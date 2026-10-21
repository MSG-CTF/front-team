import { isSuccess } from "./response.js";

export function mapApiResource(result, mapper) {
  const envelope = result?.status === "fulfilled" ? result.value?.data : null;
  try {
    if (!isSuccess(envelope)) throw new Error("조회 실패");
    const data = envelope.data == null ? null : mapper(envelope.data);
    return { status: data == null || (Array.isArray(data) && !data.length) ? "empty" : "success", data, error: false };
  } catch {
    return { status: "error", data: null, error: true };
  }
}

export function keepPreviousResource(resource) {
  return { ...resource, status: ["success", "empty"].includes(resource.status) ? resource.status : "error", error: true };
}

export function scoresMatch(left, right) {
  return Number.isFinite(left) && Number.isFinite(right) && Math.abs(left - right) < 0.000001;
}
