import { useState } from "react";
import styles from "./LoginScreen.module.css";

// Figma: "MSG-CTF 프론트 개발" 파일, node-id 10:14 ("Login page", 1920x1080).
// get_metadata로 확보한 실측 좌표는 LoginScreen.module.css의 .stage 블록에 CSS 변수로
// 모아뒀다. 카드 판(login-card-plate)에 양피지 프레임/입력창 테두리/아이콘(사람·자물쇠)이
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

// 예전 login-clean-plate는 프레임 주변에 풍경(가을 마을/호수/가판대)까지 통째로
// 구워진 1920x1080 그림이었다. .page의 새 배경(background-plaza)과 서로 다른
// 풍경이 겹쳐 경계선이 보였기 때문에, login-clean-plate에서 양피지 카드(원목
// 프레임+입력창 테두리+아이콘)만 알파로 오려내고 주변 풍경은 지운 뒤 은은한
// 그림자를 입힌 것이 login-card-plate다. 카드 위치·크기는 원본 좌표 그대로라
// 아래 .stage 변수들은 손댈 필요가 없다.
const BACKGROUND_SRC = `${ASSET_BASE}login-card-plate.webp`;
// logo@2x.webp / login-button@2x.webp는 알파 채널이 없는 flat 이미지라
// 로고 사각 배경(#f9eded)과 버튼 4귀퉁이 톱니 노치 부분이 뒤 배경과 다른
// 색으로 그대로 보였다. logo-cutout.png(rules/msg-ctf-logo.png와 동일,
// 실제 알파 채널 있음)와 login-button-cutout.png(같은 원본을 4귀퉁이
// 배경색 기준 flood-fill로 투명 처리)로 교체했다.
const LOGO_SRC = `${ASSET_BASE}logo-cutout.png`;
const LOGIN_BUTTON_SRC = `${ASSET_BASE}login-button-cutout.png`;

export default function LoginScreen({ onLogin, submitting = false, feedback = null }) {
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
            required
            disabled={submitting}
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
            required
            disabled={submitting}
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

          {feedback ? (
            <p
              className={`${styles.feedback} ${
                feedback.type === "error" ? styles.feedbackError : styles.feedbackSuccess
              }`}
              role={feedback.type === "error" ? "alert" : "status"}
            >
              {feedback.message}
            </p>
          ) : null}
        </form>
      </div>
    </div>
  );
}
