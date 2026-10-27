import { createAdminIdempotencyKey, createAdminImagePreparation, getAdminImagePreparation, getAdminImagePreparations } from "../../../api/admin.js";
import { isSuccess } from "../../../utils/response.js";

// Retain only the pending command key, never authentication or image credentials.
const pendingKeys = new Map();

function storedKey(scope, value) {
  try {
    if (value === undefined) return globalThis.sessionStorage?.getItem(scope) || pendingKeys.get(scope);
    if (value === null) globalThis.sessionStorage?.removeItem(scope);
    else globalThis.sessionStorage?.setItem(scope, value);
  } catch { /* Browser storage can be unavailable; retain the key for this page. */ }
  if (value === undefined) return pendingKeys.get(scope);
  if (value === null) pendingKeys.delete(scope); else pendingKeys.set(scope, value);
  return value;
}

export function imagePreparationDisabledReason(release) {
  if (!release?.is_deployable) return "실행 가능한 배포 버전을 먼저 선택해주세요";
  if (release.runtime_type !== "KUBERNETES" || !["AMD64", "ARM64"].includes(release.architecture)
    || !["WEB", "PWN"].includes(release.isolation_profile)) return "Linux K3s AMD64·ARM64의 WEB·PWN 버전만 이미지 준비를 지원합니다";
  return "";
}

function requestError(failure) {
  const code = failure.response?.data?.code ?? failure.apiCode;
  const messages = {
    IMAGE_PREPARATION_DISABLED: "이미지 준비 기능이 비활성화되어 있습니다 Backend 설정을 확인해주세요",
    IMAGE_PREPARATION_CONFIG_INVALID: "이미지 준비 Backend 설정을 확인해주세요",
    RELEASE_NOT_APPROVED: "아직 승인되지 않은 버전입니다 승인 상태를 확인해주세요",
    IMAGE_PREPARATION_UNSUPPORTED_RELEASE: "이 배포 버전은 이미지 준비를 지원하지 않습니다",
    IMAGE_PREPARATION_NOT_FOUND: "이미지 준비 요청을 찾지 못했습니다 기존 요청 ID와 이력을 확인해주세요",
    RELEASE_NOT_FOUND: "배포 버전을 찾지 못했습니다 배포 설정을 새로고침해주세요",
    IDEMPOTENCY_KEY_CONFLICT: "동일 요청이 처리 중이거나 요청 키가 충돌했습니다 이력을 확인하고 같은 요청으로 다시 확인해주세요",
  };
  if (messages[code]) return messages[code];
  if ([404, 405, 501].includes(failure.response?.status)) return "이미지 준비 API를 사용할 수 없습니다 Backend 배포 상태를 확인해주세요";
  if ([401, 403].includes(failure.response?.status)) return "관리자 인증과 이미지 준비 API 접근 권한을 확인해주세요";
  return "요청 결과를 확인하지 못했습니다 이력을 새로고침하고 같은 요청으로 다시 확인해주세요";
}

function responseData(response) {
  if (!isSuccess(response.data)) throw Object.assign(new Error("이미지 준비 요청 실패"), { apiCode: response.data?.code });
  return response.data.data;
}

function validRecord(row, releaseId, requestId) {
  return row && typeof row.request_id === "string" && row.request_id.length > 0 && row.release_id === releaseId
    && (!requestId || row.request_id === requestId) && typeof row.delivery_status === "string"
    && (row.operation_status === null || typeof row.operation_status === "string")
    && row.readiness_semantics === "HISTORICAL_OPERATION_ONLY";
}

function historyState(data, releaseId, page) {
  if (!Array.isArray(data?.results) || !data.results.every((row) => validRecord(row, releaseId))
    || !Number.isInteger(data.count) || data.count < 0 || data.page !== page || data.page_size !== 20) throw new Error("Invalid preparation history");
  return { records: data.results, count: data.count, page: data.page, pageSize: data.page_size, loaded: true };
}

