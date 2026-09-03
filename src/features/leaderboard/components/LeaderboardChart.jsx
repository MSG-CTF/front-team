import styles from "./LeaderboardScreen.module.css";

const DEFAULT_LEGEND_TEXT_BOXES = [
  { x: 0, y: 0, width: 133, height: 28 },
  { x: 0, y: 48, width: 133, height: 28 },
  { x: 1, y: 96, width: 133, height: 28 },
  { x: 0, y: 143, width: 133, height: 28 },
  { x: 0, y: 189, width: 133, height: 28 },
  { x: 0, y: 234, width: 133, height: 28 },
];

const MAX_LEGEND_TEAMS = 8;
const COMPACT_LEGEND_LAST_Y = 234;

function getLegendTextBoxes(teamCount) {
  if (teamCount <= DEFAULT_LEGEND_TEXT_BOXES.length) {
    return DEFAULT_LEGEND_TEXT_BOXES.slice(0, teamCount);
  }

  const gap = COMPACT_LEGEND_LAST_Y / (teamCount - 1);

  return Array.from({ length: teamCount }, (_, index) => ({
    x: 0,
    y: Math.round(index * gap),
    width: 133,
    height: 28,
  }));
}

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
  const visibleTeams = teams.slice(0, MAX_LEGEND_TEAMS);
  const legendTextBoxes = getLegendTextBoxes(visibleTeams.length);

  return (
    <aside
      className={`${styles.leaderboardChart} ${visibleTeams.length > 6 ? styles.compactLegend : ""}`}
      aria-label="그래프 팀 범례"
    >
      {visibleTeams.map((team, index) => (
        <div
          className={`${styles.legendRow} ${team.isTop3 ? styles.legendTop3 : ""}`}
          key={team.key}
          style={toTextBoxStyle(legendTextBoxes[index])}
          data-is-top3={team.isTop3 || undefined}
          aria-label={team.isTop3 ? `TOP 3 ${team.name}` : team.name}
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
