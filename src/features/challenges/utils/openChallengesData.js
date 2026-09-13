import { adaptOpenedChallenges } from "../../board/utils/boardData.js";
import { TERMINAL_INSTANCE_STATUSES } from "../../../constants/enums.js";

export function readOpenChallenges(data) {
  if (!Array.isArray(data?.opened_challenges))
    throw new Error("문제 목록 응답을 확인할 수 없습니다");
  const challenges = adaptOpenedChallenges({
    opened_challenges: data.opened_challenges.filter(
      (entry) => entry?.challenge_id != null,
    ),
  }).map((challenge) => ({
    ...challenge,
    title: challenge.title || "제목 없는 문제",
  }));
  return {
    challenges,
    totalCount: challenges.length,
    solvedCount: challenges.filter((challenge) => challenge.isSolved).length,
    totalScore:
      typeof data.total_score === "number" && Number.isFinite(data.total_score)
        ? data.total_score
        : null,
  };
}

export function groupOpenChallenges(
  challenges,
  { query = "", category = "", instanceChallengeId } = {},
) {
  const normalizedQuery = query.trim().toLocaleLowerCase("ko-KR");
  const matches = challenges.filter((challenge) => {
    const text = [challenge.title, challenge.clubName]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase("ko-KR");
    return (
      (!category || challenge.category === category) &&
      (!normalizedQuery || text.includes(normalizedQuery))
    );
  });
  const unsolved = matches.filter((challenge) => !challenge.isSolved);
  const currentIndex = unsolved.findIndex(
    (challenge) => challenge.challengeId === instanceChallengeId,
  );
  if (currentIndex > 0) unsolved.unshift(...unsolved.splice(currentIndex, 1));
  return {
    unsolved,
    solved: matches.filter((challenge) => challenge.isSolved),
    categories: [
      ...new Set(
        challenges.map((challenge) => challenge.category).filter(Boolean),
      ),
    ].sort(),
  };
}

export function readCurrentInstance(data) {
  const instances = Array.isArray(data) ? data : data ? [data] : [];
  const active = instances.find(
    (instance) =>
      instance?.instance_id &&
      !TERMINAL_INSTANCE_STATUSES.includes(instance.status),
  );
  return active
    ? {
        instanceId: active.instance_id,
        challengeId: active.challenge_id,
        challengeTitle: active.challenge_title || "사용 중인 문제",
        status: active.status,
      }
    : null;
}

export function getOpenChallengesError(error) {
  const status = error?.response?.status;
  return {
    message:
      error?.response?.data?.message ||
      error?.message ||
      "열린 문제 목록을 불러오지 못했습니다",
    recoverable: status == null || status >= 500 || status === 429,
  };
}
