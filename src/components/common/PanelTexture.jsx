import { useId } from "react";
import styles from "./PanelTexture.module.css";

const PAPER = {
  paper: { src: "/assets/rules/paper-texture.webp", width: 336, height: 336, crop: "8 8 320 320" },
  map: { src: "/assets/koth/koth-trail-background.webp", width: 1672, height: 941, crop: "650 600 240 240" },
  scoreboard: { src: "/assets/leaderboard/leaderboard-layout.webp", width: 1672, height: 941, crop: "650 600 200 200" },
};

// Mirror a blank original patch at its edges. Texture density stays constant
// as the content grows, instead of stretching the paper's floral pattern.
export default function PanelTexture({ material = "wood", responsive = "both" }) {
  const id = useId();
  const source = PAPER[material];
  if (source) return <svg className={styles.texture} data-responsive={responsive} data-material={material} aria-hidden="true" focusable="false">
    <defs><pattern id={id} width="320" height="320" patternUnits="userSpaceOnUse">
      {["", "translate(320 0) scale(-1 1)", "translate(0 320) scale(1 -1)", "translate(320 320) scale(-1 -1)"].map(transform =>
        <g key={transform} transform={transform}><svg width="160" height="160" viewBox={source.crop}>
          <image href={source.src} width={source.width} height={source.height} />
        </svg></g>)}
    </pattern></defs>
    <rect width="100%" height="100%" fill={`url(#${id})`} />
  </svg>;
  return <svg className={styles.texture} viewBox="50 190 1010 120" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
    <image href="/assets/mypage/panel-score.webp" width="1110" height="380" />
  </svg>;
}
