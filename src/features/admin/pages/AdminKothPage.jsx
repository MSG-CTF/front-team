import { Link, useNavigate } from "react-router-dom";
import { getAdminKothChallenges } from "../../../api/admin.js";
import { getKothClubs } from "../../../api/koth.js";
import { ROUTES } from "../../../routes/routePaths.js";
import { isSuccess } from "../../../utils/response.js";
import AdminLayout, { AdminBadge, AdminStatusMessage } from "../components/AdminLayout.jsx";
import { Glyph } from "../components/AdminGlyph.jsx";
import { IconButton, StatStrip, StatTile } from "../components/AdminWidgets.jsx";
import useAdminResource from "../hooks/useAdminResource.js";
import { KOTH_POINTS, byOpenGroup, kothListFromClubs, kothStatus, kothSummary, periodRange, periodStatus, repositoryFreshness, tickLabel, tickNumber } from "../utils/adminKoth.js";
import { formatAdminNumber } from "../utils/adminNumber.js";
import { getAdminRequestError } from "../utils/adminValidation.js";
import ui from "../components/AdminWorkspace.module.css";
import styles from "./AdminKoth.module.css";

// 관리자 KoTH API(프론트 요청)가 없으면 참가자 API GET /koth/clubs (구현 완료)로 목록만 채운다
export async function loadKothList(config) {
  try {
    const response = await getAdminKothChallenges(config);
    if (!isSuccess(response.data)) throw new Error(response.data?.message || "KoTH 문제를 불러오지 못했습니다");
    return { data: { code: "SUCCESS", data: { challenges: [...(response.data.data?.challenges ?? [])].sort(byOpenGroup), limited: false } } };
  } catch (error) {
    if (getAdminRequestError(error, "").status !== "unavailable") throw error;
    const clubs = await getKothClubs(config);
    if (!isSuccess(clubs.data)) throw new Error(clubs.data?.message || "KoTH 문제를 불러오지 못했습니다");
    return { data: { code: "SUCCESS", data: { challenges: kothListFromClubs(clubs.data.data), limited: true } } };
  }
}

export const LIMITED_NOTICE = "관리자 KoTH API가 아직 백엔드에 없어 참가자 API로 목록과 누적 순위만 보입니다 구간 기록, 지문 수정, 저장소 연결은 백엔드 반영 후 열립니다";

