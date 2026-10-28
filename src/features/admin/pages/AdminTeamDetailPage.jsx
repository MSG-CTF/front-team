import { useRef, useState } from "react";
import AdminLineScores from "../components/AdminLineScores.jsx";
import { StatStrip, StatTile } from "../components/AdminWidgets.jsx";
import { useNavigate, useParams } from "react-router-dom";
import {
  adjustDiceRolls,
  adjustMileage,
  banTeam,
  getAdminTeamDetail,
  moveBoardPosition,
  unbanTeam,
  updateBoardCell,
} from "../../../api/admin.js";
import { ROUTES } from "../../../routes/routePaths.js";
import { isSuccess } from "../../../utils/response.js";
import { formatAdminTime } from "../utils/adminTime.js";
import { formatAdminNumber } from "../utils/adminNumber.js";
import AdminLayout, { AdminBadge, AdminStatusMessage } from "../components/AdminLayout.jsx";
import { AdminTeamDeleteDialog, AdminTeamEditDialog } from "../components/AdminTeamManagementDialogs.jsx";
import { getAdminRequestError } from "../utils/adminValidation.js";
import useAdminResource from "../hooks/useAdminResource.js";
import { formatMileageAmount, getMileageTypeLabel } from "../utils/adminMileage.js";
import {
  BOARD_CELL_MAX,
  BOARD_CELL_MIN,
  CELL_STATUSES_REQUIRING_OPENED_CHALLENGE,
  parseBoardCellIndex,
  validateBoardCellUpdate,
  validateBoardPositionMove,
} from "../utils/adminBoard.js";
import { AdminAmountChips, AdminBanDialog, AdminReasonField } from "../components/AdminFormParts.jsx";
import { DICE_AMOUNTS, REASON_PRESETS } from "../utils/adminReasons.js";
import AdminMileageAdjustForm from "../components/AdminMileageAdjustForm.jsx";
import ui from "../components/AdminWorkspace.module.css";

