import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { getTimer } from "../api/timer.js";
import { isSuccess } from "../utils/response.js";
import { contestGateState, formatWaiting, isGatedPath } from "./contestGate.js";
import { ROUTES } from "./routePaths.js";
import styles from "./ContestGate.module.css";

const startFormat = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul", month: "long", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false,
});

// 대회 시작 전 대기 화면: 시작까지 남은 시간을 1초마다 세고, 시작 시각이 되면 원래 화면을 바로 연다
export default function ContestGate({ role, children }) {
  const { pathname } = useLocation();
  const gated = role !== "ADMIN" && isGatedPath(pathname);
  const [timer, setTimer] = useState({ status: gated ? "loading" : "idle", data: null, offset: 0 });
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!gated) return undefined;
    const controller = new AbortController();
    getTimer({ signal: controller.signal, timeout: 8000 })
      .then((response) => {
        if (controller.signal.aborted) return;
        const data = isSuccess(response.data) ? response.data.data : null;
        const serverTime = Date.parse(data?.server_time);
        setTimer({ status: "ready", data, offset: Number.isFinite(serverTime) ? serverTime - Date.now() : 0 });
      })
      .catch(() => {
        if (!controller.signal.aborted) setTimer({ status: "ready", data: null, offset: 0 });
      });
    return () => controller.abort();
  }, [gated]);

  const gate = gated && timer.status === "ready" ? contestGateState({ timer: timer.data, role, pathname, now, offsetMs: timer.offset }) : { blocked: false };

  useEffect(() => {
    if (!gate.blocked) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [gate.blocked]);

  if (!gated) return children;
  if (timer.status === "loading") return <div role="status" className={styles.checking}>대회 시간을 확인하는 중</div>;
  if (!gate.blocked) return children;
  return <main className={styles.screen} aria-labelledby="contest-waiting-title">
    <section className={styles.card}>
      <p className={styles.eyebrow}>{gate.name || "MSG CTF"}</p>
      <h1 id="contest-waiting-title">대회 시작 전입니다</h1>
      <p className={styles.countdown} role="timer" aria-live="off">{formatWaiting(gate.secondsLeft)}</p>
      <p className={styles.when}>{gate.startTime ? `${startFormat.format(new Date(gate.startTime))} 시작` : "시작 시각이 정해지면 열립니다"}</p>
      <p className={styles.note}>시작 시각이 되면 이 화면이 저절로 열립니다 그 전에 게임 규칙과 팀 정보를 확인해주세요</p>
      <nav className={styles.links} aria-label="시작 전에 볼 수 있는 화면">
        <Link to={ROUTES.rules}>게임 규칙</Link>
        <Link to={ROUTES.mypage}>마이페이지</Link>
        <Link to="/timer">대회 타이머</Link>
      </nav>
    </section>
  </main>;
}
