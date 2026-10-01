import { getRemainingSeconds } from "./boardData.js";

// 두 타이머가 같이 끝나도 조회는 하나만 실행하고 성공한 만료만 기록한다
export function scheduleBoardDeadlineRefresh(deadlines, diceStatus, refresh, {
  completed = new Set(),
  onError = () => {},
  onRecovered = () => {},
  retryDelays = [1000, 2500, 5000],
  now = Date.now,
  setTimer = (callback, delay) => window.setTimeout(callback, delay),
  clearTimer = timer => window.clearTimeout(timer),
  visibility = document,
} = {}) {
  let timer;
  let disposed = false;
  let inFlight = false;
  let retryAttempt = 0;
  let exhausted = false;
  const pending = () => deadlines
    .filter(deadline => !completed.has(deadline.key))
    .map(deadline => ({ ...deadline, remaining: getRemainingSeconds(deadline.targetIso, diceStatus, now()) }))
    .filter(deadline => Number.isFinite(deadline.remaining));
  const check = () => {
    clearTimer(timer);
    timer = undefined;
    if (disposed || inFlight || exhausted) return;
    const remaining = pending();
    const due = remaining.filter(deadline => deadline.remaining === 0);
    if (!due.length) {
      if (remaining.length) timer = setTimer(check, Math.min(...remaining.map(deadline => deadline.remaining * 1000), 2147483647));
      return;
    }
    inFlight = true;
    Promise.resolve().then(() => {
      if (!disposed) return refresh();
    }).then(() => {
      if (disposed) return;
      due.forEach(deadline => completed.add(deadline.key));
      retryAttempt = 0;
      onRecovered();
      inFlight = false;
      check();
    }).catch(error => {
      if (disposed) return;
      inFlight = false;
      onError(error, { retrying: retryAttempt < retryDelays.length });
      if (retryAttempt < retryDelays.length) timer = setTimer(check, retryDelays[retryAttempt++]);
      else exhausted = true;
    });
  };
  const onVisible = () => {
    if (!visibility.hidden && !inFlight && !exhausted && retryAttempt === 0) check();
  };
  visibility.addEventListener("visibilitychange", onVisible);
  check();
  return () => {
    disposed = true;
    clearTimer(timer);
    visibility.removeEventListener("visibilitychange", onVisible);
  };
}
