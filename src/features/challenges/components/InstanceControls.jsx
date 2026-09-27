import styles from "./ChallengeDetailScreen.module.css";

export default function InstanceControls({
  instance,
  otherInstance,
  controls,
  unavailable,
  pendingAction,
  onAction,
}) {
  const busy = pendingAction != null;
  const canShowCreate =
    !instance?.instanceId ||
    ["STOPPED", "FAILED", "EXPIRED", "CLEANED"].includes(instance.status);
  return (
    <div className={styles.controlsSection}>
      <div
        className={styles.instanceControls}
        role="group"
        aria-label="인스턴스 작업"
        aria-busy={["create", "extend", "restart", "stop"].includes(
          pendingAction,
        )}
      >
        {canShowCreate ? (
          <button
            type="button"
            className={styles.createButton}
            onClick={() => onAction("create")}
            disabled={!controls.canCreate || unavailable || busy}
            aria-label="인스턴스 생성"
          >
            {pendingAction === "create"
              ? "생성 요청 중…"
              : otherInstance
                ? "이 문제로 전환"
                : "인스턴스 생성"}
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => onAction("extend")}
              disabled={!controls.canExtend || unavailable || busy}
              aria-label="인스턴스 TTL 연장"
            >
              {pendingAction === "extend" ? "연장 중…" : "시간 연장"}
            </button>
            <button
              type="button"
              onClick={() => onAction("restart")}
              disabled={!controls.canRestart || unavailable || busy}
              aria-label="인스턴스 재시작"
            >
              {pendingAction === "restart" ? "요청 중…" : "재시작"}
            </button>
            <button
              type="button"
              className={styles.stopButton}
              onClick={() => onAction("stop")}
              disabled={!controls.canStop || unavailable || busy}
              aria-label="인스턴스 종료"
            >
              {pendingAction === "stop" ? "종료 중…" : "종료"}
            </button>
          </>
        )}
      </div>
      {controls.extendLimitReached && (
        <p className={styles.controlHint}>연장 횟수 3회를 모두 사용했습니다</p>
      )}
      {controls.expired && (
        <p className={styles.controlHint}>
          사용 시간이 만료됐습니다. 서버 상태를 확인하고 있습니다
        </p>
      )}
      {otherInstance && otherInstance.status !== "RUNNING" && (
        <p className={styles.controlHint}>
          다른 인스턴스의 준비가 끝나면 전환할 수 있습니다
        </p>
      )}
    </div>
  );
}
