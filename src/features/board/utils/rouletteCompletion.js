// 방문한 칸이라는 정보만으로 지급을 추정하지 않고 서버의 지급 내역을 확인한다
export function findRouletteReceipt(data, cellIndex) {
  if (!Number.isInteger(cellIndex) || cellIndex < 1 || cellIndex > 36 || !Array.isArray(data?.history)) return null;
  const receipt = data.history.find((row) => row?.type === "ROULETTE" &&
    row.reason === `ROULETTE_CELL:${cellIndex}` && [50, 100, 150, 200].includes(row.amount));
  if (!receipt) return null;
  return {
    label: `마일리지 ${receipt.amount}`,
    mileageGained: receipt.amount,
    totalMileage: Number.isSafeInteger(data.mileage) ? data.mileage : null,
    restored: true,
  };
}
