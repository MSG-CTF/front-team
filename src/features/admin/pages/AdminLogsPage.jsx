import { useState } from "react";
import AdminPagination from "../components/AdminPagination.jsx";
import { getAdminEvents } from "../../../api/admin.js";
import { formatAdminTime } from "../utils/adminTime.js";
import AdminLayout, { AdminBadge, AdminStatusMessage } from "../components/AdminLayout.jsx";
import { IconButton } from "../components/AdminWidgets.jsx";
import useAdminResource from "../hooks/useAdminResource.js";
import {
  ADMIN_EVENT_TYPES,
  ADMIN_EVENT_TYPES_PENDING,
  getAdminEventSeverity,
  getAdminEventTypeLabel,
  isLongEventMessage,
  previewEventMessage,
} from "../utils/adminBoard.js";
import ui from "../components/AdminWorkspace.module.css";

// 조작 사유가 500자를 넘게 들어올 수 있어 기본은 줄여 보여주고 펼칠 수 있게 한다.
function EventMessage({ message }) {
  const [expanded, setExpanded] = useState(false);
  if (!message) return "-";
  const long = isLongEventMessage(message);
  return (
    <div className={ui.eventMessage}>
      {expanded || !long ? message : previewEventMessage(message)}
      {long && (
        <button type="button" onClick={() => setExpanded((value) => !value)} className={ui.textToggle}>
          {expanded ? "접기" : "전체 보기"}
        </button>
      )}
    </div>
  );
}

// 로그/리소스 - README.md "8. 관리자 페이지 > 리소스/로그".
// 이벤트 type 11종, severity 4종(INFO/WARNING/CRITICAL/MANUAL_REVIEW)은 백엔드 #81~#85 기준.
export default function AdminLogsPage() {
  const [page, setPage] = useState(1);
  const [appliedType, setAppliedType] = useState("");
  const events = useAdminResource(
    (config) => getAdminEvents({ type: appliedType || undefined, page, size: 50 }, config),
    [page, appliedType],
    "이벤트 로그를 불러오지 못했습니다",
  );
  const eventRows = events.data?.events ?? [];

  return (
    <AdminLayout
      title="이벤트 로그"
      actions={<>
        <label className={ui.inlineLabel}>
          <span>이벤트 유형</span>
          <select value={appliedType} onChange={(event) => { setPage(1); setAppliedType(event.target.value); }} className={ui.select}>
            <option value="">전체</option>
            {ADMIN_EVENT_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label} ({item.value})</option>)}
            <optgroup label="백엔드 PR 대기 중">
              {ADMIN_EVENT_TYPES_PENDING.map((item) => <option key={item.value} value={item.value}>{item.label} ({item.value})</option>)}
            </optgroup>
          </select>
        </label>
        <IconButton icon="refresh" label="새로고침" onClick={events.retry} disabled={events.status === "loading"} />
      </>}
    >
      <div className={ui.stack}>

          {(!events.data || ["error", "unavailable"].includes(events.status)) && (
            <AdminStatusMessage status={events.status} error={events.error} onRetry={events.retry} />
          )}
          {events.data && (
            <div className={`${ui.tableWrap} ${ui.logStack}`}>
              <table className={ui.table} aria-label="이벤트 로그">
                <thead>
                  <tr>
                    <th>시각 (KST)</th>
                    <th>유형</th>
                    <th>심각도</th>
                    <th>메시지</th>
                    <th>팀 / 문제</th>
                  </tr>
                </thead>
                <tbody>
                  {eventRows.map((event) => (
                    <tr key={event.event_id} className={ui.topRow}>
                      <td className={ui.time}>{formatAdminTime(event.created_at)}</td>
                      <td title={event.type}>{getAdminEventTypeLabel(event.type)}</td>
                      <td>
                        <AdminBadge tone={getAdminEventSeverity(event.severity).tone}>{getAdminEventSeverity(event.severity).label}</AdminBadge>
                      </td>
                      <td className={`${ui.wrap} ${ui.messageCell}`}><EventMessage message={event.message} /></td>
                      <td className={`${ui.wrap} ${ui.muted}`}>
                        {/* 삭제된 팀은 team_id/team_name이 null이고 정보는 message에 남는다 */}
                        {[event.team_name, event.challenge_title].filter(Boolean).join(" / ") || "-"}
                      </td>
                    </tr>
                  ))}
                  {eventRows.length === 0 && (
                    <tr className={ui.emptyRow}>
                      <td colSpan={5} className={ui.empty}>이벤트 없음</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          <AdminPagination page={page} totalCount={events.data?.total_count} onChange={setPage} disabled={events.status !== "success"}/>
      </div>
    </AdminLayout>
  );
}
