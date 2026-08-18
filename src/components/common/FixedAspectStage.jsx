// 배경(backdropSrc)과 프레임 컴포넌트(children)를 완전히 분리한다.
//
// - 배경: 뷰포트 뒤에 깔리는 장식용 그림. object-cover로 화면 비율에 맞춰
//   자유롭게 잘리며, 블러/확대 같은 보정 없이 있는 그대로 뷰포트를 반응형으로
//   꽉 채운다.
// - 프레임 컴포넌트(로그인 카드, KOTH 문제 패널 등): 배경과 별개로, 항상 정확한
//   16:9 비율의 무대 위에서 그 자체로 반응형이다 — width/height를 CSS min()으로
//   서로 억제해 창이 어떤 비율이어도 내부 %/cqw 좌표가 서로 어긋나지 않는다.
//
// 주의: 배경 그림 안에 카드 테두리가 같이 그려져 있는 경우(bg-1920x1080.png 등),
// 그 그림을 무대 안에 또 한 번 선명하게 겹치지 말 것
// — 배경(자유 반응형)과 무대(고정 16:9) 두 레이어는 서로 다른 비율로 축소되므로
// 같은 카드 그림을 양쪽에 겹치면 두 겹으로 보인다. 카드/패널의 실제 모양은
// 무대 안 프레임 컴포넌트(children)가 각자의 에셋으로 그린다.
export default function FixedAspectStage({ backdropSrc, children, className = "" }) {
  return (
    <div className="fixed inset-0 overflow-hidden">
      <img
        src={backdropSrc}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
      />
      <div
        className={`absolute left-1/2 top-1/2 w-[min(100vw,177.78vh)] h-[min(100vh,56.25vw)] -translate-x-1/2 -translate-y-1/2 @container ${className}`}
      >
        {children}
      </div>
    </div>
  );
}
