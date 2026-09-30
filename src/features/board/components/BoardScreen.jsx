import { useEffect, useId, useMemo, useRef, useState } from "react";
import FixedAspectStage from "../../../components/common/FixedAspectStage.jsx";
import { BLOCKED_REASON_MESSAGES } from "../data/boardContent.js";
import { getRemainingSeconds } from "../utils/boardData.js";
import { getBoardZoomScrollLeft } from "../utils/boardViewport.js";
import useTrainTravel from "../hooks/useTrainTravel.js";
import useTrainWhistle from "../hooks/useTrainWhistle.js";
import { preloadBoardTrain } from "./BoardTrain.jsx";
import { prepareBoardLines } from "../utils/boardLines.js";
import { normalizeBoardListView } from "../utils/boardChallengeList.js";
import { getChallengeSelectionKey } from "../utils/challengeSelection.js";
import { getAirportSelectableCellIndexes, isAirportSelectionMode } from "../utils/boardOverlays.js";
import AirportTravelOverlay from "./AirportTravelOverlay.jsx";
import BoardEventPanel from "./BoardEventPanel.jsx";
import BoardLineSummary from "./BoardLineSummary.jsx";
import BoardNav from "./BoardNav.jsx";
import BoardScene from "./BoardScene.jsx";
import BoardTrack from "./BoardTrack.jsx";
import ChanceCardSummary from "./ChanceCardSummary.jsx";
import DiceStatusPanel from "./DiceStatusPanel.jsx";
import KothEventBanner from "./KothEventBanner.jsx";
import OpenChallengesSidePanel, { OpenChallengesToggle } from "./OpenChallengesSidePanel.jsx";
import QuarantinePanel from "./QuarantinePanel.jsx";
import styles from "./BoardScreen.module.css";

const NO_LINES = Object.freeze([]);

