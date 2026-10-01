import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import OpenChallengesPage from "../features/challenges/pages/OpenChallengesPage.jsx";
import AdminRoute from "./AdminRoute.jsx";
import RouteLoadBoundary from "./RouteLoadBoundary.jsx";
import { ROUTES } from "./routePaths.js";
import useRouteTitle from "./useRouteTitle.js";
import usePageResources from "./usePageResources.js";

// 현재 화면에 필요한 코드만 읽는다 관리자 화면과 QR 기능은 참가자 진입에서 제외한다
const LoginPage = lazy(() => import("../features/auth/pages/LoginPage.jsx"));
const BoardPage = lazy(() => {
  // 보드 페이지를 받은 뒤에 3D 코드를 찾는 직렬 대기를 줄인다 실패 시 원래 대체 주사위를 쓴다
  void import("../features/board/components/Dice3D.jsx").catch(() => {});
  return import("../features/board/pages/BoardPage.jsx");
});
const ChallengeDetailPage = lazy(
  () => import("../features/challenges/pages/ChallengeDetailPage.jsx"),
);
const LeaderboardPage = lazy(
  () => import("../features/leaderboard/pages/LeaderboardPage.jsx"),
);
const MyPage = lazy(() => import("../features/mypage/pages/MyPage.jsx"));
const TimerPage = lazy(() => import("../features/timer/pages/TimerPage.jsx"));
const KothPage = lazy(() => import("../features/koth/pages/KothPage.jsx"));
const RulesPage = lazy(() => import("../features/rules/pages/RulesPage.jsx"));
const AdminDashboardPage = lazy(
  () => import("../features/admin/pages/AdminDashboardPage.jsx"),
);
const AdminTeamsPage = lazy(
  () => import("../features/admin/pages/AdminTeamsPage.jsx"),
);
const AdminTeamDetailPage = lazy(
  () => import("../features/admin/pages/AdminTeamDetailPage.jsx"),
);
const AdminChallengesPage = lazy(
  () => import("../features/admin/pages/AdminChallengesPage.jsx"),
);
const AdminSignaturesPage = lazy(
  () => import("../features/admin/pages/AdminSignaturesPage.jsx"),
);
const AdminMileagePage = lazy(
  () => import("../features/admin/pages/AdminMileagePage.jsx"),
);
const AdminSettingsPage = lazy(
  () => import("../features/admin/pages/AdminSettingsPage.jsx"),
);
const AdminLogsPage = lazy(
  () => import("../features/admin/pages/AdminLogsPage.jsx"),
);
const AdminAccountsPage = lazy(
  () => import("../features/admin/pages/AdminAccountsPage.jsx"),
);

const loadIntroPage = () => import("../features/intro/IntroPage.jsx");
const IntroLayout = lazy(() => {
  // 첫 페이지 내용은 공통 레이아웃과 함께 받아 직렬 대기를 줄인다
  if (typeof window !== "undefined" && window.location.pathname === ROUTES.intro) {
    void loadIntroPage().catch(() => {});
  }
  return import("../features/intro/IntroLayout.jsx");
});
const IntroPage = lazy(loadIntroPage);
const IntroGuidePage = lazy(
  () => import("../features/intro/IntroGuidePage.jsx"),
);
const SignaturesPage = lazy(
  () => import("../features/signatures/pages/SignaturesPage.jsx"),
);
const SignatureDetailPage = lazy(
  () => import("../features/signatures/pages/SignatureDetailPage.jsx"),
);
const SignatureClubPage = lazy(
  () => import("../features/signatures/pages/SignatureClubPage.jsx"),
);

// TODO: 참가자 라우트 가드(로그인 안 한 상태에서 /board 등 직접 접근)는 토큰
// 저장 방식이 정해지면 추가. 관리자 라우트는 AdminRoute로 막아뒀다(아래).
export default function AppRoutes() {
  useRouteTitle();
  usePageResources();
  return (
    <RouteLoadBoundary>
    <Suspense
      fallback={
        <div
          role="status"
          className="fixed inset-0 grid place-items-center bg-[#21150d] font-inria-serif text-[#f8ead0]"
        >
          화면을 불러오는 중
        </div>
      }
    >
      <Routes>
        <Route
          element={
            <Suspense fallback={<p role="status">대회 안내를 불러오는 중</p>}>
              <IntroLayout />
            </Suspense>
          }
        >
          <Route path={ROUTES.intro} element={<IntroPage />} />
          <Route path={ROUTES.introGuide} element={<IntroGuidePage />} />
        </Route>
        <Route path="/login" element={<LoginPage />} />
        <Route path={ROUTES.board} element={<BoardPage />} />
        <Route path={ROUTES.openChallenges} element={<OpenChallengesPage />} />
        <Route
          path="/challenges/:challengeId"
          element={<ChallengeDetailPage />}
        />
        <Route
          path={ROUTES.signatures}
          element={
            <Suspense fallback={<p role="status">부스 문제를 불러오는 중</p>}>
              <SignaturesPage />
            </Suspense>
          }
        />
        <Route
          path="/signatures/clubs/:clubId"
          element={
            <Suspense fallback={<p role="status">동아리 부스를 불러오는 중</p>}>
              <SignatureClubPage />
            </Suspense>
          }
        />
        <Route
          path="/signatures/:signatureId"
          element={
            <Suspense fallback={<p role="status">부스 문제를 불러오는 중</p>}>
              <SignatureDetailPage />
            </Suspense>
          }
        />
        <Route path={ROUTES.leaderboard} element={<LeaderboardPage />} />
        <Route path={ROUTES.mypage} element={<MyPage />} />
        <Route path="/timer" element={<TimerPage />} />
        <Route path={ROUTES.koth} element={<KothPage />} />
        <Route path={ROUTES.rules} element={<RulesPage />} />
        <Route
          path={ROUTES.adminDashboard}
          element={
            <AdminRoute>
              <AdminDashboardPage />
            </AdminRoute>
          }
        />
        <Route
          path={ROUTES.adminTeams}
          element={
            <AdminRoute>
              <AdminTeamsPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/teams/:teamId"
          element={
            <AdminRoute>
              <AdminTeamDetailPage />
            </AdminRoute>
          }
        />
        <Route
          path={ROUTES.adminChallenges}
          element={
            <AdminRoute>
              <AdminChallengesPage />
            </AdminRoute>
          }
        />
        <Route
          path={ROUTES.adminMileage}
          element={
            <AdminRoute>
              <AdminMileagePage />
            </AdminRoute>
          }
        />
        <Route
          path={ROUTES.adminSignatures}
          element={
            <AdminRoute>
              <AdminSignaturesPage />
            </AdminRoute>
          }
        />
        <Route
          path={ROUTES.adminSettings}
          element={
            <AdminRoute>
              <AdminSettingsPage />
            </AdminRoute>
          }
        />
        <Route
          path={ROUTES.adminLogs}
          element={
            <AdminRoute>
              <AdminLogsPage />
            </AdminRoute>
          }
        />
        <Route
          path={ROUTES.adminAccounts}
          element={
            <AdminRoute>
              <AdminAccountsPage />
            </AdminRoute>
          }
        />
      </Routes>
    </Suspense>
    </RouteLoadBoundary>
  );
}
