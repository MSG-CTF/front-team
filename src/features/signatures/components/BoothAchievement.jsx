import { getFestivalBrand } from "../utils/festivalBrand.js";
import styles from "./SignatureFestival.module.css";

// 원본 SVG를 알파 마스크로 사용해 도형은 유지하고 잉크색만 입힌다
export default function BoothAchievement({ name }) {
  const brand = getFestivalBrand(name);
  if (!brand) return null;
  return (
    <span
      className={styles.clubStamp}
      data-stamp-brand={brand.key}
      data-stamp-shape={brand.shape}
      data-stamp-frame="round"
      aria-hidden="true"
    >
      <span className={styles.stampInk}>
        <svg
          className={styles.stampBorder}
          viewBox="0 0 100 100"
          fill="none"
          focusable="false"
        >
          <circle
            cx="50"
            cy="50"
            r="43"
            strokeWidth="3.2"
            strokeDasharray="84 1.5 28 2 65 1 36 1.5"
          />
          <circle
            cx="50"
            cy="50"
            r="37"
            strokeWidth="1.2"
            strokeDasharray="55 0.7 39 1 80 0.6"
          />
        </svg>
        <span
          className={styles.stampLogo}
          style={{ "--stamp-logo": `url("${brand.src}")` }}
        />
      </span>
    </span>
  );
}
