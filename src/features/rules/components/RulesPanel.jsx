import styles from "./RulesScreen.module.css";

export default function RulesPanel({ rules }) {
  return (
    <section className={styles.rulesPanel} aria-labelledby="rules-heading">
      <img
        src="/assets/rules/rules-panel.png"
        alt=""
        aria-hidden="true"
        className={styles.rulesPanelImage}
      />

      <h1 id="rules-heading" className={styles.visuallyHidden}>
        게임 규칙
      </h1>

      <div className={styles.rulesList}>
        {rules.map((rule) => (
          <article key={rule.title} className={styles.ruleItem}>
            <h2 className={styles.ruleTitle}>
              <span aria-hidden="true">{rule.icon}</span> {rule.title}
            </h2>
            <p className={styles.ruleDescription}>{rule.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
