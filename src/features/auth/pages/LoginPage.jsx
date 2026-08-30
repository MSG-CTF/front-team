import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../../../api/auth.js";
import {
  ACCESS_TOKEN_STORAGE_KEY,
  REFRESH_TOKEN_STORAGE_KEY,
} from "../../../api/client.js";
import { isSuccess } from "../../../utils/response.js";
import { ROUTES } from "../../../routes/routePaths.js";
import LoginScreen from "../components/LoginScreen.jsx";

export default function LoginPage() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const handleLogin = async ({ username, password }) => {
    setSubmitting(true);
    setFeedback(null);

    try {
      const response = await login({ loginId: username, password });
      const envelope = response.data;
      const accessToken = envelope?.data?.access_token;
      const refreshToken = envelope?.data?.refresh_token;

      if (!isSuccess(envelope) || !accessToken || !refreshToken) {
        setFeedback({
          type: "error",
          message: envelope?.message || "로그인 응답을 확인할 수 없습니다.",
        });
        return;
      }

      localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, accessToken);
      localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken);
      setFeedback({ type: "success", message: "로그인에 성공했습니다." });
      navigate(ROUTES.board, { replace: true });
    } catch (error) {
      setFeedback({
        type: "error",
        message: error.response?.data?.message || "로그인 요청에 실패했습니다.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return <LoginScreen onLogin={handleLogin} submitting={submitting} feedback={feedback} />;
}
