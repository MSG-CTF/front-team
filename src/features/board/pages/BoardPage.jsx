import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../../../routes/routePaths.js";
import BoardScreen from "../components/BoardScreen.jsx";
import useBoardController from "../hooks/useBoardController.js";

// 문제 리스트(보드) 페이지 - README.md "2. 문제 리스트(보드) 페이지".
export default function BoardPage() {
  const navigate = useNavigate();
  const board = useBoardController();
  const [quarantineDismissed, setQuarantineDismissed] = useState(false);

  useEffect(() => {
    if (!board.myBoard?.isQuarantined) setQuarantineDismissed(false);
  }, [board.myBoard?.isQuarantined]);

  const handleOpenChallenge = async (challengeId) => {
    try {
      const openedChallenge = await board.openChallenge(challengeId);
      if (!openedChallenge) return;
      navigate(ROUTES.challengeDetail(openedChallenge.challengeId), {
        state: { boardAccess: openedChallenge },
      });
    } catch {
      // Board controller가 백엔드의 code/message를 화면 오류 상태로 보존한다.
    }
  };

  const runBoardAction = async (action) => {
    try {
      return await action();
    } catch {
      // Board controller가 백엔드의 code/message를 화면 오류 상태로 보존한다.
      return null;
    }
  };

  const handleEscapeQuarantine = async (code) => {
    const result = await runBoardAction(() => board.escapeQuarantine(code));
    if (result) setQuarantineDismissed(true);
  };

  // 이미 문제를 오픈해둔 칸을 다시 클릭하면 칸 정보 패널 대신 바로 문제
  // 상세로 재진입한다(README 2절 opened_challenges 기준).
  const handleSelectCell = (cellIndex) => {
    const opened = board.openedChallengesByCell.get(cellIndex);
    if (opened) {
      navigate(ROUTES.challengeDetail(opened.challengeId));
      return;
    }
    board.selectCell(cellIndex);
  };

  return (
    <BoardScreen
      boardDefinition={board.boardDefinition}
      myBoard={board.myBoard}
      diceStatus={board.diceStatus}
      currentCell={board.currentCell}
      displayPosition={board.displayPosition}
      pendingRoll={board.pendingRoll}
      pendingChanceChoice={board.pendingChanceChoice}
      cellEvent={board.cellEvent}
      awaitingDiscard={board.awaitingDiscard}
      ownedChanceCards={board.ownedChanceCards}
      cellStatesByIndex={board.cellStatesByIndex}
      selectedCell={board.selectedCell}
      isLoading={board.isLoading}
      isMutating={board.isMutating}
      error={board.error}
      showQuarantine={
        board.myBoard?.isQuarantined === true &&
        !board.awaitingDiscard &&
        !quarantineDismissed
      }
      onReload={board.reload}
      onDismissError={board.clearError}
      onRollDice={(options) => runBoardAction(() => board.rollDice(options))}
      onConfirmDice={() => runBoardAction(board.confirmDice)}
      onOpenChallenge={handleOpenChallenge}
      onMoveAirport={(destinationIndex) =>
        runBoardAction(() => board.moveAirport(destinationIndex))
      }
      onUseChanceCard={(cardId, options) =>
        runBoardAction(() => board.useChanceCard(cardId, options))
      }
      onConfirmChance={(choice) =>
        runBoardAction(() => board.confirmChance(choice))
      }
      onDiscardChance={(cardId) =>
        runBoardAction(() => board.discardChance(cardId))
      }
      onSpinRoulette={(eventToken) =>
        runBoardAction(() => board.spinRoulette(eventToken))
      }
      onRetryChanceDraw={(eventToken) => board.drawChance(eventToken)}
      onCloseCellEvent={board.closeCellEvent}
      onEscapeQuarantine={handleEscapeQuarantine}
      onSelectCell={handleSelectCell}
      onClearSelectedCell={board.clearSelectedCell}
      onCloseQuarantine={() => setQuarantineDismissed(true)}
    />
  );
}
