import { useNavigate, useParams } from "react-router-dom";
import { downloadAdminChallengeFile, getAdminChallengePreview } from "../../../api/admin.js";
import ChallengeDetailScreen from "../../challenges/components/ChallengeDetailScreen.jsx";
import { mapChallengeDetail } from "../../challenges/utils/challengeDetailMapper.js";
import useAdminResource from "../hooks/useAdminResource.js";
import styles from "../components/AdminWorkspace.module.css";

const NO_ACTIONS = { canCreate: false, canExtend: false, canRestart: false, canStop: false };

export default function AdminChallengePreviewPage() {
  const { challengeId } = useParams();
  const navigate = useNavigate();
  const preview = useAdminResource((config) => getAdminChallengePreview(challengeId, config), [challengeId], "미리보기를 불러오지 못했습니다");
  const challenge = preview.data ? mapChallengeDetail(preview.data) : null;
  return <>
    <aside className={`${styles.workspace} ${styles.previewNotice}`} aria-label="관리자 미리보기">
      <div><strong>참가자 화면 미리보기</strong><span>저장된 내용 기준 · 정답 제출과 인스턴스 실행은 비활성화됩니다</span></div>
      {preview.data && <span>{preview.data.is_published ? "공개" : "비공개"}{preview.data.release_version ? ` · 배포 v${preview.data.release_version}` : " · 배포 버전 없음"}</span>}
      <button type="button" className={styles.button} onClick={() => navigate("/admin/challenges")}>문제 관리로</button>
    </aside>
    <ChallengeDetailScreen loading={preview.status === "loading"} refreshing={preview.status === "loading"}
      pageError={["error", "unavailable"].includes(preview.status) ? { message: preview.error } : null} challenge={challenge}
      submission={{ remainingSeconds: null, blocked: false }} instance={null} controls={NO_ACTIONS}
      flagValue="" retrySeconds={0} readOnly downloadFile={downloadAdminChallengeFile}
      onBack={() => navigate("/admin/challenges")} onRetry={preview.retry}/>
  </>;
}
