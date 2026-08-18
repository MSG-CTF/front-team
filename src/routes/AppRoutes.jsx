import { Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "../features/auth/pages/LoginPage.jsx";
import BoardPage from "../features/board/pages/BoardPage.jsx";
import OpenChallengesPage from "../features/challenges/pages/OpenChallengesPage.jsx";
import ChallengeDetailPage from "../features/challenges/pages/ChallengeDetailPage.jsx";
import LeaderboardPage from "../features/leaderboard/pages/LeaderboardPage.jsx";
import MyPage from "../features/mypage/pages/MyPage.jsx";
import TimerPage from "../features/timer/pages/TimerPage.jsx";
import KothPage from "../features/koth/pages/KothPage.jsx";
import AdminDashboardPage from "../features/admin/pages/AdminDashboardPage.jsx";
import AdminTeamsPage from "../features/admin/pages/AdminTeamsPage.jsx";
import AdminTeamDetailPage from "../features/admin/pages/AdminTeamDetailPage.jsx";
import AdminChallengesPage from "../features/admin/pages/AdminChallengesPage.jsx";
import AdminSettingsPage from "../features/admin/pages/AdminSettingsPage.jsx";
import AdminLogsPage from "../features/admin/pages/AdminLogsPage.jsx";

// TODO: 인증/관리자 라우트 가드(ProtectedRoute, AdminRoute)는 토큰 저장 방식이
// 정해지면 추가. 지금은 전부 공개 라우트로 뚫려있음.
export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/board" element={<BoardPage />} />
      <Route path="/challenges" element={<OpenChallengesPage />} />
      <Route path="/challenges/:challengeId" element={<ChallengeDetailPage />} />
      <Route path="/leaderboard" element={<LeaderboardPage />} />
      <Route path="/mypage" element={<MyPage />} />
      <Route path="/timer" element={<TimerPage />} />
      <Route path="/koth" element={<KothPage />} />
      <Route path="/admin" element={<AdminDashboardPage />} />
      <Route path="/admin/teams" element={<AdminTeamsPage />} />
      <Route path="/admin/teams/:teamId" element={<AdminTeamDetailPage />} />
      <Route path="/admin/challenges" element={<AdminChallengesPage />} />
      <Route path="/admin/settings" element={<AdminSettingsPage />} />
      <Route path="/admin/logs" element={<AdminLogsPage />} />
    </Routes>
  );
}
