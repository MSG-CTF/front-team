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
      drawImage() {},
      getImageData: () => ({
        data: new Uint8ClampedArray(4),
        width: 1,
        height: 1,
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
