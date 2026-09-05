import { useEffect, useMemo, useState } from "react";

const OFFSET_OPTIONS = [-3, -2, -1, 1, 2, 3];

export default function ChanceCardSummary({
  cards,
  cells,
  consumedCellIndexes,
  isMutating,
  awaitingDiscard,
  pendingConfirm,
  onUseCard,
}) {
  const availableDestinations = useMemo(
    () =>
      cells.filter(
        (cell) => !consumedCellIndexes.includes(cell.cellIndex),
      ),
    [cells, consumedCellIndexes],
  );
  const [offset, setOffset] = useState(1);
  const [destinationIndex, setDestinationIndex] = useState("");

  useEffect(() => {
    setDestinationIndex(availableDestinations[0]?.cellIndex ?? "");
  }, [availableDestinations]);

  if (cards.length === 0) return null;

  const useCard = (card) => {
    if (card.cardId === "card_move_offset") {
      onUseCard(card.cardId, { offset });
      return;
    }
    if (card.cardId === "card_free_travel") {
      onUseCard(card.cardId, {
        destinationIndex: Number(destinationIndex),
      });
      return;
    }
    onUseCard(card.cardId);
  };

  return (
    <aside className="absolute left-[2.2%] top-[19.3%] z-20 w-[19.5%] max-h-[45%] overflow-auto rounded-[0.55cqw] border border-[#946231] bg-[#2a180d]/90 px-[0.7cqw] py-[0.5cqw] font-inria-serif text-[#f5dca9] shadow-lg">
      <h2 className="m-0 text-[0.72cqw] font-bold">보유 찬스카드</h2>
      {awaitingDiscard && (
        <p className="my-[0.25cqw] text-[0.52cqw] text-[#ffd36b]">
          카드 한 장을 먼저 폐기해주세요.
        </p>
      )}
      <ul className="m-0 mt-[0.25cqw] list-none space-y-[0.32cqw] p-0">
        {cards.map((card) => {
          const showPostRollAction =
            pendingConfirm && card.usageTiming === "POST_ROLL";
          const canUse =
            card.usableNow &&
            !awaitingDiscard &&
            !isMutating &&
            !showPostRollAction;

          return (
            <li
              key={card.cardId}
              className="rounded-[0.25cqw] border border-[#6f4929] bg-[#1f120a]/65 p-[0.28cqw] text-[0.56cqw]"
            >
              <div className="flex items-center justify-between gap-[0.35cqw]">
                <span className="truncate font-bold">
                  {card.name || card.cardId}
                </span>
                <span
                  className={card.usableNow ? "text-[#ffd36b]" : "opacity-60"}
                >
                  {card.usableNow ? "사용 가능" : "사용 불가"}
                </span>
              </div>

              {card.usableNow && !awaitingDiscard && !showPostRollAction && (
                <div className="mt-[0.24cqw] flex gap-[0.24cqw]">
                  {card.cardId === "card_move_offset" && (
                    <select
                      aria-label="추가 이동 칸 수"
                      value={offset}
                      onChange={(event) => setOffset(Number(event.target.value))}
                      disabled={isMutating}
                      className="min-w-0 flex-1 rounded border border-[#9a6539] bg-[#fff2cf] px-[0.2cqw] text-[#3e2818]"
                    >
                      {OFFSET_OPTIONS.map((value) => (
                        <option key={value} value={value}>
                          {value > 0 ? `+${value}` : value}칸
                        </option>
                      ))}
                    </select>
                  )}
                  {card.cardId === "card_free_travel" && (
                    <select
                      aria-label="자유 이동 목적지"
                      value={destinationIndex}
                      onChange={(event) =>
                        setDestinationIndex(Number(event.target.value))
                      }
                      disabled={isMutating}
                      className="min-w-0 flex-1 rounded border border-[#9a6539] bg-[#fff2cf] px-[0.2cqw] text-[#3e2818]"
                    >
                      {availableDestinations.map((cell) => (
                        <option key={cell.cellIndex} value={cell.cellIndex}>
                          {cell.cellIndex}번 {cell.name || cell.type}
                        </option>
                      ))}
                    </select>
                  )}
                  <button
                    type="button"
                    disabled={
                      !canUse ||
                      (card.cardId === "card_free_travel" &&
                        destinationIndex === "")
                    }
                    onClick={() => useCard(card)}
                    className="shrink-0 rounded border border-[#b77b3d] bg-[#75451f] px-[0.38cqw] py-[0.16cqw] font-bold text-[#fff2cf] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    사용
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