// KoTH 문제 목록: 공개 순번 순서로 상태, 선두, 득점 팀, 마지막 구간을 한 줄씩 보인다 줄을 누르면 상세로 간다
export default function AdminKothPage() {
  const navigate = useNavigate();
  const list = useAdminResource(loadKothList, [], "KoTH 문제를 불러오지 못했습니다");
  const challenges = list.data?.challenges ?? [];
  const limited = Boolean(list.data?.limited);
  const summary = kothSummary(challenges);
  const open = (challenge) => navigate(ROUTES.adminKothDetail(challenge.koth_challenge_id));

  return <AdminLayout title="KoTH 문제" actions={<IconButton icon="refresh" label="새로고침" onClick={list.retry} disabled={list.status === "loading"} />}>
    <AdminStatusMessage status={list.status} error={list.error} onRetry={list.retry} hasData={Boolean(list.data)} />
    {limited && <p className={ui.callout}>{LIMITED_NOTICE}</p>}
    {list.data && <div className={ui.stack}>
      <StatStrip label="KoTH 문제 현황">
        <StatTile label="전체" value={formatAdminNumber(summary.all)} unit="문제" />
        <StatTile label="진행 중" value={formatAdminNumber(summary.ACTIVE)} unit="문제" />
        <StatTile label="공개 예정" value={formatAdminNumber(summary.SCHEDULED)} unit="문제" />
        <StatTile label="종료" value={formatAdminNumber(summary.CLOSED)} unit="문제" />
        <StatTile label="수집 실패" value={limited ? "-" : formatAdminNumber(summary.failing)} unit={limited ? undefined : "문제"} alert={summary.failing > 0}
          sub={limited ? "백엔드 반영 전" : summary.failing ? "틱 기록을 확인하세요" : "모든 틱 정상"} />
      </StatStrip>

      <section className={ui.card} aria-labelledby="koth-list">
        <header className={ui.cardHeader}>
          <h2 id="koth-list" className={ui.cardTitle}>문제</h2>
          <span className={ui.cardMeta}>한 틱은 15분 · 틱마다 1위부터 {KOTH_POINTS.join(" · ")}점으로 환산해 쌓습니다</span>
        </header>
        <div className={`${ui.tableWrap} ${ui.tableFlush} ${styles.listStack}`}>
          <table className={ui.table} aria-label="KoTH 문제 목록">
            <thead><tr><th className={ui.num}>순번</th><th>문제</th><th>상태</th><th>선두</th><th className={ui.num}>득점 팀</th><th>마지막 틱</th><th aria-label="미리보기와 열기" /></tr></thead>
            <tbody>
              {challenges.map((challenge) => {
                const status = kothStatus(challenge.status);
                const last = challenge.last_period;
                const lastStatus = last ? periodStatus(last.status) : null;
                return <tr key={challenge.koth_challenge_id} className={styles.rowLink} onClick={() => open(challenge)}>
                  <td className={`${ui.num} ${styles.order}`}>{challenge.open_group ?? "-"}</td>
                  <td>
                    <button type="button" className={ui.linkButton} onClick={(event) => { event.stopPropagation(); open(challenge); }}>{challenge.title}</button>
                    <span className={ui.secondary}>{[challenge.club_name, challenge.repository?.slug, challenge.files?.bundle && `파일 ${formatAdminNumber(challenge.files.bundle.file_count)}개`].filter(Boolean).join(" · ") || "-"}
                      {!limited && !challenge.repository && <span className={styles.unlinked}> · 저장소 미연결</span>}
                      {!limited && repositoryFreshness(challenge.repository).behind && <span className={styles.unlinked}> · 저장소에 새 커밋</span>}</span>
                  </td>
                  <td><AdminBadge tone={status.tone}>{status.label}</AdminBadge></td>
                  <td>{challenge.current_owner_team_name
                    ? <><span className={ui.title}>{challenge.current_owner_team_name}</span><span className={ui.secondary}>{formatAdminNumber(challenge.current_score)}점</span></>
                    : <span className={ui.muted}>-</span>}</td>
                  <td className={ui.num}>{challenge.scored_team_count == null ? "-" : formatAdminNumber(challenge.scored_team_count)}</td>
                  <td>{last
                    ? <><span className={styles.periodTime}><strong>{tickLabel(tickNumber(last.period_id, challenge.opened_at))}</strong> {periodRange(last.period_id).slice(6)}</span>
                      <AdminBadge tone={lastStatus.tone}>{lastStatus.label}</AdminBadge>
                      {challenge.failed_period_count > 0 && <span className={ui.failedCount}>실패 {challenge.failed_period_count}틱</span>}</>
                    : <span className={ui.muted}>{limited ? "백엔드 반영 전" : "아직 없음"}</span>}</td>
                  <td className={styles.rowEnd}>
                    <Link className={ui.fileLink} to={ROUTES.adminKothPreview(challenge.koth_challenge_id)} target="_blank" rel="noreferrer"
                      aria-label={`${challenge.title} 참가자 화면 미리보기`} onClick={(event) => event.stopPropagation()}>미리보기 ↗</Link>
                    <span className={styles.chevron}><Glyph name="chevronRight" size={14} strokeWidth={2.4} /></span>
                  </td>
                </tr>;
              })}
              {challenges.length === 0 && <tr className={ui.emptyRow}><td colSpan={7} className={ui.empty}>등록된 KoTH 문제가 없습니다</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>}
  </AdminLayout>;
}
