import { useEffect, useId, useRef } from "react";
import styles from "./ChallengeDetailScreen.module.css";

export default function InstanceActionDialog({
  action,
  otherInstance,
  onConfirm,
  onCancel,
  disabled,
  returnFocusTo,
}) {
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
  const content = {
    create: {
      title: "이 문제의 인스턴스로 전환",
      description:
        (otherInstance?.challengeTitle || "다른 문제") +
        "에서 사용 중인 인스턴스를 종료하고 새로 생성합니다. 기존 작업 내용은 유지되지 않습니다",
      button: "전환하고 생성",
    },
    restart: {
      title: "인스턴스 재시작",
      description:
        "현재 환경을 초기화하고 새 인스턴스를 만듭니다. 작업 내용이 사라지고 접속 주소가 바뀔 수 있습니다",
      button: "재시작",
    },
    stop: {
      title: "인스턴스 종료",
      description:
        "현재 문제의 실행 환경을 종료합니다. 다시 사용하려면 새 인스턴스를 생성해주세요",
      button: "종료하기",
    },
  }[action];
  return (
    <dialog
      ref={ref}
      className={styles.confirmDialog}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={onCancel}
    >
      <p className={styles.eyebrow}>INSTANCE</p>
      <h2 id={titleId}>{content.title}</h2>
      <p id={descriptionId}>{content.description}</p>
      <div className={styles.dialogActions}>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={onCancel}
          autoFocus
        >
          취소
        </button>
        <button
          type="button"
          className={styles.primaryButton}
          onClick={onConfirm}
          disabled={disabled}
        >
          {content.button}
        </button>
      </div>
    </dialog>
  );
}
