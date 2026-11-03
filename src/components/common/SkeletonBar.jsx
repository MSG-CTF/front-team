import styles from "./SkeletonBar.module.css";

// 값이 오기 전 그 값이 놓일 자리를 채우는 옅은 막대
// 문제 상세 자리 잡기 화면과 같은 빛이 지나가고, 색은 놓인 자리의 글자색을 따라 어두운 판과 종이 판 모두에서 보인다
// 크기는 놓인 자리의 글자 크기 기준이라 className 이나 style 로 폭과 높이만 정한다
export default function SkeletonBar({ className = "", style }) {
  return <span className={`${styles.bar} ${className}`.trim()} style={style} aria-hidden="true" data-skeleton />;
}
