import styles from "./ChallengeDetailScene.module.css";

export default function InstanceControls({
  instance,
  otherInstance,
  controls,
  unavailable,
  pendingAction,
  onAction,
}) {
  const busy = pendingAction != null;
  const actions = [
    {
      key: "create",
      className: styles.btnCreate,
      enabled: controls.canCreate,
      label: otherInstance ? "SWITCH" : "CREATE",
      aria: "인스턴스 생성",
    },
    {
      key: "extend",
      className: styles.btnExtend,
      enabled: controls.canExtend,
      label: "EXTEND",
      aria: "인스턴스 TTL 연장",
    },
    {
      key: "restart",
      className: styles.btnRestart,
      enabled: controls.canRestart,
      label: "RESTART",
      aria: "인스턴스 재시작",
    },
    {
      key: "stop",
      className: styles.btnStop,
      enabled: controls.canStop,
      label: "STOP",
      aria: "인스턴스 종료",
    },
  ];
  const hasHint =
    controls.extendLimitReached ||
    controls.expired ||
    (otherInstance && otherInstance.status !== "RUNNING");
  return (
    <>
      <div
        className={styles.controls}
        role="group"
        aria-label="인스턴스 작업"
        aria-busy={["create", "extend", "restart", "stop"].includes(
          pendingAction,
        )}
      >
        {actions.map(({ key, className, enabled, label, aria }) => (
          <button
            key={key}
            type="button"
            className={`${styles.actionButton} ${className}`}
            onClick={() => onAction(key)}
            disabled={!enabled || unavailable || busy}
            aria-label={aria}
          >
            {pendingAction === key ? "…" : label}
          </button>
        ))}
      </div>
      {hasHint && (
        <p className={styles.controlHints}>
          {controls.extendLimitReached && (
            <span>연장 횟수 3회를 모두 사용했습니다</span>
          )}
          {controls.expired && (
            <span>사용 시간이 만료됐습니다. 서버 상태를 확인하고 있습니다</span>
          )}
          {otherInstance && otherInstance.status !== "RUNNING" && (
            <span>다른 인스턴스의 준비가 끝나면 전환할 수 있습니다</span>
          )}
        </p>
      )}
    </>
  );
}
