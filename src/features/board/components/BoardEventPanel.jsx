import { useEffect, useMemo, useState } from "react";
import { BLOCKED_REASON_MESSAGES } from "../data/boardContent.js";

function PanelShell({ title, children, onClose }) {
  return (
    <section
      className="absolute left-[33%] top-[39%] z-30 w-[31%] max-h-[36%] overflow-auto rounded-[1.1cqw] border-[0.16cqw] border-[#8a5728] bg-[#f2d7a7]/95 px-[1.2cqw] py-[0.9cqw] font-inria-serif text-[#3e2818] shadow-[0_0.5cqw_1.5cqw_rgba(40,19,4,0.35)]"
      aria-label={title}
    >
      <div className="flex items-center justify-between gap-[1cqw]">
        <h2 className="m-0 text-[1.1cqw] font-bold">{title}</h2>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="border-0 bg-transparent p-0 text-[1.2cqw] text-[#5d3820]"
            aria-label="칸 정보 닫기"
          >
            ×
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

function ChallengeCandidates({ candidates, isMutating, onOpenChallenge }) {
  return (
    <PanelShell title="문제 선택">
      <p className="my-[0.45cqw] text-[0.72cqw]">
        현재 칸에서 도전할 문제를 선택해주세요.
      </p>
      <div className="grid gap-[0.4cqw]">
        {candidates.map((candidate) => (
          <button
            key={candidate.challengeId}
            type="button"
            disabled={isMutating}
            onClick={() => onOpenChallenge(candidate.challengeId)}
            className="flex min-h-[2.25cqw] items-center justify-between gap-[0.7cqw] rounded-[0.35cqw] border border-[#9a6539] bg-[#fff2cf]/90 px-[0.65cqw] py-[0.35cqw] text-left text-[#3e2818] hover:brightness-105 disabled:cursor-wait disabled:opacity-60"
          >
            <span className="min-w-0">
              <strong className="block truncate text-[0.78cqw]">
                {candidate.title}
              </strong>
              <span className="block text-[0.6cqw] opacity-80">
                {[candidate.category, candidate.clubName]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </span>
            <span className="shrink-0 text-[0.72cqw] font-bold">
              {candidate.score} P
            </span>
          </button>
        ))}
      </div>
    </PanelShell>
  );
}

function AirportDestination({ cells, consumedCellIndexes, isMutating, onMoveAirport }) {
  const firstAvailable = useMemo(
    () =>
      cells.find((cell) => !consumedCellIndexes.includes(cell.cellIndex))
        ?.cellIndex ?? "",
    [cells, consumedCellIndexes],
  );
  const [destinationIndex, setDestinationIndex] = useState(firstAvailable);

  useEffect(() => {
    setDestinationIndex(firstAvailable);
  }, [firstAvailable]);

  return (
    <PanelShell title="공항 이동">
      <p className="my-[0.45cqw] text-[0.72cqw]">
        아직 소모하지 않은 목적지를 선택해주세요.
      </p>
      <div className="flex gap-[0.55cqw]">
        <select
          value={destinationIndex}
          onChange={(event) => setDestinationIndex(Number(event.target.value))}
          className="min-w-0 flex-1 rounded-[0.3cqw] border border-[#9a6539] bg-[#fff2cf] px-[0.5cqw] py-[0.35cqw] text-[0.7cqw]"
        >
          {cells.map((cell) => (
            <option
              key={cell.cellIndex}
              value={cell.cellIndex}
              disabled={consumedCellIndexes.includes(cell.cellIndex)}
            >
              {cell.cellIndex}번 · {cell.name || cell.type}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={isMutating || destinationIndex === ""}
          onClick={() => onMoveAirport(Number(destinationIndex))}
          className="rounded-[0.3cqw] border border-[#70411e] bg-[#75451f] px-[0.85cqw] text-[0.72cqw] font-bold text-[#fff2cf] disabled:cursor-not-allowed disabled:opacity-60"
        >
          이동
        </button>
      </div>
    </PanelShell>
  );
}

export default function BoardEventPanel({
  cells,
  myBoard,
  currentCell,
  pendingRoll,
  blockedReason,
  selectedCell,
  isMutating,
  onConfirmDice,
  onOpenChallenge,
  onMoveAirport,
  onClearSelectedCell,
}) {
  if (!myBoard) return null;

  if (pendingRoll || blockedReason === "PENDING_CONFIRM") {
    return (
      <PanelShell title="주사위 결과 확인">
        <p className="my-[0.55cqw] text-[0.76cqw]">
          {pendingRoll
            ? `${pendingRoll.diceA} + ${pendingRoll.diceB} = ${pendingRoll.rolledNumber}, ${pendingRoll.currentPosition}번 칸으로 이동합니다.`
            : "보류 중인 주사위 이동 결과가 있습니다."}
        </p>
        <button
          type="button"
          disabled={isMutating}
          onClick={onConfirmDice}
          className="w-full rounded-[0.35cqw] border border-[#70411e] bg-[#75451f] py-[0.45cqw] text-[0.72cqw] font-bold text-[#fff2cf] disabled:cursor-wait disabled:opacity-60"
        >
          이동 확정
        </button>
      </PanelShell>
    );
  }

  if (
    currentCell?.type === "CHALLENGE" &&
    currentCell.challengeCandidates.length > 0
  ) {
    return (
      <ChallengeCandidates
        candidates={currentCell.challengeCandidates}
        isMutating={isMutating}
        onOpenChallenge={onOpenChallenge}
      />
    );
  }

  if (currentCell?.type === "AIRPORT" && !myBoard.airportMoveUsed) {
    return (
      <AirportDestination
        cells={cells}
        consumedCellIndexes={myBoard.consumedCellIndexes}
        isMutating={isMutating}
        onMoveAirport={onMoveAirport}
      />
    );
  }

  if (selectedCell) {
    return (
      <PanelShell title={`${selectedCell.cellIndex}번 칸`} onClose={onClearSelectedCell}>
        <dl className="my-[0.45cqw] grid grid-cols-[auto_1fr] gap-x-[0.7cqw] gap-y-[0.25cqw] text-[0.72cqw]">
          <dt className="font-bold">이름</dt>
          <dd>{selectedCell.name || "—"}</dd>
          <dt className="font-bold">종류</dt>
          <dd>{selectedCell.type}</dd>
          <dt className="font-bold">난이도</dt>
          <dd>{selectedCell.difficulty || "—"}</dd>
        </dl>
      </PanelShell>
    );
  }

  if (myBoard.boardCompleted || myBoard.activeChallenge) {
    const message = myBoard.boardCompleted
      ? BLOCKED_REASON_MESSAGES.BOARD_COMPLETED
      : BLOCKED_REASON_MESSAGES.TIMER_RUNNING;
    return (
      <PanelShell title={myBoard.boardCompleted ? "보드 완료" : "진행 중인 문제"}>
        <p className="my-[0.45cqw] text-[0.72cqw]">{message}</p>
      </PanelShell>
    );
  }

  return null;
}
