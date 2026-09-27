import styles from "./MyPageScreen.module.css";

export default function TeamInfoCard({
  panelSrc,
  teamName,
  members,
  status,
  children,
  footer,
}) {
  let visibleTeamName = teamName || "—";
  if (status === "loading") visibleTeamName = "LOADING";
  if (status === "error") visibleTeamName = "UNAVAILABLE";
  return (
    <section
      className={styles.teamInfoCard}
      aria-label="팀 정보"
      style={{ borderImageSource: "url(" + panelSrc + ")" }}
    >
      <p className={styles.teamRibbon}>TEAM</p>
      <h1 className={styles.teamName} title={visibleTeamName}>
        {visibleTeamName}
      </h1>
      {children}
      <div className={styles.members}>
        <h2>MEMBERS</h2>
        <ul>
          {status === "success" &&
            members.slice(0, 2).map((member, index) => (
              <li key={member + index} title={member}>
                {member}
              </li>
            ))}
        </ul>
      </div>
      {footer}
      <p className={styles.teamSignature}>MSG CTF</p>
    </section>
  );
}
