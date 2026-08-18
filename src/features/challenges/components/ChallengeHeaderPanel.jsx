// Figma node 104:461 그룹 (panel-header) — 배경판 위에 제목/배지/포인트/풀이수를
// 절대 좌표(1920x1080 캔버스 기준 %)로 겹쳐 그린다.
//
// 시안 레이어 이름은 "문제분야"/"난이도"지만 실제 내용은 일반 category/difficulty가
// 아니라 "킹힐"(=King of the Hill, KOTH) 전용 배지다: 첫 번째 pill은 이 문제가 KOTH
// 문제임을 나타내는 "KOTH" 고정 라벨, 두 번째 pill은 우리 팀의 현재 KOTH 순위
// (README.md "9. KOTH 페이지" — 누적합산방식 랭킹)다. 일반(비 KOTH) 문제의
// category/difficulty 배지 디자인은 아직 Figma에 없어서 별도로 받아야 함.
export default function ChallengeHeaderPanel({ challenge }) {
  const { title, isKoth, kothRank, solved, points, solves } = challenge;

  return (
    <>
      <div
        className="absolute left-[6.77%] top-[17.59%] w-[86.46%] h-[13.89%]"
        aria-hidden="true"
      >
        <img
          src="/assets/challenge-detail/panel-header.png"
          alt=""
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        />
      </div>

      <h1 className="absolute left-[8.85%] top-[21.20%] font-im-fell text-[2.08cqw] text-auth-text">
        {title}
      </h1>

      {/* KOTH 문제 배지 — 킹힐(King of the Hill) 문제일 때만 표시 */}
      {isKoth && (
        <div className="absolute left-[8.85%] top-[25.93%] w-[3.59%] h-[2.96%]">
          <img
            src="/assets/challenge-detail/pill-category.png"
            alt=""
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          />
          <span className="absolute inset-0 flex items-center justify-center font-inria-serif text-[0.83cqw] text-detail-muted">
            KOTH
          </span>
        </div>
      )}

      {/* 현재 KOTH 순위 (예: "1st") — KOTH 문제일 때만 의미가 있음 */}
      {isKoth && kothRank && (
        <div className="absolute left-[12.86%] top-[25.93%] w-[4.74%] h-[2.96%]">
          <img
            src="/assets/challenge-detail/pill-rank.png"
            alt=""
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          />
          <span className="absolute inset-0 flex items-center justify-center font-inria-serif text-[0.83cqw] text-detail-muted">
            {kothRank}
          </span>
        </div>
      )}

      {/* SOLVED 배지 — 우리 팀이 이미 풀었을 때만 표시 */}
      {solved && (
        <div className="absolute left-[18.02%] top-[25.93%] w-[5.31%] h-[2.96%]">
          <img
            src="/assets/challenge-detail/pill-solved.png"
            alt=""
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          />
          <span className="absolute inset-0 flex items-center justify-center font-inria-serif text-[0.83cqw] text-detail-solved">
            SOLVED
          </span>
        </div>
      )}

      {/* "POINTS" / "SOLVES" 라벨은 panel-header.png 배경에 이미 그려져 있음 — 값만 겹쳐 그린다. */}
      <p className="absolute left-[76.35%] top-[23.15%] font-kode-mono text-[2.5cqw] text-detail-points">
        {points}
      </p>

      <p className="absolute left-[87.03%] top-[23.15%] font-kode-mono text-[2.5cqw] text-auth-text">
        {solves}
      </p>
    </>
  );
}
