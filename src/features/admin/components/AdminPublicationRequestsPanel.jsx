import { useEffect, useRef, useState } from "react";
import { createAdminIdempotencyKey, createPublicationRequest, dispatchPublicationRequest, getPublicationRequest, getPublicationRequests, syncPublicationRequest } from "../../../api/admin.js";
import { isSuccess } from "../../../utils/response.js";
import { useAuthenticatedUser } from "../../../routes/AuthenticatedRoute.jsx";
import useAdminResource from "../hooks/useAdminResource.js";
import { formatAdminTime } from "../utils/adminTime.js";
import { PUBLICATION_STATUS, publicationBody, publicationRunUrl } from "../utils/adminPublicationRequests.js";
import AdminActionDialog from "./AdminActionDialog.jsx";
import AdminDialog from "./AdminDialog.jsx";
import AdminPagination from "./AdminPagination.jsx";
import { AdminBadge, AdminStatusMessage } from "./AdminLayout.jsx";
import ui from "./AdminWorkspace.module.css";
import local from "./AdminApiActions.module.css";

function storedIntent(key) {
  try { const value = JSON.parse(sessionStorage.getItem(key) || "null"); if (!value || typeof value.key !== "string") return null; const parsed = publicationBody({ slug: value.body.challenge_slug, sha: value.body.requested_sha || "" }); return parsed.error ? null : { key: value.key, body: parsed.body }; } catch { return null; }
}
function persist(key, value) { try { if (value) sessionStorage.setItem(key, JSON.stringify(value)); else sessionStorage.removeItem(key); } catch { /* 페이지 안에서는 같은 요청을 유지한다 */ } }

function RequestDetail({ id, capabilities, onClose, onChanged }) {
  const detail = useAdminResource(config => getPublicationRequest(id, config), [id], "발행 요청을 불러오지 못했습니다");
  const [confirming, setConfirming] = useState(false), [busy, setBusy] = useState(false), [notice, setNotice] = useState(""), [error, setError] = useState("");
  const lock = useRef(false), data = detail.data, runUrl = publicationRunUrl(data?.workflow_url);
  const canDispatch = capabilities?.dispatch_supported === true && data?.dispatch_supported === true && Boolean(data?.requested_sha) && data?.dispatch_status === "NOT_DISPATCHED";
  async function sync() {
    if (lock.current) return; lock.current = true; setBusy(true); setError("");
    try { const response = await syncPublicationRequest(id); if (!isSuccess(response.data)) throw new Error(response.data?.message); setNotice(await detail.reload() ? "작업 상태를 확인했습니다" : "확인은 처리됐지만 최신 상태를 조회하지 못했습니다"); onChanged(); }
    catch (failure) { setError(failure.response?.data?.message || "작업 상태를 확인하지 못했습니다 다시 조회해주세요"); }
    finally { lock.current = false; setBusy(false); }
  }
  return <AdminDialog title="발행 요청 상세" busy={busy} onClose={onClose}><div className={local.stack}>
    <AdminStatusMessage status={detail.status} error={detail.error} onRetry={detail.retry} hasData={Boolean(data)} />
    {notice && <p role="status" className={ui.callout}>{notice}</p>}{error && <p role="alert" className={ui.errorText}>{error}</p>}
    {data && <><dl className={ui.detailList}><dt>문제</dt><dd className={local.long}>{data.challenge_slug}</dd><dt>요청</dt><dd className={local.long}>{data.request_id}</dd><dt>커밋 SHA</dt><dd className={local.long}>{data.requested_sha || "지정하지 않음"}</dd><dt>발행 상태</dt><dd>{PUBLICATION_STATUS[data.dispatch_status] || data.dispatch_status}</dd><dt>작업 결과</dt><dd>{data.workflow_conclusion || data.workflow_status || "작업 전"}</dd><dt>최근 확인</dt><dd>{formatAdminTime(data.last_checked_at)}</dd><dt>SHA 검증</dt><dd>{data.sha_verified ? "수집한 발행본과 일치" : data.run_sha_verified ? "실행한 커밋과 일치" : "아직 확인되지 않음"}</dd>{data.last_error_code && <><dt>확인 사항</dt><dd className={local.long}>{data.last_error_code}</dd></>}</dl>
      {!capabilities?.dispatch_supported && <p className={ui.helpText}>이 서버에서는 발행 실행이 꺼져 있습니다 요청 이력은 조회할 수 있습니다</p>}
      {!data.requested_sha && <p className={ui.helpText}>발행하려면 커밋 SHA를 지정한 새 요청을 기록해주세요</p>}
      {data.dispatch_status === "DISPATCH_UNKNOWN" && <p className={ui.callout}>접수 여부를 확인해야 합니다 새 요청을 만들기 전에 작업 상태를 확인해주세요</p>}
      <div className={local.actions}><button type="button" className={ui.button} onClick={detail.retry} disabled={busy}>저장된 상태 새로고침</button><button type="button" className={ui.button} onClick={sync} disabled={busy || !["DISPATCH_UNKNOWN", "DISPATCHED"].includes(data.dispatch_status)}>작업 상태 확인</button><button type="button" className={ui.primary} onClick={() => setConfirming(true)} disabled={busy || detail.status !== "success" || !canDispatch}>발행 실행</button>{runUrl && <a className={ui.fileLink} href={runUrl} target="_blank" rel="noreferrer">GitHub 작업 보기</a>}</div>
    </>}
  </div>{confirming && <AdminActionDialog title="발행 작업 실행" confirmLabel="발행 실행" onBusyChange={setBusy} onClose={() => setConfirming(false)} onFailure={detail.reload} action={() => dispatchPublicationRequest(id)}
    onDone={async () => { setConfirming(false); setNotice("발행 요청을 처리했습니다 작업 상태를 확인해주세요"); if (!await detail.reload()) setNotice("요청은 처리됐지만 최신 상태를 조회하지 못했습니다"); onChanged(); }}>
    <p className={ui.callout}>기록한 문제와 커밋으로 GitHub 발행 작업을 요청합니다 발행본을 가져오거나 사용 중인 버전을 전환하지는 않습니다</p>
  </AdminActionDialog>}</AdminDialog>;
}

