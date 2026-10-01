import { immediateDiceResult } from "./dicePose.js";
import { unpackDiceMotions } from "./diceMotionCodec.js";

export function createDiceMotionClient({
  createWorker = () => new Worker(new URL("./diceMotion.worker.js", import.meta.url), { type: "module" }),
  timeout = 4000,
  setTimer = (callback, delay) => window.setTimeout(callback, delay),
  clearTimer = timer => window.clearTimeout(timer),
} = {}) {
  let worker;
  let nextId = 0;
  let disposed = false;
  const pending = new Map();
  const finish = (id, motions) => {
    const request = pending.get(id);
    if (!request) return;
    pending.delete(id);
    clearTimer(request.timer);
    request.resolve(motions);
  };
  const failWorker = () => {
    worker?.terminate();
    worker = null;
    for (const [id, request] of pending) finish(id, immediateDiceResult(request.current, request.result));
  };
  try {
    worker = createWorker();
    worker.onmessage = ({ data }) => {
      const request = pending.get(data.id);
      if (!request) return;
      try {
        if (data.failed) throw new Error("주사위 계산 실패");
        finish(data.id, unpackDiceMotions(data.motions));
      } catch { failWorker(); }
    };
    worker.onerror = event => { event.preventDefault?.(); failWorker(); };
    worker.onmessageerror = failWorker;
  } catch { worker = null; }
  return {
    compute(current, result, reducedMotion = false) {
      if (disposed) return Promise.resolve(null);
      if (reducedMotion || !worker) return Promise.resolve(immediateDiceResult(current, result));
      const id = ++nextId;
      return new Promise(resolve => {
        const timer = setTimer(failWorker, timeout);
        pending.set(id, { resolve, timer, current, result });
        try {
          worker.postMessage({ id, result: { diceA: result?.diceA, diceB: result?.diceB }, current: current.map(pose => ({ position: pose.position.toArray(), quaternion: pose.quaternion.toArray() })) });
        } catch { failWorker(); }
      });
    },
    dispose() {
      disposed = true;
      worker?.terminate();
      worker = null;
      for (const id of pending.keys()) finish(id, null);
    },
  };
}
