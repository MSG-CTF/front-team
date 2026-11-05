import { AdminBadge } from "./AdminLayout.jsx";
import { describeSchedulerObservation } from "../utils/adminInstanceForce.js";
import { formatAdminTime } from "../utils/adminTime.js";
import styles from "./AdminWorkspace.module.css";

// Scheduler 관측 상태 표시 DB 상태 배지와 따로 두어 둘을 섞어 읽지 않게 한다
// 관측값은 참고 정보다 정리 완료 여부는 DB 상태로만 판단한다
export default function AdminSchedulerObservation({ observation, now = Date.now(), detailed = false }) {
  const view = describeSchedulerObservation(observation, now);
  const checked = view.checkedAt ? `${formatAdminTime(view.checkedAt)} 확인` : "확인 기록 없음";
  return <span className={styles.observation} data-state={view.state}>
    <span className={styles.observationTop}>
      <AdminBadge tone={view.tone}>{view.label}</AdminBadge>
      {view.remoteLabel && view.state !== "error" && <span className={styles.observationRemote}>{view.state === "stale" ? "마지막 " : ""}{view.remoteLabel}</span>}
    </span>
    <span className={styles.secondary}>{checked}</span>
    {(detailed || view.state === "error" || view.state === "mismatch") && <span className={styles.secondary}>{view.detail}</span>}
  </span>;
}
