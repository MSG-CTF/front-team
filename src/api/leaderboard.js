import apiClient from "./client.js";

export function getLeaderboard() {
  return apiClient.get("/leaderboard");
}

export function getRankings({ page = 1, size = 6 } = {}) {
  return apiClient.get("/ranking", {
    params: { page, size },
  });
}
