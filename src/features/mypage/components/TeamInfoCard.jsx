import styles from "./MyPageScreen.module.css";

export default function TeamInfoCard({
  panelSrc,
  cleanTeamSourceSrc,
  teamName,
  members,
  status,
}) {
  let visibleTeamName = teamName || "—";
  if (status === "loading") visibleTeamName = "LOADING";
  if (status === "error") visibleTeamName = "UNAVAILABLE";

  return (
    <section className={styles.teamInfoCard} aria-label="팀 정보">
      <img src={panelSrc} alt="" aria-hidden="true" className={styles.teamPanelImage} />

      <div className={styles.teamNameCleanClip} aria-hidden="true">
        <img src={cleanTeamSourceSrc} alt="" className={styles.teamNameCleanImage} />
      </div>

      <p className={styles.teamName}>{visibleTeamName}</p>

      {status === "success" &&
        members.slice(0, 2).map((member, index) => (
          <p
            key={`${member}-${index}`}
            className={styles.memberName}
            style={{ top: `${567 + index * 56}px` }}
          >
            {member}
          </p>
        ))}
    </section>
  );
}
