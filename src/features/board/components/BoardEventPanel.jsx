import { useEffect, useMemo, useState } from "react";
import { BLOCKED_REASON_MESSAGES } from "../data/boardContent.js";

const OFFSET_OPTIONS = [-3, -2, -1, 1, 2, 3];

function PanelShell({ title, children, onClose }) {
  return (
    <section
      className="absolute left-[33%] top-[36%] z-30 max-h-[43%] w-[31%] overflow-auto rounded-[1.1cqw] border-[0.16cqw] border-[#8a5728] bg-[#f2d7a7]/95 px-[1.2cqw] py-[0.9cqw] font-inria-serif text-[#3e2818] shadow-[0_0.5cqw_1.5cqw_rgba(40,19,4,0.35)]"
      aria-label={title}
    >
      <div className="flex items-center justify-between gap-[1cqw]">
        <h2 className="m-0 text-[1.1cqw] font-bold">{title}</h2>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="border-0 bg-transparent p-0 text-[1.2cqw] text-[#5d3820]"
            aria-label="팝업 닫기"
          >
            ×
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

function ActionButton({ children, disabled, onClick }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-[0.3cqw] border border-[#70411e] bg-[#75451f] px-[0.7cqw] py-[0.38cqw] text-[0.7cqw] font-bold text-[#fff2cf] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {children}
    </button>
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
                  .join(" / ")}
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
              {cell.cellIndex}번 / {cell.name || cell.type}
            </option>
          ))}
        </select>
        <ActionButton
          disabled={isMutating || destinationIndex === ""}
          onClick={() => onMoveAirport(Number(destinationIndex))}
        >
          이동
        </ActionButton>
      </div>
    </PanelShell>
  );
}

function PendingRollActions({
  pendingRoll,
  postRollCards,
  isMutating,
  onConfirmDice,
  onUseChanceCard,
}) {
  const [offset, setOffset] = useState(1);

  return (
    <PanelShell title="주사위 결과 확인">
      <p className="my-[0.55cqw] text-[0.76cqw]">
        {pendingRoll
          ? `${pendingRoll.diceA} + ${pendingRoll.diceB} = ${pendingRoll.rolledNumber}, ${pendingRoll.currentPosition}번 칸으로 이동합니다.`
          : "보류 중인 주사위 이동 결과가 있습니다."}
      </p>
      <div className="grid gap-[0.35cqw]">
        <ActionButton disabled={isMutating} onClick={onConfirmDice}>
          일반 이동 확정
        </ActionButton>
        {postRollCards.map((card) => (
          <div
            key={card.cardId}
            className="flex items-center gap-[0.35cqw] rounded border border-[#b1814f] bg-[#fff2cf]/70 p-[0.3cqw]"
          >
            <span className="min-w-0 flex-1 truncate text-[0.66cqw]">
              {card.name || card.cardId}
            </span>
            {card.cardId === "card_move_offset" && (
              <select
                aria-label="추가 이동 칸 수"
                value={offset}
                disabled={isMutating}
                onChange={(event) => setOffset(Number(event.target.value))}
                className="rounded border border-[#9a6539] bg-[#fff2cf] px-[0.2cqw] py-[0.18cqw] text-[0.62cqw]"
              >
                {OFFSET_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {value > 0 ? `+${value}` : value}칸
                  </option>
                ))}
              </select>
            )}
            <ActionButton
              disabled={isMutating}
              onClick={() =>
                onUseChanceCard(
                  card.cardId,
                  card.cardId === "card_move_offset" ? { offset } : undefined,
                )
              }
            >
              카드 사용
            </ActionButton>
          </div>
        ))}
      </div>
    </PanelShell>
  );
}

function ChanceChoice({ choice, isMutating, onConfirmChance }) {
  return (
    <PanelShell title="주사위 결과 선택">
      <p className="my-[0.45cqw] text-[0.72cqw]">
        두 결과 중 이동에 사용할 숫자를 선택해주세요.
      </p>
      <div className="grid grid-cols-2 gap-[0.45cqw]">
        <ActionButton
          disabled={isMutating}
          onClick={() => onConfirmChance("FIRST")}
        >
          첫 번째 {choice.firstNumber}
        </ActionButton>
        <ActionButton
          disabled={isMutating}
          onClick={() => onConfirmChance("SECOND")}
        >
          두 번째 {choice.secondNumber}
        </ActionButton>
      </div>
    </PanelShell>
  );
}

function DiscardChanceCard({ cards, isMutating, onDiscardChance }) {
  const [cardId, setCardId] = useState(cards[0]?.cardId ?? "");

  useEffect(() => {
    setCardId(cards[0]?.cardId ?? "");
  }, [cards]);

  return (
    <PanelShell title="찬스카드 폐기">
      <p className="my-[0.45cqw] text-[0.72cqw]">
        보유 한도를 초과했습니다. 다른 행동 전에 한 장을 선택해 폐기해주세요.
      </p>
      <div className="grid gap-[0.3cqw]">
        {cards.map((card) => (
          <label
            key={card.cardId}
            className="flex cursor-pointer items-start gap-[0.35cqw] rounded border border-[#a97949] bg-[#fff2cf]/70 p-[0.35cqw] text-[0.65cqw]"
          >
            <input
              type="radio"
              name="discard-card"
              value={card.cardId}
              checked={cardId === card.cardId}
              disabled={isMutating}
              onChange={() => setCardId(card.cardId)}
            />
            <span>
              <strong className="block">{card.name || card.cardId}</strong>
              <span>{card.description}</span>
            </span>
          </label>
        ))}
        <ActionButton
          disabled={isMutating || !cardId}
          onClick={() => onDiscardChance(cardId)}
        >
          선택한 카드 폐기
        </ActionButton>
      </div>
    </PanelShell>
  );
}

