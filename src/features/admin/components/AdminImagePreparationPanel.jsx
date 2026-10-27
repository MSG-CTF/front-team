import { useEffect, useRef, useState } from "react";
import { createImagePreparationController, imagePreparationDisabledReason } from "../utils/adminImagePreparations.js";
import { formatAdminTime } from "../utils/adminTime.js";
import { AdminMiniPager } from "./AdminPagination.jsx";
import styles from "./AdminWorkspace.module.css";
import panelStyles from "./AdminImagePreparationPanel.module.css";

const initialState = { records: [], detail: null, page: 1, count: 0, pageSize: 20, loading: true, submitting: false,
  loaded: false, error: "", notice: "", ambiguous: false };

export function AdminImagePreparationView({ release, state, busy = false, onSubmit, onLoad, onView }) {
  const disabledReason = imagePreparationDisabledReason(release);
  const pending = busy || state.loading || state.submitting;
  const detail = state.detail;
  const nodes = Array.isArray(detail?.progress?.nodes) ? detail.progress.nodes : [];
  return <section className={panelStyles.panel} aria-label={`버전 ${release.version} 이미지 준비`} aria-busy={state.loading || state.submitting}>
    <div className={styles.groupHead}>
      <h4 className={styles.groupTitle}>버전 {release.version} 이미지 준비</h4>
      <button type="button" className={styles.primary} disabled={pending || Boolean(disabledReason) || (!state.loaded && !state.ambiguous)} onClick={onSubmit}>
        {state.submitting ? "요청 중…" : state.ambiguous ? "같은 이미지 준비 요청 다시 확인" : "이미지 준비 요청"}
      </button>
    </div>
    <p className={styles.helpText}>선택 버전 ID: <code className={panelStyles.identifier}>{release.release_id}</code></p>
    <p className={styles.helpText}>승인된 버전의 고정 이미지와 운영 설정의 대상으로 준비를 요청합니다 배포 버전은 전환하지 않습니다</p>
    <p className={styles.fileNotice}>이력은 과거 작업 결과이며 현재 노드의 이미지 준비 상태를 보증하지 않습니다</p>
    {disabledReason && <p className={styles.helpText}>{disabledReason}</p>}
    {state.ambiguous && <p className={styles.fileNotice}>이전 요청의 접수 여부를 확인하지 못했습니다 이력을 확인한 뒤 같은 요청으로 다시 확인할 수 있습니다</p>}
    {state.error && <p role="alert" className={styles.errorText}>{state.error}</p>}
    {state.notice && <p role="status" className={styles.helpText}>{state.notice}</p>}
    <div className={panelStyles.actions}>
      <button type="button" className={styles.button} disabled={pending} onClick={() => onLoad(state.page)}>이미지 준비 이력 새로고침</button>
      <span className={styles.secondary}>{state.loading ? "조회 중…" : state.loaded ? `총 ${state.count}건` : "이력 조회 대기"}</span>
      <AdminMiniPager label="이미지 준비 이력 쪽" page={state.page} pageCount={Math.max(1, Math.ceil(state.count / state.pageSize))}
        onChange={onLoad} disabled={pending}/>
    </div>
    {state.records.length > 0 ? <div className={panelStyles.history}>
      <table className={styles.settingsTable} aria-label="이미지 준비 요청 이력">
        <thead><tr><th>요청 · 접수 시각</th><th>Backend 전송</th><th>과거 작업 상태</th><th>조회</th></tr></thead>
        <tbody>{state.records.map((row) => <tr key={row.request_id}>
          <td><code className={panelStyles.identifier}>{row.request_id}</code><div className={styles.secondary}>{formatAdminTime(row.created_at)}</div></td>
          <td>{row.delivery_status}</td><td>{row.operation_status || "작업 상태 없음"}{row.requires_review && <div className={styles.errorText}>운영 확인 필요</div>}</td>
          <td><button type="button" className={styles.button} disabled={pending} aria-label={`요청 ${row.request_id} 상태 보기`} onClick={() => onView(row.request_id)}>상태 보기</button></td>
        </tr>)}</tbody>
      </table>
    </div> : state.loaded && <p className={styles.empty}>이미지 준비 요청 이력이 없습니다</p>}
    {detail && <div className={panelStyles.detail} aria-label="선택 이미지 준비 요청 상세">
      <div className={styles.groupHead}><h5 className={styles.groupTitle}>과거 작업 결과</h5>
        <button type="button" className={styles.button} disabled={pending} onClick={() => onView(detail.request_id)}>선택 요청 상태 새로고침</button></div>
      <dl className={styles.detailList}>
        <dt>요청 ID</dt><dd className={panelStyles.identifier}>{detail.request_id}</dd>
        <dt>작업 ID</dt><dd className={panelStyles.identifier}>{detail.operation_id || "아직 없음"}</dd>
        <dt>Backend 전송</dt><dd>{detail.delivery_status}</dd>
        <dt>과거 작업 상태</dt><dd>{detail.operation_status || "아직 없음"}{detail.requires_review && " · 운영 확인 필요"}</dd>
        <dt>Backend 마지막 확인</dt><dd>{detail.last_checked_at ? formatAdminTime(detail.last_checked_at) : "아직 없음"}</dd>
        <dt>오류 코드</dt><dd className={panelStyles.identifier}>{detail.last_error_code || "없음"}</dd>
      </dl>
      {nodes.length > 0 && <details><summary>과거 노드 · 이미지 결과 ({nodes.length}개 노드)</summary>
        <ul className={panelStyles.nodes}>{nodes.map((node) => <li key={node.node_uid}>
          <strong>{node.node_name}</strong> · {node.target_id} · {node.status}
          <ul>{(Array.isArray(node.images) ? node.images : []).map((image) => <li key={image.image}>
            <code className={panelStyles.identifier}>{image.image}</code> · {image.status}{image.error_code && ` · ${image.error_code}`}
          </li>)}</ul>
        </li>)}</ul>
      </details>}
    </div>}
  </section>;
}

export default function AdminImagePreparationPanel({ challengeId, release, busy, onBusyChange }) {
  const [state, setState] = useState(initialState);
  const controller = useRef(null);
  useEffect(() => {
    const current = createImagePreparationController({ challengeId, releaseId: release.release_id, onChange: setState });
    controller.current = current;
    setState(current.getState());
    current.load();
    return () => { current.dispose(); controller.current = null; };
  }, [challengeId, release.release_id]);
  useEffect(() => { onBusyChange?.(state.submitting); }, [state.submitting, onBusyChange]);
  useEffect(() => () => onBusyChange?.(false), [onBusyChange]);
  return <AdminImagePreparationView release={release} state={state} busy={busy}
    onLoad={(page) => controller.current?.load(page)} onSubmit={() => controller.current?.submit()}
    onView={(requestId) => controller.current?.view(requestId)}/>;
}
