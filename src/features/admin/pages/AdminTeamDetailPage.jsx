import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
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
import { isSuccess } from "../../../utils/response.js";
import { toKst } from "../../../utils/time.js";
import AdminLayout, { AdminBadge, AdminStatusMessage } from "../components/AdminLayout.jsx";
import { getAdminRequestError } from "../utils/adminValidation.js";
import useAdminResource from "../hooks/useAdminResource.js";

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
        if (!parsed || !reason.trim()) return;
        if (!idempotencyKeyRef.current) idempotencyKeyRef.current = createAdminIdempotencyKey("admin-mileage");
        onSubmit(teamId, parsed, reason.trim(), idempotencyKeyRef.current).then((ok) => {
          if (ok) {
            idempotencyKeyRef.current = null;
            setAmount("");
            setReason("");
          }
        });
      }}
      className="flex flex-wrap items-center gap-2 font-song-myung text-sm"
    >
      <input
        type="number"
        value={amount}
        onChange={(event) => setAmount(event.target.value)}
        placeholder="+지급 / -회수"
        className="w-32 rounded border border-admin-divider bg-white/60 px-2 py-1.5 font-kode-mono"
      />
      <input
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        placeholder="사유"
        className="w-48 rounded border border-admin-divider bg-white/60 px-2 py-1.5"
      />
      <button
        type="submit"
        disabled={isMutating || !amount || !reason.trim()}
        className="rounded border border-admin-ink px-3 py-1.5 disabled:opacity-50"
      >
        마일리지 조정
      </button>
    </form>
  );
}

