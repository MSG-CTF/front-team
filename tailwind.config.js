import containerQueries from "@tailwindcss/container-queries";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        "auth-text": "#613d15",
        "auth-bg": "#f9eeee",
        // 문제 상세 페이지(challenge detail) 팔레트 — Figma node 104:459.
        "detail-muted": "#d6cccc", // KOTH / 1st 배지 라벨
        "detail-solved": "#6c8e4a", // SOLVED 배지 라벨
        "detail-size": "#8a5e2e", // 첨부파일 용량(MB) 텍스트
        "detail-points": "#d38e25", // 포인트 값
        "detail-console": "#e4dbd1", // 인스턴스 접속 URL 텍스트
      },
      fontFamily: {
        "im-fell": ['"IM Fell English"', "ui-serif", "serif"],
        "kode-mono": ['"Kode Mono"', "ui-monospace", "monospace"],
        "inria-serif": ['"Inria Serif"', "ui-serif", "serif"],
      },
    },
  },
  // @container / cqw 단위는 코어 플러그인이 아니라 이 플러그인이 있어야 실제
  // CSS(container-type 등)로 만들어진다 — 빠져 있으면 `@container` 클래스가
  // 조용히 아무 효과 없는 죽은 클래스가 되어 cqw 폰트 크기가 전부 깨진다.
  plugins: [containerQueries],
};
