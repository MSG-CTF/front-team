import { useCallback } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ROUTES } from "../../../routes/routePaths.js";
import { useSignatures, useSignatureDetail } from "../hooks/useSignatures.js";
import { groupSignatureClubs } from "../utils/festivalBooths.js";
import { SignatureFestivalScreen } from "./SignaturesPage.jsx";
import BoothMenuModal from "../components/BoothMenuModal.jsx";

function ProblemMenu({ club, signatureId, onClose }) {
  // 상세 조회와 플래그 제출을 같은 훅으로 처리해 모달에서 바로 낸다
  const detail = useSignatureDetail(signatureId);
  return <BoothMenuModal club={club} challenge={detail.data} status={detail.status}
    error={detail.error} onRetry={detail.retry} onClose={onClose} submission={detail} />;
}

export default function SignatureClubPage() {
  const { clubId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const state = useSignatures();
  const club = groupSignatureClubs(state.data).find(entry => entry.clubId === clubId);
  const signatureId = club?.problems[0]?.signature_id;
  const close = useCallback(() => {
    if (location.state?.fromFestival) navigate(-1);
    else navigate(ROUTES.signatures, { replace: true });
  }, [navigate, location.state]);
  return <>
    <SignatureFestivalScreen state={state} />
    {signatureId ? <ProblemMenu key={signatureId} club={club} signatureId={signatureId}
      onClose={close} />
      : <BoothMenuModal club={club} status={state.status === "success" ? "empty" : state.status}
        error={state.error} onRetry={state.retry} onClose={close} />}
  </>;
}
