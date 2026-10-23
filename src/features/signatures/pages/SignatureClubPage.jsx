import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ROUTES } from "../../../routes/routePaths.js";
import { useSignatures, useSignatureDetail } from "../hooks/useSignatures.js";
import { groupSignatureClubs } from "../utils/festivalBooths.js";
import { SignatureFestivalScreen } from "./SignaturesPage.jsx";
import BoothMenuModal from "../components/BoothMenuModal.jsx";

const SOLVED_CODES = ["SUCCESS", "ALREADY_SOLVED", "SOLVE_CONFIRMED"];

// 기존 상세 GET, 제출, 재시도 대기를 그대로 쓰고 메뉴판 아래에서 바로 플래그를 낸다
function ProblemMenu({ club, signatureId, onSelect, onSolved, onClose, initialFocus }) {
  const detail = useSignatureDetail(signatureId);
  const solvedNow = SOLVED_CODES.includes(detail.feedback?.code);
  useEffect(() => { if (solvedNow) onSolved(signatureId); }, [solvedNow, signatureId, onSolved]);
  return <BoothMenuModal club={club} challenge={detail.data} status={detail.status}
    error={detail.error} onRetry={detail.retry} onClose={onClose} initialFocus={initialFocus}
    problems={club.problems} selectedId={signatureId} onSelect={onSelect}
    flag={{ value: detail.flag, onChange: detail.setFlag, onSubmit: detail.submit, busy: detail.busy,
      feedback: detail.feedback, retrySeconds: detail.retrySeconds, solved: detail.solved, disabled: detail.disabled }} />;
}

export default function SignatureClubPage() {
  const { clubId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const state = useSignatures();
  const { refresh } = state;
  const [pickedId, setPickedId] = useState(null);
  const [focusMenu, setFocusMenu] = useState(false);
  const club = groupSignatureClubs(state.data).find(entry => entry.clubId === clubId);
  // 처음에는 아직 못 푼 첫 문제를 보이고, 메뉴를 고르거나 풀고 나면 목록이 새로 와도 그 문제를 그대로 둔다
  const picked = club?.problems.find(problem => problem.signature_id === pickedId);
  const signatureId = (picked ?? club?.problems.find(problem => !problem.is_solved) ?? club?.problems[0])?.signature_id;
  const select = useCallback((id) => { setPickedId(id); setFocusMenu(true); }, []);
  // 정답이면 축제장 목록을 조용히 다시 읽어 부스 스탬프와 메뉴 체크를 바로 바꾼다
  const solved = useCallback((id) => { setPickedId(id); refresh(); }, [refresh]);
  const close = useCallback(() => {
    if (location.state?.fromFestival) navigate(-1);
    else navigate(ROUTES.signatures, { replace: true });
  }, [navigate, location.state]);
  return <>
    <SignatureFestivalScreen state={state} />
    {signatureId ? <ProblemMenu key={signatureId} club={club} signatureId={signatureId}
      onSelect={select} onSolved={solved} onClose={close} initialFocus={focusMenu ? "menu" : "close"} />
      : <BoothMenuModal club={club} status={state.status === "success" ? "empty" : state.status}
        error={state.error} onRetry={state.retry} onClose={close} />}
  </>;
}
