import FixedAspectStage from "../../../components/common/FixedAspectStage.jsx";
import BoardNav from "./BoardNav.jsx";
import BoardTrack from "./BoardTrack.jsx";
import DiceStatusPanel from "./DiceStatusPanel.jsx";
import KothEventBanner from "./KothEventBanner.jsx";
import QuarantinePanel from "./QuarantinePanel.jsx";

// Figma node 3:2 "BoardPage" (1920x1080) + 146:19 "무인도 클릭"(무인도 모달 상태).
// bg-1920x1080.png는 배경(뷰포트 반응형 object-cover)으로만 쓰고, HUD/배너/보드판/
// 오버레이는 항상 정확한 16:9 무대 위에서 % 좌표로 배치한다(ChallengeDetailScreen과 동일 패턴).
export default function BoardScreen({
  board,
  showQuarantine,
  onRollDice,
  onSelectCell,
  onOpenRound,
  onCloseQuarantine,
}) {
  const canRoll =
    board.diceRollsLeft > 0 && !board.isQuarantined && !board.boardCompleted;

  return (
    <FixedAspectStage backdropSrc="/assets/board/bg-1920x1080.png">
      <DiceStatusPanel
        rollsLeft={board.diceRollsLeft}
        rollsMax={board.diceRollsMax}
        resetInSeconds={board.nextDiceResetInSeconds}
      />

      <BoardNav />

      <KothEventBanner
        title={board.kothEventTitle}
        round={board.round}
        onOpenRound={onOpenRound}
      />

      <BoardTrack
        piecePosition={board.position}
        canRoll={canRoll}
        onRollDice={onRollDice}
        onSelectCell={onSelectCell}
      />

      {showQuarantine && (
        <QuarantinePanel
          releasedInSeconds={board.quarantineReleasedInSeconds}
          onClose={onCloseQuarantine}
        />
      )}
    </FixedAspectStage>
  );
}
