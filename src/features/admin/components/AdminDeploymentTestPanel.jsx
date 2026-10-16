import { useCallback, useEffect, useRef, useState } from "react";
import { getAdminDeploymentTests, startAdminDeploymentTest, stopAdminDeploymentTest } from "../../../api/admin.js";
import { isSuccess } from "../../../utils/response.js";
import { toKst } from "../../../utils/time.js";
import { mapInstanceEndpoints } from "../../challenges/utils/challengeDetailMapper.js";
import { deploymentTestStatus, deploymentTestSteps } from "../utils/adminDeploymentTests.js";
import { AdminBadge } from "./AdminLayout.jsx";
import styles from "./AdminWorkspace.module.css";

export default function AdminDeploymentTestPanel({ challengeId, release, onBusyChange }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState("");
  const mounted = useRef(false);
  const pending = useRef(false);
  const fetching = useRef(false);
  const generation = useRef(0);
  const request = useRef(null);
  const controller = useRef(null);

  const load = useCallback(async () => {
    if (fetching.current || pending.current || !mounted.current) return;
    fetching.current = true;
    const current = ++generation.current;
    controller.current = new AbortController();
    try {
      const response = await getAdminDeploymentTests(challengeId, { signal: controller.current.signal, timeout: 12000 });
      if (!isSuccess(response.data)) throw new Error(response.data?.message);
      if (mounted.current && generation.current === current) { setData(response.data.data); setLoadError(""); }
    } catch (failure) {
      if (mounted.current && generation.current === current) setLoadError(failure.response?.data?.message || "테스트 상태를 불러오지 못했습니다 다시 확인해주세요");
    } finally { fetching.current = false; }
  }, [challengeId]);

  useEffect(() => {
    mounted.current = true;
    const initial = setTimeout(load, 0);
    const timer = setInterval(() => { if (document.visibilityState === "visible") load(); }, 4000);
    return () => { mounted.current = false; generation.current += 1; controller.current?.abort(); clearTimeout(initial); clearInterval(timer); };
  }, [load]);
  useEffect(() => { onBusyChange?.(busy); }, [busy, onBusyChange]);
  useEffect(() => () => onBusyChange?.(false), [onBusyChange]);

  async function mutate(action) {
    if (pending.current) return;
    pending.current = true;
    generation.current += 1;
    controller.current?.abort();
    setBusy(true); setError("");
    try {
      const response = await action();
      if (!isSuccess(response.data)) throw new Error(response.data?.message);
      request.current = null;
      if (mounted.current) setData((current) => ({ ...current,
        tests: [response.data.data, ...(current?.tests ?? []).filter((item) => item.test_id !== response.data.data.test_id)],
        active_test: response.data.data.finished_at ? null : response.data.data,
      }));
    } catch (failure) {
      if (mounted.current) {
        setError(failure.response?.data?.message || "요청 결과를 확인하지 못했습니다 새로고침 후 같은 요청으로 다시 확인할 수 있습니다");
        if (failure.response?.data?.data?.active_test) setData((current) => ({ ...current, active_test: failure.response.data.data.data.active_test }));
        if (failure.response && failure.response.status < 500) request.current = null;
      }
    } finally { pending.current = false; if (mounted.current) setBusy(false); }
  }

  function start() {
    if (!request.current || request.current.releaseId !== release.release_id) {
      request.current = { releaseId: release.release_id, id: crypto.randomUUID() };
    }
    mutate(() => startAdminDeploymentTest(challengeId, release.release_id, request.current.id));
  }

  async function copy(endpoint) {
    try { await navigator.clipboard.writeText(endpoint.url); setCopied(endpoint.url); }
    catch { setError("주소를 복사하지 못했습니다 접속 주소를 직접 선택해 복사해주세요"); }
  }

  const active = data?.active_test;
  const tests = (data?.tests ?? []).filter((item) => item.release_id === release?.release_id);
  const latest = active?.release_id === release?.release_id ? active : tests[0];
  const otherActive = active && active.release_id !== release?.release_id;
  const endpoints = mapInstanceEndpoints(latest);
  const disabledReason = !release?.is_deployable ? "실행할 수 있는 배포 버전을 먼저 등록해주세요"
    : !["KUBERNETES", "DOCKER"].includes(release.runtime_type) ? "VM 배포 테스트는 아직 지원하지 않습니다"
      : release.containers.some((container) => container.secret_bindings?.some((binding) => binding.status === "missing"))
        ? "연결되지 않은 비밀값을 먼저 저장해주세요" : "";

  return <div className={styles.deploymentTest}>
    <div className={styles.testHeading}>
      <div><h3 className={styles.sectionTitle}>버전 {release?.version} 시험 실행</h3>
        <p className={styles.helpText}>이 버전의 이미지와 환경변수로 실행합니다 테스트는 15분 뒤 만료됩니다</p></div>
      <button type="button" className={styles.primary} disabled={busy || !data || Boolean(active) || Boolean(disabledReason)} onClick={start}>
        {busy ? "요청 중…" : "테스트 실행"}</button>
    </div>
    <p className={styles.testHint}>참가자에게 적용 중인 배포 버전은 그대로 유지됩니다</p>
    {disabledReason && <p role="status" className={styles.testHint}>{disabledReason}</p>}
    {(error || loadError) && <p role="alert" className={styles.testError}>{error || loadError}</p>}
    {!data && !error && !loadError && <p role="status" className={styles.empty}>테스트 기록을 불러오는 중입니다</p>}
    {otherActive && <div className={styles.confirmation}>
      <p>{active.challenge_title} · 버전 {active.version} 테스트가 진행 중입니다</p>
      <p className={styles.helpText}>{deploymentTestStatus[active.status]} · 종료 후 새 테스트를 실행할 수 있습니다</p>
      {active.can_stop && <button type="button" className={styles.button} disabled={busy}
        onClick={() => mutate(() => stopAdminDeploymentTest(active.challenge_id, active.test_id))}>진행 중인 테스트 종료</button>}
    </div>}
    <ol className={styles.testSteps} aria-label="배포 테스트 진행 단계">
      {deploymentTestSteps(latest).map((step, index) => <li key={step.label} data-state={step.state}>
        <span>{step.state === "done" ? "✓" : step.state === "failed" ? "!" : index + 1}</span><div>{step.label}{step.state === "manual" && <small>관리자 확인</small>}{step.state === "failed" && <small>진행 실패</small>}</div>
      </li>)}
    </ol>
    {latest ? <section className={styles.testResult} aria-label="최근 배포 테스트">
      <div className={styles.testResultHeader} aria-live="polite"><strong>버전 {latest.version}</strong>
        <AdminBadge tone={latest.error_code && ["FAILED", "CLEANED", "CLEANUP_PENDING"].includes(latest.status) ? "bad" : latest.status === "RUNNING" ? "good" : "neutral"}>
          {latest.status === "CLEANED" && latest.error_code ? "실패 · 정리 완료" : deploymentTestStatus[latest.status] ?? latest.status}</AdminBadge>
        {latest.can_stop && <button type="button" className={styles.button} disabled={busy}
          onClick={() => mutate(() => stopAdminDeploymentTest(challengeId, latest.test_id))}>테스트 종료</button>}
      </div>
      <dl className={styles.testTimes}>
        <div><dt>요청 시각</dt><dd>{toKst(latest.created_at)}</dd></div>
        <div><dt>{latest.finished_at ? "종료 확인" : "만료 예정"}</dt><dd>{toKst(latest.finished_at || latest.expires_at)}</dd></div>
      </dl>
      {latest.error_message && <p role="status" className={styles.testError}>{latest.error_message}</p>}
      {latest.status === "RUNNING" && <>
        <p className={styles.helpText}>컨테이너가 실행 중입니다 접속해서 문제 화면과 기능을 확인해주세요</p>
        {endpoints.length === 0 && <p className={styles.testHint}>접속 주소가 아직 없습니다 상태를 다시 확인해주세요</p>}
        {endpoints.map((endpoint) => <div key={endpoint.url} className={styles.testEndpoint}>
          <div><strong>{endpoint.name}</strong><code>{endpoint.url}</code></div>
          <div>{endpoint.isWeb && <a href={endpoint.url} target="_blank" rel="noopener noreferrer" className={styles.button}>접속하기</a>}
            <button type="button" className={styles.button} onClick={() => copy(endpoint)}>{copied === endpoint.url ? "복사됨" : "주소 복사"}</button></div>
        </div>)}
      </>}
      {latest.status === "PROVISIONING" && <p className={styles.helpText}>이미지를 내려받고 컨테이너를 준비하고 있습니다 준비가 끝나면 접속하거나 종료할 수 있습니다</p>}
    </section> : data && <p className={styles.empty}>이 버전의 테스트 기록이 없습니다</p>}
    <div className={styles.testFooter}><span>내 테스트 · 최근 10건 · 시간은 한국 기준</span>
      <button type="button" className={styles.button} disabled={busy} onClick={load}>상태 새로고침</button></div>
    {tests.length > 1 && <details className={styles.details}><summary>이 버전의 이전 테스트 {tests.length - 1}건</summary>
      <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>요청 시각</th><th>결과</th></tr></thead>
        <tbody>{tests.slice(1).map((test) => <tr key={test.test_id}><td>{toKst(test.created_at)}</td><td>{deploymentTestStatus[test.status]}{test.error_message && <span className={styles.secondary}>{test.error_message}</span>}</td></tr>)}</tbody>
      </table></div></details>}
  </div>;
}
