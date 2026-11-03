import styles from "./LoadingRing.module.css";

// 오래 걸릴 수 있는 로딩 문구 앞에 붙는 도는 링
// 인스턴스 칸의 준비 중 링과 같은 속도로 돌고, 색은 놓인 자리의 글자색을 따른다
// 금방 끝나는 로딩에서 깜빡이지 않게 0.3초 뒤에 나타나며 문구는 처음부터 보인다
// size="page"는 화면 전체 대기용으로 큰 링을 문구 위에 둔다
export default function LoadingRing({ children, size = "inline", className = "" }) {
  const label = [styles.label, size === "page" && styles.page, className].filter(Boolean).join(" ");
  return (
    <span className={label}>
      <span className={styles.ring} aria-hidden="true" data-loading-ring />
      {children}
    </span>
  );
}
