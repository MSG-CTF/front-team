import { useEffect, useRef, useState } from "react";
import { createAdminIdempotencyKey, getAdminChallenge, getPublishedChallenges, importPublishedChallenge, previewPublishedChallenge } from "../../../api/admin.js";
import { isSuccess } from "../../../utils/response.js";
import { formatAdminTime } from "../utils/adminTime.js";
import { latestPublications, mergePublications, publicationAttempt, publicationFileLabel } from "../utils/adminPublications.js";
import AdminDialog from "./AdminDialog.jsx";
import { AdminBadge } from "./AdminLayout.jsx";
import styles from "./AdminWorkspace.module.css";

function responseData(response) {
  if (!isSuccess(response.data)) throw new Error(response.data?.message || "발행본을 확인하지 못했습니다");
  return response.data.data;
}

export default function AdminPublicationImportDialog({ onClose, onImported, onOpenSettings }) {
  const [rows, setRows] = useState([]);
  const [source, setSource] = useState(null);
  const [nextPage, setNextPage] = useState(1);
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState("new");
  const [preview, setPreview] = useState(null);
  const [difficulty, setDifficulty] = useState("UNASSIGNED");
  const [updateMetadata, setUpdateMetadata] = useState(false);
  const [loading, setLoading] = useState("");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(null);
  const read = useRef({ sequence: 0, controller: null });
  const attempt = useRef(null);
  const pending = useRef(false);
  const heading = useRef(null);

  useEffect(() => {
    loadPage(1);
    return () => { read.current.sequence += 1; read.current.controller?.abort(); };
  }, []);
  useEffect(() => { if (preview || result) heading.current?.focus(); }, [preview, result]);

  async function fetchRead(label, action, accept, retryAction) {
    read.current.controller?.abort();
    const controller = new AbortController();
    const sequence = ++read.current.sequence;
    read.current.controller = controller;
    setLoading(label);
    setError("");
    setRetry(null);
    try {
      const data = responseData(await action(controller.signal));
      if (sequence === read.current.sequence) accept(data);
    } catch (failure) {
      if (!controller.signal.aborted && sequence === read.current.sequence) {
        setError(failure?.response?.data?.message || failure.message || "발행본을 불러오지 못했습니다");
        setRetry(() => retryAction);
      }
    } finally { if (sequence === read.current.sequence) setLoading(""); }
  }

  function loadPage(page) {
    return fetchRead("발행 목록을 불러오고 있습니다", (signal) => getPublishedChallenges(page, { signal }), (data) => {
      setRows((current) => mergePublications(page === 1 ? [] : current, data.items));
      setNextPage(data.next_page);
      setSource(data);
    }, () => loadPage(page));
  }

  function selectPublication(row) {
    return fetchRead(`${row.title || row.challenge_slug} 발행 내용을 확인하고 있습니다`,
      (signal) => previewPublishedChallenge(row.artifact_id, { signal }), (data) => {
        setPreview(data);
        setDifficulty(data.defaults.difficulty);
        setUpdateMetadata(false);
        attempt.current = null;
      }, () => selectPublication(row));
  }

  function back() {
    setPreview(null);
    setError("");
    setRetry(null);
    attempt.current = null;
  }

  function openExisting(row) {
    return fetchRead("현재 문제 설정을 확인하고 있습니다",
      (signal) => getAdminChallenge(row.challenge_id, { signal }),
      (data) => onOpenSettings?.(data), () => openExisting(row));
  }

  async function submit(event) {
    event.preventDefault();
    if (pending.current || !preview?.can_import || result) return;
    pending.current = true;
    setSaving(true);
    setError("");
    const body = { preview_token: preview.preview_token, difficulty, update_metadata: updateMetadata };
    attempt.current = publicationAttempt(attempt.current, body, () => createAdminIdempotencyKey("publication"));
    try {
      const imported = responseData(await importPublishedChallenge(attempt.current.body, attempt.current.key));
      setResult(imported);
      onImported?.(imported);
    } catch (failure) {
      setError(failure?.response?.data?.message || failure.message || "발행본을 가져오지 못했습니다");
    } finally { pending.current = false; setSaving(false); }
  }

  const search = query.trim().toLocaleLowerCase();
  const latest = latestPublications(rows);
  const newCount = latest.filter((item) => !item.challenge_id).length;
  const filtered = latest.filter((item) => (scope === "all" || (scope === "new" ? !item.challenge_id : item.challenge_id))
    && `${item.title || ""} ${item.challenge_slug}`.toLocaleLowerCase().includes(search));
  const registered = Boolean(preview?.challenge_id);

  return <AdminDialog title="GitHub에서 문제 가져오기" variant="workspace" busy={saving} onClose={onClose}
    subtitle={source ? `${source.repository} · ${source.source_ref.replace("refs/heads/", "")}` : "저장소에 발행한 문제와 배포 파일을 가져옵니다"}>
    <ol className={styles.importSteps} aria-label="가져오기 순서">
      <li aria-current={!preview ? "step" : undefined}><span>1</span> 발행본 선택</li>
      <li aria-current={preview && !result ? "step" : undefined}><span>2</span> 내용 확인</li>
      <li aria-current={result ? "step" : undefined}><span>3</span> 등록 완료</li>
    </ol>
    {error && <div role="alert" className={styles.importError}><p>{error}</p>
      {retry && <button type="button" className={styles.button} disabled={Boolean(loading)} onClick={retry}>다시 불러오기</button>}
    </div>}
    {loading && <p role="status" className={styles.fileNotice}>{loading}</p>}

    {!preview && <>
      <div className={styles.catalogFilters} role="group" aria-label="등록 여부">
        {[["new", `새 문제 ${newCount}`], ["registered", `등록된 문제 ${latest.length - newCount}`], ["all", "전체"]].map(([value, label]) =>
          <button key={value} type="button" className={scope === value ? styles.primary : styles.button}
            aria-pressed={scope === value} onClick={() => setScope(value)}>{label}</button>)}
      </div>
      <div className={styles.publicationSearch}>
        <label>불러온 목록에서 검색<input className={styles.input} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="문제 이름 또는 폴더 이름"/></label>
        <button type="button" className={styles.button} disabled={Boolean(loading)} onClick={() => loadPage(1)}>새로고침</button>
      </div>
      <div className={styles.tableWrap}>
        <table className={`${styles.table} ${styles.publicationTable}`} aria-label="GitHub 발행본">
          <thead><tr><th>문제</th><th>발행일 (KST)</th><th>발행 내용</th><th><span className={styles.srOnly}>선택</span></th></tr></thead>
          <tbody>{filtered.map((row) => <tr key={`${row.challenge_slug}:${row.run_id}`}>
            <td><span className={styles.title}>{row.title || row.challenge_slug}</span>
              <span className={styles.secondary}>{row.title ? `${row.challenge_slug} · ` : ""}{row.challenge_id ? "등록된 문제" : "새 문제"}</span></td>
            <td className={styles.time}>{formatAdminTime(row.published_at, { seconds: false })}</td>
            <td>{row.has_release_artifact ? "실행 이미지" : "파일 정보"}{row.has_release_artifact && row.has_files_artifact ? " · 파일 정보" : ""}
              {row.workflow_state === "failed" && <span className={styles.secondary}>발행 실패</span>}
              {row.workflow_state === "running" && <span className={styles.secondary}>발행 진행 중</span>}</td>
            <td><div className={styles.rowActions}>{row.challenge_id && <button type="button" className={styles.button} disabled={Boolean(loading)} onClick={() => openExisting(row)}>설정 열기</button>}<button type="button" className={styles.button} disabled={Boolean(loading) || ["failed", "running"].includes(row.workflow_state)} aria-label={`${row.title || row.challenge_slug} 발행본 확인`} onClick={() => selectPublication(row)}>{row.challenge_id ? "발행본 확인" : "가져오기"}</button></div></td>
          </tr>)}</tbody>
        </table>
        {!filtered.length && !loading && <p className={styles.empty}>{search ? "검색 결과가 없습니다" : scope === "new" && latest.length ? "불러온 문제는 모두 등록되어 있습니다 ‘등록된 문제’에서 확인할 수 있습니다" : "표시할 발행본이 없습니다"}{nextPage ? " 목록을 더 불러오면 다른 문제도 확인할 수 있습니다" : ""}</p>}
      </div>
      <div className={styles.publicationPagination}>
        <p className={styles.helpText}>불러온 문제 {latest.length}개 · 문제마다 최신 발행본 하나만 표시합니다</p>
        {nextPage && <button type="button" className={styles.button} disabled={Boolean(loading)} onClick={() => loadPage(nextPage)}>목록 더 불러오기</button>}
      </div>
    </>}

    {preview && !result && <form onSubmit={submit}>
      <div className={styles.publicationHeading}>
        <div><h3 ref={heading} tabIndex={-1}>{preview.title}</h3><p className={styles.secondary}>{preview.challenge_slug} · 발행 #{preview.registry_revision}</p></div>
        <AdminBadge tone="neutral">{registered ? "등록된 문제" : "새 문제"}</AdminBadge>
      </div>
      <dl className={styles.publicationFacts}>
        <div><dt>분야 · 실행 방식</dt><dd>{preview.category} · {preview.runtime_type ? `${preview.runtime_type === "KUBERNETES" ? "Kubernetes" : "Docker"} / 컨테이너 ${preview.containers.length}개` : "파일 풀이"}</dd></div>
        <div><dt>참가자 첨부파일</dt><dd>{publicationFileLabel(preview.files)}</dd></div>
        <div><dt>채점 플래그</dt><dd>{({ match: "기존 채점 값 유지", mismatch: preview.can_import ? "관리자가 정한 채점 값 유지" : "주입할 비밀값 확인 필요", from_repository: "발행 당시 저장소 값으로 등록" })[preview.flag_status]}</dd></div>
      </dl>
      <p className={styles.panelIntro}>{registered
        ? `‘${preview.existing_title}’에 발행본을 추가합니다 채점 플래그·배점·난이도는 현재 설정을 유지합니다`
        : "제목·지문·플래그를 함께 가져와 비공개 문제로 등록합니다"}</p>
      {registered && <div className={styles.fileNotice}>
        <label><input type="checkbox" checked={updateMetadata} disabled={saving}
          onChange={(event) => setUpdateMetadata(event.target.checked)}/> 제목·지문·분야를 이 발행본으로 갱신</label>
        <p className={styles.helpText}>{preview.metadata_changes?.length
          ? `현재 설정과 다른 항목: ${preview.metadata_changes.map((field) => ({ title: "제목", description: "지문", category: "분야" })[field]).join(" · ")}`
          : "제목·지문·분야가 현재 설정과 같습니다"}</p>
      </div>}
      {preview.runtime_type ? <p className={styles.helpText}>가져온 뒤 배포 설정에서 환경변수와 첨부파일을 확인하고 테스트할 수 있습니다 실제 적용은 배포 버전을 선택해 진행해주세요</p>
        : registered && <p className={styles.fileNotice}>파일 풀이 문제는 가장 높은 발행번호의 첨부파일을 제공합니다 새 발행본을 가져오면 참가자 다운로드가 바뀔 수 있습니다</p>}
      {preview.existing_release_id && <p className={styles.helpText}>이 배포 버전은 이미 등록되어 있습니다 같은 버전은 다시 만들지 않습니다</p>}
      {!registered && <div className={styles.publicationDefaults}>
        <label>난이도<select className={styles.select} value={difficulty} disabled={saving} onChange={(event) => setDifficulty(event.target.value)}>
          <option value="UNASSIGNED">미정</option>
          <option value="EASY">EASY</option><option value="MEDIUM">MEDIUM</option><option value="HARD">HARD</option>
        </select></label>
        <p className={styles.helpText}>초기 {preview.defaults.initial_score}점 · 최소 {preview.defaults.minimum_score}점 · 다이나믹 스코어링<br/>난이도가 미정인 문제는 공개할 수 없습니다</p>
      </div>}
      <details className={styles.details}><summary>지문과 발행 정보 보기</summary>
        <p className={styles.publicationStatement}>{preview.description || "지문 없음"}</p>
        {preview.containers.map((container) => <p key={container.name} className={styles.helpText}>{container.name} · 환경변수 {container.env_count}개 · 비밀값 연결 {container.secret_count}개</p>)}
        <p className={styles.helpText}>소스 {preview.source_sha.slice(0, 12)} · <a className={styles.fileLink} href={preview.run_url} target="_blank" rel="noreferrer">GitHub 발행 기록</a></p>
      </details>
      {preview.blocked_reason && <p role="alert" className={styles.importError}>{preview.blocked_reason}</p>}
      <div className={`${styles.formFooter} ${styles.publicationFooter}`}>
        <button type="button" className={styles.button} disabled={saving} onClick={back}>목록으로</button>
        <button type="submit" className={styles.primary} disabled={saving || !preview.can_import}>{saving ? "가져오는 중…" : "이 발행본 가져오기"}</button>
      </div>
    </form>}

    {result && <section>
      <h3 ref={heading} tabIndex={-1} className={styles.sectionTitle}>{result.title} 발행본을 가져왔습니다</h3>
      <p className={styles.panelIntro}>{result.challenge_created ? "문제는 비공개로 등록했습니다" : "기존 문제에 발행본을 등록했습니다"}
        {result.release_id ? " 배포 설정에서 가져온 버전을 확인해주세요" : " 기본 정보와 첨부파일을 확인해주세요"}</p>
      {result.metadata_updated?.length > 0 && <p className={styles.fileNotice}>제목·지문·분야를 선택한 발행본과 맞췄습니다</p>}
      <dl className={styles.publicationFacts}>
        <div><dt>발행번호</dt><dd>#{result.registry_revision}</dd></div>
        <div><dt>배포 버전</dt><dd>{result.release_status === "not_applicable" ? "파일 풀이 문제" : result.release_status === "duplicate" ? "기존 등록본 확인" : "새 버전 등록 · 미적용"}</dd></div>
        <div><dt>참가자 첨부파일</dt><dd>{publicationFileLabel(preview.files)}</dd></div>
      </dl>
      <div className={`${styles.formFooter} ${styles.publicationFooter}`}>
        <button type="button" className={styles.button} onClick={onClose}>닫기</button>
        <button type="button" className={styles.primary} onClick={() => onOpenSettings(result)}>{result.release_id ? "가져온 배포 설정 열기" : "문제 설정 열기"}</button>
      </div>
    </section>}
  </AdminDialog>;
}
