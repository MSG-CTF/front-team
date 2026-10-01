// 통과 경로나 방문 이력으로 금액을 계산하지 않고 지급 응답만 읽는다
export function readConfirmedStartReward(result, token, source = "dice") {
  if (!result || result.pendingConfirm === true || typeof token !== "string" || !token) return null;
  const reward = result.startReward;
  const mileageGained = reward?.mileage_gained;
  const rollGained = reward?.roll_gained;
  if (!Number.isSafeInteger(mileageGained) || mileageGained < 0 ||
      !Number.isSafeInteger(rollGained) || rollGained < 0 || rollGained > 3) return null;
  if (mileageGained === 0 && rollGained === 0) return null;
  if (result.passedStart !== true && result.currentPosition !== 1) return null;
  return {
    token, mileageGained, rollGained,
    kind: result.passedStart === true && source !== "airport" ? "lap" : "start",
  };
}

export function createStartRewardRecorder() {
  const seen = new Set();
  return (result, token, source) => {
    const reward = readConfirmedStartReward(result, token, source);
    if (!reward || seen.has(token)) return null;
    seen.add(token);
    return reward;
  };
}
