import { useMemo, useState } from "react";
import BoardScreen from "../components/BoardScreen.jsx";
import { PREVIEW_BOARD_CELLS } from "./lineRailPreviewData.js";
import { LANDMARK_STAGE2 } from "../utils/landmarkStage2.js";

const SPECIAL = new Set([7, 16, 21, 25, 30]);
const REPRESENTATIVES = LANDMARK_STAGE2.map(({ cellIndex }) => cellIndex);

function simulatedState(mode) {
  const selected = mode === "all" ? REPRESENTATIVES : mode === "none" ? []
    : mode === "general" ? REPRESENTATIVES.filter((index) => !SPECIAL.has(index))
      : mode === "special" ? [...SPECIAL]
        : Number.isInteger(Number(mode)) ? [Number(mode)] : [];
  const consumedCellIndexes = selected.filter((index) => SPECIAL.has(index));
  const cellStatesByIndex = new Map(selected.filter((index) => !SPECIAL.has(index))
    .map((index) => [index, { status: "CLEARED" }]));
  if (mode === "opened" || mode === "consumed") {
    cellStatesByIndex.set(2, { status: mode.toUpperCase() });
  }
  return { consumedCellIndexes, cellStatesByIndex };
}

export default function LandmarkPreviewPage() {
  const params = new URLSearchParams(window.location.search);
  const [mode, setMode] = useState(params.get("mode") ?? "all");
  const hideControls = params.get("hideControls") === "1";
  const simulated = useMemo(() => simulatedState(mode), [mode]);
  const myBoard = useMemo(() => ({ position: 1, consumedCellIndexes: simulated.consumedCellIndexes,
    cellStates: [...simulated.cellStatesByIndex].map(([cellIndex, state]) => ({ cellIndex, ...state })),
    chanceCards: [], diceRollsLeft: 0, maxDiceRolls: 3 }), [simulated]);

  return <>
    <BoardScreen
      boardDefinition={{ totalCellCount: 36, cells: PREVIEW_BOARD_CELLS }}
      myBoard={myBoard}
      diceStatus={{ canRoll: false, diceRollsLeft: 0, maxDiceRolls: 3 }}
      currentCell={PREVIEW_BOARD_CELLS[0]}
      displayPosition={1}
      pieceTransitionMs={params.get("piecePositionTest") === "all" ? 300 : 0}
      pendingRoll={null}
      pendingChanceChoice={null}
      cellEvent={null}
      awaitingDiscard={false}
      ownedChanceCards={[]}
      cellStatesByIndex={simulated.cellStatesByIndex}
      lineProgress={[]}
      isLoading={false}
      isMutating={false}
      error={null}
      onRollDice={() => {}}
      onSelectCell={() => {}}
      onOpenChallenge={() => {}}
      onOpenChallengeDetail={() => {}}
    />
    <div style={{ position: "fixed", zIndex: 100, bottom: 10, left: 10, maxWidth: "min(640px, 90vw)",
      background: "#2a160fec", color: "#f6e6c5", border: "1px solid #a17c50", borderRadius: 9,
      padding: "8px 11px", font: "12px sans-serif", display: hideControls ? "none" : "block" }}>
      <strong>개발 전용 · 가상 서버 상태 · 실제 완료 기록 아님</strong>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 6 }}>
        {[["all", "35종 모두"], ["none", "표시 전"], ["general", "일반"], ["special", "특수"],
          ["2", "Bowl"], ["8", "Skewer"], ["19", "Goblet"], ["7", "CHANCE"],
          ["16", "ROULETTE"], ["21", "AIRPORT"], ["opened", "OPENED"], ["consumed", "CONSUMED"]]
          .map(([value, label]) => <button key={value} type="button" onClick={() => setMode(value)}
            style={{ border: "1px solid #b89562", color: "#fff3d7", background: mode === value ? "#875b35" : "#402517",
              borderRadius: 5, padding: "3px 6px", cursor: "pointer" }}>{label}</button>)}
      </div>
    </div>
  </>;
}
