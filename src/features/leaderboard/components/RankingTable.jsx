import styles from "./LeaderboardScreen.module.css";

const HEADER_BOXES = [
  { key: "teamName", label: "Team", x: 27, y: 0, width: 64, height: 28 },
  { key: "teamScore", label: "Point", x: 135, y: 0, width: 64, height: 28 },
  { key: "solveCount", label: "SOLVES", x: 224, y: 0, width: 97, height: 28 },
  { key: "misc", label: "MISC", x: 346, y: 0, width: 64, height: 28 },
  { key: "web", label: "WEB", x: 458, y: 0, width: 63, height: 28 },
  { key: "for", label: "FOR", x: 572, y: 0, width: 63, height: 28 },
  { key: "rev", label: "REV", x: 681, y: 0, width: 63, height: 28 },
  { key: "pwn", label: "PWN", x: 784, y: 0, width: 63, height: 28 },
  { key: "cry", label: "CRY", x: 891, y: 0, width: 63, height: 28 },
  { key: "osint", label: "OSINT", x: 982, y: 0, width: 73, height: 28 },
  { key: "web3", label: "WEB3", x: 1086, y: 0, width: 73, height: 28 },
  { key: "koth", label: "KOTH", x: 1185, y: 0, width: 73, height: 28 },
];

const DATA_COLUMNS = [
  { key: "teamName", x: 0, width: 109, centers: [58, 110, 154, 206, 250, 302] },
  { key: "teamScore", x: 109, width: 104, centers: [58, 108, 154, 204, 252, 303] },
  { key: "solveCount", x: 214, width: 104, centers: [59, 109, 155, 205, 253, 304] },
  { key: "misc", x: 319, width: 104, centers: [58, 108, 154, 204, 252, 303] },
  { key: "web", x: 432, width: 104, centers: [58, 108, 154, 204, 252, 303] },
  { key: "for", x: 541, width: 104, centers: [59, 109, 155, 205, 253, 304] },
  { key: "rev", x: 650, width: 104, centers: [58, 108, 154, 204, 252, 303] },
  { key: "pwn", x: 759, width: 104, centers: [58, 108, 154, 204, 252, 303] },
  { key: "cry", x: 862, width: 104, centers: [59, 109, 155, 205, 253, 304] },
  { key: "osint", x: 966, width: 104, centers: [59, 109, 155, 205, 253, 304] },
  { key: "web3", x: 1065, width: 104, centers: [59, 109, 155, 205, 253, 304] },
  { key: "koth", x: 1163, width: 104, centers: [59, 109, 155, 205, 253, 304] },
];

const DATA_TEXT_HEIGHT = 44;

function displayValue(value) {
  if (value == null) return "—";
  return String(value);
}

const STATUS_MESSAGE = {
  loading: "LOADING RANKING DATA",
  empty: "NO RANKING DATA",
  error: "RANKING DATA UNAVAILABLE",
};

function toTextBoxStyle(box) {
  return {
    "--text-left": `${box.x}px`,
    "--text-top": `${box.y}px`,
    "--text-width": `${box.width}px`,
    "--text-height": `${box.height}px`,
  };
}

function dataTextBox(column, rowIndex) {
  return {
    x: column.x,
    y: column.centers[rowIndex] - DATA_TEXT_HEIGHT / 2,
    width: column.width,
    height: DATA_TEXT_HEIGHT,
  };
}

export default function RankingTable({ rankings, status }) {
  return (
    <section className={styles.rankingTable} aria-label="팀 순위표">
      <div className={styles.tableHeader} aria-hidden="true">
        {HEADER_BOXES.map((header) => (
          <span
            className={`${styles.tableText} ${styles.tableHeaderText}`}
            key={header.key}
            style={toTextBoxStyle(header)}
          >
            {header.label}
          </span>
        ))}
      </div>

      <div className={styles.tableBody}>
        {rankings.slice(0, 6).map((ranking, rowIndex) => {
          const categoryScores = ranking.categoryScores ?? Array(9).fill(null);
          const values = [
            ranking.teamName,
            displayValue(ranking.teamScore),
            displayValue(ranking.solveCount),
            ...categoryScores.map(displayValue),
          ];

          return values.map((value, columnIndex) => {
            const column = DATA_COLUMNS[columnIndex];
            return (
              <span
                className={[
                  styles.tableText,
                  columnIndex === 0 ? styles.teamNameCell : "",
                  columnIndex === 1 ? styles.pointCell : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                key={`${ranking.key}-${column.key}`}
                style={toTextBoxStyle(dataTextBox(column, rowIndex))}
              >
                {value}
              </span>
            );
          });
        })}
      </div>

      {STATUS_MESSAGE[status] ? (
        <p className={styles.tableState}>{STATUS_MESSAGE[status]}</p>
      ) : null}
    </section>
  );
}