export default function AdminPublicationRequestsPanel() {
  const user = useAuthenticatedUser(), storageKey = `msgctf:publication-request:${user?.user_id || "local"}`;
  const [draft, setDraft] = useState({ slug: "", sha: "" }), [intent, setIntent] = useState(null);
  const [page, setPage] = useState(1), [status, setStatus] = useState(""), [slug, setSlug] = useState("");
  const [search, setSearch] = useState(""), [searchError, setSearchError] = useState("");
  const [selected, setSelected] = useState(null), [busy, setBusy] = useState(false), [error, setError] = useState(""), [notice, setNotice] = useState("");
  const locked = useRef(false);
  const catalog = useAdminResource(config => getPublicationRequests({ page, challengeSlug: slug || undefined, dispatchStatus: status || undefined }, config), [page, status, slug], "발행 요청 이력을 불러오지 못했습니다");
  const capabilities = catalog.data?.capabilities, parsed = publicationBody(draft);
  useEffect(() => { const pending = storedIntent(storageKey); setIntent(pending); setDraft(pending ? { slug: pending.body.challenge_slug, sha: pending.body.requested_sha || "" } : { slug: "", sha: "" }); setError(""); }, [storageKey]);
  async function record(event) {
    event.preventDefault(); if (locked.current || (!intent && parsed.error)) return;
    locked.current = true; setBusy(true); setError(""); setNotice("");
    const pending = intent || { body: parsed.body, key: createAdminIdempotencyKey("publication-request") };
    persist(storageKey, pending); setIntent(pending);
    try {
      const response = await createPublicationRequest(pending.body, pending.key);
      if (!isSuccess(response.data) || !response.data.data?.request_id) throw new Error("요청 접수를 확인하지 못했습니다");
      persist(storageKey, null); setIntent(null); setDraft({ slug: "", sha: "" }); setSelected(response.data.data.request_id);
      setNotice("발행 요청을 기록했습니다 상세에서 내용을 확인한 뒤 발행을 실행할 수 있습니다"); await catalog.reload();
    } catch (failure) {
      const code = failure.response?.data?.code, definite = (failure.response && failure.response.status < 500 && code !== "IDEMPOTENCY_KEY_CONFLICT") || (code === "PUBLICATION_REQUESTS_DISABLED" && !intent);
      if (definite) { persist(storageKey, null); setIntent(null); }
      setError(code === "PUBLICATION_REQUESTS_DISABLED" ? "이 서버에서는 발행 요청 기록이 꺼져 있습니다" : failure.response?.data?.message || "접수 응답을 확인하지 못했습니다 같은 요청으로 접수 확인을 눌러주세요");
    } finally { locked.current = false; setBusy(false); }
  }
  return <section className={local.stack} aria-label="발행 요청 관리"><AdminStatusMessage status={catalog.status} error={catalog.error} onRetry={catalog.retry} hasData={Boolean(catalog.data)} />
    {notice && <p role="status" className={ui.callout}>{notice}</p>}<p className={ui.helpText}>요청 기록과 발행 실행은 별도 단계입니다 발행한 결과를 확인한 뒤 기존 가져오기 메뉴에서 등록할 수 있습니다</p>
    {catalog.data && capabilities?.recording_supported !== true && <p className={ui.callout}>이 서버에서는 발행 요청 기록이 꺼져 있거나 기능 상태를 제공하지 않습니다 이력만 조회할 수 있습니다</p>}
    <form onSubmit={record} className={ui.formStack}><div className={local.fields}>
      <label className={local.field}>문제 저장소 이름<input className={ui.input} value={draft.slug} maxLength={100} placeholder="web-example" disabled={busy || Boolean(intent)} onChange={e => setDraft({ ...draft, slug: e.target.value })} /></label>
      <label className={local.field}>커밋 SHA (선택)<input className={ui.input} value={draft.sha} maxLength={40} placeholder="40자리 커밋 SHA" disabled={busy || Boolean(intent)} onChange={e => setDraft({ ...draft, sha: e.target.value })} /></label></div>
      {!draft.sha && <p className={ui.helpText}>SHA 없이 기록한 요청은 발행 실행을 할 수 없습니다</p>}{intent && <p className={ui.helpText}>이전 요청의 입력과 요청 키를 유지하며 접수 여부를 확인합니다</p>}{error && <p role="alert" className={ui.errorText}>{error}</p>}
      <div className={local.actions}><button type="submit" className={ui.primary} disabled={busy || (!intent && (capabilities?.recording_supported !== true || Boolean(parsed.error)))}>{busy ? "확인 중" : intent ? "같은 요청으로 접수 확인" : "발행 요청 기록"}</button></div>
    </form>
    <form className={ui.formStack} onSubmit={event => {
      event.preventDefault(); const value = search.trim();
      if (value && publicationBody({ slug: value, sha: "" }).error) { setSearchError("저장소 이름을 끝까지 입력해주세요 예: web-example"); return; }
      setSearchError(""); setSlug(value); setPage(1);
    }}><div className={local.fields}><label className={local.field}>저장소 이름으로 찾기<input className={ui.input} value={search} maxLength={100} placeholder="전체 저장소 이름" disabled={busy} onChange={e => setSearch(e.target.value)} /></label><label className={local.field}>발행 상태<select className={ui.select} value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} disabled={busy}><option value="">전체</option>{Object.entries(PUBLICATION_STATUS).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select></label></div>
      {searchError && <p role="alert" className={ui.errorText}>{searchError}</p>}<div className={local.actions}><button type="submit" className={ui.button} disabled={busy}>조회</button><button type="button" className={ui.button} disabled={busy} onClick={() => { setSearch(""); setSlug(""); setStatus(""); setPage(1); setSearchError(""); }}>필터 초기화</button></div>
    </form>
    <div className={local.actions}><button type="button" className={ui.button} disabled={busy} onClick={catalog.retry}>목록 새로고침</button></div>
    <div className={local.table}><table className={ui.table} aria-label="발행 요청 이력"><thead><tr><th>문제</th><th>요청 시각 (KST)</th><th>발행 상태</th><th>작업 결과</th><th>관리</th></tr></thead><tbody>{(catalog.data?.items || []).map(row => <tr key={row.request_id}><td className={local.long}>{row.challenge_slug}</td><td>{formatAdminTime(row.created_at)}</td><td><AdminBadge>{PUBLICATION_STATUS[row.dispatch_status] || row.dispatch_status}</AdminBadge></td><td>{row.workflow_conclusion || row.workflow_status || "작업 전"}</td><td><button type="button" className={ui.button} onClick={() => setSelected(row.request_id)}>상세 보기</button></td></tr>)}</tbody></table></div>
    {catalog.data?.items?.length === 0 && <p className={ui.empty}>이 조건의 발행 요청이 없습니다</p>}<AdminPagination page={page} totalCount={catalog.data?.total_count} size={20} onChange={setPage} disabled={busy || catalog.status !== "success"} />
    {selected && <RequestDetail key={selected} id={selected} capabilities={capabilities} onClose={() => setSelected(null)} onChanged={catalog.retry} />}
  </section>;
}
