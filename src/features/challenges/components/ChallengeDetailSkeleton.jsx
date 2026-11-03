import LoadingRing from "../../../components/common/LoadingRing.jsx";
import styles from "./ChallengeDetailScene.module.css";

// 설명 글줄은 길이를 조금씩 달리해 실제 문단처럼 보이게 한다
const LINE_WIDTHS = ["100%", "94%", "97%", "86%", "58%"];

// 문제 정보를 받는 동안 머리글·설명·플래그 칸을 실제 자리에 먼저 깔아 둔다
// 인스턴스·원격 실행·마스코트 중 무엇이 올지 모르는 오른쪽 위 칸 자리에는 링과 안내 문구를 둔다
export default function ChallengeDetailSkeleton() {
  return (
    <div className={styles.skeleton}>
      <div className={`${styles.header} ${styles.skeletonHeader}`} aria-hidden="true">
        <span className={styles.skeletonBar} data-part="title" />
        <span className={styles.skeletonPills}>
          <span className={styles.skeletonBar} />
          <span className={styles.skeletonBar} />
          <span className={styles.skeletonBar} />
        </span>
        <dl className={styles.metrics}>
          <div className={styles.metric}>
            <dt className={styles.bakedLabel}>현재 배점</dt>
            <dd><span className={styles.skeletonBar} /></dd>
          </div>
          <div className={styles.metric}>
            <dt className={styles.bakedLabel}>해결한 팀</dt>
            <dd><span className={styles.skeletonBar} /></dd>
          </div>
        </dl>
      </div>
      <div className={`${styles.descriptionPanel} ${styles.skeletonDescription}`} aria-hidden="true">
        <p className={styles.bakedLabel}>문제 설명</p>
        <span className={styles.skeletonLines}>
          {LINE_WIDTHS.map((width) => (
            <span key={width} className={styles.skeletonBar} style={{ width }} />
          ))}
        </span>
        <p className={styles.bakedLabel}>첨부파일</p>
        <span className={styles.skeletonBar} data-part="file" />
      </div>
      <p className={styles.skeletonStatus} role="status">
        <LoadingRing>문제 정보를 불러오는 중입니다</LoadingRing>
      </p>
      <div className={`${styles.flagPanel} ${styles.skeletonFlag}`} aria-hidden="true">
        <p className={styles.bakedLabel}>플래그 제출</p>
        <span className={styles.skeletonBar} data-part="input" />
        <span className={styles.skeletonBar} data-part="hint" />
        <span className={styles.skeletonBar} data-part="button" />
      </div>
    </div>
  );
}
