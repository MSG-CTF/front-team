import { getAdminBoardReadiness } from "../../../api/admin.js";
import useAdminResource from "../hooks/useAdminResource.js";
import { AdminBadge, AdminStatusMessage } from "./AdminLayout.jsx";
import styles from "./AdminWorkspace.module.css";

export default function AdminBoardReadiness({ revision }) {
  const check = useAdminResource(getAdminBoardReadiness, [revision], "보드 공개 현황을 불러오지 못했습니다");
  const data = check.data;
  return <section className={styles.readiness} aria-label="보드 문제 공개 현황">
    <div className={styles.readinessHeading}><h2><span className={styles.eyebrow}>BOARD</span>보드 문제 공개 현황</h2>
      {data && <AdminBadge tone={data.ready ? "good" : "neutral"}>{data.ready ? "필요 수 충족" : "확인 필요"}</AdminBadge>}
      <button type="button" className={styles.button} onClick={check.retry} disabled={check.status === "loading"}>현황 새로고침</button></div>
    <AdminStatusMessage status={check.status} error={check.error} onRetry={check.retry}/>
    {check.status === "success" && <>
      <p className={styles.helpText}>현재 보드 {data.required_count}칸 · 등록 {data.registered_count}개 · 공개 {data.published_count}개 · 비공개 {data.draft_count}개</p>
      <div className={styles.readinessCounts}>{data.difficulties.map((row) => <div key={row.difficulty}>
        <strong>{row.difficulty}</strong><span>공개 {row.published_count} / 필요 {row.required_count}</span>
        <span className={row.shortfall_count ? styles.readinessShortfall : styles.helpText}>{row.shortfall_count ? `${row.shortfall_count}개 부족` : "충족"}</span>
      </div>)}</div>
      {data.unassigned_count > 0 && <p className={styles.helpText}>난이도 미정 {data.unassigned_count}개 — 기본 정보에서 난이도를 지정한 뒤 공개해주세요</p>}
      {(data.unenrolled_published_count > 0 || data.invalid_cell_count > 0) && <p role="alert">보드 연결 누락 {data.unenrolled_published_count}개 · 난이도 없는 문제 칸 {data.invalid_cell_count}개</p>}
    </>}
  </section>;
}
