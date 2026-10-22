import styles from "./AdminGlyph.module.css";

// 관리자 화면 공용 아이콘: 24px 격자 위의 선 그림 한 벌을 글줄 옆 표식, 색 타일, 단추에 똑같이 쓴다
export const GLYPHS = {
  dashboard: <path d="M4 4h6.5v6.5H4zM13.5 4H20v6.5h-6.5zM4 13.5h6.5V20H4zM13.5 13.5H20V20h-6.5z" />,
  nodes: <><path d="M4 4.5h16V10H4zM4 14h16v5.5H4z" /><path d="M7.5 7.3h.01M7.5 16.8h.01" strokeWidth="2.6" /></>,
  teams: <><circle cx="9" cy="8" r="3.2" /><path d="M3.5 19.5c0-3.3 2.5-5.5 5.5-5.5s5.5 2.2 5.5 5.5" /><path d="M15.5 5.2a3.2 3.2 0 0 1 0 6.1" /><path d="M20.5 19.5c0-2.9-1.8-5-4.3-5.4" /></>,
  mileage: <><circle cx="10" cy="12" r="6.5" /><path d="M10 8.5v7M6.5 12h7" /><path d="M18.5 6v4M16.5 8h4" /></>,
  payment: <><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4z" /><path d="M14.5 14.5h.01M19.5 14.5h.01M14.5 19.5h.01M19.5 19.5h.01M17 17h.01" strokeWidth="2.6" /></>,
  logs: <path d="M5 7h14M5 12h14M5 17h9" />,
  account: <><circle cx="10" cy="8" r="3.5" /><path d="M3.5 20c0-3.6 2.9-6.5 6.5-6.5h1" /><path d="M18 13.5v6M15 16.5h6" /></>,
  challenges: <><path d="M6 21V4" /><path d="M6 4.5h11.5l-2.5 4 2.5 4H6" /></>,
  signatures: <><circle cx="12" cy="9" r="4.5" /><path d="M9.2 12.8 7 20l5-2 5 2-2.2-7.2" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" /></>,
  rollback: <><path d="M8.5 14 4.5 10l4-4" /><path d="M4.5 10h9.5a5 5 0 0 1 0 10h-3.5" /></>,
  stop: <><path d="M12 3.5V12" /><path d="M6.8 7.2a7.5 7.5 0 1 0 10.4 0" /></>,
  ban: <><circle cx="12" cy="12" r="8" /><path d="M6.5 6.5l11 11" /></>,
  timer: <><circle cx="12" cy="13" r="7.5" /><path d="M12 9v4.5l2.8 1.8M9.5 2.5h5" /></>,
  rank: <path d="M4.5 18.5h15l1-10-4.8 3.8L12 5.5l-3.7 6.8L3.5 8.5z" />,
  publish: <><path d="M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12z" /><circle cx="12" cy="12" r="2.8" /></>,
  refresh: <><path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3" /><path d="M19.5 4v4.5H15" /></>,
  instance: <><path d="M12 3 20 7.5v9L12 21l-8-4.5v-9z" /><path d="M12 12l8-4.5M12 12v9M12 12 4 7.5" /></>,
  warning: <><path d="M12 4.5 20.5 19h-17z" /><path d="M12 10v4M12 16.8h.01" strokeWidth="2.4" /></>,
  solve: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  dice: <><rect x="3.5" y="3.5" width="17" height="17" rx="3.5" /><path d="M8.2 8.2h.01M15.8 8.2h.01M12 12h.01M8.2 15.8h.01M15.8 15.8h.01" strokeWidth="2.6" /></>,
  gauge: <><path d="M4 16.5a8 8 0 0 1 16 0" /><path d="M12 16.5l3.6-4.4" /></>,
  question: <><circle cx="12" cy="12" r="8.5" /><path d="M9.6 9.7a2.4 2.4 0 1 1 3.4 2.2c-.7.4-1 .9-1 1.7" /><path d="M12 16.8h.01" strokeWidth="2.4" /></>,
  search: <><circle cx="10.5" cy="10.5" r="6" /><path d="M15 15l5.5 5.5" /></>,
  bolt: <path d="M13 2.8 5 13.5h6.2L10.5 21.2l8.5-11h-6.3z" />,
  chevronRight: <path d="M9 5l7 7-7 7" />,
  logout: <><path d="M14 4.5H6.5a1.5 1.5 0 0 0-1.5 1.5v12a1.5 1.5 0 0 0 1.5 1.5H14" /><path d="M10.5 12H20M16.5 8.5 20 12l-3.5 3.5" /></>,
  external: <><path d="M14 4.5h5.5V10" /><path d="M19.5 4.5 11 13" /><path d="M17 14v4.5a1 1 0 0 1-1 1H5.5a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1H10" /></>,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  edit: <><path d="M4.5 19.5l1-4.2L15.8 5a2 2 0 0 1 2.9 2.9L8.4 18.2z" /><path d="M13.8 7l3 3" /></>,
  trash: <><path d="M4.5 7h15M9.5 7V4.5h5V7" /><path d="M6.5 7l1 12.5h9l1-12.5" /></>,
  move: <><path d="M12 3v18M3 12h18" /><path d="M9 6l3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  filter: <path d="M4 6h16M7 12h10M10 18h4" />,
  key: <><circle cx="8" cy="15.5" r="4.5" /><path d="M11.3 12.2 19.5 4M16.5 7l2.5 2.5M14.2 9.3l2 2" /></>,
  eye: <><path d="M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12z" /><circle cx="12" cy="12" r="2.8" /></>,
  eyeOff: <><path d="M3.5 3.5l17 17" /><path d="M10.4 5.7A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a16.6 16.6 0 0 1-3.1 3.9M6.5 6.9C3.9 8.7 2.5 12 2.5 12s3.5 6.5 9.5 6.5c1.5 0 2.9-.4 4.1-1" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></>,
  copy: <><rect x="8.5" y="8.5" width="11.5" height="11.5" rx="2.5" /><path d="M15.5 8.5V6.5a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2" /></>,
  download: <><path d="M12 4v11M7.5 10.5 12 15l4.5-4.5" /><path d="M5 19.5h14" /></>,
  upload: <><path d="M12 15V4M7.5 8.5 12 4l4.5 4.5" /><path d="M5 19.5h14" /></>,
  lock: <><rect x="5" y="10.5" width="14" height="10" rx="2.5" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /></>,
  sliders: <><path d="M4 7h9M17 7h3M4 17h3M11 17h9" /><circle cx="15" cy="7" r="2" /><circle cx="9" cy="17" r="2" /></>,
  info: <><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5M12 7.8h.01" strokeWidth="2.4" /></>,
  version: <><path d="M12 3.5 20 8l-8 4.5L4 8z" /><path d="M4 12l8 4.5 8-4.5M4 16l8 4.5 8-4.5" /></>,
};

