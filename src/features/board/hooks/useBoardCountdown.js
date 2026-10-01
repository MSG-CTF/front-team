import { useEffect, useState } from "react";
import { getRemainingSeconds } from "../utils/boardData.js";

// 초 단위 갱신은 숫자를 보여주는 패널 안에서만 실행한다
// 보드 원판, 36개 칸과 3D 캔버스를 타이머에 묶지 않는다
export default function useBoardCountdown(targetIso, diceStatus) {
  const serverTime = diceStatus?.serverTime;
  const receivedAt = diceStatus?.receivedAt;
  const read = () => {
    const value = getRemainingSeconds(targetIso, { serverTime, receivedAt });
    return Number.isFinite(value) ? value : null;
  };
  const [remaining, setRemaining] = useState(read);

  useEffect(() => {
    let timerId;
    const stop = () => { window.clearInterval(timerId); timerId = undefined; };
    const tick = () => {
      const next = read();
      setRemaining(next);
      if (!(next > 0)) stop();
      return next;
    };
    const sync = () => {
      stop();
      const next = tick();
      if (!document.hidden && next > 0) timerId = window.setInterval(tick, 1000);
    };
    sync();
    if (!(read() > 0)) return stop;
    document.addEventListener("visibilitychange", sync);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", sync);
    };
  }, [targetIso, serverTime, receivedAt]);

  return remaining;
}