// 보드 강제 개입 3종 - clear 칸 관리(진행 중) / 말 위치 이동(진행 중) / 주사위
// 지급/회수(PR 대기). README 8절, api/admin.js에 함수가 이미 있어 화면만 붙였다.
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
    <div className="flex flex-col gap-4 font-song-myung text-sm">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const idx = Number(cellIndex);
          if (!Number.isInteger(idx) || idx < 0 || idx > 35 || !cellReason.trim()) return;
          onCellUpdate(idx, cellStatus, cellReason.trim()).then((ok) => {
            if (ok) {
              setCellIndex("");
              setCellReason("");
            }
          });
        }}
        className="flex flex-wrap items-center gap-2"
      >
        <span className="w-24 text-xs text-admin-muted">clear 칸 관리</span>
        <input
          type="number"
          min={0}
          max={35}
          value={cellIndex}
          onChange={(event) => setCellIndex(event.target.value)}
          placeholder="칸 번호(0~35)"
          className="w-28 rounded border border-admin-divider bg-white/60 px-2 py-1.5 font-kode-mono"
        />
        <select
          value={cellStatus}
          onChange={(event) => setCellStatus(event.target.value)}
          className="rounded border border-admin-divider bg-white/60 px-2 py-1.5"
        >
          <option value="UNVISITED">UNVISITED(초기화)</option>
          <option value="CONSUMED">CONSUMED</option>
          <option value="OPENED">OPENED</option>
          <option value="CLEARED">CLEARED</option>
        </select>
        <input
          value={cellReason}
          onChange={(event) => setCellReason(event.target.value)}
          placeholder="사유"
          className="w-40 rounded border border-admin-divider bg-white/60 px-2 py-1.5"
        />
        <button
          type="submit"
          disabled={isMutating || cellIndex === "" || !cellReason.trim()}
          className="rounded border border-admin-ink px-3 py-1.5 disabled:opacity-50"
        >
          적용
        </button>
      </form>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          const pos = Number(position);
          if (!Number.isInteger(pos) || pos < 0 || pos > 35 || !positionReason.trim()) return;
          onPositionMove(pos, consumeCell, positionReason.trim()).then((ok) => {
            if (ok) {
              setPosition("");
              setPositionReason("");
            }
          });
        }}
        className="flex flex-wrap items-center gap-2"
      >
        <span className="w-24 text-xs text-admin-muted">말 위치 이동</span>
        <input
          type="number"
          min={0}
          max={35}
          value={position}
          onChange={(event) => setPosition(event.target.value)}
          placeholder="이동할 칸(0~35)"
          className="w-28 rounded border border-admin-divider bg-white/60 px-2 py-1.5 font-kode-mono"
        />
        <label className="flex items-center gap-1 text-xs">
          <input type="checkbox" checked={consumeCell} onChange={(event) => setConsumeCell(event.target.checked)} />
          도착 칸 소모 처리
        </label>
        <input
          value={positionReason}
          onChange={(event) => setPositionReason(event.target.value)}
          placeholder="사유"
          className="w-40 rounded border border-admin-divider bg-white/60 px-2 py-1.5"
        />
        <button
          type="submit"
          disabled={isMutating || position === "" || !positionReason.trim()}
          className="rounded border border-admin-ink px-3 py-1.5 disabled:opacity-50"
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
        className="flex flex-wrap items-center gap-2"
      >
        <span className="w-24 text-xs text-admin-muted">주사위 지급/회수</span>
        <input
          type="number"
          min={-20}
          max={20}
          value={diceAmount}
          onChange={(event) => setDiceAmount(event.target.value)}
          placeholder="+지급 / -회수"
          className="w-28 rounded border border-admin-divider bg-white/60 px-2 py-1.5 font-kode-mono"
        />
        <input
          value={diceReason}
          onChange={(event) => setDiceReason(event.target.value)}
          placeholder="사유"
          className="w-40 rounded border border-admin-divider bg-white/60 px-2 py-1.5"
        />
        <button
          type="submit"
          disabled={isMutating || !diceAmount || !diceReason.trim()}
          className="rounded border border-admin-ink px-3 py-1.5 disabled:opacity-50"
        >
          적용
        </button>
        <span className="text-xs text-admin-muted">(어떤 경로로도 0~3회 범위로 고정)</span>
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
    return <p className="font-song-myung text-sm text-admin-muted">롤백 지점을 불러오는 중입니다...</p>;
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
      className="flex flex-col gap-2 font-song-myung text-sm"
    >
      {loadError && <p role="alert" className="text-admin-failed">{loadError}</p>}
      {snapshots.length === 0 && !loadError && (
        <p className="text-admin-muted">
          아직 롤백 지점이 없습니다. 밴/clear 칸 관리/위치 이동/주사위 지급을 하면 그 직전 상태가 자동으로 남습니다.
        </p>
      )}
      {snapshots.length > 0 && (
        <div className="flex max-h-40 flex-col gap-1 overflow-y-auto rounded border border-admin-divider p-2">
          {snapshots.map((snapshot) => (
            <label key={snapshot.snapshot_id} className="flex items-center gap-2 text-xs">
              <input
                type="radio"
                name="team-snapshot"
                checked={snapshotId === snapshot.snapshot_id}
                onChange={() => setSnapshotId(snapshot.snapshot_id)}
              />
              {snapshot.label} · 위치 {snapshot.position} · 마일리지 {snapshot.mileage} · {toKst(snapshot.created_at)}
            </label>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="롤백 사유"
          className="w-56 rounded border border-admin-divider bg-white/60 px-2 py-1.5"
        />
        <button
          type="submit"
          disabled={isMutating || !snapshotId || !reason.trim()}
          className="rounded border border-admin-failed px-3 py-1.5 text-admin-failed disabled:opacity-50"
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
  const detail = useAdminResource(
    () => getAdminTeamDetail(teamId),
    [teamId],
    "팀 상세 정보를 불러오지 못했습니다.",
  );
  const [isMutating, setIsMutating] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  const runAction = async (action, fallbackMessage) => {
    setIsMutating(true);
    setActionError("");
    setActionMessage("");
    try {
      const response = await action();
      if (!isSuccess(response.data)) {
        throw new Error(response.data?.message || fallbackMessage);
      }
      await detail.reload();
      return true;
    } catch (error) {
      setActionError(getAdminRequestError(error, fallbackMessage).error);
      return false;
    } finally {
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

  return (
    <AdminLayout title={data ? `팀 상세 - ${data.team_name}` : "팀 상세"}>
      <AdminStatusMessage status={detail.status} error={detail.error} onRetry={detail.retry} />
      {actionError && <p role="alert" className="mb-3 font-song-myung text-sm text-admin-failed">{actionError}</p>}
      {actionMessage && <p role="status" className="mb-3 font-song-myung text-sm text-admin-running">{actionMessage}</p>}

      {detail.status === "success" && data && (
        <div className="flex flex-col gap-6">
          <section className="rounded-lg border border-admin-divider bg-white/30 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="m-0 font-im-fell text-lg text-admin-ink">{data.team_name}</h2>
                {data.is_banned ? (
                  <AdminBadge tone="bad">밴됨</AdminBadge>
                ) : (
                  <AdminBadge tone="good">정상</AdminBadge>
                )}
              </div>
              <button
                type="button"
                disabled={isMutating}
                onClick={handleBanToggle}
                className="rounded border border-admin-failed px-3 py-1 font-song-myung text-xs text-admin-failed disabled:opacity-50"
              >
                {data.is_banned ? "밴 해제" : "밴 처리"}
              </button>
            </div>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-1 font-song-myung text-sm md:grid-cols-4">
              <dt className="text-admin-muted">점수</dt>
              <dd>{data.team_score}</dd>
              <dt className="text-admin-muted">마일리지</dt>
              <dd>{data.mileage}</dd>
              <dt className="text-admin-muted">보드 위치</dt>
              <dd>{data.position}</dd>
              {data.is_banned && (
                <>
                  <dt className="text-admin-muted">밴 사유</dt>
                  <dd>{data.ban_reason || "-"}</dd>
                  <dt className="text-admin-muted">밴 시각</dt>
                  <dd>{data.banned_at ? toKst(data.banned_at) : "-"}</dd>
                </>
              )}
            </dl>
          </section>

          <section>
            <h2 className="mb-2 font-song-myung text-sm font-bold text-admin-muted">팀원</h2>
            <ul className="m-0 flex flex-col gap-1 p-0 font-song-myung text-sm">
              {(data.members ?? []).map((member) => (
                <li key={member.user_id} className="flex items-center gap-2">
                  <span>{member.nickname}</span>
                  {member.is_leader && <AdminBadge>팀장</AdminBadge>}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="mb-2 font-song-myung text-sm font-bold text-admin-muted">마일리지 조정</h2>
            <MileageForm teamId={teamId} isMutating={isMutating} onSubmit={handleMileageAdjust} />
          </section>

          {Array.isArray(data.recent_mileage_history) && (
            <section>
              <h2 className="mb-2 font-song-myung text-sm font-bold text-admin-muted">최근 마일리지 내역</h2>
              <table className="w-full border-collapse font-song-myung text-sm">
                <thead>
                  <tr className="border-b border-admin-divider text-left text-admin-muted">
                    <th className="px-2 py-1 font-normal">유형</th>
                    <th className="px-2 py-1 font-normal">변동</th>
                    <th className="px-2 py-1 font-normal">사유</th>
                    <th className="px-2 py-1 font-normal">시각</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent_mileage_history.map((entry) => (
                    <tr key={entry.history_id} className="border-b border-admin-divider/40 last:border-0">
                      <td className="px-2 py-1">{entry.type}</td>
                      <td className="px-2 py-1">{entry.amount > 0 ? `+${entry.amount}` : entry.amount}</td>
                      <td className="px-2 py-1">{entry.reason || "-"}</td>
                      <td className="px-2 py-1">{toKst(entry.created_at)}</td>
                    </tr>
                  ))}
                  {data.recent_mileage_history.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-2 py-4 text-center text-admin-muted">내역 없음</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </section>
          )}

          <section>
            <h2 className="mb-2 font-song-myung text-sm font-bold text-admin-muted">보드 강제 개입</h2>
            <BoardInterventionForms
              teamId={teamId}
              isMutating={isMutating}
              onCellUpdate={handleCellUpdate}
              onPositionMove={handlePositionMove}
              onDiceAdjust={handleDiceAdjust}
            />
          </section>

          <section>
            <h2 className="mb-2 font-song-myung text-sm font-bold text-admin-muted">롤백</h2>
            <RollbackSection teamId={teamId} isMutating={isMutating} onRollback={handleRollback} />
          </section>
        </div>
      )}
    </AdminLayout>
  );
}
