import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ROUTES } from "../../../routes/routePaths.js";
import { useSignatures, useSignatureDetail } from "../hooks/useSignatures.js";
import { groupSignatureClubs } from "../utils/festivalBooths.js";
import { SignatureFestivalScreen } from "./SignaturesPage.jsx";
import BoothMenuModal from "../components/BoothMenuModal.jsx";

const SOLVED_CODES = ["SUCCESS", "ALREADY_SOLVED", "SOLVE_CONFIRMED"];

function ProblemMenu({ club, signatureId, onSelect, onSolved, onClose, initialFocus }) {
  // 상세 조회와 플래그 제출을 같은 훅으로 처리해 모달에서 바로 낸다
  const detail = useSignatureDetail(signatureId);
  const solvedNow = SOLVED_CODES.includes(detail.feedback?.code);
  useEffect(() => { if (solvedNow) onSolved(signatureId); }, [solvedNow, signatureId, onSolved]);
  return <BoothMenuModal club={club} challenge={detail.data} status={detail.status}
    error={detail.error} onRetry={detail.retry} onClose={onClose} submission={detail}
    problems={club.problems} selectedId={signatureId} onSelect={onSelect} initialFocus={initialFocus} />;
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
  // 처음에는 아직 못 푼 첫 문제를 열고, 메뉴를 고르거나 풀고 나면 목록이 새로 와도 그 문제를 그대로 둔다
  const picked = club?.problems.find(problem => problem.signature_id === pickedId);
  const signatureId = (picked ?? club?.problems.find(problem => !problem.is_solved) ?? club?.problems[0])?.signature_id;
  const select = useCallback((id) => { setPickedId(id); setFocusMenu(true); }, []);
  // 정답이면 축제장 목록을 비우지 않고 다시 읽어 부스 진행과 메뉴 체크를 바로 바꾼다
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
