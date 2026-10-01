import { useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { ROUTES } from "../../../routes/routePaths.js";
import BoardScreen from "../components/BoardScreen.jsx";
import useBoardController from "../hooks/useBoardController.js";
import useBoardInstance from "../hooks/useBoardInstance.js";
import { normalizeBoardListView } from "../utils/boardChallengeList.js";
import { openChallengeWithReveal } from "../utils/challengeReveal.js";
import { getAirportSelectableCellIndexes, isAirportSelectionMode } from "../utils/boardOverlays.js";

// 문제 리스트(보드) 페이지 - README.md "2. 문제 리스트(보드) 페이지".
export default function BoardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const isListOpen = searchParams.get("panel") === "challenges";
  const instanceInfo = useBoardInstance(isListOpen);
  const board = useBoardController();
  const setListOpen = (open) => {
    const next = new URLSearchParams(searchParams);
    if (open) next.set("panel", "challenges");
    else next.delete("panel");
    setSearchParams(next, { replace: true, state: location.state });
  };
  const openChallengeDetail = (challengeId, view) => {
    const boardList = normalizeBoardListView(view ?? location.state?.boardList);
    // 브라우저 뒤로 가기에도 같은 목록 위치를 복원한다
    navigate(ROUTES.boardChallenges, { replace: true, state: { ...location.state, boardList } });
    navigate(ROUTES.challengeDetail(challengeId), { state: { boardList } });
  };
  const [quarantineDismissed, setQuarantineDismissed] = useState(false);
  // 기차여행(Figma 555:342) - 보드 칸을 눌러 고른 목적지. 확인 패널에서 이동을 확정한다.
  const [airportDestinationIndex, setAirportDestinationIndex] = useState(null);
  const isAirportSelecting = isAirportSelectionMode({
    currentCell: board.currentCell,
    myBoard: board.myBoard,
    pendingRoll: board.pendingRoll,
    pendingChanceChoice: board.pendingChanceChoice,
    awaitingDiscard: board.awaitingDiscard,
    blockedReason: board.diceStatus?.blockedReason,
    cellEvent: board.cellEvent,
  });

  useEffect(() => {
    if (!isAirportSelecting) setAirportDestinationIndex(null);
  }, [isAirportSelecting]);

  useEffect(() => {
    if (!board.myBoard?.isQuarantined) setQuarantineDismissed(false);
  }, [board.myBoard?.isQuarantined]);

  const handleOpenChallenge = async (challengeId, view, { beforeNavigate } = {}) => {
    try {
      // 보드는 돌아올 때 다시 조회하고, 첫 선택에만 짧은 카드 연출을 보장한다
      await openChallengeWithReveal({
        request: () => board.openChallenge(challengeId, { refreshBoard: false }),
        beforeNavigate,
        navigate: (openedChallenge) => navigate(ROUTES.challengeDetail(openedChallenge.challengeId), {
          state: { boardAccess: openedChallenge, boardList: normalizeBoardListView(view ?? location.state?.boardList) },
        }),
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
  const handleSelectCell = (cellIndex, view) => {
    if (board.isMutating) return;
    if (isAirportSelecting) {
      const selectable = getAirportSelectableCellIndexes(
        board.boardDefinition?.cells,
        board.myBoard.consumedCellIndexes,
        board.myBoard.position,
      );
      if (selectable.has(cellIndex)) setAirportDestinationIndex(cellIndex);
      return;
    }
    const opened = board.openedChallengesByCell.get(cellIndex);
    if (opened) {
      openChallengeDetail(opened.challengeId, view);
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
      startRewardEvent={board.startRewardEvent}
      awaitingDiscard={board.awaitingDiscard}
      ownedChanceCards={board.ownedChanceCards}
      cellStatesByIndex={board.cellStatesByIndex}
      selectedCell={board.selectedCell}
      openedChallenges={board.openedChallenges}
      openedChallengesLoading={board.isLoading || board.openedChallengesLoading}
      openedChallengesError={board.openedChallengesError}
      onRetryOpenedChallenges={board.reloadOpenedChallenges}
      openListVisible={isListOpen}
      onOpenListVisibleChange={setListOpen}
      initialOpenListView={location.state?.boardList}
      instanceInfo={instanceInfo}
      airportDestinationIndex={airportDestinationIndex}
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
      onMoveAirport={async (destinationIndex, options) => {
        const result = await runBoardAction(() => board.moveAirport(destinationIndex, options));
        if (result) setAirportDestinationIndex(null);
        return result;
      }}
      onCancelAirportDestination={() => setAirportDestinationIndex(null)}
      onOpenChallengeDetail={openChallengeDetail}
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
