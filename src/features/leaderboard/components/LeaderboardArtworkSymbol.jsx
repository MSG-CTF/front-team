import { useId } from "react";

// 원본 월계관과 낙엽을 그대로 사용한다 픽셀을 다시 그리지 않고 배경의 종이색만 투명하게 표시한다
export const RANK_ARTWORK = {
  1: [216, 568, 55, 43],
  2: [216, 611, 55, 43],
  3: [216, 655, 55, 43],
};
export const LEAF_ARTWORK = [
  [1331, 195, 32, 32], [1331, 235, 32, 32], [1331, 276, 32, 32],
  [1331, 317, 32, 32], [1331, 359, 32, 32], [1331, 399, 32, 32],
];

export default function LeaderboardArtworkSymbol({ region, className, style }) {
  const ink = useId();
  return <svg viewBox={region.join(" ")} className={className} style={style} aria-hidden="true" focusable="false">
    <defs><filter id={ink} colorInterpolationFilters="sRGB">
      <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  -2 -2 -2 0 4" />
    </filter></defs>
    <image href={`${import.meta.env.BASE_URL}assets/leaderboard/leaderboard.png`} width="1672" height="941" filter={`url(#${ink})`} />
  </svg>;
}
