import styles from "./BoardScreen.module.css";

// 모바일에서 바닥 그림과 원판은 같은 스크롤·확대 영역에 둔다
// 데스크톱에서는 이 래퍼를 display: contents로 풀어 기존 무대를 유지한다
export default function BoardScene({ children }) {
  return (
    <div className={styles.boardScene} data-board-layer="scene">
      <img
        src="/assets/board/bg-1920x1080.webp"
        alt=""
        aria-hidden="true"
        draggable={false}
        className={styles.sceneBackdrop}
        data-board-layer="background"
      />
      {children}
    </div>
  );
}
