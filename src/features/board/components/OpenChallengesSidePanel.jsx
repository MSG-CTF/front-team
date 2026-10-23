import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import useMobileBoardOverlay from "../hooks/useMobileBoardOverlay.js";
import { formatOpenChallengeNumber } from "../utils/boardOverlays.js";
import { normalizeBoardListView, selectBoardChallenges } from "../utils/boardChallengeList.js";
import { INSTANCE_STATUS_LABEL } from "../../../constants/enums.js";
import styles from "./BoardScreen.module.css";

const useBrowserLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

// Figma node 518:300 "열린 문제" - 주사위판 아래 "열린 문제 목록 보기"를 누르면 보드
// 왼쪽에 뜨는 양피지 세로 패널. 닫기 버튼과 종이는 Figma 원본 그림에서 가져왔다.
// 데스크톱에서는 좌상단 통합 패널 아래에 같은 폭으로 이어 붙고 화면 아래 여백선까지 채운다.
// 종이(open-challenges-paper)는 네 변 테두리를 9분할로 늘려 폭이 달라도 테두리가 찌그러지지 않는다.
// 휴대폰에서는 같은 패널을 시트로 띄운다. 제목 줄 아래에서 문제 목록과 라인 독점을 탭으로 나눠
// 한 번에 하나만 보인다. 문제를 고를 때만 상세로 이동한다. 데이터는 GET /board/opened_challenges(연 순서 오름차순).
// placement="panel"은 데스크톱 좌상단 통합 패널 안의 버튼, 기본값은 모바일 도구줄의 버튼이다.
// 두 버튼은 CSS로 화면 크기에 따라 한쪽만 보인다.
export function OpenChallengesToggle({ isOpen, count, onToggle, buttonRef, placement = "tools" }) {
  return (
    <button
      type="button"
      ref={buttonRef}
      onClick={onToggle}
      aria-expanded={isOpen}
      aria-controls="board-open-challenges-panel"
      // 열린 동안에도 자리를 옮기지 않아 닫을 때 초점이 이 버튼으로 바로 돌아온다.
      className={placement === "panel"
        ? `${styles.plaqueButton} ${styles.panelToggle}`
        : `${styles.plateFrame} ${styles.plaqueButton} ${styles.openToggle}`}
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

function Chevron() {
  return (
    <svg className={styles.openRowChevron} viewBox="0 0 9 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m1.5 3 6 5-6 5" />
    </svg>
  );
}

// 내 인스턴스 표시는 작은 점과 상태 글자만 둔다 실행 중이면 초록, 준비나 재시작 중이면 갈색
function InstanceMark({ running, label }) {
  return <span className={styles.openLive} data-tone={running ? "running" : "busy"}><i aria-hidden="true" />{label}</span>;
}

// 라인 독점 탭은 children(BoardLineSummary)이 있을 때만 생긴다
// 어느 탭을 볼지는 보드에서 라인을 눌러도 열 수 있게 BoardScreen 이 정한다
export default function OpenChallengesSidePanel({
  challenges, onSelectChallenge, onClose, children, initialView, onViewChange,
  loading = false, error = "", onRetry, instanceInfo,
  lineCount = "", showLines = false, onShowLinesChange, linesTabRef,
}) {
  const panelRef = useRef(null);
  const isMobile = useMobileBoardOverlay(panelRef);
  const closeButton = useRef(null);
  const scrollBody = useRef(null);
  const restored = useRef(false);
  const restoreTarget = useRef(null);
  const problemsTab = useRef(null);
  const linesTab = useRef(null);
  const tabId = useId();
  const [view, setView] = useState(() => normalizeBoardListView(initialView));
  const currentView = useRef(view);
  const instance = instanceInfo?.instance;
  const groups = useMemo(() => selectBoardChallenges(challenges, view, instance?.challengeId), [challenges, view, instance?.challengeId]);
  const solvedCount = challenges.filter((challenge) => challenge.isSolved).length;
  const statusTabs = [["all", "전체", challenges.length], ["unsolved", "미해결", challenges.length - solvedCount], ["solved", "완료", solvedCount]];
  const activeChallenge = challenges.find((challenge) => challenge.challengeId === instance?.challengeId);
  const instanceTitle = activeChallenge?.title || instance?.challengeTitle;
  // RUNNING 은 README 에서 참가자 문구 대신 접속 정보를 보이는 상태라 패널에서는 "실행 중"으로 쓴다
  const instanceRunning = instance?.status === "RUNNING";
  const instanceLabel = instanceRunning ? "실행 중" : INSTANCE_STATUS_LABEL[instance?.status] || "상태 확인 중";
  // 실행 중인 문제가 목록에 보이면 그 줄에만 표시하고, 검색이나 필터로 가려졌을 때만 따로 띄운다
  const instanceInList = instance?.challengeId != null && groups.items.some((challenge) => challenge.challengeId === instance.challengeId);
  const hasTabs = Boolean(children);
  const linesVisible = hasTabs && showLines;
  const firstSolved = view.status === "all" && groups.unsolved.length > 0 ? groups.items.find((challenge) => challenge.isSolved) : null;
  const saveView = (next) => {
    currentView.current = normalizeBoardListView(next);
    onViewChange?.(currentView.current);
    return currentView.current;
  };
  const changeFilter = (change) => {
    restoreTarget.current = null;
    setView(saveView({ ...currentView.current, ...change, scrollTop: 0 }));
    if (scrollBody.current) scrollBody.current.scrollTop = 0;
  };
  const select = (challengeId) => onSelectChallenge(challengeId, saveView({ ...currentView.current, scrollTop: scrollBody.current?.scrollTop ?? 0 }));
  const switchTab = (lines, focus) => {
    onShowLinesChange?.(lines);
    if (focus) (lines ? linesTab : problemsTab).current?.focus();
  };
  // 탭 두 개는 좌우 화살표로 오가고 Home, End 로 처음과 끝을 고른다
  const moveTab = (event) => {
    const next = { ArrowLeft: !linesVisible, ArrowRight: !linesVisible, Home: false, End: true }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    switchTab(next, true);
  };
  const setLinesTab = (node) => {
    linesTab.current = node;
    if (linesTabRef) linesTabRef.current = node;
  };
  // 목록 스크롤은 문제 탭으로 돌아올 때마다 마지막 위치로 되돌린다
  useBrowserLayoutEffect(() => {
    if (linesVisible) {
      restored.current = false;
      return;
    }
    if (!loading && !instanceInfo?.loading && scrollBody.current && !restored.current) {
      scrollBody.current.scrollTop = currentView.current.scrollTop;
      restored.current = true;
      restoreTarget.current = { top: currentView.current.scrollTop, until: Date.now() + 3000 };
    }
  }, [loading, instanceInfo?.loading, challenges, linesVisible]);
  // 보드 응답이 늦어 탭이 나중에 붙으면 목록 높이가 바뀐다 사용자가 목록을 만지거나 필터를 바꾸기 전까지는 같은 위치로 다시 맞춘다
  useBrowserLayoutEffect(() => {
    const body = scrollBody.current;
    if (linesVisible || !body || typeof ResizeObserver === "undefined") return undefined;
    const forget = () => { restoreTarget.current = null; };
    const observer = new ResizeObserver(() => {
      const target = restoreTarget.current;
      if (target && Date.now() < target.until) body.scrollTop = target.top;
    });
    const events = ["pointerdown", "wheel", "touchstart", "keydown"];
    observer.observe(body);
    events.forEach((name) => body.addEventListener(name, forget, { passive: true }));
    return () => {
      observer.disconnect();
      events.forEach((name) => body.removeEventListener(name, forget));
    };
  }, [linesVisible]);
  useBrowserLayoutEffect(() => { closeButton.current?.focus({ preventScroll: true }); }, []);
  const tabPanel = (tab) => hasTabs
    ? { id: `${tabId}-panel`, role: "tabpanel", "aria-labelledby": `${tabId}-${tab}` }
    : { role: "region", "aria-label": "열린 문제 목록 스크롤" };
  const panel = (
    <aside
      ref={panelRef}
      role={isMobile ? "dialog" : undefined}
      aria-modal={isMobile ? true : undefined}
      id="board-open-challenges-panel"
      aria-label="열린 문제"
      onKeyDown={(event) => { if (event.key === "Escape") { event.stopPropagation(); onClose(); } }}
      className={`${styles.openPanel} absolute z-40`}
    >
      <div className={styles.openPanelHeader}>
        <h2 className={styles.openTitle}>열린 문제</h2>
        {/* 데스크톱과 휴대폰 모두 제목 오른쪽에 닫기를 둔다 */}
        <button
          type="button"
          ref={closeButton}
          onClick={onClose}
          aria-label="열린 문제 패널 닫기"
          className={`${styles.openClose} border-0 bg-transparent p-0 hover:brightness-125`}
        >
          <img src="/assets/board/icon-close-round.png" alt="" aria-hidden="true" className="h-full w-full object-contain" />
        </button>
      </div>

      {hasTabs && (
        <div className={styles.openTabs} role="tablist" aria-label="열린 문제 보기" onKeyDown={moveTab}>
          <button type="button" role="tab" id={`${tabId}-problems`} ref={problemsTab} aria-selected={!linesVisible}
            aria-controls={`${tabId}-panel`} tabIndex={linesVisible ? -1 : 0} onClick={() => switchTab(false)}>
            문제 <span>{challenges.length}</span>
          </button>
          <button type="button" role="tab" id={`${tabId}-lines`} ref={setLinesTab} aria-selected={linesVisible}
            aria-controls={`${tabId}-panel`} tabIndex={linesVisible ? 0 : -1} onClick={() => switchTab(true)}>
            라인 독점 {lineCount && <span>{lineCount}</span>}
          </button>
        </div>
      )}

      {linesVisible ? (
        <div key="lines" className={styles.openPanelBody} tabIndex={0} {...tabPanel("lines")}>
          {children}
        </div>
      ) : (
        <>
          <div className={styles.openFilters} role="search" aria-label="열린 문제 검색">
            {/* 검색과 분야를 한 줄에 두고 풀이 상태는 개수가 보이는 세 칸 단추로 고른다 */}
            <div className={styles.openSearchRow}>
              <label className={styles.openSearch}>
                <span className="sr-only">문제 제목 또는 출제 동아리 검색</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6" /><path d="m15 15 4.5 4.5" /></svg>
                <input type="search" placeholder="문제 검색" value={view.query} maxLength={120} onChange={(event) => changeFilter({ query: event.target.value })} />
              </label>
              <label className={styles.openCategory}><span className="sr-only">문제 분야</span><select value={view.category} onChange={(event) => changeFilter({ category: event.target.value })}>
                <option value="">분야 전체</option>
                {view.category && !groups.categories.includes(view.category) && <option value={view.category}>{view.category}</option>}
                {groups.categories.map((category) => <option key={category} value={category}>{category}</option>)}
              </select></label>
            </div>
            <div className={styles.openStatusTabs} role="group" aria-label="풀이 상태">
              {statusTabs.map(([value, text, count]) => <button key={value} type="button" aria-pressed={view.status === value}
                onClick={() => changeFilter({ status: value })}>{text} <span>{count}</span></button>)}
            </div>
          </div>
          <div key="problems" className={styles.openPanelBody} ref={scrollBody} tabIndex={0} {...tabPanel("problems")}
            onScroll={(event) => { if (restored.current) saveView({ ...currentView.current, scrollTop: event.currentTarget.scrollTop }); }}>
            {instanceInfo?.loading && !instance && <p className={styles.openNotice} role="status">내 인스턴스 확인 중</p>}
            {instanceInfo?.error && <p className={styles.openNotice}>{instanceInfo.error} <button type="button" onClick={instanceInfo.retry}>다시 확인</button></p>}
            {instance && !instanceInList && <div className={styles.openInstance}>
              <span className={styles.openInstanceHead}>내 인스턴스 <InstanceMark running={instanceRunning} label={instanceLabel} /></span>
              {instance.challengeId != null
                ? <button type="button" title={instanceTitle} onClick={() => select(instance.challengeId)}><span>{instanceTitle}</span><Chevron /></button>
                : <strong>{instanceTitle}</strong>}
            </div>}
            {error && <p className={styles.openNotice} role="alert">{error}<button type="button" disabled={loading} onClick={onRetry}>다시 불러오기</button></p>}
            {loading && <p className={styles.openNotice} role="status">목록 확인 중</p>}
            <ol className={styles.openChallengeList}>
              {groups.items.map((challenge) => {
                const number = formatOpenChallengeNumber(challenge.openedNumber - 1);
                const isInstance = challenge.challengeId === instance?.challengeId;
                return (
                  <li key={challenge.challengeId} data-solved={challenge.isSolved ? "true" : undefined}>
                    {challenge === firstSolved && <p className={styles.openGroupLabel} aria-hidden="true">완료한 문제</p>}
                    <button
                      type="button"
                      className={styles.openRow}
                      onClick={() => select(challenge.challengeId)}
                      aria-label={`${number}번 ${challenge.title || "문제"}${challenge.isSolved ? ", 해결함" : ""}${isInstance ? `, 내 인스턴스 ${instanceLabel}` : ""} 상세 보기`}
                    >
                      {/* 푼 문제는 번호 대신 초록 체크로 바꿔 한눈에 구분한다 */}
                      <span className={styles.openRowNo} aria-hidden="true">
                        {challenge.isSolved
                          ? <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m4 8.5 2.6 2.5L12 5.5" /></svg>
                          : number}
                      </span>
                      <span className={styles.openRowText}>
                        <strong title={challenge.title}>{challenge.title || challenge.challengeId}</strong>
                        <span className={styles.openRowMeta}>
                          <span>{challenge.category || "분야 없음"}</span>
                          {isInstance && <InstanceMark running={instanceRunning} label={instanceLabel} />}
                        </span>
                      </span>
                      <Chevron />
                    </button>
                  </li>
                );
              })}
              {!loading && !error && challenges.length === 0 && (
                <li className={styles.openEmpty}>
                  아직 연 문제가 없습니다
                  <br />
                  문제 칸에 도착하면 문제를 골라 열 수 있습니다
                </li>
              )}
              {!loading && challenges.length > 0 && groups.items.length === 0 && <li className={styles.openNotice}>
                조건에 맞는 문제가 없습니다
                <button type="button" onClick={() => changeFilter({ query: "", category: "", status: "all" })}>전체 보기</button>
              </li>}
            </ol>
          </div>
        </>
      )}
    </aside>
  );
  return isMobile ? createPortal(<div className={styles.mobileOpenOverlay}>{panel}</div>, document.body) : panel;
}
