import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { logout } from "../../../api/auth.js";
import {
  ACCESS_TOKEN_STORAGE_KEY,
  REFRESH_TOKEN_STORAGE_KEY,
  ROLE_STORAGE_KEY,
} from "../../../api/client.js";
import {
  getMyMileageHistory,
  getMyProfile,
  issueMyQrToken,
} from "../../../api/mypage.js";
import { ROUTES } from "../../../routes/routePaths.js";
import { isSuccess } from "../../../utils/response.js";
import MyPageScreen from "../components/MyPageScreen.jsx";
import { PREVIEW_MY_PAGE_DATA } from "../data/previewMyPageData.js";
import { mapMileageHistory, mapTeamProfile } from "../utils/myPageData.js";

const LOADING_STATE = Object.freeze({ status: "loading", data: null });
const SOLVE_HISTORY_API_READY_STATE = Object.freeze({
  status: "unavailable",
  data: [],
});
const QR_LOADING_STATE = Object.freeze({
  status: "loading",
  paymentToken: "",
  expiresAt: "",
  remainingSeconds: null,
  error: "",
});
const QR_PREVIEW_STATE = Object.freeze({
  status: "unavailable",
  paymentToken: "",
  expiresAt: "",
  remainingSeconds: null,
  error: "",
});

function getQrRemainingSeconds(expiresAt, now = Date.now()) {
  const expiresAtMilliseconds = Date.parse(expiresAt);
  if (!Number.isFinite(expiresAtMilliseconds)) return null;
  return Math.max(0, Math.ceil((expiresAtMilliseconds - now) / 1000));
}

function resolveResponse(settledResult, mapData, isEmpty) {
  if (settledResult.status === "rejected") {
    return { status: "error", data: null };
  }

  const envelope = settledResult.value?.data;
  if (!isSuccess(envelope)) {
    return { status: "error", data: null };
  }

  if (isEmpty(envelope.data)) {
    return { status: "empty", data: null };
  }

  return { status: "success", data: mapData(envelope.data) };
}

