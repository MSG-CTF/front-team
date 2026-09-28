import { useEffect, useRef, useState } from "react";
import FixedAspectStage from "../../../components/common/FixedAspectStage.jsx";
import { BLOCKED_REASON_MESSAGES } from "../data/boardContent.js";
import { getRemainingSeconds } from "../utils/boardData.js";
import { getAirportSelectableCellIndexes, isAirportSelectionMode } from "../utils/boardOverlays.js";
import AirportTravelOverlay from "./AirportTravelOverlay.jsx";
import BoardEventPanel from "./BoardEventPanel.jsx";
import BoardNav from "./BoardNav.jsx";
import BoardTrack from "./BoardTrack.jsx";
import ChanceCardSummary from "./ChanceCardSummary.jsx";
import DiceStatusPanel from "./DiceStatusPanel.jsx";
import KothEventBanner from "./KothEventBanner.jsx";
import OpenChallengesSidePanel, { OpenChallengesToggle } from "./OpenChallengesSidePanel.jsx";
import QuarantinePanel from "./QuarantinePanel.jsx";
import styles from "./BoardScreen.module.css";

// Figma node 3:2 "BoardPage" (1920x1080) + 146:19 "무인도 클릭"(무인도 모달 상태)
// + 518:300 "열린 문제"(좌측 패널) + 555:342 "기차여행"(목적지 선택) + 555:306 "룰렛"(모달).
// bg-1920x1080.png는 배경(뷰포트 반응형 object-cover)으로만 쓰고, HUD/배너/보드판/
// 오버레이는 항상 정확한 16:9 무대 위에서 % 좌표로 배치한다(ChallengeDetailScreen과 동일 패턴).
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
  onViewAllChallenges,
  onCancelAirportDestination,
}) {
  const [now, setNow] = useState(Date.now());
  const [isOpenListVisible, setIsOpenListVisible] = useState(false);
  const boardViewport = useRef(null);

  useEffect(() => {
    const viewport = boardViewport.current;
    if (viewport && viewport.scrollWidth > viewport.clientWidth) {
      viewport.scrollLeft = (viewport.scrollWidth - viewport.clientWidth) / 2;
    }
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

  return (
    <FixedAspectStage backdropSrc="/assets/board/bg-1920x1080.png" frameClassName={styles.frame} className={styles.stage}>
      <DiceStatusPanel
        rollsLeft={diceStatus?.diceRollsLeft ?? myBoard?.diceRollsLeft ?? 0}
        canRoll={canRoll}
        blockedMessage={blockedMessage}
        resetInSeconds={resetInSeconds}
        challengeRemainingSeconds={challengeRemainingSeconds}
      />

      <OpenChallengesToggle
        isOpen={isOpenListVisible}
        count={openedChallenges.length}
        onToggle={() => setIsOpenListVisible((value) => !value)}
      />

      <BoardNav />

      <div className={styles.desktopOnly}><KothEventBanner /></div>

      <p className={styles.boardHint}>보드를 좌우로 밀어 확인하세요</p>
      <div ref={boardViewport} className={styles.boardViewport} role="region" aria-label="게임 보드 가로 스크롤" tabIndex={0}>
        <BoardTrack
          cells={cells}
          cellStatesByIndex={cellStatesByIndex}
          consumedCellIndexes={myBoard?.consumedCellIndexes ?? []}
          piecePosition={displayPosition}
          canRoll={canRoll}
          isRolling={isMutating}
          onRollDice={onRollDice}
          onSelectCell={onSelectCell}
          selectableCellIndexes={airportSelectableCellIndexes}
          highlightedCellIndex={airportDestination?.cellIndex ?? null}
        />
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
          onSelectChallenge={onOpenChallengeDetail}
          onViewAll={onViewAllChallenges}
          onClose={() => setIsOpenListVisible(false)}
        />
      )}

      {isAirportSelecting && (
        <AirportTravelOverlay
          destination={airportDestination}
          isMutating={isMutating}
          onConfirm={onMoveAirport}
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
          onConfirmDice={onConfirmDice}
          onOpenChallenge={onOpenChallenge}
          onUseChanceCard={onUseChanceCard}
          onConfirmChance={onConfirmChance}
          onDiscardChance={onDiscardChance}
          onSpinRoulette={onSpinRoulette}
          onRetryChanceDraw={onRetryChanceDraw}
          onCloseCellEvent={onCloseCellEvent}
          onClearSelectedCell={onClearSelectedCell}
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
