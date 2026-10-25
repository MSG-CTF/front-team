import styles from "./KothScreen.module.css";

export default function KothCompletionStamp({ imageSrc, visible }) {
  if (!visible || !imageSrc) return null;

  return (
    <span className={styles.completionStamp} aria-hidden="true">
      <img src={imageSrc} srcSet={`${imageSrc.replace(/\.webp$/, "-384.webp")} 384w, ${imageSrc} 1024w`}
        sizes="auto, (max-width: 639px) 45vw, (max-width: 899px) 280px, (max-width: 1100px) 20vw, min(16vw, 28vh)"
        loading="lazy" decoding="async" alt="" className={styles.layerImage} />
    </span>
  );
}
