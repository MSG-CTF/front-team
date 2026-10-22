import { useMemo, useState } from "react";
import { updateAdminResourceAccount } from "../../../api/admin.js";
import { isSuccess } from "../../../utils/response.js";
import {
  BILLING_PLANS, BILLING_STATUS, CURRENCIES, billingProjection, formatMoney, normalizeBilling, readLocalBilling, validateBillingForm, writeLocalBilling,
} from "../utils/adminBilling.js";
import { displayNodeName, formatCapacity, providerLabel, sumCapacity } from "../utils/adminNodeOverview.js";
import { resourceStatus } from "../utils/adminNodeAllocation.js";
import { formatAdminTime } from "../utils/adminTime.js";
import { getAdminRequestError } from "../utils/adminValidation.js";
import AdminDialog from "./AdminDialog.jsx";
import { AdminBadge } from "./AdminLayout.jsx";
import { AdminReasonField, AdminSegmented, AdminSwitch } from "./AdminFormParts.jsx";
import { ProviderMark } from "./AdminPlatform.jsx";
import { NodeName, USAGE_METRICS, UsageMeter } from "./AdminNodeBoard.jsx";
import ui from "./AdminWorkspace.module.css";
import styles from "./AdminNodeResources.module.css";

const PAUSE_REASONS = ["크레딧 소진 예상", "요금 초과 방지", "계정 점검"];
const RESUME_REASONS = ["크레딧 충전 확인", "점검 완료"];

