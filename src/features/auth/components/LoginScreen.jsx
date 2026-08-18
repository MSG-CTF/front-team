import { useState } from "react";
import styles from "./LoginScreen.module.css";

// Figma: "MSG-CTF 프론트 개발" 파일, node-id 10:14 ("Login page", 1920x1080).
// get_metadata로 확보한 실측 좌표는 LoginScreen.module.css의 .stage 블록에 CSS 변수로
// 모아뒀다. 배경(login-clean-plate)에 양피지 프레임/입력창 테두리/아이콘(사람·자물쇠)이
// 전부 구워져 있으므로, 여기서는 절대 border/box-shadow를 다시 그리지 않고 실제
// <input>/<button>만 투명하게 겹친다. 이전의 AuthCard/AuthInput/LoginButton/Logo
// 조합(FixedAspectStage + %/cqw 기반) 구현은 이 컴포넌트로 대체됐다.
//
// ⚠️ 폰트 확인 필요: Figma 텍스트 레이어 실측값은 "IM Fell English"다
// (get_design_context 응답의 font-['IM_FELL_English:Regular'] 참고 — Cinzel이 아님).
// index.html에서 IM Fell English를 Google Fonts로 이미 전역 로드하고 있어(문제상세 등
// 다른 화면도 동일 폰트 사용 중) 별도 @font-face 로컬 번들은 추가하지 않았다.

const BASE_URL = import.meta.env.BASE_URL;
const ASSET_BASE = `${BASE_URL}assets/login/`;

const BACKGROUND_SRC = `${ASSET_BASE}login-clean-plate@2x.webp`;
const LOGO_SRC = `${ASSET_BASE}logo@2x.webp`;
const LOGIN_BUTTON_SRC = `${ASSET_BASE}login-button@2x.webp`;

export default function LoginScreen({ onLogin, submitting = false }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();
    onLogin({ username, password });
  };

  return (
    <div className={styles.page}>
      <div className={styles.stage}>
        <img src={BACKGROUND_SRC} alt="" aria-hidden="true" className={styles.background} />

        <img src={LOGO_SRC} alt="MSG CTF" className={styles.logo} />

        <form onSubmit={handleSubmit}>
          <label htmlFor="login-username" className={styles.srOnly}>
            아이디
          </label>
          <input
            id="login-username"
            name="username"
            type="text"
            autoComplete="username"
            placeholder="USERNAME"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className={`${styles.field} ${styles.username}`}
          />

          <label htmlFor="login-password" className={styles.srOnly}>
            비밀번호
          </label>
          <input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="PASSWORD"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={`${styles.field} ${styles.password}`}
          />

          <button
            type="submit"
            disabled={submitting}
            aria-label="로그인"
            className={styles.loginButton}
          >
            <img src={LOGIN_BUTTON_SRC} alt="" aria-hidden="true" className={styles.loginButtonImg} />
          </button>
        </form>
      </div>
    </div>
  );
}