// 화면마다 색 하나: 메뉴 타일, 위젯 머리, 빠른 작업이 같은 색을 써서 어디서 봐도 같은 일로 읽힌다
export const DOMAIN_TONES = {
  dashboard: "orange",
  nodes: "green",
  teams: "indigo",
  mileage: "yellow",
  payment: "orange",
  logs: "gray",
  account: "blue",
  challenges: "red",
  signatures: "purple",
  settings: "graphite",
  rank: "yellow",
};

// 글줄 옆에 두는 작은 표식: 글자색을 그대로 따른다
export function Glyph({ name, size = 16, className, title, strokeWidth = 1.8 }) {
  const glyph = GLYPHS[name];
  if (!glyph) return null;
  return <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth}
    strokeLinecap="round" strokeLinejoin="round" role={title ? "img" : undefined} aria-hidden={title ? undefined : "true"} focusable="false">
    {title && <title>{title}</title>}
    {glyph}
  </svg>;
}

// 색 타일: iOS 설정 앱 아이콘처럼 둥근 사각형 위에 흰 선 그림
export function AppIcon({ name, tone, size = 22, className = "" }) {
  return <span className={`${styles.appIcon} ${className}`} data-tone={tone ?? DOMAIN_TONES[name] ?? "gray"} style={{ "--icon-size": `${size}px` }} aria-hidden="true">
    <Glyph name={name} size={size} strokeWidth={size >= 36 ? 1.9 : 2.3} />
  </span>;
}

const STATUS_MARKS = {
  good: <path d="M4.6 8.3l2.2 2.2 4.6-4.8" />,
  warn: <path d="M8 4.3v4.4M8 11.4h.01" />,
  bad: <path d="M8 4.3v4.4M8 11.4h.01" />,
  unknown: <path d="M6.3 6.2a1.8 1.8 0 1 1 2.5 1.7c-.5.2-.8.6-.8 1.2M8 11.4h.01" />,
};

// 상태 기호: 채운 원 안의 흰 표식(체크, 느낌표, 물음표) 색만으로 읽지 않게 모양도 다르다
export function StatusSymbol({ tone = "unknown", label }) {
  const known = STATUS_MARKS[tone] ? tone : "unknown";
  return <span className={styles.status} data-tone={known} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : "true"} title={label}>
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {STATUS_MARKS[known]}
    </svg>
  </span>;
}
