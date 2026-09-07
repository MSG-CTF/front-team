import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { getMe, logout } from "../../../api/auth.js";
import { clearStoredTokens, REFRESH_TOKEN_STORAGE_KEY } from "../../../api/client.js";
import { ROUTES } from "../../../routes/routePaths.js";

// Figma: "MSG-CTF 프론트 개발" 파일, node-id 384:396 ("AdminDashboard_OpsOverview_v2").
// 이 프레임은 대시보드 화면 하나만 시안이 있고, 사이드바 항목(운영 대시보드/문제 목록-
// 인스턴스/팀별 목록/마일리지 관리/이벤트 로그/설정)은 각 화면의 진입점으로 그대로
// 가져왔다. 계정 등록(신규, 2026-09-07 요구사항)만 시안에 없어 같은 톤으로 추가했다.
//
// 다른 게임 화면(로그인/보드/문제상세)과 달리 1920x1080 고정 스테이지로 박아 넣지
// 않았다 - 팀 개수, 이벤트 로그 줄 수, 폼 검증 메시지처럼 실데이터 길이가 매 순간
// 달라지는 화면이라 고정 좌표는 오히려 잘림/겹침을 만든다. 대신 Figma의 색/폰트/
// 배경 아트(양피지 패널)는 그대로 가져오고, 레이아웃만 반응형 flex/grid로 짰다.
const BASE_URL = import.meta.env.BASE_URL;
const ASSET_BASE = `${BASE_URL}assets/admin/`;
// login/logo@2x.webp는 배경이 투명하지 않고 옅은 분홍색이 그대로 박혀 있어서
// (로그인 화면 배경과 색이 비슷해 안 보였을 뿐) 양피지 사이드바 위에 올리면
// 흰 사각형처럼 튄다. rules/msg-ctf-logo.png는 같은 로고를 실제 알파 채널로
// 누끼 딴 버전이라 이쪽을 admin 전용 사본으로 복사해 사용한다.
const LOGO_SRC = `${ASSET_BASE}logo.png`;
const BACKGROUND_SRC = `${ASSET_BASE}background-forest.png`;
const PANEL_SRC = `${ASSET_BASE}board-panel.png`;

const NAV_ITEMS = [
  { to: ROUTES.adminDashboard, label: "운영 대시보드", end: true },
  { to: ROUTES.adminChallenges, label: "문제 목록 · 인스턴스" },
  { to: ROUTES.adminTeams, label: "팀별 목록" },
  { to: ROUTES.adminMileage, label: "마일리지 관리" },
  { to: ROUTES.adminLogs, label: "이벤트 로그" },
  { to: ROUTES.adminSettings, label: "설정" },
  { to: ROUTES.adminAccounts, label: "계정 등록" },
];

