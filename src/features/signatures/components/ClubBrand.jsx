import { getFestivalBrand } from "../utils/festivalBrand.js";
import styles from "./SignatureFestival.module.css";

export default function ClubBrand({ name }) {
  const brand = getFestivalBrand(name);
  return (
    <span
      className={styles.brand}
      data-brand={brand?.key}
      data-kind={brand?.kind}
      data-shape={brand?.shape}
    >
      <span className={styles.brandName}>{brand?.name || name}</span>
    </span>
  );
}
