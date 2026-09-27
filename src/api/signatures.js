import apiClient from "./client.js";

export function getSignatures(config) {
  return apiClient.get("/signatures", { timeout: 10000, ...config });
}

export function getSignature(signatureId, config) {
  return apiClient.get(`/signatures/${encodeURIComponent(signatureId)}`, {
    timeout: 10000,
    ...config,
  });
}

export function submitSignatureFlag(signatureId, { flag }, config) {
  return apiClient.post(
    `/signatures/${encodeURIComponent(signatureId)}/submit`,
    { flag },
    { timeout: 15000, ...config },
  );
}