// 보드 강제 개입 3종 - clear 칸 관리 / 말 위치 이동(백엔드 머지됨) / 주사위 지급/회수.
// 칸 번호는 1(START)~36이다. 0번 칸은 없다(백엔드 #81~#85).
// 세 줄 모두 같은 열 격자를 써서 번호, 선택, 사유, 버튼이 세로로 한 줄에 선다
function BoardInterventionForms({ teamId, isMutating, onCellUpdate, onPositionMove, onDiceAdjust }) {
  const [cellIndex, setCellIndex] = useState("");
  const [cellStatus, setCellStatus] = useState("CLEARED");
  const [cellReason, setCellReason] = useState("");

  const [position, setPosition] = useState("");
  const [consumeCell, setConsumeCell] = useState(false);
  const [positionReason, setPositionReason] = useState("");

  const [diceAmount, setDiceAmount] = useState("");
  const [diceReason, setDiceReason] = useState("");

  return (
    <div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (validateBoardCellUpdate({ cellIndex, status: cellStatus, reason: cellReason })) return;
          const idx = parseBoardCellIndex(cellIndex);
          onCellUpdate(idx, cellStatus, cellReason.trim()).then((ok) => {
            if (ok) {
              setCellIndex("");
              setCellReason("");
            }
          });
        }}
        className={ui.inlineForm}
      >
        <div className={ui.inlineFormTitle}>
          <strong>clear 칸 관리</strong>
          <span>칸 상태를 바꿉니다</span>
        </div>
        <label className={ui.field}>
          <span className={ui.fieldLabel}>칸 번호 <small>{BOARD_CELL_MIN}~{BOARD_CELL_MAX}</small></span>
          <input
            type="number"
            min={BOARD_CELL_MIN}
            max={BOARD_CELL_MAX}
            value={cellIndex}
            onChange={(event) => setCellIndex(event.target.value)}
            className={ui.input}
          />
        </label>
        <label className={ui.field}>
          <span className={ui.fieldLabel}>바꿀 상태</span>
          <select
            value={cellStatus}
            onChange={(event) => setCellStatus(event.target.value)}
            className={ui.select}
          >
            <option value="UNVISITED">UNVISITED(초기화)</option>
            <option value="CONSUMED">CONSUMED</option>
            <option value="OPENED">OPENED</option>
            <option value="CLEARED">CLEARED</option>
          </select>
        </label>
        <AdminReasonField label="사유" value={cellReason} onChange={setCellReason} presets={REASON_PRESETS.cell} />
        <button
          type="submit"
          disabled={isMutating || Boolean(validateBoardCellUpdate({ cellIndex, status: cellStatus, reason: cellReason }))}
          className={ui.primary}
        >
          적용
        </button>
        {CELL_STATUSES_REQUIRING_OPENED_CHALLENGE.includes(cellStatus) && (
          <p className={ui.fieldHint}>
            OPENED/CLEARED는 이 칸에서 이미 연 문제가 있어야 적용됩니다
          </p>
        )}
      </form>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (validateBoardPositionMove({ position, reason: positionReason })) return;
          const pos = parseBoardCellIndex(position);
          onPositionMove(pos, consumeCell, positionReason.trim()).then((ok) => {
            if (ok) {
              setPosition("");
              setPositionReason("");
            }
          });
        }}
        className={ui.inlineForm}
      >
        <div className={ui.inlineFormTitle}>
          <strong>말 위치 이동</strong>
          <span>보드 위 말을 옮깁니다</span>
        </div>
        <label className={ui.field}>
          <span className={ui.fieldLabel}>이동할 칸 <small>{BOARD_CELL_MIN}~{BOARD_CELL_MAX}</small></span>
          <input
            type="number"
            min={BOARD_CELL_MIN}
            max={BOARD_CELL_MAX}
            value={position}
            onChange={(event) => setPosition(event.target.value)}
            className={ui.input}
          />
        </label>
        <label className={`${ui.check} ${ui.checkField}`}>
          <input type="checkbox" checked={consumeCell} onChange={(event) => setConsumeCell(event.target.checked)} />
          도착 칸 소모 처리
        </label>
        <AdminReasonField label="사유" value={positionReason} onChange={setPositionReason} presets={REASON_PRESETS.move} />
        <button
          type="submit"
          disabled={isMutating || Boolean(validateBoardPositionMove({ position, reason: positionReason }))}
          className={ui.primary}
        >
          이동
        </button>
      </form>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          const amt = Number(diceAmount);
          if (!amt || amt < -20 || amt > 20 || !diceReason.trim()) return;
          onDiceAdjust(amt, diceReason.trim()).then((ok) => {
            if (ok) {
              setDiceAmount("");
              setDiceReason("");
            }
          });
        }}
        className={ui.inlineForm}
      >
        <div className={ui.inlineFormTitle}>
          <strong>주사위 지급/회수</strong>
          <span>보유 수를 늘리거나 줄입니다</span>
        </div>
        <div className={ui.field}>
          <label htmlFor="team-dice-amount" className={ui.fieldLabel}>변동량 <small>-20~20</small></label>
          <AdminAmountChips values={DICE_AMOUNTS} current={diceAmount} onPick={setDiceAmount} unit="개" label="주사위 빠른 입력" />
          <input
            id="team-dice-amount"
            type="number"
            min={-20}
            max={20}
            value={diceAmount}
            onChange={(event) => setDiceAmount(event.target.value)}
            placeholder="직접 입력"
            className={ui.input}
          />
        </div>
        <p className={ui.inlineNote}>어떤 경로로도 0~3회 범위로 고정됩니다</p>
        <AdminReasonField label="사유" value={diceReason} onChange={setDiceReason} presets={REASON_PRESETS.dice} />
        <button
          type="submit"
          disabled={isMutating || !diceAmount || !diceReason.trim()}
          className={ui.primary}
        >
          적용
        </button>
      </form>
    </div>
  );
}