function ChanceDrawEvent({ event, isMutating, onRetry, onClose }) {
  if (event.status === "loading") {
    return (
      <PanelShell title="황금열쇠">
        <p className="my-[0.55cqw] text-[0.72cqw]">
          찬스카드를 뽑고 있습니다.
        </p>
      </PanelShell>
    );
  }

  if (event.status === "error") {
    return (
      <PanelShell title="황금열쇠" onClose={onClose}>
        <p className="my-[0.55cqw] text-[0.72cqw]">
          {event.error.message}
        </p>
        <ActionButton
          disabled={isMutating}
          onClick={() => onRetry(event.token)}
        >
          다시 시도
        </ActionButton>
      </PanelShell>
    );
  }

  return (
    <PanelShell title="황금열쇠" onClose={onClose}>
      <dl className="my-[0.5cqw] grid grid-cols-[auto_1fr] gap-x-[0.6cqw] gap-y-[0.28cqw] text-[0.68cqw]">
        <dt className="font-bold">카드</dt>
        <dd>{event.result.name || event.result.cardId}</dd>
        <dt className="font-bold">설명</dt>
        <dd>{event.result.description || "-"}</dd>
        <dt className="font-bold">효과</dt>
        <dd>{event.result.effect || "-"}</dd>
      </dl>
    </PanelShell>
  );
}

function RouletteEvent({ event, isMutating, onSpin, onClose }) {
  return (
    <PanelShell title="룰렛" onClose={event.status === "success" ? onClose : undefined}>
      {event.status === "success" ? (
        <dl className="my-[0.5cqw] grid grid-cols-[auto_1fr] gap-x-[0.6cqw] gap-y-[0.3cqw] text-[0.72cqw]">
          {event.result.label && (
            <>
              <dt className="font-bold">결과</dt>
              <dd>{event.result.label}</dd>
            </>
          )}
          <dt className="font-bold">획득 마일리지</dt>
          <dd>{event.result.mileageGained}</dd>
          <dt className="font-bold">총 마일리지</dt>
          <dd>{event.result.totalMileage}</dd>
        </dl>
      ) : (
        <>
          <p className="my-[0.5cqw] text-[0.72cqw]">
            룰렛을 돌려 마일리지를 획득하세요.
          </p>
          <ActionButton
            disabled={isMutating}
            onClick={() => onSpin(event.token)}
          >
            {isMutating ? "처리 중" : "룰렛 돌리기"}
          </ActionButton>
        </>
      )}
    </PanelShell>
  );
}

export default function BoardEventPanel({
  cells,
  myBoard,
  currentCell,
  pendingRoll,
  pendingChanceChoice,
  cellEvent,
  ownedChanceCards,
  awaitingDiscard,
  blockedReason,
  selectedCell,
  isMutating,
  onConfirmDice,
  onOpenChallenge,
  onMoveAirport,
  onUseChanceCard,
  onConfirmChance,
  onDiscardChance,
  onSpinRoulette,
  onRetryChanceDraw,
  onCloseCellEvent,
  onClearSelectedCell,
}) {
  if (!myBoard) return null;

  if (awaitingDiscard) {
    return (
      <DiscardChanceCard
        cards={ownedChanceCards}
        isMutating={isMutating}
        onDiscardChance={onDiscardChance}
      />
    );
  }

  if (pendingChanceChoice) {
    return (
      <ChanceChoice
        choice={pendingChanceChoice}
        isMutating={isMutating}
        onConfirmChance={onConfirmChance}
      />
    );
  }

  if (pendingRoll || blockedReason === "PENDING_CONFIRM") {
    const postRollCards = ownedChanceCards.filter(
      (card) => card.usableNow && card.usageTiming === "POST_ROLL",
    );
    return (
      <PendingRollActions
        pendingRoll={pendingRoll}
        postRollCards={postRollCards}
        isMutating={isMutating}
        onConfirmDice={onConfirmDice}
        onUseChanceCard={onUseChanceCard}
      />
    );
  }

  if (cellEvent?.type === "CHANCE") {
    return (
      <ChanceDrawEvent
        event={cellEvent}
        isMutating={isMutating}
        onRetry={onRetryChanceDraw}
        onClose={onCloseCellEvent}
      />
    );
  }

  if (cellEvent?.type === "ROULETTE") {
    return (
      <RouletteEvent
        event={cellEvent}
        isMutating={isMutating}
        onSpin={onSpinRoulette}
        onClose={onCloseCellEvent}
      />
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
      <PanelShell
        title={`${selectedCell.cellIndex}번 칸`}
        onClose={onClearSelectedCell}
      >
        <dl className="my-[0.45cqw] grid grid-cols-[auto_1fr] gap-x-[0.7cqw] gap-y-[0.25cqw] text-[0.72cqw]">
          <dt className="font-bold">이름</dt>
          <dd>{selectedCell.name || "-"}</dd>
          <dt className="font-bold">종류</dt>
          <dd>{selectedCell.type}</dd>
          <dt className="font-bold">난이도</dt>
          <dd>{selectedCell.difficulty || "-"}</dd>
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
