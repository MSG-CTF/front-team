import { scheduleTrainChuffs } from "./trainChuff.js";

export const TRAIN_WHISTLE_PULSES = Object.freeze([
  { offset: 0, duration: .26 },
  { offset: .4, duration: .44 },
]);

// 별도 음원 다운로드 없이 짧은 증기 기적 두 번만 합성한다
export function scheduleTrainWhistle(context) {
  const nodes = [];
  const sources = [];
  let stopped = false;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    for (const source of sources) {
      source.onended = null;
      try { source.stop(); } catch { /* 이미 끝난 음원 */ }
    }
    for (const node of nodes) { try { node.disconnect(); } catch { /* 연결 전 실패 */ } }
  };
  try {
    const master = context.createGain();
    nodes.push(master);
    master.gain.value = .14;
    master.connect(context.destination);
    const filter = context.createBiquadFilter();
    nodes.push(filter);
    filter.type = "lowpass";
    filter.frequency.value = 1800;
    filter.Q.value = .4;
    filter.connect(master);
    const start = context.currentTime + .015;
    for (const pulse of TRAIN_WHISTLE_PULSES) {
      [349.23, 466.16, 587.33].forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        const envelope = context.createGain();
        sources.push(oscillator);
        nodes.push(oscillator, envelope);
        const at = start + pulse.offset;
        const end = at + pulse.duration;
        oscillator.type = "triangle";
        oscillator.frequency.value = frequency;
        oscillator.detune.setValueAtTime(-55, at);
        oscillator.detune.linearRampToValueAtTime(0, at + .055);
        oscillator.detune.linearRampToValueAtTime(-25, end);
        const volume = [.5, .29, .18][index];
        envelope.gain.setValueAtTime(0, at);
        envelope.gain.linearRampToValueAtTime(volume, at + .035);
        envelope.gain.setValueAtTime(volume * .86, end - .08);
        envelope.gain.linearRampToValueAtTime(0, end);
        oscillator.connect(envelope);
        envelope.connect(filter);
        oscillator.start(at);
        oscillator.stop(end + .02);
      });
    }
    let remaining = sources.length;
    sources.forEach(source => { source.onended = () => { if (--remaining === 0) stop(); }; });
    return stop;
  } catch (error) {
    stop();
    throw error;
  }
}

export function createTrainWhistlePlayer(createContext = () => {
  const Context = globalThis.AudioContext ?? globalThis.webkitAudioContext;
  return Context ? new Context() : null;
}) {
  let context = null;
  let stopSound = null;
  let stopChuffs = null;
  let disposed = false;
  const stop = () => { stopSound?.(); stopChuffs?.(); stopSound = null; stopChuffs = null; };
  return {
    // 사용자가 이동 버튼을 누른 시점에만 준비한다 실제 재생은 이동 성공 후다
    prepare() {
      if (disposed) return;
      try {
        context ??= createContext();
        if (context && context.state !== "running") Promise.resolve(context.resume()).catch(() => {});
      } catch { /* 오디오가 막혀도 이동 요청은 계속한다 */ }
    },
    play(journey) {
      stop();
      if (disposed || context?.state !== "running") return false;
      try {
        stopSound = scheduleTrainWhistle(context);
        stopChuffs = scheduleTrainChuffs(context, journey);
        return true;
      } catch { stop(); return false; }
    },
    stop,
    dispose() {
      disposed = true;
      stop();
      try { if (context) Promise.resolve(context.close()).catch(() => {}); } catch { /* 이미 닫힌 오디오 */ }
      context = null;
    },
  };
}
