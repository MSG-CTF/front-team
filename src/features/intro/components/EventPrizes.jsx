import { PrizeTotal, PrizeList, RankAwards, SpecialAwards } from "./Prizes.jsx";

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
          <p className="prize-caption">내부·외부 트랙별 1~3위 시상</p>
        </div>
        <div className="prize-details">
          <RankAwards />
          <SpecialAwards />
          <PrizeList />
        </div>
      </div>
    </section>
  );
}