export function createImagePreparationController({ challengeId, releaseId, onChange }) {
  const scope = `msgctf:image-preparation:${encodeURIComponent(challengeId)}:${encodeURIComponent(releaseId)}`;
  let state = { records: [], detail: null, page: 1, count: 0, pageSize: 20, loading: false, submitting: false,
    loaded: false, error: "", notice: "", ambiguous: Boolean(storedKey(scope)) };
  let disposed = false;
  let generation = 0;
  let reading = null;
  let sending = null;
  const update = (patch) => { if (!disposed) { state = { ...state, ...patch }; onChange?.(state); } };

  async function read(action, accept) {
    if (disposed || state.submitting) return;
    reading?.abort();
    const controller = new AbortController();
    reading = controller;
    const current = ++generation;
    update({ loading: true, error: "" });
    try {
      const data = responseData(await action({ signal: controller.signal }));
      if (!disposed && generation === current) accept(data);
    } catch (failure) {
      if (!disposed && generation === current) update({ error: requestError(failure) });
    } finally {
      if (!disposed && generation === current) update({ loading: false });
    }
  }

  return {
    getState: () => state,
    load(page = 1) {
      return read((config) => getAdminImagePreparations(challengeId, releaseId, page, config), (data) => {
        update(historyState(data, releaseId, page));
      });
    },
    view(requestId) {
      return read((config) => getAdminImagePreparation(challengeId, requestId, config), (data) => {
        if (!validRecord(data, releaseId, requestId)) throw new Error("Invalid preparation detail");
        update({ detail: data, records: state.records.map((row) => row.request_id === requestId ? data : row) });
      });
    },
    async submit() {
      if (disposed || state.submitting) return;
      // This synchronous state change prevents a second click before React renders.
      update({ submitting: true, error: "", notice: "" });
      generation += 1;
      reading?.abort();
      update({ loading: false });
      const key = storedKey(scope) || storedKey(scope, createAdminIdempotencyKey("image-preparation"));
      sending = new AbortController();
      try {
        const data = responseData(await createAdminImagePreparation(challengeId, releaseId, key, { signal: sending.signal }));
        if (!validRecord(data, releaseId)) throw new Error("Invalid preparation acknowledgement");
        storedKey(scope, null);
        update({ detail: data, ambiguous: false,
          notice: "이미지 준비 요청이 접수됐습니다 상태 새로고침으로 처리 결과를 확인해주세요" });
        // A replayed acknowledgement may already be included in any history page.
        // Always obtain the canonical count; never add one locally.
        if (!disposed) {
          update({ loading: true });
          try {
            const canonical = responseData(await getAdminImagePreparations(challengeId, releaseId, state.page, { signal: sending.signal }));
            update({ ...historyState(canonical, releaseId, state.page),
              detail: canonical.results.find((row) => row.request_id === data.request_id) ?? data });
          } catch {
            update({ error: "요청은 접수됐지만 최신 이력을 조회하지 못했습니다 이력을 새로고침해주세요" });
          } finally { update({ loading: false }); }
        }
      } catch (failure) {
        const code = failure.response?.data?.code ?? failure.apiCode;
        // Backend also stores explicit configuration rejections (503) by key.
        // A 409 key conflict may mean the original command is still processing.
        const definite = code !== "IDEMPOTENCY_KEY_CONFLICT" && Boolean(failure.apiCode
          || ["IMAGE_PREPARATION_DISABLED", "IMAGE_PREPARATION_CONFIG_INVALID"].includes(code)
          || (failure.response && failure.response.status < 500));
        if (definite) storedKey(scope, null);
        update({ error: requestError(failure), ambiguous: !definite });
      } finally {
        sending = null;
        update({ submitting: false });
      }
    },
    dispose() {
      disposed = true;
      generation += 1;
      reading?.abort();
      sending?.abort();
    },
  };
}
