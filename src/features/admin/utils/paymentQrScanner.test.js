import test from "node:test";
import assert from "node:assert/strict";
import {
  cameraErrorMessage,
  readPaymentQr,
  startPaymentQrScanner,
} from "./paymentQrScanner.js";

const token = "pt_" + "q".repeat(22);
function setup({ decode = () => null, getMedia } = {}) {
  const state = {
    stopped: 0,
    tokens: [],
    errors: [],
    invalid: [],
    scheduled: [],
    cancelled: [],
    requests: [],
    draws: [],
  };
  const track = {
    stop: () => state.stopped++,
    addEventListener() {},
    removeEventListener() {},
  };
  const stream = { getTracks: () => [track], getVideoTracks: () => [track] };
  const video = {
    srcObject: null,
    readyState: 2,
    videoWidth: 640,
    videoHeight: 480,
    play: async () => {},
    pause() {},
  };
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => ({
      drawImage: (...args) => state.draws.push(args.slice(1)),
      getImageData: (x, y, width, height) => ({
        data: new Uint8ClampedArray(4),
        width,
        height,
      }),
    }),
  };
  const environment = {
    secure: true,
    mediaDevices: {
      getUserMedia: async (options) => {
        state.requests.push(options);
        return getMedia ? getMedia() : stream;
      },
    },
    createCanvas: () => canvas,
    loadDecoder: async () => decode,
    schedule: (callback) => {
      state.scheduled.push(callback);
      return state.scheduled.length;
    },
    cancel: (id) => state.cancelled.push(id),
  };
  const callbacks = {
    onToken: (value) => state.tokens.push(value),
    onError: (value) => state.errors.push(value),
    onStatus() {},
    onInvalid: (value) => state.invalid.push(value),
  };
  return {
    state,
    video,
    stream,
    environment,
    callbacks,
    start: () => startPaymentQrScanner(video, callbacks, environment),
  };
}

test("결제 토큰 원문만 읽고 URL, JSON, 공백과 긴 입력은 거절한다", () => {
  assert.equal(readPaymentQr(token), token);
  for (const value of [
    "https://example.invalid/" + token,
    JSON.stringify({ payment_token: token }),
    " " + token,
    "pt_short",
    "pt_" + "a".repeat(129),
    token + "\n",
    null,
  ])
    assert.equal(readPaymentQr(value), null);
});

test("QR을 읽으면 스트림을 끄고 토큰 한 번만 전달한다", async () => {
  const fixture = setup({ decode: () => ({ data: token }) });
  const scanner = fixture.start();
  await scanner.ready;
  assert.deepEqual(fixture.state.tokens, [token]);
  assert.equal(fixture.state.stopped, 1);
  assert.equal(fixture.video.srcObject, null);
  assert.deepEqual(fixture.state.scheduled, []);
  assert.equal(fixture.state.requests[0].audio, false);
  assert.equal(fixture.state.requests[0].video.facingMode.ideal, "environment");
  assert.equal(fixture.state.requests[0].video.width.ideal, 1920);
  assert.equal(fixture.state.requests[0].video.height.ideal, 1080);
});

function recordFrames(fixture) {
  const frames = [];
  fixture.environment.loadDecoder = async () => (data, width, height) => {
    frames.push([width, height]);
    return null;
  };
  return frames;
}

test("웹캠 화면은 전체를 1280px까지만 줄여 읽고 다음 프레임은 가운데를 원래 해상도로 읽는다", async () => {
  const fixture = setup();
  const frames = recordFrames(fixture);
  fixture.video.videoWidth = 1920;
  fixture.video.videoHeight = 1080;
  const scanner = fixture.start();
  await scanner.ready;
  fixture.state.scheduled.shift()();
  assert.deepEqual(frames, [
    [1280, 720],
    [1080, 1080],
  ]);
  assert.deepEqual(fixture.state.draws[1], [420, 0, 1080, 1080, 0, 0, 1080, 1080]);
  scanner.stop();
});

test("작은 카메라 화면은 키우지 않고 그대로 읽는다", async () => {
  const fixture = setup();
  const frames = recordFrames(fixture);
  const scanner = fixture.start();
  await scanner.ready;
  fixture.state.scheduled.shift()();
  assert.deepEqual(frames, [
    [640, 480],
    [480, 480],
  ]);
  assert.deepEqual(fixture.state.draws[1], [80, 0, 480, 480, 0, 0, 480, 480]);
  scanner.stop();
});

test("다른 QR은 안전한 안내만 표시하고 결제 토큰으로 넘기지 않는다", async () => {
  const fixture = setup({
    decode: () => ({ data: "https://outside.invalid" }),
  });
  const scanner = fixture.start();
  await scanner.ready;
  assert.deepEqual(fixture.state.tokens, []);
  assert.equal(fixture.state.invalid.length, 1);
  assert.doesNotMatch(fixture.state.invalid[0], /outside/);
  scanner.stop();
  fixture.state.scheduled[0]();
  assert.equal(fixture.state.invalid.length, 1);
  assert.equal(fixture.video.srcObject, null);
});

test("권한 창을 닫은 뒤 늦게 받은 스트림도 즉시 종료한다", async () => {
  let resolve;
  const fixture = setup({
    getMedia: () =>
      new Promise((done) => {
        resolve = done;
      }),
  });
  const scanner = fixture.start();
  await Promise.resolve();
  scanner.stop();
  resolve(fixture.stream);
  await scanner.ready;
  assert.equal(fixture.state.stopped, 1);
  assert.equal(fixture.video.srcObject, null);
  assert.deepEqual(fixture.state.tokens, []);
});

test("권한 거부, 미지원과 HTTP 접속을 구분하고 카메라를 남기지 않는다", async () => {
  const denied = setup({
    getMedia: () => {
      throw { name: "NotAllowedError" };
    },
  });
  await denied.start().ready;
  assert.match(denied.state.errors[0], /권한/);
  assert.equal(denied.video.srcObject, null);
  for (const kind of ["insecure", "unsupported"]) {
    const fixture = setup();
    if (kind === "insecure") fixture.environment.secure = false;
    else fixture.environment.mediaDevices = undefined;
    await fixture.start().ready;
    assert.equal(fixture.state.requests.length, 0);
    assert.match(
      fixture.state.errors[0],
      kind === "insecure" ? /HTTPS/ : /브라우저/,
    );
  }
  assert.match(
    cameraErrorMessage({ name: "NotFoundError" }),
    /카메라가 없습니다/,
  );
  assert.match(cameraErrorMessage({ name: "NotReadableError" }), /다른 앱/);
});

test("QR 해석 중 오류가 나도 스트림과 다음 프레임 처리를 정리한다", async () => {
  const fixture = setup({
    decode: () => {
      throw new Error("decoder failure");
    },
  });
  await fixture.start().ready;
  assert.equal(fixture.state.stopped, 1);
  assert.equal(fixture.state.errors.length, 1);
  assert.equal(fixture.state.scheduled.length, 0);
});
