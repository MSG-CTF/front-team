import { PrizeTotal, PrizeList } from "./Prizes.jsx";

export default function EventPrizes() {
  return (
    <section
      id="prizes"
      className="event-section prize-section"
      aria-labelledby="prizes-title"
    >
      <h2 id="prizes-title">시상 안내</h2>
      <div className="prize-layout">
        <div className="prize-total">
          <span>총 시상액</span>
          <PrizeTotal />
          <p className="prize-caption">내부와 외부, 각 트랙의 TOP 3</p>
        </div>
        <div className="prize-details">
          <PrizeList />
        </div>
      </div>
    </section>
  );
}
