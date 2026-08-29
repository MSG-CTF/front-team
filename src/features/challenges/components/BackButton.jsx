// Figma node 193:87 — icon-back.svg는 "위" 방향 화살표(28.3693x43)이고, 시안은 이걸
// -90deg 회전해 왼쪽 화살표로 쓴다. 회전 후 캔버스 1920x1080 기준 최종 위치는
// left 34, top 58.37, 43x28.37.
//
// 주의: %/aspect는 "회전 전" 박스에 걸린다. 회전 전 박스는 28.3693x43 이고,
// 회전은 박스 중심을 축으로 하므로 중심을 (34 + 43/2, 58.37 + 28.37/2) = (55.5, 72.56)에
// 맞춰야 한다 → left = (55.5 - 28.3693/2)/1920, top = (72.56 - 43/2)/1080.
// (이전 값은 회전 전 박스를 43x29로 잡아 가로/세로가 뒤바뀌어 있었다.)
export default function BackButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="뒤로가기"
      className="absolute left-[2.152%] top-[4.727%] w-[1.4776%] aspect-[28.3693/43] -rotate-90 p-0 border-0 bg-transparent cursor-pointer"
    >
      <img
        src="/assets/challenge-detail/icon-back.svg"
        alt=""
        aria-hidden="true"
        className="block w-full h-full"
      />
      <span className="sr-only">뒤로가기</span>
    </button>
  );
}
