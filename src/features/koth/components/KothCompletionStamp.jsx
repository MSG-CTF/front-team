import styles from "./KothScreen.module.css";

export default function KothCompletionStamp({ stamp, visible }) {
  if (!visible) return null;

  return (
    <div className={styles.completionStamp} style={stamp.position} aria-hidden="true">
      <img src={stamp.imageSrc} alt="" className={styles.layerImage} />
    </div>
  );
}
