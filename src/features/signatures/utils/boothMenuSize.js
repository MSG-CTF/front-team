// 메뉴판 아래 제출 칸(112px)과 그 사이 간격(14px)
export const BOOTH_SUBMIT_SPACE = 126;

// 부스 메뉴판 폭: 기본 폭(--menu-max)에서 시작해 넓은 PC 화면에서는 장면 폭에 비례해 키운다
// 3:4 메뉴판과 제출 칸이 화면 높이 안에 들어오는 만큼만 키우고, 화면보다 넓어지지는 않는다
export function boothMenuWidth({ width, height, base, grow = 0, cap = base }) {
  const fit = ((height - BOOTH_SUBMIT_SPACE) * 3) / 4;
  const scaled = Math.min(cap, width * grow, fit);
  return Math.max(0, Math.min(Math.max(base, scaled), width));
}
