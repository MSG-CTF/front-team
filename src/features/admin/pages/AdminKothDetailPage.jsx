import { useCallback, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getAdminKothChallenge } from "../../../api/admin.js";
import { getKothLeaderboard } from "../../../api/koth.js";
import { ROUTES } from "../../../routes/routePaths.js";
import { isSuccess } from "../../../utils/response.js";
import AdminLayout, { AdminBadge, AdminStatusMessage } from "../components/AdminLayout.jsx";
import AdminTabs from "../components/AdminTabs.jsx";
import { Glyph } from "../components/AdminGlyph.jsx";
import { IconButton, StatStrip, StatTile } from "../components/AdminWidgets.jsx";
import { KothEditorPanel, KothLeaderboardPanel, KothPeriodsPanel, KothRepositoryPanel, KothSourceLine } from "../components/AdminKothPanels.jsx";
import AdminKothFilesPanel from "../components/AdminKothFilesPanel.jsx";
import useAdminResource from "../hooks/useAdminResource.js";
import { kothStatus, periodRange, tickLabel, tickNumber } from "../utils/adminKoth.js";
import { formatAdminNumber } from "../utils/adminNumber.js";
import { formatAdminTime } from "../utils/adminTime.js";
import { getAdminRequestError } from "../utils/adminValidation.js";
import { LIMITED_NOTICE, loadKothList } from "./AdminKothPage.jsx";
import ui from "../components/AdminWorkspace.module.css";
import styles from "./AdminKoth.module.css";

// 상세는 관리자 API를 먼저 쓰고, 없으면 참가자 목록에서 같은 문제를 찾아 보인다
async function loadKothDetail(id, config) {
  try {
    const response = await getAdminKothChallenge(id, config);
    if (!isSuccess(response.data)) throw new Error(response.data?.message || "KoTH 문제를 불러오지 못했습니다");
    return response;
  } catch (error) {
    if (getAdminRequestError(error, "").status !== "unavailable") throw error;
    const list = await loadKothList(config);
    const found = list.data.data.challenges.find((item) => item.koth_challenge_id === id);
    if (!found) throw new Error("KoTH 문제를 찾을 수 없습니다");
    return { data: { code: "SUCCESS", data: found } };
  }
}

const TABS = [
  { id: "periods", label: "틱 기록" },
  { id: "ranking", label: "누적 순위" },
  { id: "edit", label: "문제 정보" },
  { id: "files", label: "참가자 파일" },
  { id: "repository", label: "저장소 연결" },
];