export default function MyPage() {
  const navigate = useNavigate();
  const logoutInFlightRef = useRef(false);
  const qrRequestStartedRef = useRef(false);
  const qrMountedRef = useRef(false);
  const [searchParams] = useSearchParams();
  const isPreview = searchParams.get("preview") === "mypage";
  const isPreviewRef = useRef(isPreview);
  isPreviewRef.current = isPreview;
  const previewState = useMemo(
    () => ({
      profile: { status: "success", data: PREVIEW_MY_PAGE_DATA.profile },
      mileageHistory: {
        status: "success",
        data: PREVIEW_MY_PAGE_DATA.mileageHistory,
      },
      solveHistory: {
        status: "success",
        data: PREVIEW_MY_PAGE_DATA.solveHistory,
      },
    }),
    [],
  );
  const [apiState, setApiState] = useState({
    profile: LOADING_STATE,
    mileageHistory: LOADING_STATE,
  });
  const [logoutState, setLogoutState] = useState({
    isSubmitting: false,
    error: "",
  });
  const [qrState, setQrState] = useState(
    isPreview ? QR_PREVIEW_STATE : QR_LOADING_STATE,
  );

  const clearStoredAuth = () => {
    localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
    localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
    localStorage.removeItem(ROLE_STORAGE_KEY);
  };

  const handleLogout = async () => {
    if (logoutInFlightRef.current) return;
    logoutInFlightRef.current = true;

    const refreshToken = localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
    setLogoutState({ isSubmitting: true, error: "" });

    if (!refreshToken) {
      clearStoredAuth();
      navigate(ROUTES.login, { replace: true });
      return;
    }

    try {
      const response = await logout({ refreshToken });
      const envelope = response.data;

      if (!isSuccess(envelope)) {
        logoutInFlightRef.current = false;
        setLogoutState({
          isSubmitting: false,
          error: envelope?.message || "로그아웃에 실패했습니다.",
        });
        return;
      }

      clearStoredAuth();
      navigate(ROUTES.login, { replace: true });
    } catch (error) {
      logoutInFlightRef.current = false;
      setLogoutState({
        isSubmitting: false,
        error: error?.response?.data?.message || "로그아웃 요청에 실패했습니다.",
      });
    }
  };

  useEffect(() => {
    if (isPreview) return undefined;

    const controller = new AbortController();
    let active = true;

    setApiState({
      profile: LOADING_STATE,
      mileageHistory: LOADING_STATE,
    });

    Promise.allSettled([
      getMyProfile({ signal: controller.signal }),
      getMyMileageHistory({ signal: controller.signal }),
    ]).then(([profileResult, mileageHistoryResult]) => {
      if (!active) return;

      setApiState({
        profile: resolveResponse(
          profileResult,
          mapTeamProfile,
          (data) => data == null,
        ),
        mileageHistory: resolveResponse(
          mileageHistoryResult,
          mapMileageHistory,
          (data) => !data || !Array.isArray(data.history) || data.history.length === 0,
        ),
      });
    });

    return () => {
      active = false;
      controller.abort();
    };
  }, [isPreview]);

  useEffect(() => {
    qrMountedRef.current = true;

    if (isPreview) {
      setQrState(QR_PREVIEW_STATE);
      return () => {
        qrMountedRef.current = false;
      };
    }

    if (!qrRequestStartedRef.current) {
      qrRequestStartedRef.current = true;
      setQrState(QR_LOADING_STATE);

      issueMyQrToken()
        .then((response) => {
          if (!qrMountedRef.current || isPreviewRef.current) return;

          const envelope = response.data;
          const paymentToken = envelope?.data?.payment_token;
          const expiresAt = envelope?.data?.expires_at;
          const remainingSeconds = getQrRemainingSeconds(expiresAt);

          if (!isSuccess(envelope)) {
            setQrState({
              status: "error",
              paymentToken: "",
              expiresAt: "",
              remainingSeconds: null,
              error: envelope?.message || "QR 결제 토큰을 발급하지 못했습니다.",
            });
            return;
          }

          if (
            typeof paymentToken !== "string" ||
            !paymentToken.trim() ||
            remainingSeconds == null
          ) {
            setQrState({
              status: "error",
              paymentToken: "",
              expiresAt: "",
              remainingSeconds: null,
              error: "QR 토큰 응답 형식을 확인할 수 없습니다.",
            });
            return;
          }

          if (remainingSeconds === 0) {
            setQrState({
              status: "expired",
              paymentToken: "",
              expiresAt,
              remainingSeconds: 0,
              error: "",
            });
            return;
          }

          setQrState({
            status: "success",
            paymentToken,
            expiresAt,
            remainingSeconds,
            error: "",
          });
        })
        .catch((error) => {
          if (!qrMountedRef.current || isPreviewRef.current) return;
          setQrState({
            status: "error",
            paymentToken: "",
            expiresAt: "",
            remainingSeconds: null,
            error:
              error?.response?.data?.message ||
              "QR 결제 토큰을 발급하지 못했습니다.",
          });
        });
    }

    return () => {
      qrMountedRef.current = false;
    };
  }, [isPreview]);

  useEffect(() => {
    if (qrState.status !== "success" || !qrState.expiresAt) return undefined;

    const updateRemainingTime = () => {
      const remainingSeconds = getQrRemainingSeconds(qrState.expiresAt);
      if (remainingSeconds == null || remainingSeconds <= 0) {
        setQrState((current) => ({
          ...current,
          status: "expired",
          paymentToken: "",
          remainingSeconds: 0,
        }));
        return;
      }

      setQrState((current) => ({ ...current, remainingSeconds }));
    };

    updateRemainingTime();
    const intervalId = window.setInterval(updateRemainingTime, 1000);
    return () => window.clearInterval(intervalId);
  }, [qrState.expiresAt, qrState.status]);

  const viewState = isPreview
    ? previewState
    : {
        ...apiState,
        solveHistory: SOLVE_HISTORY_API_READY_STATE,
      };

  return (
    <MyPageScreen
      {...viewState}
      onLogout={handleLogout}
      isLoggingOut={logoutState.isSubmitting}
      logoutError={logoutState.error}
      qrState={qrState}
    />
  );
}
