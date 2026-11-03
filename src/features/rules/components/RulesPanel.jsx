import { Fragment } from "react";
import styles from "./RulesScreen.module.css";

// 넓은 화면은 규칙을 앞뒤 두 단으로 나눠 판 안에 스크롤 없이 다 보인다 좁은 화면은 한 줄로 이어진다
export default function RulesPanel({ rules }) {
  const half = Math.ceil(rules.length / 2);
  const columns = [rules.slice(0, half), rules.slice(half)].filter((column) => column.length > 0);
  return (
    <section className={styles.rulesPanel} aria-labelledby="rules-heading">
      <h1 id="rules-heading" className={styles.visuallyHidden}>
        게임 규칙
      </h1>
      {/* 판 그림의 제목줄 자리 다른 경기 판의 DESCRIPTION·ATTACHMENTS 와 같은 글꼴이다 */}
      <p className={styles.panelLabel} aria-hidden="true">RULES</p>

      <div className={styles.rulesList}>
        {columns.map((column) => (
          <div key={column[0].title} className={styles.rulesColumn}>
            {column.map((rule) => (
              <article key={rule.title} className={styles.ruleItem}>
                <h2 className={styles.ruleTitle}>
                  {rule.title}
                </h2>
                <p className={styles.ruleDescription}>
                  {Array.isArray(rule.description)
                    ? rule.description.map((line, index) => <Fragment key={line}>{index > 0 && <br />}{line}</Fragment>)
                    : rule.description}
                </p>
              </article>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
