import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import LoginPage from "../features/auth/pages/LoginPage.jsx";
import BoardPage from "../features/board/pages/BoardPage.jsx";
import OpenChallengesPage from "../features/challenges/pages/OpenChallengesPage.jsx";
import ChallengeDetailPage from "../features/challenges/pages/ChallengeDetailPage.jsx";
import LeaderboardPage from "../features/leaderboard/pages/LeaderboardPage.jsx";
import MyPage from "../features/mypage/pages/MyPage.jsx";
import TimerPage from "../features/timer/pages/TimerPage.jsx";
import KothPage from "../features/koth/pages/KothPage.jsx";
import RulesPage from "../features/rules/pages/RulesPage.jsx";
import AdminDashboardPage from "../features/admin/pages/AdminDashboardPage.jsx";
import AdminTeamsPage from "../features/admin/pages/AdminTeamsPage.jsx";
import AdminTeamDetailPage from "../features/admin/pages/AdminTeamDetailPage.jsx";
import AdminChallengesPage from "../features/admin/pages/AdminChallengesPage.jsx";
import AdminSignaturesPage from "../features/admin/pages/AdminSignaturesPage.jsx";
import AdminMileagePage from "../features/admin/pages/AdminMileagePage.jsx";
import AdminSettingsPage from "../features/admin/pages/AdminSettingsPage.jsx";
import AdminLogsPage from "../features/admin/pages/AdminLogsPage.jsx";
import AdminAccountsPage from "../features/admin/pages/AdminAccountsPage.jsx";
import AdminRoute from "./AdminRoute.jsx";
import { ROUTES } from "./routePaths.js";
import useRouteTitle from "./useRouteTitle.js";

const IntroLayout = lazy(() => import("../features/intro/IntroLayout.jsx"));
const IntroPage = lazy(() => import("../features/intro/IntroPage.jsx"));
const IntroGuidePage = lazy(() => import("../features/intro/IntroGuidePage.jsx"));
const SignaturesPage = lazy(() => import("../features/signatures/pages/SignaturesPage.jsx"));
const SignatureDetailPage = lazy(() => import("../features/signatures/pages/SignatureDetailPage.jsx"));
const SignatureClubPage = lazy(() => import("../features/signatures/pages/SignatureClubPage.jsx"));

// TODO: 참가자 라우트 가드(로그인 안 한 상태에서 /board 등 직접 접근)는 토큰
// 저장 방식이 정해지면 추가. 관리자 라우트는 AdminRoute로 막아뒀다(아래).
export default function AppRoutes() {
  useRouteTitle();
  return (
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
      <Route path="/challenges/:challengeId" element={<ChallengeDetailPage />} />
      <Route path={ROUTES.signatures} element={<Suspense fallback={<p role="status">부스 문제를 불러오는 중</p>}><SignaturesPage /></Suspense>} />
      <Route path="/signatures/clubs/:clubId" element={<Suspense fallback={<p role="status">동아리 부스를 불러오는 중</p>}><SignatureClubPage /></Suspense>} />
      <Route path="/signatures/:signatureId" element={<Suspense fallback={<p role="status">부스 문제를 불러오는 중</p>}><SignatureDetailPage /></Suspense>} />
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
      <Route path={ROUTES.adminSignatures} element={<AdminRoute><AdminSignaturesPage /></AdminRoute>} />
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
  );
}