// 팀별 목록 상세 - README.md "8. 관리자 페이지 > 팀 상세". 팀 롤백은 폐지됐다
// (점수를 매번 다시 계산하므로 되돌릴 수 없다) 보정은 마일리지 조정과 라인 독점 점수 수정으로 한다.
export default function AdminTeamDetailPage() {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const detail = useAdminResource(
    (config) => getAdminTeamDetail(teamId, {}, config),
    [teamId],
    "팀 상세 정보를 불러오지 못했습니다",
  );
  const [isMutating, setIsMutating] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [teamDialog, setTeamDialog] = useState(null);
  const pending = useRef(false);

  const runAction = async (action, fallbackMessage) => {
    if (pending.current) return false;
    pending.current = true;
    setIsMutating(true);
    setActionError("");
    setActionMessage("");
    try {
      const response = await action();
      if (!isSuccess(response.data)) {
        throw new Error(response.data?.message || fallbackMessage);
      }
      const refreshed = await detail.reload();
      if (!refreshed) setActionMessage("요청은 처리됐지만 최신 상태를 불러오지 못했습니다 다시 조회해서 확인하세요");
      return true;
    } catch (error) {
      setActionError(getAdminRequestError(error, fallbackMessage).error);
      return false;
    } finally {
      pending.current = false;
      setIsMutating(false);
    }
  };

  const handleMileageAdjust = (id, amount, reason, idempotencyKey) =>
    runAction(() => adjustMileage(id, { amount, reason, idempotencyKey }), "마일리지 조정에 실패했습니다");

  const [banOpen, setBanOpen] = useState(false);
  const handleBanToggle = async () => {
    if (!data.is_banned) {
      setBanOpen(true);
      return;
    }
    await runAction(() => unbanTeam(teamId), "처리에 실패했습니다");
  };
  const confirmBan = async (reason) => {
    const ok = await runAction(() => banTeam(teamId, { banReason: reason }), "처리에 실패했습니다");
    if (ok) setBanOpen(false);
  };

  const handleCellUpdate = (cellIndex, status, reason) =>
    runAction(() => updateBoardCell(teamId, cellIndex, { status, reason }), "칸 상태 변경에 실패했습니다");

  const handlePositionMove = (position, consumeCell, reason) =>
    runAction(() => moveBoardPosition(teamId, { position, consumeCell, reason }), "위치 이동에 실패했습니다");

  const handleDiceAdjust = (amount, reason) =>
    runAction(() => adjustDiceRolls(teamId, { amount, reason }), "주사위 지급/회수에 실패했습니다");

  const data = detail.data;
  const members = data?.members ?? [];

  return (
    <AdminLayout
      title={data ? data.team_name : "팀 상세"}
      breadcrumb={[{ label: "팀별 목록", to: ROUTES.adminTeams }]}
      actions={data && <>
        {data.is_banned ? <AdminBadge tone="bad">밴됨</AdminBadge> : <AdminBadge tone="good">정상</AdminBadge>}
        <button type="button" disabled={isMutating} onClick={() => setTeamDialog("edit")} className={ui.button}>팀 정보 수정</button>
        <button
          type="button"
          disabled={isMutating}
          onClick={handleBanToggle}
          className={`${ui.button} ${data.is_banned ? "" : ui.danger}`}
        >
          {data.is_banned ? "밴 해제" : "밴 처리"}
        </button>
      </>}
    >
      <AdminStatusMessage status={detail.status} error={detail.error} onRetry={detail.retry} hasData={Boolean(data)} />
      {actionError && <p role="alert" className={ui.callout} data-tone="bad">{actionError}</p>}
      {actionMessage && <p role="status" className={ui.callout} data-tone="good">{actionMessage}</p>}

      {data && (
        <div className={ui.pageColumns}>
          <div className={ui.stack}>
          <section className={ui.card} aria-label="팀 요약">
            <StatStrip label="팀 요약" flush>
              <StatTile glyph="rank" label="점수" value={formatAdminNumber(data.team_score)} tone="gold" />
              <StatTile glyph="mileage" label="마일리지" value={formatAdminNumber(data.mileage)} />
              <StatTile glyph="dice" label="보드 위치" value={data.position ?? data.board_position_states ?? "-"} />
              <StatTile glyph="teams" label="팀원" value={<>{members.length}<small>명</small></>} />
            </StatStrip>
            {data.is_banned && (
              <dl className={`${ui.dl} ${ui.dlDivided}`}>
                <div>
                  <dt>밴 사유</dt>
                  <dd className={ui.text}>{data.ban_reason || "-"}</dd>
                </div>
                <div>
                  <dt>밴 시각</dt>
                  <dd className={ui.text}>{formatAdminTime(data.banned_at, { year: true })}</dd>
                </div>
              </dl>
            )}
            <div className={ui.cardFooter}>
              <ul className={ui.memberList} aria-label="팀원">
                {members.map((member) => (
                  <li key={member.user_id}>
                    <span>{member.nickname}</span>
                    {member.is_leader && <AdminBadge>팀장</AdminBadge>}
                    {member.role === "ADMIN" && <AdminBadge tone="blue">관리자</AdminBadge>}
                  </li>
                ))}
                {members.length === 0 && <li>팀원 없음</li>}
              </ul>
            </div>
          </section>

          <section className={ui.card} aria-labelledby="team-board">
            <header className={ui.cardHeader}>
              <h2 id="team-board" className={ui.cardTitle}>보드 강제 개입</h2>
            </header>
            <div className={ui.cardBody}>
              <BoardInterventionForms
                teamId={teamId}
                isMutating={isMutating}
                onCellUpdate={handleCellUpdate}
                onPositionMove={handlePositionMove}
                onDiceAdjust={handleDiceAdjust}
              />
            </div>
          </section>

          <section className={ui.card} aria-labelledby="team-line-scores">
            <header className={ui.cardHeader}><h2 id="team-line-scores" className={ui.cardTitle}>라인 독점 점수</h2></header>
            <div className={ui.cardBody}><AdminLineScores key={teamId} teamId={teamId} lines={data.line_monopolies} disabled={isMutating} onSaved={detail.reload} onBusyChange={setIsMutating} /></div>
          </section>
          <section className={ui.card} data-tone="bad" aria-labelledby="team-danger">
            <header className={ui.cardHeader}>
              <h2 id="team-danger" className={ui.cardTitle}>위험 조치</h2>
            </header>
            <div className={`${ui.cardBody} ${ui.dangerRow}`}>
              <p>팀과 소속 계정 및 모든 팀 기록을 영구 삭제합니다 되돌릴 수 없습니다</p>
              <button type="button" disabled={isMutating} onClick={() => setTeamDialog("delete")} className={ui.dangerSolid}>팀 삭제</button>
            </div>
          </section>
          </div>
          <div className={ui.stack}>
            <section className={ui.card} aria-labelledby="team-mileage">
              <header className={ui.cardHeader}>
                <h2 id="team-mileage" className={ui.cardTitle}>마일리지 조정</h2>
                <span className={ui.cardMeta}>현재 {formatAdminNumber(data.mileage)}</span>
              </header>
              <div className={ui.cardBody}>
                <AdminMileageAdjustForm team={{ team_id: teamId, team_name: data.team_name, mileage: data.mileage }} disabled={isMutating}
                  submit={({ teamId: id, amount, reason, idempotencyKey }) => handleMileageAdjust(id, amount, reason, idempotencyKey)} />
              </div>
            </section>

          {Array.isArray(data.recent_mileage_history) && (
            <section className={ui.card} aria-labelledby="team-mileage-history">
              <header className={ui.cardHeader}>
                <h2 id="team-mileage-history" className={ui.cardTitle}>최근 마일리지 내역</h2>
              </header>
              <div className={`${ui.tableWrap} ${ui.tableFlush} ${ui.teamHistoryStack}`}>
                <table className={ui.table} aria-label="최근 마일리지 내역">
                  <thead>
                    <tr>
                      <th>시각 (KST)</th>
                      <th>유형</th>
                      <th className={ui.num}>변동</th>
                      <th>사유</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recent_mileage_history.map((entry) => (
                      <tr key={entry.history_id}>
                        <td className={ui.time}>{formatAdminTime(entry.created_at)}</td>
                        <td className={`${ui.muted} ${ui.nowrap}`} title={entry.type}>{getMileageTypeLabel(entry.type)}</td>
                        <td className={`${ui.num} ${entry.amount > 0 ? ui.amountPlus : ui.amountMinus}`}>{formatMileageAmount(entry.amount)}</td>
                        <td className={`${ui.wrap} ${ui.reasonCell}`}>{entry.reason || "-"}</td>
                      </tr>
                    ))}
                    {data.recent_mileage_history.length === 0 && (
                      <tr className={ui.emptyRow}>
                        <td colSpan={4} className={ui.empty}>내역 없음</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}
          </div>
        </div>
      )}
      {banOpen && data && <AdminBanDialog team={data} busy={isMutating} onClose={() => setBanOpen(false)} onConfirm={confirmBan} />}
      {teamDialog === "edit" && data && (
        <AdminTeamEditDialog team={data} onClose={() => setTeamDialog(null)} onSaved={async () => {
          setTeamDialog(null);
          const refreshed = await detail.reload();
          setActionMessage(refreshed ? "팀 정보를 수정했습니다 소속 또는 팀장 정보가 변경된 팀원은 다시 로그인해야 변경사항이 반영됩니다"
            : "수정은 완료됐지만 상세 정보를 다시 불러오지 못했습니다 새로고침해 확인하세요");
        }} />
      )}
      {teamDialog === "delete" && data && (
        <AdminTeamDeleteDialog team={data} onClose={() => setTeamDialog(null)} onDeleted={() => navigate(ROUTES.adminTeams, { replace: true })} />
      )}
    </AdminLayout>
  );
}
