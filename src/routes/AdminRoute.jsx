import { Navigate } from "react-router-dom";
import { ROLE } from "../constants/enums.js";
import { useAuthenticatedUser } from "./AuthenticatedRoute.jsx";
import { ROUTES } from "./routePaths.js";

// 공통 로그인 확인이 받은 서버의 role만 사용한다 저장된 role 캐시는 믿지 않는다
export default function AdminRoute({ children }) {
  const user = useAuthenticatedUser();
  if (!user) return <Navigate to={ROUTES.login} replace />;
  if (user.role !== ROLE.ADMIN) {
    return <ForbiddenPage />;
  }
  return children;
}

function ForbiddenPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#14100c] px-6 text-center text-[#f1ece2]">
      <p className="font-mono text-6xl font-bold text-[#a34934]">403</p>
      <h1 className="text-xl font-bold">관리자만 접근할 수 있는 페이지입니다</h1>
      <p className="text-sm text-[#a89b87]">
        이 계정에는 관리자 권한이 없습니다. 관리자 계정으로 다시 로그인해주세요.
      </p>
      <a
        href="/login"
        className="mt-4 rounded border border-[#c89252] px-4 py-2 text-sm text-[#e8b957] hover:bg-[#221b14]"
      >
        로그인 화면으로
      </a>
    </div>
  );
}
