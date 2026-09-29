import test from "node:test";
import assert from "node:assert/strict";
import { scheduleTrainChuffs } from "./trainChuff.js";
import { createTrainChuffPlan } from "./trainMotion.js";
import { createTrainWhistlePlayer } from "./trainWhistle.js";

function fakeAudio() {
  const nodes = [];
  const param = () => ({ value: 0, events: [],
    setValueAtTime(value, at) { this.events.push({ value, at }); },
    linearRampToValueAtTime(value, at) { this.events.push({ value, at }); },
  });
  const node = kind => {
    const result = { kind, gain: param(), frequency: param(), detune: param(), Q: param(),
      starts: [], stops: [], disconnected: false, connect() {},
      start(at) { this.starts.push(at); }, stop(at) { this.stops.push(at); }, disconnect() { this.disconnected = true; },
    };
    nodes.push(result);
    return result;
  };
  return { nodes, currentTime: 3, sampleRate: 48000, state: "running", buffers: [], destination: {},
    createGain: () => node("gain"), createBiquadFilter: () => node("filter"),
    createBufferSource: () => node("steam"), createOscillator: () => node("whistle"),
    createBuffer(channels, length, sampleRate) {
      const data = new Float32Array(length);
      const buffer = { channels, length, sampleRate, getChannelData: () => data };
      this.buffers.push(buffer);
      return buffer;
    },
    async close() { this.state = "closed"; }, async resume() { this.state = "running"; },
  };
}

test("칙칙폭폭은 이동 속도에 맞춰 예약하고 짧은 증기 버퍼 하나를 공유한다", () => {
  const context = fakeAudio();
  const journey = { duration: 3900 };
  const plan = createTrainChuffPlan(journey.duration);
  const stop = scheduleTrainChuffs(context, journey);
  const steam = context.nodes.filter(node => node.kind === "steam");
  assert.equal(steam.length, plan.length);
  assert.equal(context.buffers.length, 1);
  assert.equal(context.buffers[0].length, 9600);
  assert.ok(context.buffers[0].getChannelData().some(value => Math.abs(value) > .1));
  steam.forEach((source, index) => {
    assert.equal(source.buffer, context.buffers[0]);
    assert.ok(Math.abs(source.starts[0] - (3.015 + plan[index].at / 1000)) < 1e-9);
    assert.ok(source.stops[0] > source.starts[0] && source.stops[0] - source.starts[0] < .14);
  });
  assert.equal(context.nodes[0].gain.value, .32);
  stop();
  assert.ok(context.nodes.every(node => node.disconnected));
});

test("반복 재생 때 음원 버퍼를 다시 만들지 않고 예약된 모든 증기를 중단한다", () => {
  const context = fakeAudio();
  const stopFirst = scheduleTrainChuffs(context, { duration: 2285 });
  stopFirst();
  const stopSecond = scheduleTrainChuffs(context, { duration: 4400 });
  assert.equal(context.buffers.length, 1);
  stopSecond();
  stopSecond();
  const sources = context.nodes.filter(node => node.kind === "steam");
  assert.ok(sources.every(node => node.onended === null && node.stops.length === 2));
  assert.ok(context.nodes.every(node => node.disconnected));
});

test("기적 두 번과 주행음이 함께 재생되고 화면 종료 시 둘 다 정리된다", () => {
  const context = fakeAudio();
  const player = createTrainWhistlePlayer(() => context);
  player.prepare();
  assert.equal(player.play({ duration: 3900 }), true);
  assert.equal(context.nodes.filter(node => node.kind === "whistle").length, 6);
  assert.equal(context.nodes.filter(node => node.kind === "steam").length, 16);
  player.dispose();
  assert.equal(context.state, "closed");
  assert.ok(context.nodes.every(node => node.disconnected));
  assert.equal(player.play({ duration: 3900 }), false);
});

test("주행음이 자연 종료되면 연결이 남지 않고 중간 합성 실패도 이동에 전파하지 않는다", () => {
  const context = fakeAudio();
  scheduleTrainChuffs(context, { duration: 3900 });
  context.nodes.filter(node => node.kind === "steam").forEach(node => node.onended());
  assert.ok(context.nodes.every(node => node.disconnected));
  const broken = fakeAudio();
  broken.createBufferSource = () => { throw new Error("audio unavailable"); };
  const player = createTrainWhistlePlayer(() => broken);
  player.prepare();
  assert.equal(player.play({ duration: 3900 }), false);
  assert.ok(broken.nodes.every(node => node.disconnected));
  player.dispose();
});

test("잘못된 주행 시간으로는 오디오 노드를 생성하지 않는다", () => {
  const context = fakeAudio();
  for (const journey of [null, {}, { duration: 0 }, { duration: Infinity }]) scheduleTrainChuffs(context, journey)();
  assert.equal(context.nodes.length, 0);
  assert.equal(context.buffers.length, 0);
});