// Figma node 3:2 "BoardPage" (1920x1080) + 146:19 "무인도 클릭"(무인도 모달 상태)
// + 518:300 "열린 문제" + 555:342 "기차여행" + 555:306 "룰렛" + 104:502 "칸 눌럿음~".
// 데스크톱은 기존 16:9 무대 좌표를 유지한다
// 모바일은 BoardScene 안에서 배경 바닥과 원판을 함께 확대·스크롤한다
export default function BoardScreen({
  boardDefinition,
  myBoard,
  diceStatus,
  currentCell,
  displayPosition,
  pendingRoll,
  pendingChanceChoice,
  cellEvent,
  awaitingDiscard,
  ownedChanceCards,
  cellStatesByIndex,
  selectedCell,
  openedChallenges = [],
  openedChallengesLoading = false,
  openedChallengesError = "",
  onRetryOpenedChallenges,
  openListVisible,
  onOpenListVisibleChange,
  initialOpenListView,
  instanceInfo,
  // 명세 확정 후 연결할 화면용 데이터 실제 API 응답에서 추측해 생성하지 않는다
  lineProgress = NO_LINES,
  lineProgressPreview = false,
  airportDestinationIndex = null,
  isLoading,
  isMutating,
  error,
  showQuarantine,
  onReload,
  onDismissError,
  onRollDice,
  onSelectCell,
  onConfirmDice,
  onOpenChallenge,
  onMoveAirport,
  onUseChanceCard,
  onConfirmChance,
  onDiscardChance,
  onSpinRoulette,
  onRetryChanceDraw,
  onCloseCellEvent,
  onEscapeQuarantine,
  onClearSelectedCell,
  onCloseQuarantine,
  onOpenChallengeDetail,
  onCancelAirportDestination,
}) {
  const [now, setNow] = useState(Date.now());
  const [localOpenListVisible, setLocalOpenListVisible] = useState(false);
  const isOpenListVisible = openListVisible ?? localOpenListVisible;
  const setIsOpenListVisible = (open) => {
    setLocalOpenListVisible(open);
    onOpenListVisibleChange?.(open);
  };
  const openListView = useRef(normalizeBoardListView(initialOpenListView));
  const [isBoardZoomed, setIsBoardZoomed] = useState(false);
  const [isLineSummaryOpen, setIsLineSummaryOpen] = useState(false);
  const [selectedLineId, setSelectedLineId] = useState(null);
  const [dismissedSelectionKey, setDismissedSelectionKey] = useState(null);
  const openListTrigger = useRef(null);
  const openListToggle = useRef(null);
  const lineSummary = useRef(null);
  const lines = useMemo(() => prepareBoardLines(lineProgress), [lineProgress]);
  const hasLines = lines.length > 0;
  const activeLineId = lines.find((line) => line.lineId === selectedLineId)?.lineId ?? lines[0]?.lineId ?? null;
  const boardRegionId = useId();
  const boardViewport = useRef(null);
  const trainTravel = useTrainTravel();
  const trainWhistle = useTrainWhistle();
  const followTrain = (pose) => {
    const viewport = boardViewport.current;
    if (!isBoardZoomed || !viewport) return;
    const track = viewport.querySelector('[data-board-layer="track"]');
    if (!track) return;
    // 확대 보드에서는 칸 단위 점프 없이 기차의 실제 화면 좌표를 따라간다
    const center = track.offsetLeft + track.clientWidth * pose.x / 100;
    viewport.scrollLeft = Math.max(0, Math.min(viewport.scrollWidth - viewport.clientWidth, center - viewport.clientWidth / 2));
  };

  const openLineSummary = (lineId) => {
    openListTrigger.current = document.activeElement;
    setSelectedLineId(lineId ?? lines[0]?.lineId ?? null);
    setIsOpenListVisible(true);
    setIsLineSummaryOpen(true);
  };
  const closeOpenList = () => {
    setIsOpenListVisible(false);
    setIsLineSummaryOpen(false);
    const trigger = openListTrigger.current;
    if (trigger?.isConnected && typeof trigger.focus === "function") trigger.focus({ preventScroll: true });
    else openListToggle.current?.focus({ preventScroll: true });
  };

  useEffect(() => {
    if (!hasLines) {
      setIsLineSummaryOpen(false);
      setSelectedLineId(null);
    }
  }, [hasLines]);

  useEffect(() => {
    if (isOpenListVisible && isLineSummaryOpen) lineSummary.current?.focus({ preventScroll: true });
  }, [isOpenListVisible, isLineSummaryOpen]);

  useEffect(() => {
    const viewport = boardViewport.current;
    if (!viewport) return undefined;
    if (!isBoardZoomed) {
      viewport.scrollLeft = 0;
      return undefined;
    }
    const frameId = window.requestAnimationFrame(() => {
      const track = viewport.querySelector('[data-board-layer="track"]');
      viewport.scrollLeft = getBoardZoomScrollLeft(
        viewport.clientWidth,
        viewport.scrollWidth,
        displayPosition,
        track ? { left: track.offsetLeft, width: track.clientWidth } : null,
      );
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [isBoardZoomed, displayPosition]);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1101px)");
    const resetZoom = () => {
      if (desktop.matches) setIsBoardZoomed(false);
    };
    desktop.addEventListener("change", resetZoom);
    return () => desktop.removeEventListener("change", resetZoom);
  }, []);

  useEffect(() => {
    const timerId = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timerId);
  }, []);

  const resetInSeconds = getRemainingSeconds(
    diceStatus?.nextDiceResetAt,
    diceStatus,
    now,
  );
  const quarantineReleasedInSeconds = getRemainingSeconds(
    diceStatus?.quarantineReleasedAt,
    diceStatus,
    now,
  );
  // active_challenge는 제한시간이 끝나도 서버가 즉시 비우지 않을 수 있어(다음
  // 액션 전까지 남아있음), diceStatus.timerRunning/blockedReason 쪽을 진행 중
  // 여부의 기준으로 삼는다 - 그래야 만료 직후 이 패널이 계속 "문제 제한 00:00"에
  // 멈춰있지 않고 충전 카운트다운(resetInSeconds)으로 자연히 넘어간다.
  const isChallengeTimerRunning =
    diceStatus?.timerRunning === true || diceStatus?.blockedReason === "TIMER_RUNNING";
  const challengeRemainingSeconds = isChallengeTimerRunning
    ? getRemainingSeconds(myBoard?.activeChallenge?.solveDeadlineAt, diceStatus, now)
    : null;
  const cells = boardDefinition?.cells ?? [];
  const blockedMessage = awaitingDiscard
    ? "보유한 찬스카드 한 장을 먼저 폐기해주세요."
    : diceStatus?.blockedReason
      ? BLOCKED_REASON_MESSAGES[diceStatus.blockedReason] ||
        diceStatus.blockedReason
      : null;
  const canRoll =
    diceStatus?.canRoll === true && !isMutating && !awaitingDiscard;
  const isAirportSelecting =
    !showQuarantine &&
    isAirportSelectionMode({
      currentCell,
      myBoard,
      pendingRoll,
      pendingChanceChoice,
      awaitingDiscard,
      blockedReason: diceStatus?.blockedReason,
      cellEvent,
    });
  const airportSelectableCellIndexes = isAirportSelecting
    ? getAirportSelectableCellIndexes(cells, myBoard?.consumedCellIndexes, myBoard?.position)
    : null;
  const airportDestination = isAirportSelecting && airportDestinationIndex != null
    ? cells.find((cell) => cell.cellIndex === airportDestinationIndex) ?? null
    : null;
  useEffect(() => { if (isAirportSelecting) void preloadBoardTrain(); }, [isAirportSelecting]);
  const selectionKey = getChallengeSelectionKey({
    myBoard, currentCell, awaitingDiscard, pendingChanceChoice, pendingRoll,
    blockedReason: diceStatus?.blockedReason, cellEvent, showQuarantine, isLoading,
  });
  const isChallengeSelectionOpen = selectionKey !== null && dismissedSelectionKey !== selectionKey;

  useEffect(() => { setDismissedSelectionKey(null); }, [selectionKey]);

  return (
    <FixedAspectStage backdropSrc="/assets/board/bg-1920x1080.png" frameClassName={styles.frame} className={styles.stage}>
      <DiceStatusPanel
        rollsLeft={diceStatus?.diceRollsLeft ?? myBoard?.diceRollsLeft ?? 0}
        canRoll={canRoll}
        blockedMessage={blockedMessage}
        resetInSeconds={resetInSeconds}
        challengeRemainingSeconds={challengeRemainingSeconds}
      />

      <BoardNav />

      <div className={styles.desktopOnly}><KothEventBanner /></div>

      <div className={styles.boardArea}>
        <div className={styles.boardTools}>
          <OpenChallengesToggle
            buttonRef={openListToggle}
            isOpen={isOpenListVisible}
            count={openedChallenges.length}
            onToggle={() => {
              if (isOpenListVisible) closeOpenList();
              else {
                openListTrigger.current = document.activeElement;
                setIsOpenListVisible(true);
              }
            }}
          />
          <div className={styles.boardControls}>
            <p className={styles.boardHint}>{isBoardZoomed ? "좌우로 이동" : "전체 보드"}</p>
            <button
              type="button"
              className={styles.boardZoomButton}
              aria-label={isBoardZoomed ? "보드 전체 보기" : "보드 확대 보기"}
              aria-controls={boardRegionId}
              disabled={cells.length === 0}
              onClick={() => setIsBoardZoomed((value) => !value)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                <circle cx="10.5" cy="10.5" r="6.5" />
                <path d="m16 16 4 4M7.5 10.5h6" />
                {!isBoardZoomed && <path d="M10.5 7.5v6" />}
              </svg>
              {isBoardZoomed ? "전체 보기" : "확대"}
            </button>
          </div>
        </div>
        <div
          id={boardRegionId}
          ref={boardViewport}
          className={styles.boardViewport}
          data-zoomed={isBoardZoomed}
          data-has-lines={hasLines}
          role="region"
          aria-label="게임 보드"
          tabIndex={isBoardZoomed ? 0 : undefined}
        >
          <BoardScene>
            <BoardTrack
              cells={cells}
              cellStatesByIndex={cellStatesByIndex}
              consumedCellIndexes={myBoard?.consumedCellIndexes ?? []}
              piecePosition={displayPosition}
              trainTravel={{ ...trainTravel, onProgress: followTrain, onStart: trainWhistle.play, onStop: trainWhistle.stop }}
              canRoll={canRoll}
              isRolling={isMutating}
              onRollDice={onRollDice}
              onSelectCell={(cellIndex) => {
                if (isMutating || trainTravel.journey) return;
                setIsOpenListVisible(false);
                setIsLineSummaryOpen(false);
                if (selectionKey !== null && currentCell.cellIndex === cellIndex) {
                  setDismissedSelectionKey(null);
                  return;
                }
                onSelectCell(cellIndex, openListView.current);
              }}
              lines={lines}
              selectedLineId={isOpenListVisible && isLineSummaryOpen ? activeLineId : null}
              onSelectLine={openLineSummary}
              selectableCellIndexes={trainTravel.journey ? null : airportSelectableCellIndexes}
              highlightedCellIndex={trainTravel.journey ? null : airportDestination?.cellIndex ?? null}
            />
          </BoardScene>
        </div>
      </div>

      <ChanceCardSummary
        cards={ownedChanceCards}
        cells={cells}
        consumedCellIndexes={myBoard?.consumedCellIndexes ?? []}
        isMutating={isMutating}
        awaitingDiscard={awaitingDiscard}
        pendingConfirm={
          Boolean(pendingRoll) || diceStatus?.blockedReason === "PENDING_CONFIRM"
        }
        onUseCard={onUseChanceCard}
      />

      {isOpenListVisible && (
        <OpenChallengesSidePanel
          challenges={openedChallenges}
          loading={openedChallengesLoading}
          error={openedChallengesError}
          onRetry={onRetryOpenedChallenges}
          initialView={openListView.current}
          onViewChange={(view) => { openListView.current = view; }}
          instanceInfo={instanceInfo}
          onSelectChallenge={onOpenChallengeDetail}
          onClose={closeOpenList}
        >
          {hasLines && <BoardLineSummary lines={lines} selectedLineId={activeLineId}
            onSelectLine={setSelectedLineId} isOpen={isLineSummaryOpen} onToggle={setIsLineSummaryOpen}
            summaryRef={lineSummary} isPreview={lineProgressPreview} />}
        </OpenChallengesSidePanel>
      )}

      {trainTravel.journey && <p className="sr-only" role="status">선택한 {trainTravel.journey.cells.at(-1)}번 칸으로 기차 이동 중</p>}
      {isAirportSelecting && !trainTravel.journey && (
        <AirportTravelOverlay
          destination={airportDestination}
          isMutating={isMutating}
          soundEnabled={trainWhistle.enabled}
          onToggleSound={trainWhistle.toggle}
          onConfirm={(destination) => {
            trainWhistle.prepare();
            return onMoveAirport(destination, { onTravelResult: trainTravel.play });
          }}
          onCancel={onCancelAirportDestination}
        />
      )}

      {!showQuarantine && (
        <BoardEventPanel
          myBoard={myBoard}
          currentCell={currentCell}
          pendingRoll={pendingRoll}
          pendingChanceChoice={pendingChanceChoice}
          cellEvent={cellEvent}
          ownedChanceCards={ownedChanceCards}
          awaitingDiscard={awaitingDiscard}
          blockedReason={diceStatus?.blockedReason}
          selectedCell={selectedCell}
          isMutating={isMutating}
          isAirportSelecting={isAirportSelecting}
          isLoading={isLoading}
          onReload={onReload}
          onConfirmDice={onConfirmDice}
          onOpenChallenge={(challengeId, options) => onOpenChallenge(challengeId, openListView.current, options)}
          onUseChanceCard={onUseChanceCard}
          onConfirmChance={onConfirmChance}
          onDiscardChance={onDiscardChance}
          onSpinRoulette={onSpinRoulette}
          onRetryChanceDraw={onRetryChanceDraw}
          onCloseCellEvent={onCloseCellEvent}
          onClearSelectedCell={onClearSelectedCell}
          isChallengeSelectionOpen={isChallengeSelectionOpen}
          onCloseChallengeSelection={() => setDismissedSelectionKey(selectionKey)}
          onReopenChallengeSelection={() => setDismissedSelectionKey(null)}
          errorMessage={error?.message}
        />
      )}

      {isLoading && (
        <div className={`${styles.loading} absolute inset-0 z-50 grid place-items-center bg-[#2b1609]/35 font-inria-serif text-[1.2cqw] text-[#fff0c4]`}>
          보드 정보를 불러오는 중입니다.
        </div>
      )}

      {!isLoading && boardDefinition && cells.length === 0 && (
        <div className={`${styles.empty} absolute left-[34%] top-[47%] z-40 w-[30%] rounded-[0.6cqw] border border-[#8a5728] bg-[#f2d7a7]/95 p-[1cqw] text-center font-inria-serif text-[0.85cqw] text-[#3e2818]`}>
          표시할 보드 칸이 없습니다.
        </div>
      )}

      {error && (
        <div
          className={`${styles.error} absolute left-[31%] top-[16%] z-[60] flex w-[38%] items-center gap-[0.65cqw] rounded-[0.55cqw] border border-[#9c3f28] bg-[#3a160f]/95 px-[0.8cqw] py-[0.55cqw] font-inria-serif text-[0.7cqw] text-[#ffe8c4] shadow-xl`}
          role="alert"
        >
          <span className="min-w-0 flex-1">
            {error.code}: {error.message}
          </span>
          <button
            type="button"
            onClick={onReload}
            className="rounded border border-[#c89252] bg-[#6d391c] px-[0.55cqw] py-[0.2cqw]"
          >
            다시 시도
          </button>
          <button
            type="button"
            onClick={onDismissError}
            aria-label="오류 알림 닫기"
            className="border-0 bg-transparent p-0 text-[0.9cqw] text-[#ffe8c4]"
          >
            ×
          </button>
        </div>
      )}

      {showQuarantine && (
        <QuarantinePanel
          releasedInSeconds={quarantineReleasedInSeconds}
          isMutating={isMutating}
          freeEscapeCards={ownedChanceCards.filter(
            (card) =>
              card.usableNow && card.effect === "QUARANTINE_ESCAPE_FREE",
          )}
          onEscape={onEscapeQuarantine}
          onUseFreeEscape={(cardId) => onUseChanceCard(cardId)}
          onClose={onCloseQuarantine}
        />
      )}
    </FixedAspectStage>
  );
}
