import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const BASE_TITLE = "MSG CTF";

// 경로별 화면 이름. index.html의 기본 <title>이 "MSG CTF - 로그인"으로 고정돼
// 있어서 라우트가 바뀌어도 탭 제목이 갱신되지 않던 문제 대응(낮은 우선순위 항목).
// 동적 세그먼트(:teamId, :challengeId)가 있는 라우트는 접두사로 매칭하므로,
// 더 구체적인 경로를 먼저 나열해야 한다(예: /admin/teams가 /admin보다 앞).
const ROUTE_TITLES = [
  ["/", "2026"],
  ["/guide", "참가 안내와 경기 규칙"],
  ["/login", "로그인"],
  ["/board", "보드"],
  ["/challenges", "문제"],
  ["/leaderboard", "리더보드"],
  ["/mypage", "마이페이지"],
  ["/timer", "타이머"],
  ["/koth", "KOTH"],
  ["/rules", "규칙"],
  ["/admin/teams", "관리자 - 팀"],
  ["/admin/challenges", "관리자 - 문제"],
  ["/admin/mileage", "관리자 - 마일리지"],
  ["/admin/settings", "관리자 - 설정"],
  ["/admin/logs", "관리자 - 로그"],
  ["/admin/accounts", "관리자 - 계정 등록"],
  ["/admin", "관리자 - 대시보드"],
];

function resolveTitle(pathname) {
  const match = ROUTE_TITLES.find(
    ([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  return match?.[1] ?? null;
}

// AppRoutes 최상단에서 한 번 호출한다 - 페이지별로 각자 설정하지 않아도
// 라우트가 바뀔 때마다 탭 제목이 자동으로 맞춰진다.
export default function useRouteTitle() {
  const { pathname } = useLocation();
  useEffect(() => {
    const name = resolveTitle(pathname);
    document.title = name ? `${BASE_TITLE} - ${name}` : BASE_TITLE;
  }, [pathname]);
}
