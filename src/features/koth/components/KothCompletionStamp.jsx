import styles from "./KothScreen.module.css";

export default function KothCompletionStamp({ imageSrc, visible }) {
  if (!visible || !imageSrc) return null;

  return (
    <span className={styles.completionStamp} aria-hidden="true">
      <img src={imageSrc} alt="" className={styles.layerImage} />
    </span>
  );
}
