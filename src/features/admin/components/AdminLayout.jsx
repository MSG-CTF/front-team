import { useEffect, useRef, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { getMe, performLogout } from "../../../api/auth.js";
import { ROUTES } from "../../../routes/routePaths.js";
import layout from "./AdminLayout.module.css";
import workspace from "./AdminWorkspace.module.css";
import { AppIcon, Glyph } from "./AdminGlyph.jsx";

// 운영 콘솔 앱 틀: 가을 광장 배경 위에 떠 있는 창 하나
// 왼쪽은 배경이 비치는 사이드바(색 타일 메뉴, 아래쪽 계정), 오른쪽은 툴바와 작업 면
// 실데이터 길이가 매 순간 달라지는 화면이라 고정 좌표 대신 반응형 격자로 짠다
const BASE_URL = import.meta.env.BASE_URL;
// login/logo@2x.webp는 배경이 투명하지 않아 양피지 위에서 흰 사각형처럼 튄다
// rules/msg-ctf-logo.png를 알파 채널로 누끼 딴 admin 전용 사본을 쓴다
const LOGO_SRC = `${BASE_URL}assets/admin/logo.png`;

// 메뉴는 당일에 쓰는 화면과 전날까지 끝내는 화면으로 나눈다 메뉴 이름과 화면 제목은 같은 말을 쓴다
const NAV_GROUPS = [
  { label: "현장 운영", items: [
    { to: ROUTES.adminDashboard, label: "운영 대시보드", end: true, glyph: "dashboard" },
    { to: ROUTES.adminResources, label: "노드 · 문제 배치", glyph: "nodes" },
    { to: ROUTES.adminTeams, label: "팀별 목록", glyph: "teams" },
    { to: ROUTES.adminMileage, label: "마일리지 · 결제", glyph: "mileage" },
    { to: ROUTES.adminLogs, label: "이벤트 로그", glyph: "logs" },
    { to: ROUTES.adminAccounts, label: "계정 등록", glyph: "account" },
  ] },
  { label: "대회 준비", items: [
    { to: ROUTES.adminChallenges, label: "문제 · 인스턴스", glyph: "challenges" },
    { to: ROUTES.adminSignatures, label: "시그니처 문제", glyph: "signatures" },
    { to: ROUTES.adminKoth, label: "KoTH 문제", glyph: "rank" },
    { to: ROUTES.adminSettings, label: "대회 설정", glyph: "settings" },
  ] },
];

const ROLE_LABELS = { ADMIN: "관리자", PARTICIPANT: "참가자" };

// 로그인한 계정의 이름과 권한: 권한은 GET /auth/me 의 role 그대로 보인다
function useAdminAccount() {
  const [account, setAccount] = useState({ nickname: null, role: null });
  useEffect(() => {
    let cancelled = false;
    getMe()
      .then((res) => {
        if (!cancelled) setAccount({ nickname: res.data?.data?.nickname ?? "조회 실패", role: res.data?.data?.role ?? null });
      })
      .catch(() => {
        if (!cancelled) setAccount({ nickname: "조회 실패", role: null });
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return account;
}

// 문서 스크롤 막대: 윈도우 기본 막대는 광장 사진 옆에 검은 띠로 남아 창과 어울리지 않는다
// 마우스를 쓰는 화면에서는 기본 막대를 숨기고 창 오른쪽 여백(사진 위)에 얇은 막대를 띄운다
// 스크롤하거나 올려 두면 진해지고, 끌어서 움직이거나 빈 곳을 눌러 한 화면씩 넘긴다 휠과 키보드 스크롤은 그대로다
function PageScrollbar() {
  const rail = useRef(null);
  const thumb = useRef(null);
  useEffect(() => {
    const railEl = rail.current;
    const thumbEl = thumb.current;
    if (!railEl || !thumbEl || !window.matchMedia?.("(hover: hover) and (pointer: fine)").matches) return undefined;
    const root = document.documentElement;
    root.dataset.adminScroll = "overlay";
    let frame = 0;
    let idle = 0;
    let drag = null;
    const metrics = () => {
      const view = window.innerHeight;
      const max = Math.max(0, root.scrollHeight - view);
      const track = railEl.clientHeight;
      const size = Math.min(track, Math.max(40, Math.round(track * view / Math.max(root.scrollHeight, 1))));
      return { max, track, size };
    };
    const draw = () => {
      frame = 0;
      const { max, track, size } = metrics();
      if (max <= 1) { railEl.dataset.hidden = ""; return; }
      delete railEl.dataset.hidden;
      thumbEl.style.height = `${size}px`;
      thumbEl.style.transform = `translateY(${Math.round((track - size) * Math.min(1, window.scrollY / max))}px)`;
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(draw); };
    const wake = () => {
      railEl.dataset.active = "";
      clearTimeout(idle);
      idle = setTimeout(() => { if (!drag) delete railEl.dataset.active; }, 900);
    };
    const onScroll = () => { schedule(); wake(); };
    const onPointerDown = (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      if (event.target === thumbEl) {
        drag = { y: event.clientY, top: window.scrollY };
        thumbEl.setPointerCapture(event.pointerId);
        railEl.dataset.active = "";
        return;
      }
      const above = event.clientY < thumbEl.getBoundingClientRect().top;
      window.scrollBy({ top: (above ? -1 : 1) * window.innerHeight * 0.9 });
    };
    const onPointerMove = (event) => {
      if (!drag) return;
      const { max, track, size } = metrics();
      window.scrollTo({ top: drag.top + (event.clientY - drag.y) * (max / Math.max(1, track - size)) });
    };
    const onPointerUp = () => { drag = null; wake(); };
    const observer = new ResizeObserver(schedule);
    observer.observe(document.body);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", schedule);
    railEl.addEventListener("pointerdown", onPointerDown);
    thumbEl.addEventListener("pointermove", onPointerMove);
    thumbEl.addEventListener("pointerup", onPointerUp);
    thumbEl.addEventListener("pointercancel", onPointerUp);
    draw();
    return () => {
      delete root.dataset.adminScroll;
      cancelAnimationFrame(frame);
      clearTimeout(idle);
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", schedule);
      railEl.removeEventListener("pointerdown", onPointerDown);
      thumbEl.removeEventListener("pointermove", onPointerMove);
      thumbEl.removeEventListener("pointerup", onPointerUp);
      thumbEl.removeEventListener("pointercancel", onPointerUp);
    };
  }, []);
  return <div ref={rail} className={layout.pageRail} data-hidden="" aria-hidden="true"><div ref={thumb} className={layout.pageThumb} /></div>;
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
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")} KST`;
}

export default function AdminLayout({ title, breadcrumb, actions, children, className = "" }) {
  const { nickname, role } = useAdminAccount();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className={`${layout.layout} ${workspace.workspace} ${className}`}>
      <div className={layout.window}>
        <aside className={layout.sidebar} data-menu-open={menuOpen}>
          <div className={layout.sidebarInner}>
          <div className={layout.brand}>
            <span className={layout.logo} role="img" aria-label="MSG CTF" style={{ "--logo-src": `url(${LOGO_SRC})` }} />
            {/* 부스 스태프가 폰으로 들어오면 메뉴를 열지 않고 바로 결제 화면으로 간다 */}
            <Link to={`${ROUTES.adminMileage}?tab=payment`} className={layout.payShortcut} aria-label="QR 결제 화면 열기">
              <Glyph name="payment" size={15} />QR 결제
            </Link>
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
            {NAV_GROUPS.map((group) => (
              <div key={group.label} className={layout.navGroup}>
                <p className={layout.navCaption}>{group.label}</p>
                {group.items.map((item) => (
                  <NavLink key={item.to} to={item.to} end={item.end} onClick={() => setMenuOpen(false)} className={layout.navLink}>
                    <AppIcon name={item.glyph} size={22} />
                    {item.label}
                  </NavLink>
                ))}
              </div>
            ))}
          </nav>
          <div className={layout.account}>
            <span className={layout.avatar} aria-hidden="true">{nickname ? Array.from(nickname)[0] : ""}</span>
            <span className={layout.accountText}>
              <span className={layout.accountName}>
                <strong>{nickname ?? "불러오는 중"}</strong>
                {role && <span className={layout.role} data-role={role}>{ROLE_LABELS[role] ?? role}</span>}
              </span>
              <KstClock />
            </span>
            <button type="button" onClick={performLogout} className={layout.logout} aria-label="로그아웃" title="로그아웃">
              <Glyph name="logout" size={15} />
            </button>
          </div>
          <a href={ROUTES.board} className={layout.participantLink}><Glyph name="external" size={13} />참가자 화면으로</a>
          </div>
        </aside>

        <main className={layout.main}>
          <header className={layout.header}>
            <div className={layout.heading}>
              {breadcrumb && (
                <nav aria-label="현재 위치" className={layout.breadcrumb}>
                  {breadcrumb.map((item) => (
                    <Link key={item.to} to={item.to}>{item.label}</Link>
                  ))}
                </nav>
              )}
              <h1>{title}</h1>
            </div>
            {actions && <div className={layout.actions}>{actions}</div>}
          </header>
          <div className={layout.content}>{children}</div>
        </main>
      </div>
      <PageScrollbar />
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
  const known = ["neutral", "good", "warn", "bad", "quiet", "blue", "purple", "orange"].includes(tone) ? tone : "neutral";
  return (
    <span className={workspace.badge} data-tone={known}>
      {children}
    </span>
  );
}
