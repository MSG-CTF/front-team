import {
  INSTANCE_STATUS,
  INSTANCE_STATUS_LABEL,
  UNKNOWN_INSTANCE_STATUS_LABEL,
} from "../../../constants/enums.js";
import { formatRemaining, toKst } from "../../../utils/time.js";
import styles from "./ChallengeDetailScreen.module.css";

export default function InstancePanel({ instance, error }) {
  const status = instance?.status ?? null;
  const isRunning = !error && status === INSTANCE_STATUS.RUNNING;
  const statusLabel = error
    ? "조회 실패"
    : status
      ? (INSTANCE_STATUS_LABEL[status] ?? UNKNOWN_INSTANCE_STATUS_LABEL)
      : "인스턴스 없음";
  const remainingSeconds = isRunning
    ? (instance?.remainingSeconds ?? null)
    : null;
  const extendsUsed = instance?.extendsUsed ?? null;
  const endpoints = instance?.endpoints ?? [];
  return (
    <section
      className={styles.instancePanel}
      aria-label={
        "인스턴스 상태 " +
        statusLabel +
        ", 잔여 " +
        formatRemaining(remainingSeconds) +
        ", 연장 횟수 " +
        (extendsUsed ?? "미제공")
      }
    >
      <div className={styles.instanceHeader}>
        <h2 className={styles.sectionHeading}>인스턴스</h2>
        <span
          className={isRunning ? styles.runningBadge : styles.instanceBadge}
        >
          {statusLabel}
        </span>
      </div>
      <p className={styles.consoleLabel}>접속 주소</p>
      <div
        className={styles.endpoints}
        tabIndex={0}
        aria-label="인스턴스 접속 정보"
      >
        {isRunning && endpoints.length > 0 ? (
          endpoints.map((endpoint) => (
            <div key={endpoint.url} className={styles.endpoint}>
              <span className={styles.endpointName}>{endpoint.name}</span>
              {endpoint.isWeb ? (
                <a
                  href={endpoint.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {endpoint.url}
                </a>
              ) : (
                <span className={styles.connectionText}>{endpoint.url}</span>
              )}
            </div>
          ))
        ) : (
          <span className={styles.connectionText}>
            {error
              ? "접속 정보를 불러오지 못했습니다"
              : isRunning
                ? instance.connectUrl || "접속 주소 준비 중"
                : "실행 후 접속 주소가 표시됩니다"}
          </span>
        )}
      </div>
      <dl className={styles.instanceMetrics}>
        <div>
          <dt>남은 시간</dt>
          <dd>{formatRemaining(remainingSeconds)}</dd>
        </div>
        <div>
          <dt>연장 횟수</dt>
          <dd>{extendsUsed ?? "—"}</dd>
        </div>
      </dl>
      {instance?.hardExpiresAt && (
        <p className={styles.hardExpiry}>
          최대 종료 {toKst(instance.hardExpiresAt)} KST
        </p>
      )}
    </section>
  );
}