// 요금 계획 창: 백엔드가 받으면 서버에, 아니면 이 브라우저에 저장한다
function BillingDialog({ account, billing, onClose, onSaved }) {
  const [form, setForm] = useState(() => ({
    plan: billing?.plan ?? "FREE_TRIAL", currency: billing?.currency ?? "USD",
    credit_total: billing?.credit_total ?? "", spent: billing?.spent ?? "", hourly_cost: billing?.hourly_cost ?? "",
  }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const invalid = validateBillingForm(form);
  const edit = (key, value) => { setForm((current) => ({ ...current, [key]: value })); setError(""); };

  async function save(event) {
    event.preventDefault();
    if (busy || invalid) return;
    const billingBody = { plan: form.plan, currency: form.currency, credit_total: Number(form.credit_total), spent: Number(form.spent), hourly_cost: Number(form.hourly_cost) };
    setBusy(true);
    try {
      const response = await updateAdminResourceAccount(account.account_id, { billing: billingBody, reason: "요금 계획 입력" });
      if (!isSuccess(response.data)) throw new Error(response.data?.message || "저장하지 못했습니다");
      onSaved("server");
    } catch (failure) {
      if (getAdminRequestError(failure, "").status === "unavailable") {
        if (writeLocalBilling(account.account_id, billingBody)) onSaved("local");
        else setError("이 브라우저에 저장할 수 없습니다 사생활 보호 모드인지 확인하세요");
      } else setError(failure?.response?.data?.message || failure?.message || "저장하지 못했습니다");
    } finally {
      setBusy(false);
    }
  }

  return <AdminDialog title="요금 계획" subtitle={account.scope_id || account.account_id} onClose={onClose} busy={busy}>
    <form onSubmit={save} className={ui.formStack}>
      <div className={ui.field}><span className={ui.fieldLabel}>요금 종류</span>
        <AdminSegmented items={BILLING_PLANS} value={form.plan} onChange={(value) => edit("plan", value)} label="요금 종류" disabled={busy} /></div>
      <div className={ui.field}><span className={ui.fieldLabel}>통화</span>
        <AdminSegmented items={CURRENCIES.map((key) => ({ key, label: key === "KRW" ? "원" : "달러" }))} value={form.currency} onChange={(value) => edit("currency", value)} label="통화" disabled={busy} /></div>
      <div className={`${ui.formGrid} ${ui.formGrid3}`}>
        <label className={ui.field}><span className={ui.fieldLabel}>크레딧 총액</span>
          <input className={ui.input} inputMode="decimal" value={form.credit_total} disabled={busy} onChange={(event) => edit("credit_total", event.target.value)} placeholder="300" /></label>
        <label className={ui.field}><span className={ui.fieldLabel}>지금까지 쓴 금액</span>
          <input className={ui.input} inputMode="decimal" value={form.spent} disabled={busy} onChange={(event) => edit("spent", event.target.value)} placeholder="42.5" /></label>
        <label className={ui.field}><span className={ui.fieldLabel}>시간당 요금</span>
          <input className={ui.input} inputMode="decimal" value={form.hourly_cost} disabled={busy} onChange={(event) => edit("hourly_cost", event.target.value)} placeholder="1.8" /></label>
      </div>
      <p className={ui.fieldHint}>클라우드 결제 화면의 크레딧 잔액과 지금 노드 구성의 시간당 요금을 적어주세요 대회 종료 시각까지 같은 속도로 쓴다고 보고 계산합니다</p>
      {error && <p role="alert" className={ui.errorText}>{error}</p>}
      <div className={ui.formActions}>
        <button type="button" className={ui.button} disabled={busy} onClick={onClose}>취소</button>
        <button type="submit" className={ui.primary} disabled={busy || Boolean(invalid)} title={invalid || undefined}>저장</button>
      </div>
    </form>
  </AdminDialog>;
}

// 새 배치 멈춤 확인 창
function SchedulingDialog({ account, enable, onClose, onDone }) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function confirm() {
    if (busy || !reason.trim()) return;
    setBusy(true);
    setError("");
    try {
      const response = await updateAdminResourceAccount(account.account_id, { schedulingEnabled: enable, reason: reason.trim() });
      if (!isSuccess(response.data)) throw new Error(response.data?.message || "바꾸지 못했습니다");
      await onDone();
      onClose();
    } catch (failure) {
      setError(getAdminRequestError(failure, "").status === "unavailable"
        ? "계정 배치 조정 API(PATCH /admin/resources/accounts/{id})가 아직 백엔드에 없습니다"
        : failure?.response?.data?.message || failure?.message || "바꾸지 못했습니다");
    } finally {
      setBusy(false);
    }
  }
  return <AdminDialog title={enable ? "새 배치 다시 받기" : "새 배치 멈추기"} subtitle={account.scope_id || account.account_id} onClose={onClose} busy={busy}>
    <p className={ui.dialogLead}>{enable ? "이 계정의 노드에 새 인스턴스를 다시 놓습니다" : "이 계정의 노드에는 새 인스턴스를 놓지 않습니다 이미 실행 중인 인스턴스는 만료될 때까지 그대로 둡니다"}</p>
    <AdminReasonField label="사유" value={reason} onChange={setReason} presets={enable ? RESUME_REASONS : PAUSE_REASONS} disabled={busy} required autoFocus />
    {error && <p role="alert" className={ui.errorText}>{error}</p>}
    <div className={ui.formActions}>
      <button type="button" className={ui.button} disabled={busy} onClick={onClose}>취소</button>
      <button type="button" className={enable ? ui.primary : ui.dangerSolid} disabled={busy || !reason.trim()} onClick={confirm}>{enable ? "다시 받기" : "멈추기"}</button>
    </div>
  </AdminDialog>;
}

function AccountCard({ group, endTime, onSelect, onChanged, localVersion, bumpLocal }) {
  const account = group.account;
  const billing = useMemo(() => normalizeBilling(account.billing) ?? readLocalBilling(account.account_id),
    // localVersion 이 바뀌면 이 브라우저에 새로 적은 계획을 다시 읽는다
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [account.billing, account.account_id, localVersion]);
  const projection = billingProjection(billing, { endTime });
  const status = BILLING_STATUS[projection.status];
  const capacity = formatCapacity(sumCapacity(group.entries));
  const scheduling = account.scheduling_enabled !== false && billing?.scheduling_enabled !== false;
  const accountStatus = resourceStatus(account.status);
  const [dialog, setDialog] = useState(null);
  const usedPercent = projection.status === "unknown" ? 0 : Math.min(100, projection.usedRatio * 100);
  const projectedPercent = projection.status === "unknown" ? 0 : Math.min(100, projection.projectedRatio * 100);

  return <section className={styles.accountCard} data-tone={status.tone} aria-label={`${group.name} 계정`}>
    <header className={styles.accountHead}>
      {group.provider && <ProviderMark provider={group.provider} account={account} size={22} />}
      <div className={styles.accountTitle}>
        <h3 title={group.name}>{group.name}</h3>
        <span>{[providerLabel(account), `노드 ${group.entries.length}대`, capacity].filter(Boolean).join(" · ")}</span>
      </div>
      {account.status && account.status !== "HEALTHY" && <AdminBadge tone={accountStatus.tone}>{accountStatus.label}</AdminBadge>}
    </header>

    <div className={styles.billing}>
      <div className={styles.billingTop}>
        <AdminBadge tone={status.tone}>{status.label}</AdminBadge>
        {projection.status !== "unknown" && <span className={styles.billingFigures}>
          <strong>{formatMoney(projection.plan.spent, projection.plan.currency)}</strong> 사용 / {formatMoney(projection.plan.credit_total, projection.plan.currency)}
        </span>}
        <button type="button" className={`${ui.button} ${ui.small}`} onClick={() => setDialog("billing")}>{billing ? "요금 계획" : "요금 계획 입력"}</button>
      </div>
      {projection.status !== "unknown" ? <>
        <div className={styles.billingBar} aria-hidden="true">
          <span className={styles.billingUsed} style={{ width: `${usedPercent}%` }} />
          <span className={styles.billingProjected} style={{ left: `${usedPercent}%`, width: `${Math.max(0, projectedPercent - usedPercent)}%` }} />
        </div>
        <p className={styles.billingNote}>
          {projection.remainingHours === null ? "대회 종료 시각을 몰라 예상을 계산하지 못했습니다"
            : `종료까지 ${Math.round(projection.remainingHours)}시간 · 예상 ${formatMoney(projection.projected, projection.plan.currency)}`}
          {projection.status === "over" && projection.runOutAt && ` · ${formatAdminTime(projection.runOutAt, { seconds: false })}쯤 바닥`}
          {projection.status === "over" && ` · ${formatMoney(-projection.left, projection.plan.currency)} 초과`}
          {projection.status !== "over" && projection.left !== undefined && ` · 남는 크레딧 ${formatMoney(projection.left, projection.plan.currency)}`}
        </p>
        <p className={styles.billingSource}>{billing?.source === "local" ? "이 브라우저에 적어 둔 계획" : "서버 요금 정보"}{billing?.observed_at ? ` · ${formatAdminTime(billing.observed_at, { seconds: false })} 기준` : ""}</p>
      </> : <p className={styles.billingNote}>크레딧과 시간당 요금을 적으면 대회가 끝날 때까지 얼마나 쓸지 계산합니다</p>}
      <div className={styles.schedulingRow}>
        <AdminSwitch checked={scheduling} label={scheduling ? "새 배치 멈추기" : "새 배치 다시 받기"} onChange={() => setDialog(scheduling ? "pause" : "resume")} />
        <span>{scheduling ? "새 인스턴스를 받는 중" : "새 인스턴스를 받지 않음"}</span>
      </div>
    </div>

    <div className={styles.accountNodesHead} aria-hidden="true"><span>노드</span>{USAGE_METRICS.map((metric) => <span key={metric.key}>{metric.label}</span>)}</div>
    <ul className={styles.accountNodes} aria-label={`${group.name} 노드`}>
      {group.entries.map((entry) => {
        const node = resourceStatus(entry.node.status);
        return <li key={entry.key}>
          <button type="button" className={styles.accountNode} onClick={() => onSelect(entry.key)} aria-label={`${entry.name} ${node.label} 배치 보기`}>
            <span className={styles.accountNodeName}><span className={styles.nodeDot} data-tone={node.tone} aria-hidden="true" /><NodeName name={displayNodeName(entry.name)} full={entry.name} /></span>
            {USAGE_METRICS.map((metric) => <UsageMeter key={metric.key} label={metric.label} value={entry.node[metric.key]} showLabel={false} />)}
          </button>
        </li>;
      })}
    </ul>
    {dialog === "billing" && <BillingDialog account={account} billing={billing} onClose={() => setDialog(null)}
      onSaved={async (where) => { setDialog(null); if (where === "local") bumpLocal(); else await onChanged(); }} />}
    {(dialog === "pause" || dialog === "resume") && <SchedulingDialog account={account} enable={dialog === "resume"} onClose={() => setDialog(null)} onDone={onChanged} />}
  </section>;
}

const SEVERITY = { over: 0, low: 1, unknown: 2, ok: 3 };

// 계정별 보기: 요금과 배치를 계정 단위로 본다 무료 크레딧 계정이 대회 중 바닥나지 않게 미리 조정한다
// 대회 전에 바닥날 계정부터 위에 둔다
export default function AdminNodeAccounts({ groups, endTime, onSelect, onChanged }) {
  const [localVersion, setLocalVersion] = useState(0);
  const ordered = useMemo(() => groups.map((group, index) => {
    const billing = normalizeBilling(group.account?.billing) ?? readLocalBilling(group.account?.account_id);
    return { group, index, rank: SEVERITY[billingProjection(billing, { endTime }).status] };
  }).sort((a, b) => a.rank - b.rank || a.index - b.index).map((item) => item.group),
  // localVersion 이 바뀌면 이 브라우저에 새로 적은 계획으로 다시 정렬한다
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [groups, endTime, localVersion]);
  return <div className={styles.accountGrid}>
    {ordered.map((group) => <AccountCard key={group.id} group={group} endTime={endTime} onSelect={onSelect} onChanged={onChanged}
      localVersion={localVersion} bumpLocal={() => setLocalVersion((value) => value + 1)} />)}
  </div>;
}
