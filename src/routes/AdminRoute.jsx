import { useEffect, useState } from "react";
import { getMe } from "../api/auth.js";
import { ROLE_STORAGE_KEY } from "../api/client.js";
import { ROLE } from "../constants/enums.js";

// 관리자 라우트 가드. 지금까지는 /admin/* 전부 공개 라우트로 뚫려있어서(App
// Routes.jsx 옛 TODO 참고) 참가자 계정으로도 URL만 알면 관리자 화면이 그대로
// 렌더링됐다.
//
// localStorage의 role만 보고 막으면 브라우저 devtools로 값을 바꿔치기해
// 통과할 수 있다(로그인 시 서버가 내려준 값을 그냥 저장만 해둔 캐시일 뿐).
// 그래서 진입할 때마다 GET /auth/me(Bearer 토큰 - apiClient 인터셉터가 항상
// 붙인다)를 실제로 호출해 서버가 돌려주는 role을 기준으로 판정한다. 백엔드가
// 최종 방어선인 건 여전하지만(모든 /admin/* 요청이 role: ADMIN을 다시 검사),
// 이 가드가 없으면 화면 자체(사이드바, 통계 카드 틀 등)는 참가자에게도 보이고
// 개별 API 호출만 하나씩 403으로 실패하는 어정쩡한 상태가 됐다.
export default function AdminRoute({ children }) {
  const [status, setStatus] = useState("checking"); // checking | allowed | forbidden

  useEffect(() => {
    let cancelled = false;
    getMe()
      .then((res) => {
        if (cancelled) return;
        const role = res.data?.data?.role;
        if (role === ROLE.ADMIN) {
          localStorage.setItem(ROLE_STORAGE_KEY, role);
          setStatus("allowed");
        } else {
          setStatus("forbidden");
        }
      })
      .catch(() => {
        if (!cancelled) setStatus("forbidden");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (status === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#14100c] text-sm text-[#a89b87]">
        권한 확인 중입니다...
      </div>
    );
  }
  if (status === "forbidden") {
    return <ForbiddenPage />;
  }
  return children;
}

function ForbiddenPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#14100c] px-6 text-center text-[#f1ece2]">
      <p className="font-mono text-6xl font-bold text-[#a34934]">403</p>
      <h1 className="text-xl font-bold">관리자만 접근할 수 있는 페이지입니다.</h1>
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
