// 라인 조회만 갱신한다. 이동/주사위/이벤트 처리는 호출하지 않는다.
export function watchBoardLineSnapshot({
  teamId, read, apply, onError = () => {}, canRefresh = () => true,
  visibility = document, focusTarget = window, interval = 15000,
  setTimer = setTimeout, clearTimer = clearTimeout,
}) {
  let disposed = false;
  let inFlight = false;
  let timer;
  let controller;
  const schedule = () => { if (!disposed) timer = setTimer(refresh, interval); };
  const refresh = async () => {
    if (disposed || inFlight) return;
    clearTimer(timer);
    if (visibility.hidden || !canRefresh()) { schedule(); return; }
    inFlight = true;
    controller = new AbortController();
    try {
      const snapshot = await read({ signal: controller.signal, timeout: 10000 });
      if (!disposed && snapshot.teamId === teamId && canRefresh()) apply(snapshot);
    } catch {
      if (!disposed && canRefresh()) onError();
    } finally {
      inFlight = false;
      schedule();
    }
  };
  const onVisible = () => { if (!visibility.hidden) refresh(); };
  visibility.addEventListener("visibilitychange", onVisible);
  focusTarget.addEventListener("focus", onVisible);
  schedule();
  return () => {
    disposed = true;
    clearTimer(timer);
    controller?.abort();
    visibility.removeEventListener("visibilitychange", onVisible);
    focusTarget.removeEventListener("focus", onVisible);
  };
}
