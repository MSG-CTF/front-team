import { Fragment, useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { getMe, performLogout } from "../../../api/auth.js";
import { ROUTES } from "../../../routes/routePaths.js";
import layout from "./AdminLayout.module.css";
import workspace from "./AdminWorkspace.module.css";

// Figma: "MSG-CTF 프론트 개발" 파일, node-id 384:396 ("AdminDashboard_OpsOverview_v2").
// 시안은 대시보드 한 장이라 나머지 화면은 같은 양피지 판과 색을 공유한다.
//
// 다른 게임 화면(로그인/보드/문제상세)과 달리 1920x1080 고정 스테이지로 박아 넣지
// 않았다 - 팀 개수, 이벤트 로그 줄 수, 폼 검증 메시지처럼 실데이터 길이가 매 순간
// 달라지는 화면이라 고정 좌표는 오히려 잘림/겹침을 만든다. 대신 Figma의 색/폰트/
// 배경 아트(양피지 판)는 그대로 가져오고, 레이아웃만 반응형 grid로 짰다.
const BASE_URL = import.meta.env.BASE_URL;
// login/logo@2x.webp는 배경이 투명하지 않아 양피지 위에서 흰 사각형처럼 튄다
// rules/msg-ctf-logo.png를 알파 채널로 누끼 딴 admin 전용 사본을 쓴다
const LOGO_SRC = `${BASE_URL}assets/admin/logo.png`;

// 메뉴 이름과 화면 제목은 같은 말로 맞춰 어느 화면에 있는지 바로 읽힌다 (gap은 묶음 사이 점선)
const NAV_ITEMS = [
  { to: ROUTES.adminDashboard, label: "운영 대시보드", end: true },
  { to: ROUTES.adminChallenges, label: "문제 · 인스턴스" },
  { to: ROUTES.adminSignatures, label: "시그니처 문제", gap: true },
  { to: ROUTES.adminTeams, label: "팀별 목록" },
  { to: ROUTES.adminMileage, label: "마일리지 · 결제", gap: true },
  { to: ROUTES.adminResources, label: "노드 · 문제 배치" },
  { to: ROUTES.adminLogs, label: "이벤트 로그" },
  { to: ROUTES.adminSettings, label: "대회 설정" },
  { to: ROUTES.adminAccounts, label: "계정 등록" },
];

function useAdminNickname() {
  const [nickname, setNickname] = useState(null);
  useEffect(() => {
    let cancelled = false;
    getMe()
      .then((res) => {
        if (!cancelled) setNickname(res.data?.data?.nickname ?? "조회 실패");
      })
      .catch(() => {
        if (!cancelled) setNickname("조회 실패");
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return nickname;
}

function KstClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let timer;
    const update = () => {
      clearTimeout(timer);
      if (document.hidden) return;
      setNow(new Date());
      // The label displays minutes. Schedule the next minute boundary only.
      timer = setTimeout(update, 60000 - Date.now() % 60000);
    };
    update();
    document.addEventListener("visibilitychange", update);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  return <span className={layout.clock}>{formatKst(now)}</span>;
}

const kstFormatter = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function formatKst(date) {
  const parts = kstFormatter.formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")} (KST)`;
}

export default function AdminLayout({ title, breadcrumb, actions, children, className = "" }) {
  const nickname = useAdminNickname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className={`${layout.layout} ${workspace.workspace} ${className}`}>
      <div className={layout.shell}>
        <aside className={layout.sidebar} data-menu-open={menuOpen}>
          <div className={layout.brand}>
            <span className={layout.logo} role="img" aria-label="MSG CTF" style={{ "--logo-src": `url(${LOGO_SRC})` }} />
            <span className={layout.brandRole}>운영 콘솔</span>
            <button
              type="button"
              className={layout.menuToggle}
              aria-expanded={menuOpen}
              aria-controls="admin-menu"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? "닫기" : "메뉴"}
            </button>
          </div>
          <nav id="admin-menu" aria-label="관리자 메뉴" className={layout.nav}>
            {NAV_ITEMS.map((item) => (
              <Fragment key={item.to}>
                <NavLink to={item.to} end={item.end} onClick={() => setMenuOpen(false)} className={layout.navLink}>
                  {item.label}
                </NavLink>
                {item.gap && <span className={layout.navGap} aria-hidden="true" />}
              </Fragment>
            ))}
          </nav>
          <a href={ROUTES.board} className={layout.participantLink}>참가자 화면으로</a>
        </aside>

        <main className={layout.main}>
          <header className={layout.header}>
            {breadcrumb && (
              <nav aria-label="현재 위치" className={layout.breadcrumb}>
                {breadcrumb.map((item) => (
                  <Link key={item.to} to={item.to}>{item.label}</Link>
                ))}
              </nav>
            )}
            <div className={layout.headerRow}>
              <h1>{title}</h1>
              <div className={layout.session}>
                <KstClock />
                <span className={layout.user}>
                  <span className={layout.userRole}>관리자</span>
                  {nickname ?? "불러오는 중"}
                </span>
                <button type="button" onClick={performLogout} className={layout.logout}>
                  로그아웃
                </button>
              </div>
            </div>
            {actions && <div className={layout.actions}>{actions}</div>}
          </header>
          {children}
        </main>
      </div>
    </div>
  );
}

// 데이터가 이미 있으면 주기 갱신 중에도 표를 지우지 않고 그대로 둔다
export function AdminStatusMessage({ status, error, onRetry, hasData = false }) {
  if (status === "loading") {
    if (hasData) return null;
    return (
      <p role="status" className={workspace.statusLoading}>
        불러오는 중
      </p>
    );
  }
  if (status === "error" || status === "unavailable") {
    return (
      <div className={workspace.statusError}>
        <span role="alert">{error}</span>
        <button type="button" onClick={onRetry} className={workspace.button}>
          다시 시도
        </button>
      </div>
    );
  }
  return null;
}

export function AdminBadge({ tone = "neutral", children }) {
  const known = ["neutral", "good", "warn", "bad", "quiet"].includes(tone) ? tone : "neutral";
  return (
    <span className={workspace.badge} data-tone={known}>
      {children}
    </span>
  );
}
