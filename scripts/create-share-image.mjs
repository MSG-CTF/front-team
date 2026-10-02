// Existing event artwork only: no generated mascot or new branding
// Run: node scripts/create-share-image.mjs [absolute path to the sharp package]
// The JPEG is committed; the CI build does not require sharp or render any images
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { stat } from "node:fs/promises";
import { eventConfig } from "../src/features/intro/config/eventConfig.js";
import { SHARE_COPY } from "../build/shareMetadata.js";

const require = createRequire(import.meta.url);
const sharp = require(process.argv[2] || "sharp");
const intro = new URL("../public/assets/intro/", import.meta.url);
const width = 1200;
const height = 630;

// Preserve the source logo's alpha outline and the ivory treatment used by the hero
const { data: logoPixels, info: logoInfo } = await sharp(fileURLToPath(new URL("../public/assets/login/logo-cutout.png", import.meta.url)))
  .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
let left = logoInfo.width;
let top = logoInfo.height;
let right = 0;
let bottom = 0;
for (let y = 0; y < logoInfo.height; y++) {
  for (let x = 0; x < logoInfo.width; x++) {
    const offset = (y * logoInfo.width + x) * 4;
    if (logoPixels[offset + 3] > 8) {
      left = Math.min(left, x); top = Math.min(top, y);
      right = Math.max(right, x); bottom = Math.max(bottom, y);
    }
    logoPixels[offset] = 245;
    logoPixels[offset + 1] = 232;
    logoPixels[offset + 2] = 209;
  }
}
const logo = await sharp(logoPixels, { raw: { width: logoInfo.width, height: logoInfo.height, channels: 4 } })
  .extract({ left, top, width: right - left + 1, height: bottom - top + 1 })
  .resize({ width: 600 }).png().toBuffer();
const logoSize = await sharp(logo).metadata();
const shade = Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="shade" x1="0" y1="0" x2="0" y2="1">
    <stop stop-color="#160e08" stop-opacity=".56"/>
    <stop offset=".52" stop-color="#160e08" stop-opacity=".68"/>
    <stop offset="1" stop-color="#160e08" stop-opacity=".88"/>
  </linearGradient></defs><rect width="1200" height="630" fill="url(#shade)"/>
</svg>`);

async function type(text, { font, fontfile, colour, maxWidth, y }) {
  const rendered = await sharp({ text: {
    text: `<span foreground="${colour}">${text}</span>`, font,
    fontfile: fileURLToPath(new URL(fontfile, intro)), rgba: true, dpi: 72,
  } }).png().toBuffer();
  const size = await sharp(rendered).metadata();
  if (size.width > maxWidth) throw new Error(`Share text is too wide: ${text}`);
  return { input: rendered, left: Math.round((width - size.width) / 2), top: y };
}

const [year, month, day] = eventConfig.event.date.split("-");
const start = new Date(Date.parse(eventConfig.event.startsAt) + 9 * 3600000);
const time = `${String(start.getUTCHours()).padStart(2, "0")}:${String(start.getUTCMinutes()).padStart(2, "0")}`;
const weekday = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Seoul", weekday: "short" })
  .format(new Date(eventConfig.event.startsAt)).toUpperCase();
const layers = [
  { input: shade, left: 0, top: 0 },
  await type(year, { font: "IM FELL English 36", fontfile: "fonts/IMFeENrm28P.ttf", colour: "#dcc39b", maxWidth: 180, y: 29 }),
  { input: logo, left: 300, top: 78 },
  await type(`${month}.${day}  ${weekday}  ${time}`, { font: "IM FELL English 44", fontfile: "fonts/IMFeENrm28P.ttf", colour: "#f5e8d1", maxWidth: 740, y: 530 }),
  await type(SHARE_COPY.imageSubtitle, {
    font: "IM FELL English 25", fontfile: "fonts/IMFeENrm28P.ttf", colour: "#dac6a7", maxWidth: 1000, y: 586,
  }),
];
if (78 + logoSize.height > 520) throw new Error("Share logo overlaps the date");
const output = fileURLToPath(new URL("msg-ctf-2026-share-v1.jpg", intro));
await sharp(fileURLToPath(new URL("hero-plaza.webp", intro)))
  .resize(width, height, { fit: "cover", position: "centre" })
  .composite(layers).flatten({ background: "#1a120d" }).toColourspace("srgb")
  .jpeg({ quality: 91, chromaSubsampling: "4:4:4", progressive: true }).toFile(output);
console.log(JSON.stringify({ output, width, height, bytes: (await stat(output)).size }));
