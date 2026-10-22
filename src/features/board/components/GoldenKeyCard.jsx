import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import styles from "./GoldenKeyCard.module.css";

export const GOLDEN_KEY_NAMES = Object.freeze({
  card_reroll: "주사위 다시 굴리기",
  card_roll_twice_choose: "주사위 2회 굴림 후 선택",
  card_move_offset: "주변 칸 이동",
  card_free_travel: "세계여행",
  card_extra_roll: "주사위 보너스",
});

export function getGoldenKeyText(card) {
  return {
    title: GOLDEN_KEY_NAMES[card.cardId] || card.name || "황금열쇠 카드",
    description: card.description || "획득한 카드의 효과와 사용 조건은 보유 찬스카드에서 확인해 주세요",
  };
}

// 성공한 추첨 결과만 표현한다. 추첨/재시도/카드 사용은 기존 컨트롤러가 담당한다.
export default function GoldenKeyCard({ card, onClose }) {
  const titleId = useId();
  const closeRef = useRef(null);
  const { title, description } = getGoldenKeyText(card);
  useEffect(() => {
    const previous = document.activeElement;
    closeRef.current?.focus({ preventScroll: true });
    const handleKey = (event) => {
      if (event.key === "Escape") onClose?.();
      if (event.key === "Tab") {
        const description = closeRef.current?.parentElement.querySelector('[tabindex="0"]');
        event.preventDefault();
        (document.activeElement === closeRef.current ? description : closeRef.current)?.focus();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => { document.removeEventListener("keydown", handleKey); previous?.focus?.({ preventScroll: true }); };
  }, [onClose]);
  const content = <div className={styles.overlay}>
    <section className={styles.card} role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className={styles.art}><img src="/assets/board/golden-key-original.webp" alt="" /></div>
      <p className={styles.ribbon}>황금열쇠</p>
      <h2 id={titleId} className={styles.title}>{title}</h2>
      <div className={styles.description} tabIndex={0}>{description}</div>
      <button ref={closeRef} type="button" className={styles.close} onClick={onClose} aria-label="황금열쇠 닫기">×</button>
    </section>
  </div>;
  return typeof document === "undefined" ? content : createPortal(content, document.body);
}
