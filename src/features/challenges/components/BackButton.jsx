// Figma node 193:87 — 화살표 벡터를 -90deg 회전해 "뒤로가기" 화살표로 씀.
// 위치는 캔버스 1920x1080 기준 inset(top 2.78%, left 1.77%).
export default function BackButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="뒤로가기"
      className="absolute left-[1.77%] top-[2.78%] w-[2.24%] aspect-[43/29] -rotate-90 p-0 border-0 bg-transparent cursor-pointer"
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
