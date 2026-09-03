export const ROUTES = {
  board: "/board",
  challengeDetail: (challengeId) => `/challenges/${encodeURIComponent(challengeId)}`,
  leaderboard: "/leaderboard",
  koth: "/koth",
  mypage: "/mypage",
  rules: "/rules",
};
