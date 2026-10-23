import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { logout } from "../../../api/auth.js";
import { ACCESS_TOKEN_STORAGE_KEY, REFRESH_TOKEN_STORAGE_KEY, ROLE_STORAGE_KEY } from "../../../api/client.js";
import { getMyMileageHistory, getMyProfile, getMySolves, issueMyQrToken } from "../../../api/mypage.js";
import { getMyRanking, getMyMemberRanking } from "../../../api/leaderboard.js";
import { ROUTES } from "../../../routes/routePaths.js";
import { isSuccess } from "../../../utils/response.js";
import { startVisiblePolling } from "../../../utils/visiblePolling.js";
import MyPageScreen from "../components/MyPageScreen.jsx";
import { PREVIEW_MY_PAGE_DATA } from "../data/previewMyPageData.js";
import { getQrRemainingSeconds } from "../utils/myPageData.js";
import { updateMyPageSnapshot } from "../utils/myPageSnapshot.js";
import { createTeamQrSession, getQrTeamId, QR_IDLE } from "../utils/teamQrSession.js";

const LOADING = { status: "loading", data: null };

export default function MyPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isPreview = import.meta.env.DEV && searchParams.get("preview") === "mypage";
  const mounted = useRef(false);
  const previewRef = useRef(isPreview);
  previewRef.current = isPreview;
  const logoutPending = useRef(false);
  const [revision, setRevision] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [apiState, setApiState] = useState({ profile: LOADING, mileageHistory: LOADING, solveHistory: LOADING, ranking: LOADING, memberRanking: LOADING });
  const [qrState, setQrState] = useState(QR_IDLE);
  const qrSession = useRef(null);
  if (!qrSession.current) qrSession.current = createTeamQrSession({
    getProfile: getMyProfile, issueQr: issueMyQrToken,
    updateState: (state) => { if (mounted.current) setQrState(state); },
    onMembershipChange: () => { if (mounted.current) setRevision((value) => value + 1); },
  });
  const qrTeamId = isPreview ? null : getQrTeamId(apiState.profile);
  const [logoutState, setLogoutState] = useState({ isSubmitting: false, error: "" });

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; qrSession.current.dispose(); };
  }, []);

  useEffect(() => {
    if (isPreview) return;
    const controller = new AbortController();
    const config = { signal: controller.signal, timeout: 10000 };
    let active = true;
    async function load() {
      setRefreshing(true);
      const results = await Promise.allSettled([
        getMyProfile(config), getMyMileageHistory(config), getMySolves(config), getMyRanking(config), getMyMemberRanking(config),
      ]);
      if (!active) return;
      setApiState((current) => updateMyPageSnapshot(current, results));
      setRefreshing(false);
    }
    const stopPolling = startVisiblePolling(load);
    return () => { stopPolling(); active = false; controller.abort(); };
  }, [isPreview, revision]);

  const requestQr = useCallback(() => {
    if (!mounted.current || previewRef.current) return;
    return qrSession.current.request();
  }, []);

  useEffect(() => {
    // 확인 중 팀이 바뀌었다가 돌아와도 새 프로필로 발급 세션을 다시 연결한다
    qrSession.current.setTeam(qrTeamId);
  }, [qrTeamId, apiState.profile]);

  useEffect(() => {
    if (qrState.status !== "success") return;
    const timer = window.setInterval(() => {
      const remainingSeconds = getQrRemainingSeconds(qrState.expiresAt);
      setQrState((current) => {
        if (current.status !== "success" || current.expiresAt !== qrState.expiresAt) return current;
        return remainingSeconds > 0 ? { ...current, remainingSeconds }
          : { ...QR_IDLE, teamId: current.teamId, status: "expired", remainingSeconds: 0 };
      });
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
    memberRanking: { status: "success", data: PREVIEW_MY_PAGE_DATA.memberRanking },
  } : {
    ...apiState,
    profile: { ...apiState.profile, data: apiState.profile.data
      ? { ...apiState.profile.data, rank: apiState.ranking.data?.rank ?? null } : null },
  };
  return <MyPageScreen {...viewState}
    onLogout={handleLogout} isLoggingOut={logoutState.isSubmitting} logoutError={logoutState.error}
    qrState={qrTeamId && qrState.teamId === qrTeamId && !refreshing ? qrState : QR_IDLE}
    onIssueQr={requestQr} qrDisabled={!qrTeamId || refreshing}
    onRefresh={() => setRevision((value) => value + 1)} refreshing={refreshing}
    refreshError={!isPreview && Object.values(apiState).some((state) => state.error)}
    scoreRefreshError={!isPreview && [apiState.profile, apiState.ranking, apiState.memberRanking].some((state) => state.error)}
  />;
}
