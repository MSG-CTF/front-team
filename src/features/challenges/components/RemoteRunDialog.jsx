import { useEffect, useId, useRef } from "react";
import styles from "./ChallengeDetailScene.module.css";

// 원격 실행은 되돌릴 수 없으므로 실행 전에 한 번 묻는다
export default function RemoteRunDialog({ fileName, onConfirm, onCancel, disabled, returnFocusTo }) {
  const ref = useRef(null);
  const titleId = useId();
  const descriptionId = useId();
  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    return () => {
      dialog.close();
      queueMicrotask(() => {
        if (returnFocusTo?.isConnected) returnFocusTo.focus();
      });
    };
  }, [returnFocusTo]);
  return (
    <dialog
      ref={ref}
      className={styles.confirmDialog}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={onCancel}
    >
      <p className={styles.eyebrow}>REMOTE RUN</p>
      <h2 id={titleId}>원격 실행</h2>
      <p id={descriptionId}>
        <strong>{fileName}</strong> 을 검증 VM에서 한 번 실행합니다 끝나면 출력이 이 화면에 표시됩니다
      </p>
      <div className={styles.dialogActions}>
        <button type="button" className={styles.secondaryButton} onClick={onCancel} autoFocus>
          취소
        </button>
        <button type="button" className={styles.primaryButton} onClick={onConfirm} disabled={disabled}>
          실행
        </button>
      </div>
    </dialog>
  );
}
