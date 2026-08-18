import { useState } from "react";
import LoginScreen from "../components/LoginScreen.jsx";

const ACCESS_TOKEN_STORAGE_KEY = "msgctf_access_token";

export default function LoginPage() {
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async ({ username, password }) => {
    setSubmitting(true);
    try {
      // TODO: 실제 로그인 API 연동 — MsgCTF.spec.md 1절.
      // POST {BASE_URL}api/v1/auth/login
      //   Req  { login_id, password }
      //   Res  { access_token, refresh_token, role, is_leader, nickname, team_id, team_name, user_id }
      // 이후 보호된 요청은 Authorization: Bearer ${access_token} 헤더로 호출.
      // 저장 로직만 미리 남겨두고, 실제 apiClient 호출은 API 확정 후 연결.
      console.log("login submit", { username, password });
      const accessToken = null; // TODO: 로그인 응답의 access_token으로 교체
      if (accessToken) {
        localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, accessToken);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return <LoginScreen onLogin={handleLogin} submitting={submitting} />;
}
