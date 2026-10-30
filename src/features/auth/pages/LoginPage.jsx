import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMe, login } from "../../../api/auth.js";
import {
  ACCESS_TOKEN_STORAGE_KEY,
  REFRESH_TOKEN_STORAGE_KEY,
  ROLE_STORAGE_KEY,
  clearStoredTokens,
} from "../../../api/client.js";
import { ROLE } from "../../../constants/enums.js";
import { isSuccess } from "../../../utils/response.js";
import { ROUTES } from "../../../routes/routePaths.js";
import LoginScreen from "../components/LoginScreen.jsx";
import { markBoardIntro } from "../../board/utils/boardIntro.js";
import { loginRetryMessage, retryAfterSeconds } from "../utils/loginRetry.js";

export default function LoginPage() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);
  // 시도 제한에 걸리면 남은 시간을 세고 그동안 로그인 버튼을 막는다
  const [retryUntil, setRetryUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (retryUntil <= Date.now()) return undefined;
    const id = window.setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= retryUntil) setRetryUntil(0);
    }, 1000);
    return () => window.clearInterval(id);
  }, [retryUntil]);
  const waitSeconds = retryUntil > now ? Math.ceil((retryUntil - now) / 1000) : 0;
  // "/login"에 상대경로로 직접 들어와도(주소창 입력, 뒤로가기, 북마크 등) 이미
  // 로그인된 세션이면 로그인 폼 대신 원래 화면으로 돌려보낸다. localStorage에
  // 토큰이 남아있다는 사실만으로 로그인 상태를 믿지 않고 GET /auth/me로 실제
  // 유효성을 확인한다(AdminRoute와 동일한 이유 - 만료·조작된 토큰일 수 있다).
  const [checkingSession, setCheckingSession] = useState(
    () => Boolean(localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)),
  );

  useEffect(() => {
    if (!checkingSession) return undefined;
    let cancelled = false;
    getMe()
      .then((res) => {
        if (cancelled) return;
        const role = res.data?.data?.role;
        if (isSuccess(res.data) && role) {
          navigate(role === ROLE.ADMIN ? ROUTES.adminDashboard : ROUTES.board, { replace: true });
          return;
        }
        clearStoredTokens();
        setCheckingSession(false);
      })
      .catch(() => {
        if (cancelled) return;
        clearStoredTokens();
        setCheckingSession(false);
      });
    return () => {
      cancelled = true;
    };
  }, [checkingSession, navigate]);

  const handleLogin = async ({ username, password }) => {
    setSubmitting(true);
    setFeedback(null);

    try {
      const response = await login({ loginId: username, password });
      const envelope = response.data;
      const accessToken = envelope?.data?.access_token;
      const refreshToken = envelope?.data?.refresh_token;
      const role = envelope?.data?.role;

      if (!isSuccess(envelope) || !accessToken || !refreshToken) {
        setFeedback({
          type: "error",
          message: envelope?.message || "로그인 응답을 확인할 수 없습니다",
        });
        return;
      }

      localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, accessToken);
      localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken);
      if (role) {
        localStorage.setItem(ROLE_STORAGE_KEY, role);
      } else {
        localStorage.removeItem(ROLE_STORAGE_KEY);
      }
      // 새 로그인 세션에서 보드에 처음 들어오면 판이 생기는 연출과 첫 주사위 안내를 보인다
      markBoardIntro();
      setFeedback({ type: "success", message: "로그인에 성공했습니다" });
      navigate(role === ROLE.ADMIN ? ROUTES.adminDashboard : ROUTES.board, { replace: true });
    } catch (error) {
      if (error.response?.status === 429) {
        const current = Date.now();
        // 제한이 풀린 뒤 이전 오류 문구가 다시 보이지 않게 비워 둔다
        setFeedback(null);
        setNow(current);
        setRetryUntil(current + retryAfterSeconds(error, current) * 1000);
        return;
      }
      setFeedback({
        type: "error",
        message: error.response?.data?.message || "로그인 요청에 실패했습니다",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <LoginScreen
      onLogin={handleLogin}
      submitting={submitting}
      checkingSession={checkingSession}
      locked={waitSeconds > 0}
      feedback={waitSeconds > 0 ? { type: "error", message: loginRetryMessage(waitSeconds) } : feedback}
    />
  );
}
