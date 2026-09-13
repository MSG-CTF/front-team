import { Navigate, Route, Routes } from "react-router-dom";
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
import AdminMileagePage from "../features/admin/pages/AdminMileagePage.jsx";
import AdminSettingsPage from "../features/admin/pages/AdminSettingsPage.jsx";
import AdminLogsPage from "../features/admin/pages/AdminLogsPage.jsx";
import AdminAccountsPage from "../features/admin/pages/AdminAccountsPage.jsx";
import AdminRoute from "./AdminRoute.jsx";
import { ROUTES } from "./routePaths.js";

// TODO: 참가자 라우트 가드(로그인 안 한 상태에서 /board 등 직접 접근)는 토큰
// 저장 방식이 정해지면 추가. 관리자 라우트는 AdminRoute로 막아뒀다(아래).
export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path={ROUTES.board} element={<BoardPage />} />
      <Route path={ROUTES.openChallenges} element={<OpenChallengesPage />} />
      <Route path="/challenges/:challengeId" element={<ChallengeDetailPage />} />
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
