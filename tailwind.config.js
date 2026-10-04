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
        // 관리자 페이지(admin) 팔레트 - Figma node 384:396 "AdminDashboard_OpsOverview_v2".
        "admin-ink": "#613d15", // 본문 진한 갈색 텍스트
        "admin-muted": "#8a5e2e", // 보조 라벨(사이드바 비활성 항목, 표 헤더)
        "admin-gold": "#d38e25", // 강조 텍스트(시각, 참가 팀 수, 활성 표시줄)
        "admin-running": "#6c8e4a", // 실행중 인스턴스 수치
        "admin-failed": "#a34934", // 실패 인스턴스 수치
        "admin-panel": "#f3e6cf", // 양피지 패널 위 카드 배경(반투명 오버레이용 기준색)
        "admin-divider": "rgba(211,142,37,0.35)",
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "sans-serif", '"Apple Color Emoji"', '"Segoe UI Emoji"', '"Segoe UI Symbol"', '"Noto Color Emoji"'],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", '"Liberation Mono"', '"Courier New"', "monospace"],
        "im-fell": ['"IM Fell English"', "ui-serif", "serif"],
        "kode-mono": ['"Kode Mono"', "ui-monospace", "monospace"],
        "inria-serif": ['"Inria Serif"', "ui-serif", "serif"],
        "song-myung": ['"Song Myung"', "ui-serif", "serif"],
        pretendard: ["Pretendard", '"Apple SD Gothic Neo"', '"Malgun Gothic"', "sans-serif"],
        abyssinica: ['"Abyssinica SIL"', "ui-serif", "serif"],
      },
    },
  },
  // Tailwind 4에서 @container를 기본으로 지원한다
  plugins: [],
};
