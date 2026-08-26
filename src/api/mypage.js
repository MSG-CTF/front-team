import apiClient from "./client.js";

export function getMyProfile(config = {}) {
  return apiClient.get("/teams/me", config);
}

export function getMyMileageHistory(config = {}) {
  return apiClient.get("/teams/me/mileage_history", config);
}
