import apiClient from "./client.js";

export const FILE_DOWNLOAD_IDLE_TIMEOUT_MS = 90000;

// 큰 파일은 전송이 계속되는 동안 기다리고, 데이터가 멈춘 요청만 취소한다
export async function downloadFile(path, { signal, onDownloadProgress, params } = {}) {
  const controller = new AbortController();
  let idleTimer;
  let loaded = 0;
  let stalled = false;
  let settled = false;

  const clearIdleTimer = () => clearTimeout(idleTimer);
  const resetIdleTimer = () => {
    clearIdleTimer();
    idleTimer = setTimeout(() => {
      stalled = true;
      controller.abort();
    }, FILE_DOWNLOAD_IDLE_TIMEOUT_MS);
  };
  const cancel = () => {
    clearIdleTimer();
    controller.abort(signal?.reason);
  };

  if (signal?.aborted) cancel();
  else {
    signal?.addEventListener("abort", cancel, { once: true });
    resetIdleTimer();
  }

  try {
    return await apiClient.get(path, {
      responseType: "blob",
      timeout: 0,
      signal: controller.signal,
      params,
      onDownloadProgress(event) {
        if (settled || controller.signal.aborted) return;
        // 인증 갱신 후 재전송하면 받은 바이트 수가 처음부터 다시 올라간다
        if (Number.isFinite(event.loaded) && event.loaded > 0 && event.loaded !== loaded) {
          loaded = event.loaded;
          resetIdleTimer();
        }
        onDownloadProgress?.(event);
      },
    });
  } catch (error) {
    if (stalled) {
      const failure = new Error("한동안 파일 데이터를 받지 못했습니다 연결을 확인한 뒤 다시 받아주세요");
      failure.code = "DOWNLOAD_STALLED";
      throw failure;
    }
    throw error;
  } finally {
    settled = true;
    clearIdleTimer();
    signal?.removeEventListener("abort", cancel);
  }
}
