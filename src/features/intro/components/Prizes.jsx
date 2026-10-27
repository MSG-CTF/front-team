import { eventConfig } from "../config/eventConfig.js";
import { formatWon, getPrizes } from "../utils/eventData.js";

export function PrizeTotal({ as: Tag = "p" }) {
  const prizes = getPrizes(eventConfig.prizes);
  return (
    <Tag data-prize-total="" className={prizes ? "is-confirmed" : undefined}>
      {prizes ? formatWon(prizes.trackTotal) : "추후 공개"}
    </Tag>
  );
}

export function RankAwards() {
  if (!getPrizes(eventConfig.prizes)) return null;
  return (
    <dl className="rank-awards" aria-label="두 트랙 공통 순위별 상 이름">
      {eventConfig.prizes.rankAwards.map((award, index) => (
        <div key={award}>
          <dt>{index + 1}위</dt>
          <dd>{award}</dd>
        </div>
      ))}
    </dl>
  );
}

export function SpecialAwards() {
  const prizes = getPrizes(eventConfig.prizes);
  if (!prizes?.specialAwards.length) return null;
  return (
    <div className="special-awards">
      {prizes.specialAwards.map((award) => (
        <article
          className="special-award"
          key={award.label}
          aria-label={award.label}
        >
          <div className="special-award-copy">
            <h3>{award.label}</h3>
            {award.description && <p>{award.description}</p>}
          </div>
          <p className="special-award-amount">
            <strong>{formatWon(award.amount)}</strong>
          </p>
          {award.selectionNote && (
            <p className="special-award-note">{award.selectionNote}</p>
          )}
        </article>
      ))}
    </div>
  );
}

export function PrizeList({ table = false }) {
  const prizes = getPrizes(eventConfig.prizes);
  if (!prizes) return <p>상금과 순위별 시상 내역은 추후 공개합니다</p>;
  if (table)
    return (
      <table className="prize-table" aria-label="내부와 외부 트랙 순위별 상금">
        <thead>
          <tr>
            {["구분", "1위", "2위", "3위"].map((label) => (
              <th key={label} scope="col">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {prizes.tracks.map((track) => (
            <tr key={track.label}>
              <th scope="row">{track.label}</th>
              {track.amounts.map((amount, index) => (
                <td key={index}>
                  {amount % 10000 === 0 ? (
                    <>
                      {(amount / 10000).toLocaleString("ko-KR")}
                      <wbr />만원
                    </>
                  ) : formatWon(amount)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  return (
    <div className="prize-showcase">
      {prizes.tracks.map((track) => (
        <article className="prize-track" key={track.label}>
          <h3>{track.label}</h3>
          <p className="prize-first">
            <span>1위</span>
            <strong>
              {(track.amounts[0] / 10000).toLocaleString("ko-KR")}
              <small>만원</small>
            </strong>
          </p>
          <dl className="prize-runners">
            {track.amounts.slice(1).map((amount, index) => (
              <div key={index}>
                <dt>{index + 2}위</dt>
                <dd>{formatWon(amount)}</dd>
              </div>
            ))}
          </dl>
        </article>
      ))}
    </div>
  );
}