function useAdminNickname() {
  const [nickname, setNickname] = useState(null);
  useEffect(() => {
    let cancelled = false;
    getMe()
      .then((res) => {
        if (!cancelled) setNickname(res.data?.data?.nickname ?? null);
      })
      .catch(() => {
        if (!cancelled) setNickname(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return nickname;
}

function useKstClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

function formatKst(date) {
  const parts = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")} (KST)`;
}

// 서버 로그아웃(refresh_token 폐기)이 실패해도 로컬 토큰은 지우고 내보낸다 -
// 어차피 클라이언트에 남은 access_token은 1시간 뒤 만료된다(README 0-4절).
// 로그인 화면은 ROUTES에 없는 하드코딩 예외라 client.js의 401 인터셉터
// (redirectToLogin)와 동일하게 window.location으로 이동한다.
async function handleLogout() {
  try {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
    if (refreshToken) await logout({ refreshToken });
  } catch {
    // 무시 - 아래 finally에서 어차피 로컬 상태를 정리한다.
  } finally {
    clearStoredTokens();
    window.location.assign("/login");
  }
}

export default function AdminLayout({ title, actions, children }) {
  const nickname = useAdminNickname();
  const now = useKstClock();

  return (
    <div
      className="min-h-screen bg-cover bg-center bg-fixed text-admin-ink"
      style={{ backgroundImage: `url(${BACKGROUND_SRC})` }}
    >
      <div className="mx-auto flex min-h-screen max-w-[1720px] flex-col gap-6 px-4 py-8 md:flex-row">
        <aside
          className="flex shrink-0 flex-col rounded-2xl bg-cover bg-center px-5 py-6 md:w-[260px]"
          style={{ backgroundImage: `url(${PANEL_SRC})` }}
        >
          <div className="mb-6 flex items-center gap-2">
            <img src={LOGO_SRC} alt="" aria-hidden="true" className="h-10 w-10 object-contain" />
            <span className="font-im-fell text-lg text-admin-ink">MSG CTF</span>
          </div>
          <nav className="flex flex-1 flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `relative rounded px-3 py-2 font-song-myung text-[15px] transition-colors ${
                    isActive
                      ? "bg-[rgba(211,142,37,0.18)] text-admin-ink before:absolute before:left-0 before:top-1/2 before:h-5 before:w-[3px] before:-translate-y-1/2 before:bg-admin-gold before:content-['']"
                      : "text-admin-muted hover:bg-[rgba(211,142,37,0.08)] hover:text-admin-ink"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <a
            href={ROUTES.board}
            className="mt-4 font-song-myung text-xs text-admin-muted hover:text-admin-ink"
          >
            참가자 화면으로
          </a>
          <p className="mt-6 font-song-myung text-[11px] text-admin-muted/70">MSG CTF Admin Console</p>
        </aside>

        <main
          className="flex-1 rounded-2xl bg-cover bg-center px-6 py-6 md:px-10 md:py-8"
          style={{ backgroundImage: `url(${PANEL_SRC})` }}
        >
          <header className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-admin-divider pb-4">
            <h1 className="font-im-fell text-[28px] leading-tight text-admin-ink">{title}</h1>
            <div className="flex flex-col items-end gap-1 text-right">
              <span className="font-kode-mono text-sm text-admin-gold">{formatKst(now)}</span>
              <div className="flex items-center gap-2">
                <AdminBadge>관리자</AdminBadge>
                <span className="font-song-myung text-sm text-admin-ink">
                  {nickname ?? "불러오는 중..."}
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded border border-admin-divider px-2 py-0.5 font-song-myung text-xs text-admin-muted hover:border-admin-failed hover:text-admin-failed"
                >
                  로그아웃
                </button>
              </div>
            </div>
          </header>
          {actions && <div className="mb-4 flex justify-end">{actions}</div>}
          {children}
        </main>
      </div>
    </div>
  );
}

export function AdminStatusMessage({ status, error, onRetry }) {
  if (status === "loading") {
    return <p className="font-song-myung text-sm text-admin-muted">불러오는 중입니다...</p>;
  }
  if (status === "error") {
    return (
      <div className="flex items-center gap-3 rounded border border-admin-failed bg-[rgba(163,73,52,0.12)] px-4 py-3 text-sm">
        <span role="alert" className="flex-1 font-song-myung text-admin-ink">{error}</span>
        <button
          type="button"
          onClick={onRetry}
          className="rounded border border-admin-gold px-3 py-1 font-song-myung text-admin-ink"
        >
          다시 시도
        </button>
      </div>
    );
  }
  return null;
}

export function AdminBadge({ tone = "neutral", children }) {
  const toneClass = {
    neutral: "border-admin-muted text-admin-muted",
    good: "border-admin-running text-admin-running",
    bad: "border-admin-failed text-admin-failed",
  }[tone];
  return (
    <span className={`inline-block rounded-full border px-2 py-0.5 font-song-myung text-xs ${toneClass}`}>
      {children}
    </span>
  );
}
