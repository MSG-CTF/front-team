import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  adjustDiceRolls,
  adjustMileage,
  banTeam,
  createAdminIdempotencyKey,
  getAdminTeamDetail,
  getTeamSnapshots,
  moveBoardPosition,
  rollbackTeam,
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
import { formatMileageAmount, getMileageTypeLabel, mileageAttempt, validateMileageAdjustment } from "../utils/adminMileage.js";
import {
  BOARD_CELL_MAX,
  BOARD_CELL_MIN,
  CELL_STATUSES_REQUIRING_OPENED_CHALLENGE,
  parseBoardCellIndex,
  validateBoardCellUpdate,
  validateBoardPositionMove,
} from "../utils/adminBoard.js";
import ui from "../components/AdminWorkspace.module.css";

function MileageForm({ teamId, isMutating, onSubmit }) {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  // 재시도 시 같은 Idempotency-Key를 재사용해야 중복 지급이 막힌다. 성공하면
  // 비우고, 다음 제출에서 새로 발급한다.
  const idempotencyKeyRef = useRef(null);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const parsed = Number(amount);
        if (isMutating || validateMileageAdjustment({ teamId, amount, reason })) return;
        idempotencyKeyRef.current = mileageAttempt(idempotencyKeyRef.current, { teamId, amount, reason }, () => createAdminIdempotencyKey("admin-mileage"));
        onSubmit(teamId, parsed, reason.trim(), idempotencyKeyRef.current.key).then((ok) => {
          if (ok) {
            idempotencyKeyRef.current = null;
            setAmount("");
            setReason("");
          }
        });
      }}
      className={ui.adjustForm}
    >
      <label className={ui.field}>
        <span className={ui.fieldLabel}>변동량</span>
        <input
          type="number"
          step={1}
          disabled={isMutating}
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder="+지급 / -회수"
          className={ui.input}
        />
      </label>
      <label className={ui.field}>
        <span className={ui.fieldLabel}>사유</span>
        <input
          value={reason}
          disabled={isMutating}
          maxLength={500}
          onChange={(event) => setReason(event.target.value)}
          placeholder="지급하거나 회수하는 이유"
          className={ui.input}
        />
      </label>
      <button
        type="submit"
        disabled={isMutating || Boolean(validateMileageAdjustment({ teamId, amount, reason }))}
        className={ui.primary}
      >
        마일리지 조정
      </button>
    </form>
  );
}

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
        <label className={ui.field}>
          <span className={ui.fieldLabel}>사유</span>
          <input
            value={cellReason}
            maxLength={500}
            onChange={(event) => setCellReason(event.target.value)}
            className={ui.input}
          />
        </label>
        <button
          type="submit"
          disabled={isMutating || Boolean(validateBoardCellUpdate({ cellIndex, status: cellStatus, reason: cellReason }))}
          className={ui.primary}
        >
          적용
        </button>
        {CELL_STATUSES_REQUIRING_OPENED_CHALLENGE.includes(cellStatus) && (
          <p className={ui.fieldHint}>
            OPENED/CLEARED는 이 칸에서 이미 연 문제가 있어야 합니다. 없으면 서버가 400으로 거절합니다.
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
        <label className={ui.field}>
          <span className={ui.fieldLabel}>사유</span>
          <input
            value={positionReason}
            maxLength={500}
            onChange={(event) => setPositionReason(event.target.value)}
            className={ui.input}
          />
        </label>
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
        <label className={ui.field}>
          <span className={ui.fieldLabel}>변동량 <small>-20~20</small></span>
          <input
            type="number"
            min={-20}
            max={20}
            value={diceAmount}
            onChange={(event) => setDiceAmount(event.target.value)}
            placeholder="+지급 / -회수"
            className={ui.input}
          />
        </label>
        <p className={ui.inlineNote}>어떤 경로로도 0~3회 범위로 고정됩니다</p>
        <label className={ui.field}>
          <span className={ui.fieldLabel}>사유</span>
          <input
            value={diceReason}
            onChange={(event) => setDiceReason(event.target.value)}
            className={ui.input}
          />
        </label>
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

function RollbackSection({ teamId, isMutating, onRollback }) {
  const [snapshots, setSnapshots] = useState(null);
  const [snapshotId, setSnapshotId] = useState("");
  const [reason, setReason] = useState("");
  const [loadError, setLoadError] = useState("");

  const loadSnapshots = () => {
    getTeamSnapshots(teamId)
      .then((res) => {
        if (isSuccess(res.data)) {
          setSnapshots(res.data.data.snapshots ?? []);
          setLoadError("");
        } else {
          setLoadError(res.data?.message || "롤백 지점을 불러오지 못했습니다.");
        }
      })
      .catch((err) => {
        setLoadError(getAdminRequestError(err, "롤백 지점을 불러오지 못했습니다.").error);
        setSnapshots([]);
      });
  };

  useEffect(loadSnapshots, [teamId]);

  if (snapshots === null) {
    return <p role="status" className={ui.statusLoading}>롤백 지점을 불러오는 중입니다</p>;
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (!snapshotId || !reason.trim()) return;
        onRollback(snapshotId, reason.trim()).then((ok) => {
          if (ok) {
            setReason("");
            loadSnapshots();
          }
        });
      }}
      className={ui.formStack}
    >
      {loadError && <p role="alert" className={ui.callout} data-tone="bad">{loadError}</p>}
      {snapshots.length === 0 && !loadError && (
        <p className={ui.fieldHint}>
          아직 롤백 지점이 없습니다. 밴/clear 칸 관리/위치 이동/주사위 지급을 하면 그 직전 상태가 자동으로 남습니다.
        </p>
      )}
      {snapshots.length > 0 && (
        <div className={ui.choiceList}>
          {snapshots.map((snapshot) => (
            <label key={snapshot.snapshot_id} className={ui.check}>
              <input
                type="radio"
                name="team-snapshot"
                checked={snapshotId === snapshot.snapshot_id}
                onChange={() => setSnapshotId(snapshot.snapshot_id)}
              />
              <span className={ui.snapshotText}>
                <strong>{snapshot.label}</strong>
                <span>위치 {snapshot.position} · 마일리지 {snapshot.mileage} · {formatAdminTime(snapshot.created_at)}</span>
              </span>
            </label>
          ))}
        </div>
      )}
      <div className={ui.reasonForm}>
        <label className={ui.field}>
          <span className={ui.fieldLabel}>롤백 사유</span>
          <input
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className={ui.input}
          />
        </label>
        <button
          type="submit"
          disabled={isMutating || !snapshotId || !reason.trim()}
          className={ui.dangerSolid}
        >
          이 지점으로 롤백
        </button>
      </div>
    </form>
  );
}

