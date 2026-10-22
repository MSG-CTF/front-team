import { createContext, useContext, useEffect, useState } from "react";
import { Link, Navigate, Outlet, useLocation } from "react-router-dom";
import { getMe } from "../api/auth.js";
import { ACCESS_TOKEN_STORAGE_KEY, clearStoredTokens } from "../api/client.js";
import { ROLE } from "../constants/enums.js";
import { isSuccess } from "../utils/response.js";
import { ROUTES } from "./routePaths.js";
import usePageResources from "./usePageResources.js";
import ContestGate from "./ContestGate.jsx";

const AuthenticatedUser = createContext(null);

export function useAuthenticatedUser() {
  return useContext(AuthenticatedUser);
}

export default function AuthenticatedRoute() {
  const { pathname } = useLocation();
  // 다른 화면으로 이동할 때 이전 인증 확인 결과로 새 화면을 먼저 열지 않는다
  return <SessionGate key={pathname} />;
}

function SessionGate() {
  const hasToken = Boolean(localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY));
  const [status, setStatus] = useState("checking");
  const [user, setUser] = useState(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!hasToken) return undefined;
    const controller = new AbortController();
    setStatus("checking");
    getMe({ signal: controller.signal, timeout: 10000 })
      .then((response) => {
        if (controller.signal.aborted) return;
        const verifiedUser = response.data?.data;
        if (
          isSuccess(response.data) &&
          typeof verifiedUser?.user_id === "string" &&
          verifiedUser.user_id &&
          [ROLE.PARTICIPANT, ROLE.ADMIN].includes(verifiedUser.role)
        ) {
          setUser(verifiedUser);
          setStatus("allowed");
        } else {
          clearStoredTokens();
          setStatus("anonymous");
        }
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        if (error.response?.status === 401) {
          clearStoredTokens();
          setStatus("anonymous");
        } else {
          setStatus("unavailable");
        }
      });
    return () => controller.abort();
  }, [hasToken, attempt]);

  if (!hasToken || status === "anonymous") {
    return <Navigate to={ROUTES.login} replace />;
  }
  if (status === "unavailable") {
    return (
      <div className="grid min-h-screen place-content-center gap-4 bg-[#21150d] px-6 text-center text-[#f8ead0]">
        <p role="alert">로그인 상태를 확인하지 못했어요 다시 시도해 주세요</p>
        <button type="button" onClick={() => setAttempt((value) => value + 1)}>
          다시 확인하기
        </button>
        <Link to={ROUTES.login}>로그인 화면으로</Link>
      </div>
    );
  }
  if (status !== "allowed") {
    return (
      <div role="status" className="grid min-h-screen place-items-center bg-[#21150d] text-[#f8ead0]">
        로그인 확인 중
      </div>
    );
  }
  return (
    <AuthenticatedUser.Provider value={user}>
      <AuthenticatedContent />
    </AuthenticatedUser.Provider>
  );
}

function AuthenticatedContent() {
  usePageResources();
  const user = useAuthenticatedUser();
  // 대회 시작 전에는 참가자의 게임 화면을 대기 화면으로 바꾼다 관리자는 그대로 지나간다
  return <ContestGate role={user?.role}><Outlet /></ContestGate>;
}
