import { groupOpenChallenges } from "../../challenges/utils/openChallengesData.js";

export function normalizeBoardListView(value) {
  return {
    query: typeof value?.query === "string" ? value.query.slice(0, 120) : "",
    category: typeof value?.category === "string" ? value.category.slice(0, 40) : "",
    status: ["all", "unsolved", "solved"].includes(value?.status) ? value.status : "all",
    scrollTop: Number.isFinite(value?.scrollTop) ? Math.max(0, Math.min(value.scrollTop, 100000)) : 0,
  };
}

export function selectBoardChallenges(challenges, view, instanceChallengeId) {
  const filters = normalizeBoardListView(view);
  const groups = groupOpenChallenges(challenges, { ...filters, instanceChallengeId });
  const items = filters.status === "solved" ? groups.solved
    : filters.status === "unsolved" ? groups.unsolved : [...groups.unsolved, ...groups.solved];
  const numbers = new Map(challenges.map((challenge, index) => [challenge.challengeId, index + 1]));
  return { ...groups, items: items.map((challenge) => ({ ...challenge, openedNumber: numbers.get(challenge.challengeId) })) };
}