// KoTH 상세: 15분 틱마다 받은 순위와 환산 점수, 누적 순위, 지문 수정, 참가자 파일, 출제 저장소 연결을 한 화면에서 다룬다
export default function AdminKothDetailPage() {
  const { kothChallengeId } = useParams();
  const detail = useAdminResource((config) => loadKothDetail(kothChallengeId, config), [kothChallengeId], "KoTH 문제를 불러오지 못했습니다");
  const leaderboard = useAdminResource((config) => getKothLeaderboard(kothChallengeId, config), [kothChallengeId], "누적 순위를 불러오지 못했습니다");
  const [tab, setTab] = useState("periods");
  const [draft, setDraft] = useState(null);
  const challenge = detail.data;
  const limited = Boolean(challenge?.limited);
  const status = kothStatus(challenge?.status);
  const last = challenge?.last_period;

  const refresh = useCallback(() => Promise.all([detail.reload(), leaderboard.reload()]), [detail.reload, leaderboard.reload]);
  // 저장소의 info.yaml 지문을 편집 칸에 채우고 문제 정보 탭으로 넘긴다 제목은 그대로 둔다
  const applyDraft = useCallback((next) => { setDraft({ description: next.description ?? "", at: Date.now() }); setTab("edit"); }, []);

  return <AdminLayout title={challenge?.title ?? "KoTH 문제"} breadcrumb={[{ label: "KoTH 문제", to: ROUTES.adminKoth }]}
    actions={<>
      {challenge && <AdminBadge tone={status.tone}>{status.label}</AdminBadge>}
      <Link className={ui.headerLink} to={ROUTES.adminKothPreview(kothChallengeId)} target="_blank" rel="noreferrer" aria-label="참가자 화면 미리보기"
        title="저장한 내용으로 열립니다"><Glyph name="external" size={13} strokeWidth={2.2} /><span>미리보기</span></Link>
      <IconButton icon="refresh" label="새로고침" onClick={refresh} disabled={detail.status === "loading"} />
    </>}>
    <AdminStatusMessage status={detail.status} error={detail.error} onRetry={detail.retry} hasData={Boolean(detail.data)} />
    {limited && <p className={ui.callout}>{LIMITED_NOTICE}</p>}
    {challenge && <div className={ui.stack}>
      <StatStrip label="KoTH 문제 요약">
        <StatTile label="동아리 · 순번" value={challenge.club_name || "-"} text sub={challenge.open_group ? `공개 순번 ${challenge.open_group}` : ""} />
        <StatTile label="선두" value={challenge.current_owner_team_name ?? "-"} text sub={challenge.current_owner_team_name ? `${formatAdminNumber(challenge.current_score)}점` : "아직 없음"} />
        <StatTile label="득점 팀" value={challenge.scored_team_count == null ? formatAdminNumber(leaderboard.data?.total_count) : formatAdminNumber(challenge.scored_team_count)} unit="팀" />
        <StatTile label="마지막 틱" value={last ? tickLabel(tickNumber(last.period_id, challenge.opened_at)) : "-"} text alert={challenge.failed_period_count > 0}
          sub={limited ? "백엔드 반영 전" : challenge.failed_period_count ? `수집 실패 ${challenge.failed_period_count}틱` : last ? periodRange(last.period_id).slice(6) : "아직 없음"} />
        <StatTile label="진행 시각" text
          value={challenge.opened_at ? `${formatAdminTime(challenge.opened_at, { seconds: false }).slice(6)} ~ ${challenge.closed_at ? formatAdminTime(challenge.closed_at, { seconds: false }).slice(6) : ""}` : "-"}
          sub={challenge.closed_at ? "종료" : challenge.opened_at ? "진행 중" : "공개 전"} />
      </StatStrip>

      <section className={ui.card}>
        <div className={styles.tabsBar}>
          <AdminTabs idPrefix="koth-detail" label="KoTH 상세" variant="primary" value={tab} onChange={setTab} items={TABS} />
          <div className={styles.tabsAside}>
            {!limited && !challenge.score_api_configured && <span className={styles.scoreWarning}>채점 주소가 아직 없습니다</span>}
            {!limited && <KothSourceLine challenge={challenge} onOpenRepository={() => setTab("repository")} />}
          </div>
        </div>
        <div className={ui.cardBody}>
          <div role="tabpanel" id="koth-detail-panel-periods" aria-labelledby="koth-detail-tab-periods" hidden={tab !== "periods"}>
            {tab === "periods" && <KothPeriodsPanel challengeId={kothChallengeId} openedAt={challenge.opened_at} limited={limited} onRetried={refresh} />}
          </div>
          <div role="tabpanel" id="koth-detail-panel-ranking" aria-labelledby="koth-detail-tab-ranking" hidden={tab !== "ranking"}>
            {tab === "ranking" && <KothLeaderboardPanel leaderboard={leaderboard} />}
          </div>
          <div role="tabpanel" id="koth-detail-panel-edit" aria-labelledby="koth-detail-tab-edit" hidden={tab !== "edit"}>
            {tab === "edit" && <KothEditorPanel key={`${challenge.updated_at ?? ""}:${draft?.at ?? ""}`} challenge={challenge} limited={limited}
              draft={draft && { description: draft.description }}
              onDraftUsed={() => setDraft(null)} onSaved={refresh} onOpenFiles={() => setTab("files")} />}
          </div>
          <div role="tabpanel" id="koth-detail-panel-files" aria-labelledby="koth-detail-tab-files" hidden={tab !== "files"}>
            {tab === "files" && <AdminKothFilesPanel challenge={challenge} limited={limited} onSaved={refresh} onOpenRepository={() => setTab("repository")} />}
          </div>
          <div role="tabpanel" id="koth-detail-panel-repository" aria-labelledby="koth-detail-tab-repository" hidden={tab !== "repository"}>
            {tab === "repository" && <KothRepositoryPanel challenge={challenge} limited={limited} onLinked={refresh} onUseDraft={applyDraft} />}
          </div>
        </div>
      </section>
    </div>}
  </AdminLayout>;
}
