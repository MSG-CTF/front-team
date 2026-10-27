import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getKothLeaderboard } from "../../../api/koth.js";
import { downloadAdminKothFiles, startAdminKothPreview } from "../../../api/admin.js";
import { ROUTES } from "../../../routes/routePaths.js";
import usePageResources from "../../../routes/usePageResources.js";
import KothScreen from "../../koth/components/KothScreen.jsx";
import { useKothTeamToken } from "../../koth/hooks/useKothData.js";
import { KOTH_CHALLENGE_VISUALS } from "../../koth/config/kothVisualConfig.js";
import { createKothChallengeViewModels, kothFile } from "../../koth/utils/kothChallengeState.js";
import useAdminResource from "../hooks/useAdminResource.js";
import { kothStatus } from "../utils/adminKoth.js";
import { kothLivePreviewUrl } from "../utils/kothLivePreview.js";
import { isSuccess } from "../../../utils/response.js";
import { loadKothList } from "./AdminKothPage.jsx";
import styles from "../components/AdminWorkspace.module.css";
import previewStyles from "./AdminKothPreviewPage.module.css";

const READY = { status: "success", data: null, error: "", retry() {} };

// 참가자 지도와 지문은 미리보기로 보고 관리자 게임 테스트는 별도 탭에서 연다
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
  const [opening, setOpening] = useState(false);
  const [openError, setOpenError] = useState("");
  const [isTeamTokenOpen, setIsTeamTokenOpen] = useState(false);
  const teamToken = useKothTeamToken();
  const { clearTeamToken } = teamToken;
  const pendingPopup = useRef(null);
  useEffect(() => {
    setOpening(false); setOpenError("");
    setIsTeamTokenOpen(false); clearTeamToken();
    return () => { pendingPopup.current?.close(); pendingPopup.current = null; };
  }, [kothChallengeId, clearTeamToken]);

  function openTeamToken() {
    setIsTeamTokenOpen(true);
    teamToken.requestTeamToken();
  }

  function closeTeamToken() {
    setIsTeamTokenOpen(false);
    clearTeamToken();
  }

  async function openGame() {
    if (!target || opening) return;
    const popup = window.open("about:blank", "_blank");
    if (!popup) { setOpenError("팝업을 허용한 뒤 다시 눌러주세요"); return; }
    popup.opener = null;
    pendingPopup.current = popup;
    setOpening(true); setOpenError("");
    try {
      const response = await startAdminKothPreview(kothChallengeId);
      if (!isSuccess(response.data)) throw new Error(response.data?.message || "게임 테스트를 열지 못했습니다");
      const url = kothLivePreviewUrl(response.data.data, target.challenge_url);
      if (pendingPopup.current === popup && !popup.closed) popup.location.replace(url);
    } catch (error) {
      popup.close();
      if (pendingPopup.current === popup) setOpenError(error?.response?.data?.message || error?.message || "게임 테스트를 열지 못했습니다");
    } finally {
      if (pendingPopup.current === popup) { pendingPopup.current = null; setOpening(false); }
    }
  }

  return <div className={previewStyles.shell}>
    <aside className={`${styles.workspace} ${styles.previewNotice}`} aria-label="관리자 미리보기">
      <div><strong>참가자 화면 미리보기</strong><span>관리자 게임 테스트는 5분 동안 열립니다 공개 일정은 바뀌지 않습니다</span></div>
      {target && <span>{target.title} · 지금 {status.label}{target.status === "ACTIVE" ? "" : " · 진행 중일 때 모습으로 보입니다"}</span>}
      {list.status === "success" && !target && <span>이 KoTH 문제를 찾지 못했습니다</span>}
      {target?.status === "SCHEDULED" && <button type="button" className={styles.button} onClick={openGame}
        disabled={opening || !target.challenge_url?.startsWith("https://")}>{opening ? "게임 여는 중" : "게임 테스트 열기"}</button>}
      <button type="button" className={styles.button} onClick={openTeamToken}>팀 토큰</button>
      {openError && <span role="alert">{openError}</span>}
      <button type="button" className={styles.button} onClick={() => navigate(ROUTES.adminKothDetail(kothChallengeId))}>KoTH 관리로</button>
    </aside>
    <div className={previewStyles.canvas} onClickCapture={(event) => {
      // 게임은 위의 관리자 테스트 버튼으로 열고, 파일은 관리자 API로 받는다
      if (event.target.closest("a")) { event.preventDefault(); event.stopPropagation(); }
    }}>
      <KothScreen requestStatus={list.status === "success" ? "success" : list.status === "loading" ? "loading" : "error"} requestError={list.error}
        authenticated clubsStale={false} problemRanking={problemRanking} challenges={models} isEmpty={list.status === "success" && models.length === 0}
        unmappedChallengeCount={0} teamName={teamToken.data?.team_name ?? "테스트 팀"} totalKothScore={null} selectedChallenge={isTeamTokenOpen ? null : selected ?? null} clubDetail={READY}
        isTeamTokenOpen={isTeamTokenOpen} teamToken={teamToken} onRetry={list.retry} onSelectChallenge={() => {}} onCloseChallenge={() => navigate(ROUTES.adminKothDetail(kothChallengeId))}
        onOpenTeamToken={openTeamToken} onCloseTeamToken={closeTeamToken} downloadFile={downloadAdminKothFiles} />
    </div>
  </div>;
}
