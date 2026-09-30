import { createTrainChuffPlan } from "./trainMotion.js";

const steamBuffers = new WeakMap();
function steamBuffer(context) {
  if (steamBuffers.has(context)) return steamBuffers.get(context);
  const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * .2), context.sampleRate);
  const channel = buffer.getChannelData(0);
  let seed = 718;
  for (let index = 0; index < channel.length; index++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    channel[index] = (seed / 4294967296 * 2 - 1) * .8;
  }
  steamBuffers.set(context, buffer);
  return buffer;
}

export function scheduleTrainChuffs(context, journey) {
  const plan = createTrainChuffPlan(journey?.duration);
  if (!plan.length) return () => {};
  const nodes = [];
  const sources = [];
  let stopped = false;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    for (const source of sources) {
      source.onended = null;
      try { source.stop(); } catch { /* 종료된 소리 */ }
    }
    for (const node of nodes) { try { node.disconnect(); } catch { /* 연결 전 실패 */ } }
  };
  try {
    const buffer = steamBuffer(context);
    const master = context.createGain();
    nodes.push(master);
    master.gain.value = .32;
    master.connect(context.destination);
    const start = context.currentTime + .015;
    for (const beat of plan) {
      const source = context.createBufferSource();
      sources.push(source); nodes.push(source);
      const filter = context.createBiquadFilter();
      nodes.push(filter);
      const envelope = context.createGain();
      nodes.push(envelope);
      const at = start + beat.at / 1000;
      const duration = [.075, .07, .12, .11][beat.accent];
      const volume = [.58, .45, .82, .65][beat.accent] * (.7 + beat.speedRatio * .3);
      source.buffer = buffer;
      filter.type = "bandpass";
      filter.frequency.value = [1800, 1350, 540, 410][beat.accent];
      filter.Q.value = .65;
      envelope.gain.setValueAtTime(0, at);
      envelope.gain.linearRampToValueAtTime(volume, at + .006);
      envelope.gain.linearRampToValueAtTime(volume * .28, at + duration * .38);
      envelope.gain.linearRampToValueAtTime(0, at + duration);
      source.connect(filter);
      filter.connect(envelope);
      envelope.connect(master);
      source.start(at);
      source.stop(at + duration + .008);
    }
    let remaining = sources.length;
    sources.forEach(source => { source.onended = () => { if (--remaining === 0) stop(); }; });
    return stop;
  } catch (error) {
    stop();
    throw error;
  }
}
