import styles from "./LeaderboardScreen.module.css";

const LEGEND_TEXT_BOXES = [
  { x: 0, y: 0, width: 133, height: 28 },
  { x: 0, y: 48, width: 133, height: 28 },
  { x: 1, y: 96, width: 133, height: 28 },
  { x: 0, y: 143, width: 133, height: 28 },
  { x: 0, y: 189, width: 133, height: 28 },
  { x: 0, y: 234, width: 133, height: 28 },
];

const STATUS_MESSAGE = {
  loading: "LOADING TEAMS",
  empty: "NO TEAMS",
  error: "TEAM DATA UNAVAILABLE",
};

function toTextBoxStyle(box) {
  return {
    "--text-left": `${box.x}px`,
    "--text-top": `${box.y}px`,
    "--text-width": `${box.width}px`,
    "--text-height": `${box.height}px`,
  };
}

export default function LeaderboardChart({ teams, status }) {
  return (
    <aside className={styles.leaderboardChart} aria-label="그래프 팀 범례">
      {teams.slice(0, 6).map((team, index) => (
        <div
          className={styles.legendRow}
          key={team.key}
          style={toTextBoxStyle(LEGEND_TEXT_BOXES[index])}
        >
          <span className={styles.legendName}>{team.name}</span>
        </div>
      ))}
      {STATUS_MESSAGE[status] ? (
        <p className={styles.legendState}>{STATUS_MESSAGE[status]}</p>
      ) : null}
    </aside>
  );
}
