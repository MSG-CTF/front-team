import { INSTANCE_STATUS } from "../../../constants/enums.js";
import styles from "./ChallengeDetailScreen.module.css";

export default function InstanceControls({
  instance,
  unavailable,
  busy,
  onCreate,
  onExtend,
  onRestart,
  onStop,
}) {
  const hasActiveInstance = Boolean(instance?.instanceId);
  const canManageInstance = instance?.status === INSTANCE_STATUS.RUNNING;
  return (
    <div className={styles.instanceControls} aria-label="인스턴스 작업">
      <button
        type="button"
        onClick={onCreate}
        disabled={hasActiveInstance || unavailable || busy}
        aria-label="인스턴스 생성"
        className={styles.createButton}
      >
        생성
      </button>
      <button
        type="button"
        onClick={onExtend}
        disabled={!canManageInstance || unavailable || busy}
        aria-label="인스턴스 TTL 연장"
      >
        시간 연장
      </button>
      <button
        type="button"
        onClick={onRestart}
        disabled={!canManageInstance || unavailable || busy}
        aria-label="인스턴스 재시작"
      >
        재시작
      </button>
      <button
        type="button"
        onClick={onStop}
        disabled={!canManageInstance || unavailable || busy}
        aria-label="인스턴스 종료"
        className={styles.stopButton}
      >
        종료
      </button>
    </div>
  );
}
