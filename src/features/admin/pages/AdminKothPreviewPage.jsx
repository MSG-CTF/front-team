import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getKothLeaderboard } from "../../../api/koth.js";
import { ROUTES } from "../../../routes/routePaths.js";
import usePageResources from "../../../routes/usePageResources.js";
import KothScreen from "../../koth/components/KothScreen.jsx";
import { KOTH_CHALLENGE_VISUALS } from "../../koth/config/kothVisualConfig.js";
import { createKothChallengeViewModels, kothFile } from "../../koth/utils/kothChallengeState.js";
import useAdminResource from "../hooks/useAdminResource.js";
import { kothStatus } from "../utils/adminKoth.js";
import { loadKothList } from "./AdminKothPage.jsx";
import styles from "../components/AdminWorkspace.module.css";

const NO_TOKEN = { status: "idle", data: null, error: "", requestTeamToken() {}, clearTeamToken() {} };
const READY = { status: "success", data: null, error: "", retry() {} };

// 참가자 KoTH 지도와 문제 정보 칸을 저장된 내용으로 보인다 팀 토큰과 접속은 연결하지 않는다
// 아직 공개 전이거나 끝난 문제도 진행 중일 때 모습으로 문제 정보 칸을 연다
export default function AdminKothPreviewPage() {
  usePageResources();
  const { kothChallengeId } = useParams();
  const navigate = useNavigate();
  const list = useAdminResource(loadKothList, [], "KoTH 문제를 불러오지 못했습니다");
  const ranking = useAdminResource((config) => getKothLeaderboard(kothChallengeId, config), [kothChallengeId], "누적 순위를 불러오지 못했습니다");
  const challenges = useMemo(() => list.data?.challenges ?? [], [list.data]);
  const target = challenges.find((item) => item.koth_challenge_id === kothChallengeId);
  const clubs = useMemo(() => {
    const grouped = new Map();
    for (const item of challenges) {
      if (!grouped.has(item.club_id)) grouped.set(item.club_id, { club_id: item.club_id, name: item.club_name, challenges: [] });
      grouped.get(item.club_id).challenges.push(item);
    }
    return [...grouped.values()];
  }, [challenges]);
  const models = useMemo(() => createKothChallengeViewModels(KOTH_CHALLENGE_VISUALS, clubs, []), [clubs]);
  const model = models.find((item) => item.kothChallengeId === kothChallengeId);
  const bundle = target?.files?.mode === "REPOSITORY" ? target.files.bundle : null;
  const selected = model && { ...model, status: "ACTIVE", description: target?.description ?? null, file: kothFile(bundle) };
  const problemRanking = ranking.status === "success" ? { status: "success", data: ranking.data, retry: ranking.retry }
    : { status: ranking.status === "loading" ? "loading" : "error", data: null, error: ranking.error, retry: ranking.retry };
  const status = kothStatus(target?.status);

  return <>
    <aside className={`${styles.workspace} ${styles.previewNotice}`} aria-label="관리자 미리보기">
      <div><strong>참가자 화면 미리보기</strong><span>저장된 내용 기준 · 팀 토큰, 문제 접속, 파일 받기는 비활성화됩니다</span></div>
      {target && <span>{target.title} · 지금 {status.label}{target.status === "ACTIVE" ? "" : " · 진행 중일 때 모습으로 보입니다"}</span>}
      {list.status === "success" && !target && <span>이 KoTH 문제를 찾지 못했습니다</span>}
      <button type="button" className={styles.button} onClick={() => navigate(ROUTES.adminKothDetail(kothChallengeId))}>KoTH 관리로</button>
    </aside>
    <div onClickCapture={(event) => {
      // 미리보기에서는 문제 접속과 파일 받기를 실제로 하지 않는다
      if (event.target.closest("a, [data-file-download]")) { event.preventDefault(); event.stopPropagation(); }
    }}>
      <KothScreen requestStatus={list.status === "success" ? "success" : list.status === "loading" ? "loading" : "error"} requestError={list.error}
        authenticated clubsStale={false} problemRanking={problemRanking} challenges={models} isEmpty={list.status === "success" && models.length === 0}
        unmappedChallengeCount={0} teamName="미리보기" totalKothScore={null} selectedChallenge={selected ?? null} clubDetail={READY}
        isTeamTokenOpen={false} teamToken={NO_TOKEN} onRetry={list.retry} onSelectChallenge={() => {}} onCloseChallenge={() => navigate(ROUTES.adminKothDetail(kothChallengeId))}
        onOpenTeamToken={() => {}} onCloseTeamToken={() => {}} />
    </div>
  </>;
}
