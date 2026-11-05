import { useEffect } from "react";
import styles from "./ChallengeDetailScene.module.css";

// 정답 두루마리 그림(1280x960) 바깥에 흩날리는 낙엽 조각의 위치와 크기
const LEAF_SPRITES = [
  { x: 1149, y: 169, w: 63, h: 57 },
  { x: 36, y: 255, w: 88, h: 76 },
  { x: 1142, y: 337, w: 81, h: 93 },
  { x: 23, y: 624, w: 59, h: 54 },
  { x: 859, y: 764, w: 66, h: 63 },
  { x: 328, y: 784, w: 124, h: 88 },
];

// 가로 위치(%), 시작 지연(s), 낙하 시간(s), 흔들림 주기(s), 흔들림 폭(px), 크기 배율, 조각 번호
const FALLING_LEAVES = [
  [4, 0, 13, 3.2, 40, 0.42, 0],
  [12, 3.5, 15, 3.8, 55, 0.36, 1],
  [21, 1.2, 12, 2.9, 35, 0.5, 2],
  [30, 6, 14, 3.5, 50, 0.4, 3],
  [39, 2.4, 16, 4.1, 45, 0.34, 4],
  [48, 8, 13, 3.1, 60, 0.38, 5],
  [57, 0.6, 15, 3.6, 40, 0.46, 1],
  [66, 4.8, 12, 2.8, 50, 0.42, 0],
  [75, 1.8, 14, 3.9, 35, 0.38, 3],
  [84, 7, 16, 3.3, 55, 0.48, 2],
  [93, 3, 13, 3.7, 45, 0.4, 4],
  [17, 9.5, 15, 3.4, 50, 0.36, 5],
  [62, 10.5, 14, 3, 40, 0.4, 2],
  [88, 11.5, 15, 4, 50, 0.34, 1],
];

function FallingLeaves() {
  return (
    <div className={styles.leafFall} aria-hidden="true">
      {FALLING_LEAVES.map(([left, delay, fall, sway, amp, k, sprite], index) => {
        const { x, y, w, h } = LEAF_SPRITES[sprite];
        return (
          <span
            key={index}
            className={styles.leafDrop}
            style={{
              left: `${left}%`,
              animationDuration: `${fall}s`,
              animationDelay: `${delay}s`,
            }}
          >
            <span
              className={styles.leaf}
              style={{
                "--x": x, "--y": y, "--w": w, "--h": h, "--k": k,
                "--amp": `${amp}px`,
                animationDuration: `${sway}s`,
                animationDelay: `${-delay}s`,
              }}
            />
          </span>
        );
      })}
    </div>
  );
}

export default function FlagResultModal({ feedback, onClose }) {
  useEffect(() => {
    if (!feedback) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [feedback, onClose]);

  if (!feedback) return null;
  const isError = feedback.type === "error";
  const data = feedback.data;
  const hasNumber = (key) =>
    typeof data?.[key] === "number" && Number.isFinite(data[key]);

  return (
    <div className={styles.resultOverlay} onClick={onClose}>
      {!isError && <FallingLeaves />}
      <div
        id="flag-feedback"
        className={`${styles.resultModal} ${
          isError ? styles.resultModalError : styles.resultModalSuccess
        }`}
        role={isError ? "alertdialog" : "dialog"}
        aria-modal="true"
        aria-labelledby="flag-result-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className={styles.resultClose}
          aria-label="닫기"
          onClick={onClose}
          autoFocus
        >
          ×
        </button>
        {/* 두루마리 양피지 안쪽에 글을 모은다 */}
        <div className={styles.resultBody}>
          <p className={styles.resultEyebrow}>{isError ? "INCORRECT" : "CORRECT"}</p>
          <h2 id="flag-result-title" className={styles.resultTitle}>
            {isError ? "오답입니다" : "정답입니다"}
          </h2>
          <div className={styles.resultDivider} aria-hidden="true"><span /></div>
          <p className={styles.resultMessage}>{feedback.message}</p>
          {!isError && data && (
            <dl className={styles.rewards}>
              {hasNumber("earned_score") && (
                <div>
                  <dt>획득 점수</dt>
                  <dd>+{data.earned_score.toLocaleString("ko-KR")}</dd>
                </div>
              )}
              {hasNumber("earned_mileage") && (
                <div>
                  <dt>획득 마일리지</dt>
                  <dd>+{data.earned_mileage.toLocaleString("ko-KR")}</dd>
                </div>
              )}
              {data.is_extra_dice_granted === true && (
                <div>
                  <dt>추가 주사위</dt>
                  <dd>+1</dd>
                </div>
              )}
            </dl>
          )}
          <button type="button" className={styles.primaryButton} onClick={onClose}>
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
