import styles from "./LoginScreen.module.css";

const PLATE_SRC = `${import.meta.env.BASE_URL}assets/login/login-card-plate.webp`;
const BOTTOM_PLATE_ID = "login-plate-bottom";

// 원본의 모서리와 장식은 그대로 두고, 빈 양피지만 입력 영역에 맞춰 늘린다
const FRAME_SLICES = [
  [780, 24, 220, 300], [1000, 24, 1840, 300], [2840, 24, 220, 300],
  [780, 324, 220, 1356], null, [2840, 324, 220, 1356],
  [780, 1680, 220, 416], [1000, 1680, 1840, 416], [2840, 1680, 220, 416],
];
const BOTTOM_MIDDLE = 7;

function ArtworkSlice({ rect, className, imageId, children }) {
  return (
    <svg className={className} viewBox={rect.join(" ")} preserveAspectRatio="none" focusable="false">
      <image href={PLATE_SRC} id={imageId} width="3840" height="2160" />
      {children}
    </svg>
  );
}

// 아래 가운데 조각에 남은 원본 버튼 홈의 아래 테두리와 지운 글자 자국만 같은 줄의 깨끗한 종이로 덮는다
// 좌표는 모두 원본 판 기준이라 조각 크기가 바뀌어도 구분선과 테두리 위치는 그대로다
function BottomPaperPatch() {
  const plate = `#${BOTTOM_PLATE_ID}`;
  return (
    <>
      <defs>
        {/* 버튼 홈 아래 테두리(1680~1712)는 34px 아래 빈 종이로 덮고 1708~1718에서 원본으로 넘긴다 */}
        <linearGradient id="login-patch-slot-fade" x2="0" y2="1">
          <stop offset="0.74" stopColor="#fff" />
          <stop offset="1" stopColor="#000" />
        </linearGradient>
        <mask id="login-patch-slot" maskUnits="userSpaceOnUse" x="1000" y="1680" width="1840" height="38">
          <rect x="1000" y="1680" width="1840" height="38" fill="url(#login-patch-slot-fade)" />
        </mask>
        {/* 글자 자국 오른쪽의 깨끗한 열 2320~2430을 좌우로 번갈아 뒤집어 이어 붙인다 */}
        <clipPath id="login-patch-mirror-half">
          <rect x="110" width="110" height="2160" />
        </clipPath>
        <pattern id="login-patch-paper" patternUnits="userSpaceOnUse" x="2320" width="220" height="2160">
          <use href={plate} x="-2320" />
          <g clipPath="url(#login-patch-mirror-half)">
            <use href={plate} transform="matrix(-1 0 0 1 2540 0)" />
          </g>
        </pattern>
        {/* 덮는 범위는 1440~2320, 1838~1990이고 왼쪽 50px와 위아래 끝은 서서히 원본으로 넘긴다 */}
        <linearGradient id="login-patch-ghost-fade-y" x2="0" y2="1">
          <stop offset="0" stopColor="#000" />
          <stop offset="0.08" stopColor="#fff" />
          <stop offset="0.816" stopColor="#fff" />
          <stop offset="1" stopColor="#000" />
        </linearGradient>
        <linearGradient id="login-patch-ghost-fade-x">
          <stop offset="0" stopColor="#000" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </linearGradient>
        <mask id="login-patch-ghost" maskUnits="userSpaceOnUse" x="1440" y="1838" width="880" height="152">
          <rect x="1440" y="1838" width="880" height="152" fill="url(#login-patch-ghost-fade-y)" />
          <rect x="1440" y="1838" width="50" height="152" fill="url(#login-patch-ghost-fade-x)" />
        </mask>
      </defs>
      <g mask="url(#login-patch-slot)">
        <use href={plate} y="-34" />
      </g>
      <rect
        x="1440"
        y="1838"
        width="880"
        height="152"
        fill="url(#login-patch-paper)"
        mask="url(#login-patch-ghost)"
      />
    </>
  );
}

export function LoginFrameArtwork() {
  return (
    <div className={styles.frameArtwork} aria-hidden="true" data-login-artwork="frame">
      <div className={styles.framePaper}>
        <ArtworkSlice rect={[1000, 350, 1800, 520]} />
      </div>
      {FRAME_SLICES.map((rect, index) => rect ? (
        index === BOTTOM_MIDDLE ? (
          <ArtworkSlice key={index} rect={rect} className={styles[`frameSlice${index}`]} imageId={BOTTOM_PLATE_ID}>
            <BottomPaperPatch />
          </ArtworkSlice>
        ) : (
          <ArtworkSlice key={index} rect={rect} className={styles[`frameSlice${index}`]} />
        )
      ) : <span key={index} />)}
    </div>
  );
}

export function LoginFieldArtwork({ password = false }) {
  const y = password ? 1132 : 898;
  return (
    <div className={styles.fieldArtwork} aria-hidden="true" data-login-artwork="field">
      {[[1060, y, 190, 180], [1250, y, 1430, 180], [2680, y, 100, 180]].map((rect, index) => (
        <ArtworkSlice key={index} rect={rect} />
      ))}
    </div>
  );
}
