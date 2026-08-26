import styles from "./LeaderboardScreen.module.css";

export default function ScoreBoard({ staticAssetSrc, dynamicGraph = null }) {
  return (
    <section className={styles.scoreBoard} aria-label="팀별 누적 점수 변화">
      {dynamicGraph ? (
        <div className={styles.dynamicGraph}>{dynamicGraph}</div>
      ) : (
        <img
          src={staticAssetSrc}
          alt="Figma에 정의된 정적 점수 변화 그래프"
          className={styles.scoreArtwork}
        />
      )}
    </section>
  );
}
