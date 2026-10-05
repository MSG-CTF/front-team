import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { formatOpenChallengeNumber } from "../utils/boardOverlays.js";
import { normalizeBoardListView, selectBoardChallenges } from "../utils/boardChallengeList.js";
import { INSTANCE_STATUS_LABEL } from "../../../constants/enums.js";
import styles from "./BoardScreen.module.css";

const useBrowserLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

// Figma node 518:300 "열린 문제" - 주사위판 아래 "열린 문제 목록 보기"를 누르면 보드
// 왼쪽에 뜨는 양피지 세로 패널. 패널/번호 배지/화살표/닫기 버튼은
// Figma 원본 에셋이고, 좌표는 1920x1080 무대 기준 %로 옮겼다(패널 32,179 / 284x814).
// 문제 목록과 라인 완성은 이 패널 안에서 확인하고 문제를 고를 때만 상세로 이동한다.
// 데이터는 GET /board/opened_challenges(연 순서 오름차순).
export function OpenChallengesToggle({ isOpen, count, onToggle, buttonRef }) {
  return (
    <button
      type="button"
      ref={buttonRef}
      onClick={onToggle}
      aria-expanded={isOpen}
      aria-controls="board-open-challenges-panel"
      // 금테 명판 버튼. 주사위판 바로 아래에 붙이고 양끝을 주사위판 테두리(무대 2.45%~19.74%)에 맞춘다.
      // 세로 순서: 주사위판 → 이 버튼 → 주사위 안내 문구 → 보유 찬스카드(ChanceCardSummary).
      // 열린 동안에도 자리를 옮기지 않아 닫을 때 초점이 이 버튼으로 바로 돌아온다.
      className={`${styles.plaqueButton} ${styles.openToggle} absolute left-[2.45%] top-[14.6%] z-30 w-[17.29%]`}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M6 4h9l3 3v13H6z" /><path d="M9 10h6M9 13.5h6M9 17h4" />
      </svg>
      <span>열린 문제 목록 보기</span>
      {count > 0 && <span className={styles.openToggleCount} aria-hidden="true">{count}</span>}
      {count > 0 && <span className="sr-only"> ({count}개)</span>}
    </button>
  );
}

