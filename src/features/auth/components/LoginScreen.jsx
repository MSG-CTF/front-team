import { useState } from "react";
import { Link } from "react-router-dom";
import { ROUTES } from "../../../routes/routePaths.js";
import { LoginFrameArtwork, LoginFieldArtwork } from "./LoginArtwork.jsx";
import styles from "./LoginScreen.module.css";

const ASSET_BASE = `${import.meta.env.BASE_URL}assets/login/`;

export default function LoginScreen({
  onLogin,
  submitting = false,
  checkingSession = false,
  feedback = null,
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const busy = submitting || checkingSession;

  const handleSubmit = (event) => {
    event.preventDefault();
    if (busy) return;
    onLogin({ username, password });
  };

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link
          to={ROUTES.intro + "#top"}
          className={styles.backLink}
          aria-label="MSG CTF 대회 안내로 돌아가기"
        >
          <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
            <path d="m9 4-4 4 4 4M5 8h8" />
          </svg>
          대회 안내
        </Link>
      </header>
      <div className={styles.content}>
        <section className={styles.panel} aria-labelledby="login-title">
          <LoginFrameArtwork />
          <h1 id="login-title" className={styles.srOnly}>로그인</h1>
          <img
            src={`${ASSET_BASE}logo-cutout.webp`}
            alt="MSG CTF"
            width="1254"
            height="1254"
            decoding="async"
            fetchpriority="high"
            className={styles.logo}
          />
          <form onSubmit={handleSubmit} className={styles.form} aria-busy={busy}>
            <div className={styles.fieldGroup}>
              <label htmlFor="login-username" className={styles.srOnly}>아이디</label>
              <LoginFieldArtwork />
              <input
                id="login-username"
                name="username"
                type="text"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="USERNAME"
                value={username}
                required
                disabled={busy}
                aria-describedby={feedback ? "login-feedback" : undefined}
                onChange={(event) => setUsername(event.target.value)}
                className={styles.field}
              />
            </div>
            <div className={styles.fieldGroup}>
              <label htmlFor="login-password" className={styles.srOnly}>비밀번호</label>
              <LoginFieldArtwork password />
              <input
                id="login-password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="PASSWORD"
                value={password}
                required
                disabled={busy}
                aria-describedby={feedback ? "login-feedback" : undefined}
                onChange={(event) => setPassword(event.target.value)}
                className={styles.field}
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              aria-label="로그인"
              aria-busy={busy}
              className={styles.loginButton}
            >
              <img
                src={`${ASSET_BASE}login-button-cutout.webp`}
                alt=""
                aria-hidden="true"
                width="1710"
                height="212"
                decoding="async"
                className={styles.loginButtonImg}
              />
              <span className={styles.srOnly}>LOGIN</span>
            </button>
            {busy && (
              <p className={styles.feedback} role="status">
                {checkingSession ? "로그인 상태를 확인하고 있어요" : "로그인 중"}
              </p>
            )}
            {feedback && (
              <p
                id="login-feedback"
                className={[
                  styles.feedback,
                  feedback.type === "error" ? styles.feedbackError : styles.feedbackSuccess,
                ].join(" ")}
                role={feedback.type === "error" ? "alert" : "status"}
              >
                {feedback.message}
              </p>
            )}
          </form>
        </section>
      </div>
    </main>
  );
}
