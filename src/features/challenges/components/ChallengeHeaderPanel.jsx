// Figma node 307:22 (panel-header, 1660x150) — 배경판 위에 제목/배지/포인트/풀이수를
// 캔버스 1920x1080 기준 % 좌표로 겹쳐 그린다. "POINTS"/"SOLVES" 라벨은 panel-header.png에
// 이미 그려져 있어 값만 겹친다.
//
// node 95:360(ChallengeDetailPage)에서 헤더 배지가 KOTH 전용(KOTH/순위) → 일반
// category/difficulty/solved 로 바뀌었다. category는 README enum(WEB/PWN/REV/CRYPTO/
// FORENSIC/MISC)을 3글자로 축약해 표시한다(시안: FORENSIC → "FOR").
const CATEGORY_SHORT = {
  WEB: "WEB",
  PWN: "PWN",
  REV: "REV",
  CRYPTO: "CRY",
  FORENSIC: "FOR",
  MISC: "MSC",
};

export default function ChallengeHeaderPanel({ challenge }) {
  const { title, category, difficulty, solved, points, solves } = challenge;
  const categoryLabel = CATEGORY_SHORT[category] ?? (category ?? "").slice(0, 3).toUpperCase();

  return (
    <>
      <div
        className="absolute left-[6.77%] top-[12.96%] w-[86.46%] h-[13.89%]"
        aria-hidden="true"
      >
        <img
          src="/assets/challenge-detail/panel-header.png"
          alt=""
          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
        />
      </div>

      {/* leading-[normal]: 시안 텍스트 박스 높이(IM Fell 40px → 51px)는 폰트가 주는
          natural line-height 그대로다. 전역 line-height(1.5)를 그대로 두면 줄 상자가
          60px로 커져 글자가 시안보다 4~5px 내려간다. 아래 값들도 같은 이유. */}
      <h1 className="absolute left-[8.28%] top-[16.61%] font-im-fell text-[2.08cqw] leading-[normal] text-auth-text">
        {title}
      </h1>

      {/* 분야(category) 배지 */}
      <div className="absolute left-[8.28%] top-[21.33%] w-[3.59%] h-[2.96%]">
        <img
          src="/assets/challenge-detail/pill-category.png"
          alt=""
          className="absolute inset-0 w-full h-full object-fill pointer-events-none"
        />
        <span className="absolute inset-0 flex items-center justify-center font-inria-serif text-[0.83cqw] text-detail-muted">
          {categoryLabel}
        </span>
      </div>

      {/* 난이도(difficulty) 배지 */}
      {difficulty && (
        <div className="absolute left-[12.29%] top-[21.33%] w-[4.74%] h-[2.96%]">
          <img
            src="/assets/challenge-detail/pill-difficulty.png"
            alt=""
            className="absolute inset-0 w-full h-full object-fill pointer-events-none"
          />
          <span className="absolute inset-0 flex items-center justify-center font-inria-serif text-[0.83cqw] text-detail-muted">
            {difficulty}
          </span>
        </div>
      )}

      {/* SOLVED 배지 — 우리 팀이 이미 풀었을 때만 */}
      {solved && (
        <div className="absolute left-[17.45%] top-[21.33%] w-[5.31%] h-[2.96%]">
          <img
            src="/assets/challenge-detail/pill-solved.png"
            alt=""
            className="absolute inset-0 w-full h-full object-fill pointer-events-none"
          />
          <span className="absolute inset-0 flex items-center justify-center font-inria-serif text-[0.83cqw] text-detail-solved">
            SOLVED
          </span>
        </div>
      )}

      <p className="absolute left-[78.13%] top-[18.52%] font-kode-mono text-[2.5cqw] leading-[normal] text-detail-points">
        {points}
      </p>

      <p className="absolute left-[86.98%] top-[18.52%] font-kode-mono text-[2.5cqw] leading-[normal] text-auth-text">
        {solves}
      </p>
    </>
  );
}
