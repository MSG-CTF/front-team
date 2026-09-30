import test from "node:test";
import assert from "node:assert/strict";
import { createTrainWhistlePlayer, scheduleTrainWhistle, TRAIN_WHISTLE_PULSES } from "./trainWhistle.js";

function fakeContext() {
  const nodes = [];
  const param = () => ({ value: 0, events: [],
    setValueAtTime(value, at) { this.events.push({ value, at }); },
    linearRampToValueAtTime(value, at) { this.events.push({ value, at }); },
  });
  const node = kind => {
    const result = { kind, gain: param(), frequency: param(), detune: param(), Q: param(),
      disconnected: false, starts: [], stops: [], connect() {},
      disconnect() { this.disconnected = true; }, start(at) { this.starts.push(at); }, stop(at) { this.stops.push(at); },
    };
    nodes.push(result);
    return result;
  };
  return { nodes, state: "suspended", currentTime: 7, destination: {}, resumes: 0, closes: 0,
    createGain: () => node("gain"), createBiquadFilter: () => node("filter"), createOscillator: () => node("oscillator"),
    async resume() { this.resumes++; this.state = "running"; },
    async close() { this.closes++; this.state = "closed"; },
  };
}

test("클릭으로 준비하기 전에는 오디오를 만들거나 자동 재생하지 않는다", () => {
  let created = 0;
  const context = fakeContext();
  const player = createTrainWhistlePlayer(() => { created++; return context; });
  assert.equal(player.play(), false);
  assert.equal(created, 0);
  player.prepare();
  player.prepare();
  assert.equal(created, 1);
  assert.equal(context.resumes, 1);
  assert.equal(context.nodes.length, 0, "준비만 해서는 소리가 나면 안 됨");
  player.dispose();
});

test("기적은 한 번에 1초 안쪽의 두 음절만 예약하고 음량을 제한한다", () => {
  const context = fakeContext();
  const stop = scheduleTrainWhistle(context);
  const oscillators = context.nodes.filter(node => node.kind === "oscillator");
  assert.equal(oscillators.length, 6);
  assert.equal(context.nodes[0].gain.value, .14);
  assert.deepEqual([...new Set(oscillators.flatMap(node => node.starts))], [7.015, 7.415]);
  assert.ok(oscillators.every(node => node.stops[0] < 8));
  assert.equal(TRAIN_WHISTLE_PULSES.length, 2);
  stop();
  assert.ok(context.nodes.every(node => node.disconnected));
});

test("같은 기적을 다시 재생하면 이전 소리는 정리하고 자연 종료 후에도 연결을 해제한다", () => {
  const context = fakeContext();
  const player = createTrainWhistlePlayer(() => context);
  player.prepare();
  assert.equal(player.play(), true);
  const previous = [...context.nodes];
  assert.equal(player.play(), true);
  assert.ok(previous.every(node => node.disconnected));
  context.nodes.slice(previous.length).filter(node => node.kind === "oscillator").forEach(node => node.onended());
  assert.ok(context.nodes.every(node => node.disconnected));
  player.dispose();
  player.dispose();
  assert.equal(context.closes, 1);
});

test("화면을 떠나면 음원을 중단하고 늦은 재생 호출은 무시한다", () => {
  const context = fakeContext();
  const player = createTrainWhistlePlayer(() => context);
  player.prepare();
  player.play();
  player.dispose();
  assert.ok(context.nodes.every(node => node.disconnected));
  assert.equal(player.play(), false);
  player.prepare();
  assert.equal(context.resumes, 1);
});

test("음소거용 stop은 재생을 끝내지만 다음 명시적 이동은 재생할 수 있다", () => {
  const context = fakeContext();
  const player = createTrainWhistlePlayer(() => context);
  player.prepare();
  player.play();
  player.stop();
  assert.ok(context.nodes.every(node => node.disconnected));
  assert.equal(player.play(), true);
  player.dispose();
});

test("오디오 미지원이나 자동 재생 거절은 이동 동작에 오류를 전달하지 않는다", async () => {
  const context = fakeContext();
  context.resume = async () => { throw new Error("NotAllowedError"); };
  for (const create of [() => null, () => { throw new Error("unavailable"); }, () => context]) {
    const player = createTrainWhistlePlayer(create);
    assert.doesNotThrow(() => player.prepare());
    await Promise.resolve();
    assert.equal(player.play(), false);
    assert.doesNotThrow(() => player.dispose());
  }
});

test("합성 중 실패해도 이미 만든 오디오 연결과 음원을 모두 정리한다", () => {
  const context = fakeContext();
  context.state = "running";
  const create = context.createOscillator;
  let count = 0;
  context.createOscillator = () => { if (++count === 3) throw new Error("failed"); return create(); };
  const player = createTrainWhistlePlayer(() => context);
  player.prepare();
  assert.equal(player.play(), false);
  assert.ok(context.nodes.every(node => node.disconnected));
  player.dispose();
});