export default function OpenChallengesSidePanel({
  challenges, onSelectChallenge, onClose, children, initialView, onViewChange,
  loading = false, error = "", onRetry, instanceInfo,
}) {
  const closeButton = useRef(null);
  const scrollBody = useRef(null);
  const restored = useRef(false);
  const [view, setView] = useState(() => normalizeBoardListView(initialView));
  const currentView = useRef(view);
  const groups = useMemo(() => selectBoardChallenges(challenges, view, instanceInfo?.instance?.challengeId), [challenges, view, instanceInfo?.instance?.challengeId]);
  const solvedCount = challenges.filter((challenge) => challenge.isSolved).length;
  const activeChallenge = challenges.find((challenge) => challenge.challengeId === instanceInfo?.instance?.challengeId);
  const instanceTitle = activeChallenge?.title || instanceInfo?.instance?.challengeTitle;
  const saveView = (next) => {
    currentView.current = normalizeBoardListView(next);
    onViewChange?.(currentView.current);
    return currentView.current;
  };
  const changeFilter = (change) => {
    setView(saveView({ ...currentView.current, ...change, scrollTop: 0 }));
    if (scrollBody.current) scrollBody.current.scrollTop = 0;
  };
  const select = (challengeId) => onSelectChallenge(challengeId, saveView({ ...currentView.current, scrollTop: scrollBody.current?.scrollTop ?? 0 }));
  useBrowserLayoutEffect(() => {
    if (!loading && !instanceInfo?.loading && scrollBody.current && !restored.current) {
      scrollBody.current.scrollTop = currentView.current.scrollTop;
      restored.current = true;
    }
  }, [loading, instanceInfo?.loading, challenges]);
  useEffect(() => { closeButton.current?.focus({ preventScroll: true }); }, []);
  return (
    <aside
      id="board-open-challenges-panel"
      aria-label="열린 문제"
      onKeyDown={(event) => { if (event.key === "Escape") { event.stopPropagation(); onClose(); } }}
      className={`${styles.openPanel} absolute left-[1.67%] top-[16.57%] z-40 h-[75.37%] w-[14.79%]`}
    >
      <img
        src="/assets/board/open-challenges-panel.webp"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full object-fill"
      />
      {/* 데스크톱은 패널 이미지에 제목이 그려져 있어 모바일에서만 보이는 제목 */}
      <h2 className={styles.mobileOpenTitle}>열린 문제</h2>

      <button
        type="button"
        ref={closeButton}
        onClick={onClose}
        aria-label="열린 문제 패널 닫기"
        className={`${styles.openClose} absolute left-[76.06%] top-[5.41%] h-[2.58%] w-[8.1%] border-0 bg-transparent p-0 hover:brightness-125`}
      >
        <img src="/assets/board/icon-close-round.png" alt="" aria-hidden="true" className="h-full w-full object-contain" />
      </button>

      <div className={styles.openPanelBody} ref={scrollBody}
        onScroll={(event) => { if (restored.current) saveView({ ...currentView.current, scrollTop: event.currentTarget.scrollTop }); }}
        tabIndex={0} role="region" aria-label="열린 문제 목록 스크롤">
      {children}
      <div className={styles.openFilters} role="search" aria-label="열린 문제 검색">
        <label className={styles.openSearch}>
          <span className="sr-only">문제 제목 또는 출제 동아리 검색</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><circle cx="10" cy="10" r="6" /><path d="m15 15 5 5" /></svg>
          <input type="search" placeholder="문제 검색" value={view.query} maxLength={120} onChange={(event) => changeFilter({ query: event.target.value })} />
        </label>
        <div className={styles.openFilterRow}>
          <label><span className="sr-only">문제 분야</span><select value={view.category} onChange={(event) => changeFilter({ category: event.target.value })}>
            <option value="">분야 전체</option>
            {view.category && !groups.categories.includes(view.category) && <option value={view.category}>{view.category}</option>}
            {groups.categories.map((category) => <option key={category} value={category}>{category}</option>)}
          </select></label>
          <label><span className="sr-only">풀이 상태</span><select value={view.status} onChange={(event) => changeFilter({ status: event.target.value })}>
            <option value="all">풀이 전체</option><option value="unsolved">미해결</option><option value="solved">완료</option>
          </select></label>
        </div>
        <p className={styles.openCounts}>미해결 {challenges.length - solvedCount} <span>완료 {solvedCount}</span></p>
      </div>
      {instanceInfo?.loading && !instanceInfo?.instance && <p className={styles.openNotice} role="status">내 인스턴스 확인 중</p>}
      {instanceInfo?.error && <p className={styles.openNotice}>{instanceInfo.error} <button type="button" onClick={instanceInfo.retry}>다시 확인</button></p>}
      {instanceInfo?.instance && <div className={styles.openInstance}>
        <span>내 인스턴스 · {INSTANCE_STATUS_LABEL[instanceInfo.instance.status] || "상태 확인 중"}</span>
        {instanceInfo.instance.challengeId != null ? <button type="button" title={instanceTitle} onClick={() => select(instanceInfo.instance.challengeId)}>{instanceTitle}<span aria-hidden="true"> →</span></button> : <strong>{instanceTitle}</strong>}
      </div>}
      {error && <p className={styles.openNotice} role="alert">{error}<button type="button" disabled={loading} onClick={onRetry}>다시 불러오기</button></p>}
      {loading && <p className={styles.openNotice} role="status">목록 확인 중</p>}
      <ol className={`${styles.openChallengeList} m-0 flex list-none flex-col p-0`}>
        {groups.items.map((challenge) => (
          <li key={challenge.challengeId} className="shrink-0 border-b border-[#844618]">
            <button
              type="button"
              onClick={() => select(challenge.challengeId)}
              aria-label={`${formatOpenChallengeNumber(challenge.openedNumber - 1)}번 ${challenge.title || "문제"}${challenge.isSolved ? ", 해결함" : ""} 상세 보기`}
              className="flex h-[3.26cqw] w-full items-center gap-[0.42cqw] border-0 bg-transparent p-0 text-left hover:bg-[#f6ead2]/60 focus-visible:outline focus-visible:outline-[0.1cqw] focus-visible:outline-[#844618]"
            >
              <span aria-hidden="true" className="relative grid h-[1.51cqw] w-[1.41cqw] shrink-0 place-items-center">
                <img
                  src="/assets/board/open-challenges-badge.png"
                  alt=""
                  // 푼 문제는 같은 배지를 초록 계열로 돌려 구분한다
                  className={`absolute inset-0 h-full w-full object-contain ${challenge.isSolved ? "[filter:hue-rotate(95deg)_saturate(0.8)]" : ""}`}
                />
                <span className="relative font-pretendard text-[0.68cqw] text-white">
                  {challenge.isSolved ? "✓" : formatOpenChallengeNumber(challenge.openedNumber - 1)}
                </span>
              </span>
              <span className="min-w-0 flex-1 pt-[0.05cqw]">
                <strong title={challenge.title} className="block truncate font-pretendard text-[0.68cqw] font-bold leading-normal text-black">
                  {challenge.title || challenge.challengeId}
                </strong>
                <span className="block truncate font-pretendard text-[0.52cqw] leading-normal text-black">
                  {[challenge.category, challenge.isSolved ? "해결" : null].filter(Boolean).join(" · ") || "-"}
                </span>
              </span>
              <img
                src="/assets/board/open-challenges-chevron.png"
                alt=""
                aria-hidden="true"
                className="h-[1.41cqw] w-[1.15cqw] shrink-0 object-contain"
              />
            </button>
          </li>
        ))}
        {!loading && !error && challenges.length === 0 && (
          <li className={`${styles.openEmpty} pt-[1cqw] text-center font-pretendard text-[0.62cqw] leading-relaxed text-[#613d15]`}>
            아직 연 문제가 없습니다.
            <br />
            문제 칸에 도착하면 문제를 골라 열 수 있습니다.
          </li>
        )}
        {!loading && challenges.length > 0 && groups.items.length === 0 && <li className={styles.openNotice}>
          조건에 맞는 문제가 없습니다
          <button type="button" onClick={() => changeFilter({ query: "", category: "", status: "all" })}>전체 보기</button>
        </li>}
      </ol>
      </div>
    </aside>
  );
}
