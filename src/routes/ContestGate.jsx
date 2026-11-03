import { Suspense, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { getTimer } from "../api/timer.js";
import { isSuccess } from "../utils/response.js";
import ContestCountdown from "../features/countdown/components/ContestCountdown.jsx";
import useCountdownClock from "../features/countdown/hooks/useCountdownClock.js";
import useStartFinale from "../features/countdown/hooks/useStartFinale.js";
import { contestGateState, isGatedPath } from "./contestGate.js";
import { preloadGatedPage } from "./gatedPagePreload.js";
import { markBoardIntro } from "../features/board/utils/boardIntro.js";
import LoadingRing from "../components/common/LoadingRing.jsx";
import styles from "./ContestGate.module.css";

// 시작까지 30초 넘게 남았으면 1분마다 서버 시각을 다시 맞춘다 관리자가 시작 시각을 바꿔도 따라간다
const RESYNC_MS = 60000;

// 대회 시작 전 대기 화면: 시작까지 남은 시간을 세고, 시작 시각이 되면 시작 연출과 함께 원래 화면을 연다
export default function ContestGate({ role, children }) {
  const { pathname } = useLocation();
  const gated = role !== "ADMIN" && isGatedPath(pathname);
  const [timer, setTimer] = useState({ status: gated ? "loading" : "idle", data: null, offset: 0 });
  const [sync, setSync] = useState(0);

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
        // 다시 맞추다 실패하면 앞서 받은 시각을 그대로 쓴다
        if (!controller.signal.aborted) setTimer((value) => (value.status === "ready" ? value : { status: "ready", data: null, offset: 0 }));
      });
    return () => controller.abort();
  }, [gated, sync]);

  const ready = gated && timer.status === "ready";
  const waiting = ready && String(timer.data?.status ?? "").toUpperCase() === "BEFORE";
  const now = useCountdownClock(Date.parse(timer.data?.start_time), timer.offset, waiting);
  const gate = ready ? contestGateState({ timer: timer.data, role, pathname, now, offsetMs: timer.offset }) : { blocked: false };
  const finale = useStartFinale(gate.blocked, gated);
  const resync = gate.blocked && (gate.secondsLeft == null || gate.secondsLeft > 30);

  useEffect(() => {
    if (!resync) return undefined;
    const id = window.setTimeout(() => setSync((value) => value + 1), RESYNC_MS);
    return () => window.clearTimeout(id);
  }, [resync, sync]);

  useEffect(() => {
    if (gate.blocked) void preloadGatedPage(pathname);
  }, [gate.blocked, pathname]);

  // 마지막 10초를 같이 본 사람은 시작 직후 보드에서 판이 생기는 연출과 첫 주사위 안내를 본다
  const finalCount = gate.blocked && gate.secondsLeft != null && gate.secondsLeft <= 10;
  useEffect(() => {
    if (finalCount) markBoardIntro("countdown");
  }, [finalCount]);

  if (!gated) return children;
  if (timer.status === "loading") return <div role="status" className={styles.checking}><LoadingRing size="page">대회 시간을 확인하는 중</LoadingRing></div>;
  // 카운트다운과 시작 연출이 같은 자리에 있어야 0초에서 끊기지 않고 이어진다
  // 게임 화면 코드를 받는 동안의 대기는 여기서 받아 시작 연출까지 함께 멈추지 않게 한다
  return <>
    {!gate.blocked && <Suspense fallback={<div role="status" className={styles.loading}><LoadingRing size="page">화면을 불러오는 중</LoadingRing></div>}>{children}</Suspense>}
    {(gate.blocked || finale) && <ContestCountdown targetTime={gate.startTime ?? timer.data?.start_time} secondsLeft={gate.blocked ? gate.secondsLeft : 0} overlay={!gate.blocked} />}
  </>;
}
