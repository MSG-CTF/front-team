import { useEffect, useId, useRef } from "react";
import styles from "./ChallengeDetailScene.module.css";

export default function InstanceActionDialog({
  action,
  otherInstance,
  teammate,
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
  // 팀원이 이 문제를 켜 두었으면 같이 쓸 수 있다는 걸 먼저 알리고, 그래도 따로 켤지 묻는다
  const sharedLine = teammate && teammate.nickname + "님이 이 문제 인스턴스를 켜 두어 접속 주소를 같이 쓸 수 있습니다";
  const content = {
    create: otherInstance ? {
      title: "인스턴스 전환",
      description: [
        ...(sharedLine ? [sharedLine] : []),
        "인스턴스는 한 사람당 1개만 켤 수 있습니다",
        (otherInstance?.challengeTitle || "다른 문제") +
          "에서 사용 중인 인스턴스를 종료하고 새로 생성합니다",
        "기존 작업 내용은 유지되지 않습니다",
      ],
      button: "전환하고 생성",
    } : {
      title: "팀원 인스턴스 사용 중",
      description: [
        sharedLine || "팀원이 이 문제 인스턴스를 켜 두었습니다",
        "따로 켜면 팀 인스턴스를 하나 더 쓰고 재시작·종료는 각자 합니다",
      ],
      button: "따로 생성",
    },
    restart: {
      title: "인스턴스 재시작",
      description: [
        "현재 환경을 초기화하고 새 인스턴스를 만듭니다",
        "작업 내용이 사라지고 접속 주소가 바뀔 수 있습니다",
        "남은 시간은 늘어나지 않으니 만료가 가까우면 먼저 연장해 주세요",
      ],
      button: "재시작",
    },
    stop: {
      title: "인스턴스 종료",
      description: [
        "현재 문제의 실행 환경을 종료합니다",
        "다시 사용하려면 새 인스턴스를 생성해주세요",
      ],
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
      <div id={descriptionId} className={styles.confirmDescription}>
        {content.description.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
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
