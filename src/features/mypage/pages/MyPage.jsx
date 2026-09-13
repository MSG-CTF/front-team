import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { logout } from "../../../api/auth.js";
import { ACCESS_TOKEN_STORAGE_KEY, REFRESH_TOKEN_STORAGE_KEY, ROLE_STORAGE_KEY } from "../../../api/client.js";
import { getMyMileageHistory, getMyProfile, getMySolves, issueMyQrToken } from "../../../api/mypage.js";
import { getMyRanking } from "../../../api/leaderboard.js";
import { ROUTES } from "../../../routes/routePaths.js";
import { isSuccess } from "../../../utils/response.js";
import MyPageScreen from "../components/MyPageScreen.jsx";
import { PREVIEW_MY_PAGE_DATA } from "../data/previewMyPageData.js";
import { mapMileageHistory, mapSolveHistory, mapTeamProfile, getQrRemainingSeconds } from "../utils/myPageData.js";

const LOADING = { status: "loading", data: null };
const QR_IDLE = { status: "idle", paymentToken: "", expiresAt: "", remainingSeconds: null, error: "" };

export default function MyPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isPreview = import.meta.env.DEV && searchParams.get("preview") === "mypage";
  const mounted = useRef(false);
  const previewRef = useRef(isPreview);
  previewRef.current = isPreview;
  const qrPending = useRef(false);
  const logoutPending = useRef(false);
  const [revision, setRevision] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [apiState, setApiState] = useState({ profile: LOADING, mileageHistory: LOADING, solveHistory: LOADING, ranking: LOADING });
  const [qrState, setQrState] = useState(QR_IDLE);
  const [logoutState, setLogoutState] = useState({ isSubmitting: false, error: "" });

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    if (isPreview) return;
    const controller = new AbortController();
    const config = { signal: controller.signal, timeout: 10000 };
    let active = true;
    let timer;
    async function load() {
      setRefreshing(true);
      const results = await Promise.allSettled([
        getMyProfile(config), getMyMileageHistory(config), getMySolves(config), getMyRanking(config),
      ]);
      if (!active) return;
      const specs = [
        ["profile", mapTeamProfile], ["mileageHistory", mapMileageHistory],
        ["solveHistory", mapSolveHistory], ["ranking", (data) => data],
      ];
      setApiState((current) => Object.fromEntries(specs.map(([key, mapper], index) => {
        const result = results[index];
        const envelope = result.status === "fulfilled" ? result.value.data : null;
        if (!isSuccess(envelope)) return [key, { ...current[key], status: current[key].data ? "success" : "error", error: true }];
        const data = envelope.data == null ? null : mapper(envelope.data);
        return [key, { status: data == null || (Array.isArray(data) && data.length === 0) ? "empty" : "success", data, error: false }];
      })));
      setRefreshing(false);
      timer = window.setTimeout(load, 30000);
    }
    load();
    return () => { active = false; controller.abort(); window.clearTimeout(timer); };
  }, [isPreview, revision]);

  const requestQr = useCallback(async () => {
    if (qrPending.current || previewRef.current || apiState.profile.data?.isBanned) return;
    qrPending.current = true;
    setQrState({ ...QR_IDLE, status: "loading" });
    try {
      const response = await issueMyQrToken({ timeout: 10000 });
      if (!mounted.current || previewRef.current) return;
      const envelope = response.data;
      const paymentToken = envelope?.data?.payment_token;
      const expiresAt = envelope?.data?.expires_at;
      const remainingSeconds = getQrRemainingSeconds(expiresAt);
      if (!isSuccess(envelope) || typeof paymentToken !== "string" || !paymentToken.trim() || remainingSeconds == null) {
        setQrState({ ...QR_IDLE, status: "error", error: envelope?.message || "QR 발급 응답을 확인하지 못했습니다" });
      } else {
        setQrState({ ...QR_IDLE, status: remainingSeconds > 0 ? "success" : "expired",
          paymentToken: remainingSeconds > 0 ? paymentToken : "", expiresAt, remainingSeconds });
      }
    } catch (error) {
      if (mounted.current && !previewRef.current) setQrState({ ...QR_IDLE, status: "error", error: error?.response?.data?.message || "QR 발급 응답을 확인하지 못했습니다" });
    } finally { qrPending.current = false; }
  }, [apiState.profile.data?.isBanned]);

  useEffect(() => {
    if (isPreview) setQrState(QR_IDLE);
  }, [isPreview]);

  useEffect(() => {
    if (qrState.status !== "success") return;
    const timer = window.setInterval(() => {
      const remainingSeconds = getQrRemainingSeconds(qrState.expiresAt);
      setQrState((current) => remainingSeconds > 0
        ? { ...current, remainingSeconds }
        : { ...QR_IDLE, status: "expired", remainingSeconds: 0 });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [qrState.expiresAt, qrState.status]);

  const handleLogout = async () => {
    if (logoutPending.current) return;
    logoutPending.current = true;
    setLogoutState({ isSubmitting: true, error: "" });
    try {
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
      if (refreshToken) {
        const response = await logout({ refreshToken });
        if (!isSuccess(response.data)) throw new Error(response.data?.message || "로그아웃에 실패했습니다");
      }
      [ACCESS_TOKEN_STORAGE_KEY, REFRESH_TOKEN_STORAGE_KEY, ROLE_STORAGE_KEY].forEach((key) => localStorage.removeItem(key));
      navigate(ROUTES.login, { replace: true });
    } catch (error) {
      if (mounted.current) setLogoutState({ isSubmitting: false, error: error?.response?.data?.message || error.message || "로그아웃에 실패했습니다" });
    } finally { logoutPending.current = false; }
  };

  const viewState = isPreview ? {
    profile: { status: "success", data: PREVIEW_MY_PAGE_DATA.profile },
    mileageHistory: { status: "success", data: PREVIEW_MY_PAGE_DATA.mileageHistory },
    solveHistory: { status: "success", data: PREVIEW_MY_PAGE_DATA.solveHistory },
  } : {
    ...apiState,
    profile: { ...apiState.profile, data: apiState.profile.data
      ? { ...apiState.profile.data, rank: apiState.ranking.data?.rank ?? null } : null },
  };
  return <MyPageScreen {...viewState}
    onLogout={handleLogout} isLoggingOut={logoutState.isSubmitting} logoutError={logoutState.error}
    qrState={qrState} onIssueQr={requestQr} qrDisabled={isPreview || apiState.profile.data?.isBanned || apiState.profile.status !== "success"}
    onRefresh={() => setRevision((value) => value + 1)} refreshing={refreshing}
    refreshError={!isPreview && Object.values(apiState).some((state) => state.error)}
  />;
}
