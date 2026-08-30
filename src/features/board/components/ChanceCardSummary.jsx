export default function ChanceCardSummary({ cards }) {
  if (cards.length === 0) return null;

  return (
    <aside className="absolute left-[2.2%] top-[19.3%] z-20 w-[18%] rounded-[0.55cqw] border border-[#946231] bg-[#2a180d]/90 px-[0.7cqw] py-[0.5cqw] font-inria-serif text-[#f5dca9] shadow-lg">
      <h2 className="m-0 text-[0.72cqw] font-bold">보유 찬스카드</h2>
      <ul className="m-0 mt-[0.25cqw] list-none space-y-[0.2cqw] p-0">
        {cards.map((card) => (
          <li key={card.cardId} className="flex items-center justify-between gap-[0.4cqw] text-[0.58cqw]">
            <span className="truncate">{card.name || card.cardId}</span>
            <span className={card.usableNow ? "text-[#ffd36b]" : "opacity-60"}>
              {card.usableNow ? "사용 가능" : "사용 불가"}
            </span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
