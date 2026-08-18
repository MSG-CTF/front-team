// Figma node 104:484 — 위쪽 화살표 벡터(31x43)를 -90deg 회전해 "뒤로가기" 화살표로 씀.
// 위치는 1920x1080 캔버스 기준 inset(top 7.69%, left 2.34%)을 그대로 옮긴 것.
export default function BackButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="뒤로가기"
      className="absolute left-[2.34%] top-[7.69%] w-[2.29%] aspect-[31/43] -rotate-90 p-0 border-0 bg-transparent cursor-pointer"
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
