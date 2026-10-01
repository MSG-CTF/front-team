import { useEffect, useState } from "react";
import styles from "./BoardScreen.module.css";

function Reward({ reward }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const timeout = window.setTimeout(() => setVisible(false), 4800);
    return () => window.clearTimeout(timeout);
  }, []);
  if (!visible) return null;
  const title = reward.kind === "lap" ? "한 바퀴 완주" : "출발칸 보상";
  const amount = reward.mileageGained.toLocaleString("ko-KR");
  return (
    <div className={styles.startReward} data-board-start-reward={reward.kind} role="status" aria-live="polite" aria-atomic="true">
      <span className="sr-only">{title}{reward.mileageGained > 0 ? `, ${amount} 마일리지 적립` : ""}{reward.rollGained > 0 ? `, 주사위 ${reward.rollGained}개 충전` : ""}</span>
      <div aria-hidden="true" className={styles.startRewardVisual}>
        <span className={styles.startRewardTitle}>{title}</span>
        {reward.mileageGained > 0 && <strong className={styles.startRewardAmount}>
          <svg viewBox="0 0 40 40" className={styles.startRewardCoin} aria-hidden="true">
            <circle cx="20" cy="20" r="18" fill="#d8ab56" stroke="#65441d" strokeWidth="2" />
            <circle cx="20" cy="20" r="14" fill="#f1cd82" stroke="#b17e34" strokeWidth="1" />
            <path d="M12 27V13h3l5 8 5-8h3v14h-4v-8l-4 6-4-6v8Z" fill="#805321" />
          </svg>
          <span>+{amount}<small> M</small></span>
        </strong>}
        {reward.rollGained > 0 && <span className={styles.startRewardRoll}>주사위 +{reward.rollGained}</span>}
      </div>
    </div>
  );
}

export default function BoardStartReward({ reward }) {
  return reward ? <Reward key={reward.token} reward={reward} /> : null;
}
