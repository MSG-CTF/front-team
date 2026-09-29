import { Navigate, useLocation } from "react-router-dom";
import { ROUTES } from "../../../routes/routePaths.js";

export default function OpenChallengesPage() {
  const location = useLocation();
  // 기존 즐겨찾기와 공유 주소는 보드 안의 열린 목록으로 이어진다
  return <Navigate to={ROUTES.boardChallenges} state={location.state} replace />;
}
