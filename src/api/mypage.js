import apiClient from "./client.js";

export function getMyProfile(config = {}) {
  return apiClient.get("/teams/me", config);
}

export function getMyMileageHistory(config = {}) {
  return apiClient.get("/teams/me/mileage_history", config);
}

export function issueMyQrToken(config = {}) {
  return apiClient.post("/teams/me/qr_token", undefined, config);
}
