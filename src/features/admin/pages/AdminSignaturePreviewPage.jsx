import { useCallback, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getAdminSignatures } from "../../../api/admin.js";
import { ROUTES } from "../../../routes/routePaths.js";
import usePageResources from "../../../routes/usePageResources.js";
import BoothMenuModal from "../../signatures/components/BoothMenuModal.jsx";
import { SignatureFestivalScreen } from "../../signatures/pages/SignaturesPage.jsx";
import { groupSignatureClubs } from "../../signatures/utils/festivalBooths.js";
import useAdminResource from "../hooks/useAdminResource.js";
import styles from "../components/AdminWorkspace.module.css";

// 참가자가 보는 축제장과 부스 메뉴판을 저장된 내용 그대로 보인다 제출은 연결하지 않는다
// 참가자에게는 공개된 문제만 보이지만, 미리보기에서는 고른 문제를 공개된 것처럼 함께 넣어 공개 후 모습을 확인한다
const toParticipant = (entry) => ({
  signature_id: entry.signature_id, club_id: entry.club_id, club_name: entry.club_name, title: entry.title,
  description: entry.description, score: entry.score, solved_team_count: entry.solved_team_count ?? 0, is_solved: false, solved_at: null,
});

export default function AdminSignaturePreviewPage() {
  usePageResources();
  const { signatureId } = useParams();
  const navigate = useNavigate();
  const resource = useAdminResource(getAdminSignatures, [], "시그니처 문제를 불러오지 못했습니다");
  const all = useMemo(() => resource.data?.signatures ?? [], [resource.data]);
  const target = all.find((entry) => entry.signature_id === signatureId);
  const problems = useMemo(() => all.filter((entry) => entry.is_published || entry.signature_id === signatureId).map(toParticipant), [all, signatureId]);
  const clubs = useMemo(() => groupSignatureClubs(problems), [problems]);
  const [openClubId, setOpenClubId] = useState(undefined);
  const clubId = openClubId === undefined ? target?.club_id : openClubId;
  const club = clubs.find((entry) => entry.clubId === clubId);
  const close = useCallback(() => setOpenClubId(null), []);
  const status = resource.status === "success" ? "success" : resource.status === "loading" ? "loading" : "error";

  return <>
    <aside className={`${styles.workspace} ${styles.previewNotice}`} aria-label="관리자 미리보기">
      <div><strong>참가자 화면 미리보기</strong><span>저장된 내용 기준 · 정답 제출은 비활성화됩니다</span></div>
      {target && <span>{target.club_name} · {target.is_published ? "공개 중" : "비공개 · 공개하면 이렇게 보입니다"}</span>}
      {resource.status === "success" && !target && <span>이 시그니처 문제를 찾지 못했습니다</span>}
      <button type="button" className={styles.button} onClick={() => navigate(ROUTES.adminSignatures)}>시그니처 관리로</button>
    </aside>
    <div onClickCapture={(event) => {
      if (event.target.closest("a")) { event.preventDefault(); event.stopPropagation(); }
    }}>
      <SignatureFestivalScreen state={{ status, data: problems, error: resource.error, retry: resource.retry }}
        onPreviewClub={(next) => setOpenClubId(next.clubId)} />
    </div>
    {club && <BoothMenuModal key={club.clubId} club={club} challenge={club.problems[0]} status="success" onClose={close} />}
  </>;
}
