import { useEffect, useState } from "react";
import FixedAspectStage from "../../../components/common/FixedAspectStage.jsx";
import { BLOCKED_REASON_MESSAGES } from "../data/boardContent.js";
import { getRemainingSeconds } from "../utils/boardData.js";
import BoardEventPanel from "./BoardEventPanel.jsx";
import BoardNav from "./BoardNav.jsx";
import BoardTrack from "./BoardTrack.jsx";
import ChanceCardSummary from "./ChanceCardSummary.jsx";
import DiceStatusPanel from "./DiceStatusPanel.jsx";
import KothEventBanner from "./KothEventBanner.jsx";
import QuarantinePanel from "./QuarantinePanel.jsx";

// Figma node 3:2 "BoardPage" (1920x1080) + 146:19 "무인도 클릭"(무인도 모달 상태).
// bg-1920x1080.png는 배경(뷰포트 반응형 object-cover)으로만 쓰고, HUD/배너/보드판/
// 오버레이는 항상 정확한 16:9 무대 위에서 % 좌표로 배치한다(ChallengeDetailScreen과 동일 패턴).
export default function BoardScreen({
  boardDefinition,
  myBoard,
  diceStatus,
  currentCell,
  displayPosition,
  pendingRoll,
  ownedChanceCards,
  cellStatesByIndex,
  selectedCell,
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
  onClearSelectedCell,
  onCloseQuarantine,
}) {
  const [now, setNow] = useState(Date.now());

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
  const challengeRemainingSeconds = getRemainingSeconds(
    myBoard?.activeChallenge?.solveDeadlineAt,
    diceStatus,
    now,
  );
  const cells = boardDefinition?.cells ?? [];
  const blockedMessage = diceStatus?.blockedReason
    ? BLOCKED_REASON_MESSAGES[diceStatus.blockedReason] || diceStatus.blockedReason
    : null;

  return (
    <FixedAspectStage backdropSrc="/assets/board/bg-1920x1080.png">
      <DiceStatusPanel
        rollsLeft={diceStatus?.diceRollsLeft ?? myBoard?.diceRollsLeft ?? 0}
        canRoll={diceStatus?.canRoll === true}
        blockedMessage={blockedMessage}
        resetInSeconds={resetInSeconds}
        challengeRemainingSeconds={challengeRemainingSeconds}
      />

      <BoardNav />

      <KothEventBanner />

      <BoardTrack
        cells={cells}
        cellStatesByIndex={cellStatesByIndex}
        consumedCellIndexes={myBoard?.consumedCellIndexes ?? []}
        piecePosition={displayPosition}
        canRoll={diceStatus?.canRoll === true && !isMutating}
        isRolling={isMutating}
        onRollDice={onRollDice}
        onSelectCell={onSelectCell}
      />

      <ChanceCardSummary cards={ownedChanceCards} />

      <BoardEventPanel
        cells={cells}
        myBoard={myBoard}
        currentCell={currentCell}
        pendingRoll={pendingRoll}
        blockedReason={diceStatus?.blockedReason}
        selectedCell={selectedCell}
        isMutating={isMutating}
        onConfirmDice={onConfirmDice}
        onOpenChallenge={onOpenChallenge}
        onMoveAirport={onMoveAirport}
        onClearSelectedCell={onClearSelectedCell}
      />

      {isLoading && (
        <div className="absolute inset-0 z-50 grid place-items-center bg-[#2b1609]/35 font-inria-serif text-[1.2cqw] text-[#fff0c4]">
          보드 정보를 불러오는 중입니다.
        </div>
      )}

      {!isLoading && boardDefinition && cells.length === 0 && (
        <div className="absolute left-[34%] top-[47%] z-40 w-[30%] rounded-[0.6cqw] border border-[#8a5728] bg-[#f2d7a7]/95 p-[1cqw] text-center font-inria-serif text-[0.85cqw] text-[#3e2818]">
          표시할 보드 칸이 없습니다.
        </div>
      )}

      {error && (
        <div
          className="absolute left-[31%] top-[16%] z-[60] flex w-[38%] items-center gap-[0.65cqw] rounded-[0.55cqw] border border-[#9c3f28] bg-[#3a160f]/95 px-[0.8cqw] py-[0.55cqw] font-inria-serif text-[0.7cqw] text-[#ffe8c4] shadow-xl"
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
          onClose={onCloseQuarantine}
        />
      )}
    </FixedAspectStage>
  );
}
