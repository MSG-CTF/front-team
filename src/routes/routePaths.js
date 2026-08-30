export const ROUTES = {
  board: "/board",
  challengeDetail: (challengeId) => `/challenges/${encodeURIComponent(challengeId)}`,
  leaderboard: "/leaderboard",
  mypage: "/mypage",
  rules: "/rules",
};
