export function readPaymentQr(value) {
  // QR에는 URL이나 계정 정보 대신 결제 토큰 원문만 들어간다
  return typeof value === "string" && /^pt_[A-Za-z0-9_-]{16,128}$/.test(value)
    ? value
    : null;
}

export function cameraErrorMessage(error) {
  switch (error?.name) {
    case "NotAllowedError":
    case "SecurityError":
      return "카메라 권한이 꺼져 있습니다 브라우저 설정에서 허용하거나 토큰을 직접 입력하세요";
    case "NotFoundError":
    case "DevicesNotFoundError":
      return "사용할 카메라가 없습니다 카메라를 연결하거나 토큰을 직접 입력하세요";
    case "NotReadableError":
    case "TrackStartError":
      return "카메라를 사용할 수 없습니다 다른 앱에서 사용 중인지 확인해주세요";
    case "InsecureContext":
      return "카메라는 HTTPS로 접속해야 사용할 수 있습니다 토큰 직접 입력은 가능합니다";
    case "UnsupportedCamera":
      return "이 브라우저에서는 카메라를 사용할 수 없습니다 다른 브라우저를 사용하거나 토큰을 직접 입력하세요";
    default:
      return "카메라를 시작하지 못했습니다 다시 시도하거나 토큰을 직접 입력하세요";
  }
}

// 노트북 웹캠은 초점이 고정이라 폰을 멀리 들게 되고 화면 속 QR이 작다
// 프레임마다 번갈아 전체 화면은 1280px까지만 줄여 읽고, 가운데 정사각형은 원래 해상도로 읽는다
// 작은 QR은 줄이면 칸이 뭉개지고, 흐린 화면을 키우면 오히려 덜 읽혀서 둘 다 피한다
const FULL_FRAME_MAX = 1280;
const CENTER_FRAME_MAX = 1080;

function browserEnvironment() {
  return {
    secure: globalThis.isSecureContext,
    mediaDevices: globalThis.navigator?.mediaDevices,
    createCanvas: () => document.createElement("canvas"),
    loadDecoder: async () => (await import("jsqr")).default,
    schedule: (callback) => setTimeout(callback, 250),
    cancel: (timer) => clearTimeout(timer),
  };
}

export function startPaymentQrScanner(
  video,
  { onToken, onError, onStatus, onInvalid, facingMode = "environment" },
  environment = browserEnvironment(),
) {
  let stopped = false;
  let stream;
  let timer;
  let decoder;
  let canvas;
  let context;
  let readCenter = false;
  const endListeners = [];

  function stop() {
    stopped = true;
    environment.cancel(timer);
    endListeners.forEach(([track, listener]) =>
      track.removeEventListener("ended", listener),
    );
    endListeners.length = 0;
    stream?.getTracks().forEach((track) => track.stop());
    if (video.srcObject === stream) {
      video.pause();
      video.srcObject = null;
    }
    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
    }
  }

  function fail(error) {
    if (stopped) return;
    stop();
    onError(cameraErrorMessage(error));
  }

  function captureFrame() {
    const width = video.videoWidth;
    const height = video.videoHeight;
    if (readCenter) {
      const side = Math.min(width, height);
      const size = Math.min(side, CENTER_FRAME_MAX);
      canvas.width = size;
      canvas.height = size;
      context.drawImage(
        video,
        (width - side) / 2,
        (height - side) / 2,
        side,
        side,
        0,
        0,
        size,
        size,
      );
    } else {
      const scale = Math.min(1, FULL_FRAME_MAX / Math.max(width, height));
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
    }
    readCenter = !readCenter;
    return context.getImageData(0, 0, canvas.width, canvas.height);
  }

  function scan() {
    if (stopped) return;
    try {
      if (video.readyState >= 2 && video.videoWidth && video.videoHeight) {
        const frame = captureFrame();
        const result = decoder(frame.data, frame.width, frame.height, {
          inversionAttempts: "dontInvert",
        });
        if (result) {
          const token = readPaymentQr(result.data);
          if (token) {
            stop();
            onToken(token);
            return;
          }
          onInvalid("결제용 QR이 아닙니다 참가자 마이페이지의 QR을 보여주세요");
        }
      }
      timer = environment.schedule(scan);
    } catch (error) {
      fail(error);
    }
  }

  const ready = (async () => {
    try {
      if (!environment.secure) throw { name: "InsecureContext" };
      if (!environment.mediaDevices?.getUserMedia)
        throw { name: "UnsupportedCamera" };
      decoder = await environment.loadDecoder();
      if (stopped) return;
      stream = await environment.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });
      // 권한 창이 열린 사이 닫혔으면 늦게 받은 스트림도 즉시 해제한다
      if (stopped) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      video.srcObject = stream;
      for (const track of stream.getVideoTracks()) {
        const listener = () => fail({ name: "NotReadableError" });
        track.addEventListener("ended", listener);
        endListeners.push([track, listener]);
      }
      await video.play();
      if (stopped) return;
      canvas = environment.createCanvas();
      context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("Canvas unavailable");
      onStatus("scanning");
      scan();
    } catch (error) {
      fail(error);
    }
  })();

  return { stop, ready };
}