// 팀별 목록 상세 - README.md "8. 관리자 페이지 > 팀 상세". 보드 강제 개입과
// 롤백/스냅샷도 이제 붙였다(목서버에 자동 스냅샷 + 롤백 엔드포인트 구현).
export default function AdminTeamDetailPage() {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const detail = useAdminResource(
    (config) => getAdminTeamDetail(teamId, {}, config),
    [teamId],
    "팀 상세 정보를 불러오지 못했습니다.",
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
    runAction(() => adjustMileage(id, { amount, reason, idempotencyKey }), "마일리지 조정에 실패했습니다.");

  const handleBanToggle = async () => {
    if (!data.is_banned) {
      // 취소를 누르면 null이 반환된다 - 이 경우 사유 없이 밴이 나가면 안 되므로
      // 여기서 바로 중단한다. admin.js 주석대로 ban_reason은 1자 이상 필수라
      // 빈 문자열 제출도 함께 막는다.
      const reason = window.prompt("밴 사유를 입력해주세요");
      if (reason === null) return;
      if (!reason.trim()) {
        setActionError("밴 사유를 입력해야 합니다.");
        return;
      }
      await runAction(() => banTeam(teamId, { banReason: reason.trim() }), "처리에 실패했습니다.");
      return;
    }
    await runAction(() => unbanTeam(teamId), "처리에 실패했습니다.");
  };

  const handleCellUpdate = (cellIndex, status, reason) =>
    runAction(() => updateBoardCell(teamId, cellIndex, { status, reason }), "칸 상태 변경에 실패했습니다.");

  const handlePositionMove = (position, consumeCell, reason) =>
    runAction(() => moveBoardPosition(teamId, { position, consumeCell, reason }), "위치 이동에 실패했습니다.");

  const handleDiceAdjust = (amount, reason) =>
    runAction(() => adjustDiceRolls(teamId, { amount, reason }), "주사위 지급/회수에 실패했습니다.");

  const handleRollback = async (snapshotId, reason) => {
    const ok = await runAction(
      () => rollbackTeam(teamId, { snapshotId, reason }),
      "이 팀에는 아직 롤백 지점이 없거나, 이미 삭제된 지점입니다.",
    );
    if (ok) setActionMessage("롤백을 실행했습니다.");
    return ok;
  };

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
        <div className={ui.stack}>
          <section className={ui.card} aria-label="팀 요약">
            <dl className={ui.dl}>
              <div>
                <dt>점수</dt>
                <dd>{formatAdminNumber(data.team_score)}</dd>
              </div>
              <div>
                <dt>마일리지</dt>
                <dd>{formatAdminNumber(data.mileage)}</dd>
              </div>
              <div>
                <dt>보드 위치</dt>
                <dd>{data.position ?? data.board_position_states ?? "미제공"}</dd>
              </div>
              <div>
                <dt>팀원</dt>
                <dd>{members.length}<small>명</small></dd>
              </div>
            </dl>
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
                  </li>
                ))}
                {members.length === 0 && <li>팀원 없음</li>}
              </ul>
            </div>
          </section>

          <section className={ui.card} aria-labelledby="team-board">
            <header className={ui.cardHeader}>
              <h2 id="team-board" className={ui.cardTitle}><span className={ui.eyebrow}>BOARD</span>보드 강제 개입</h2>
              <span className={ui.cardMeta}>실행하면 직전 상태가 롤백 지점으로 남습니다</span>
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

          <div className={`${ui.halves} ${ui.halvesEqual}`}>
            <section className={ui.card} aria-labelledby="team-mileage">
              <header className={ui.cardHeader}>
                <h2 id="team-mileage" className={ui.cardTitle}><span className={ui.eyebrow}>MILEAGE</span>마일리지 조정</h2>
                <span className={ui.cardMeta}>현재 {formatAdminNumber(data.mileage)}</span>
              </header>
              <div className={ui.cardBody}>
                <MileageForm teamId={teamId} isMutating={isMutating} onSubmit={handleMileageAdjust} />
              </div>
            </section>

            <section className={ui.card} aria-labelledby="team-rollback">
              <header className={ui.cardHeader}>
                <h2 id="team-rollback" className={ui.cardTitle}><span className={ui.eyebrow}>ROLLBACK</span>롤백</h2>
              </header>
              <div className={ui.cardBody}>
                <RollbackSection teamId={teamId} isMutating={isMutating} onRollback={handleRollback} />
              </div>
            </section>
          </div>

          {Array.isArray(data.recent_mileage_history) && (
            <section className={ui.card} aria-labelledby="team-mileage-history">
              <header className={ui.cardHeader}>
                <h2 id="team-mileage-history" className={ui.cardTitle}><span className={ui.eyebrow}>HISTORY</span>최근 마일리지 내역</h2>
              </header>
              <div className={`${ui.tableWrap} ${ui.tableFlush}`}>
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

          <section className={ui.card} data-tone="bad" aria-labelledby="team-danger">
            <header className={ui.cardHeader}>
              <h2 id="team-danger" className={ui.cardTitle}><span className={ui.eyebrow}>DANGER</span>위험 조치</h2>
            </header>
            <div className={`${ui.cardBody} ${ui.dangerRow}`}>
              <p>팀과 소속 계정 및 모든 팀 기록을 영구 삭제합니다. 되돌릴 수 없습니다.</p>
              <button type="button" disabled={isMutating} onClick={() => setTeamDialog("delete")} className={ui.dangerSolid}>팀 삭제</button>
            </div>
          </section>
        </div>
      )}
      {teamDialog === "edit" && data && (
        <AdminTeamEditDialog team={data} onClose={() => setTeamDialog(null)} onSaved={async () => {
          setTeamDialog(null);
          const refreshed = await detail.reload();
          setActionMessage(refreshed ? "팀 정보를 수정했습니다. 소속 또는 팀장 정보가 변경된 팀원은 다시 로그인해야 변경사항이 반영됩니다."
            : "수정은 완료됐지만 상세 정보를 다시 불러오지 못했습니다. 새로고침해 확인하세요.");
        }} />
      )}
      {teamDialog === "delete" && data && (
        <AdminTeamDeleteDialog team={data} onClose={() => setTeamDialog(null)} onDeleted={() => navigate(ROUTES.adminTeams, { replace: true })} />
      )}
    </AdminLayout>
  );
}
