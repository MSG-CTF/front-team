import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getExeSubmissions, getExeSubmission, submitExecutable } from "../../../api/challenges.js";
import { useAuthenticatedUser } from "../../../routes/AuthenticatedRoute.jsx";
import { startVisiblePolling } from "../../../utils/visiblePolling.js";
import { executableIntent } from "../utils/pendingExecutable.js";
import { mapRemoteRuns, remoteRetryDeadline, remoteRunErrorMessage } from "../utils/remoteRun.js";

function unwrap(response) {
  if (response.data?.code !== "SUCCESS") throw new Error(response.data?.message || "실행 정보를 확인하지 못했습니다");
  return response.data.data;
}

export default function useRemoteRun(challengeId, config) {
  const user = useAuthenticatedUser();
  const intent = useMemo(() => executableIntent({ userId: user?.user_id, teamId: user?.team_id, challengeId }),
    [user?.user_id, user?.team_id, challengeId]);
  const [runs, setRuns] = useState([]);
  const [totalRuns, setTotalRuns] = useState(0);
  const [upload, setUpload] = useState(null);
  const [error, setError] = useState(null);
  const [refreshError, setRefreshError] = useState(null);
  const [retryAt, setRetryAt] = useState(0);
  const [now, setNow] = useState(Date.now);
  const pending = useRef(false);
  const generation = useRef(0);
  const requestSequence = useRef(0);
  const rejectedUntil = useRef(0);
  const enabled = Boolean(config);
  const load = useCallback(async () => {
    if (!enabled || !intent) return;
    const current = generation.current;
    const sequence = ++requestSequence.current;
    try {
      const data = unwrap(await getExeSubmissions(challengeId));
      const active = data.runs?.find(row => ["QUEUED", "PREPARING", "ASSIGNED", "RUNNING", "START_UNKNOWN", "CLEANUP_PENDING"].includes(row.status));
      if (active?.submission_id) {
        try { const currentRun = unwrap(await getExeSubmission(challengeId, active.submission_id)); data.runs = data.runs.map(row => row.submission_id === active.submission_id ? currentRun : row); }
        catch (failure) { if (failure.response?.status !== 404) throw failure; }
      }
      const previous = intent.read();
      if (previous) {
        const recovered = unwrap(await getExeSubmissions(challengeId, { params: { idempotency_key: previous.key } }));
        if (recovered.runs?.length) {
          intent.clear(previous.key);
          if (generation.current === current && requestSequence.current === sequence) setError(null);
        }
      }
      if (generation.current !== current || requestSequence.current !== sequence) return;
      const history = mapRemoteRuns(data);
      setRuns(history.runs);
      setTotalRuns(history.totalRuns);
      setRefreshError(null);
      const seconds = data.remote_run?.retry_after_seconds;
      setRetryAt(Math.max(rejectedUntil.current, seconds > 0 ? Date.now() + seconds * 1000 : 0));
    } catch (failure) {
      if (generation.current === current && requestSequence.current === sequence) setRefreshError({ message: remoteRunErrorMessage(failure, "실행 상태를 확인하지 못했습니다 연결이 복구되면 다시 확인합니다") });
    }
  }, [challengeId, enabled, intent]);

  useEffect(() => {
    generation.current += 1;
    setRuns([]); setTotalRuns(0); setError(null); setRefreshError(null); setRetryAt(0); rejectedUntil.current = 0;
    if (!enabled) return undefined;
    const stop = startVisiblePolling(load, { intervalMs: 5000 });
    const clock = window.setInterval(() => setNow(Date.now()), 1000);
    window.addEventListener("online", load);
    window.addEventListener("storage", load);
    return () => {
      generation.current += 1;
      stop(); window.clearInterval(clock);
      window.removeEventListener("online", load);
      window.removeEventListener("storage", load);
    };
  }, [enabled, load]);

  const onSubmit = async (file) => {
    if (!intent || pending.current || !config?.available || Math.max(rejectedUntil.current, retryAt) > Date.now()) return false;
    pending.current = true;
    const current = generation.current;
    let item;
    setError(null);
    setUpload({ name: file.name, progress: 0 });
    try {
      const digest = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", await file.arrayBuffer())),
        (byte) => byte.toString(16).padStart(2, "0")).join("");
      item = intent.prepare(digest);
      unwrap(await submitExecutable(challengeId, file, item.key, {
        onUploadProgress: (event) => { if (generation.current === current) setUpload({ name: file.name, progress: event.total ? Math.min(1, event.loaded / event.total) : 0 }); },
      }));
      intent.clear(item.key);
      await load();
      return true;
    } catch (failure) {
      const status = failure.response?.status;
      if (item && [400, 403, 409, 413, 422, 429].includes(status)) intent.clear(item.key);
      if (generation.current === current) {
        rejectedUntil.current = remoteRetryDeadline(failure.response);
        setRetryAt(rejectedUntil.current); setNow(Date.now());
        setError({ message: remoteRunErrorMessage(failure, (!failure.isAxiosError && failure.message) || "접수 응답을 받지 못했습니다 같은 파일로 재시도해주세요") });
      }
      await load();
      return false;
    } finally {
      pending.current = false;
      if (generation.current === current) setUpload(null);
    }
  };
  return { runs, totalRuns, upload, submitError: error ?? refreshError, onSubmit, retrySeconds: Math.max(0, Math.ceil((retryAt - now) / 1000)) };
}
