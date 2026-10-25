import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import usePageResources from "../../../routes/usePageResources.js";
import ChallengeDetailScreen from "../components/ChallengeDetailScreen.jsx";
import { mapChallengeDetail } from "../utils/challengeDetailMapper.js";
import { mapRemoteRun, mapRemoteRuns } from "../utils/remoteRun.js";
import styles from "./RemoteRunPreviewPage.module.css";

// 개발 전용 fixture. 실제 API 요청 없이 원격 실행 칸의 상태를 차례로 본다
const NO_ACTIONS = { canCreate: false, canExtend: false, canRestart: false, canStop: false };
const CHALLENGE = {
  challenge_id: "preview-remote-run",
  title: "msgdriver",
  category: "PWN",
  club_name: "SWING",
  difficulty: "HARD",
  score: 1000,
  solved_team_count: 0,
  is_solved: false,
  status: "OPEN",
  description: "Windows 11 25H2 x64 에서 동작하는 드라이버가 주어집니다\n\n로컬 VM에서 충분히 확인한 뒤 원격 실행으로 최종 확인해 주세요",
  files: [{ file_id: "preview-file", file_name: "msgdriver.zip", file_size: 48213 }],
  requires_instance: false,
  remote_run: {
    environment: "Windows 11 25H2 x64",
    accept: [".exe"],
    executable: "pe-amd64",
    max_file_bytes: 10485760,
    timeout_seconds: 180,
    max_attempts: 5,
    used_attempts: 0,
  },
};

const minutesAgo = (minutes) => new Date(Date.now() - minutes * 60000).toISOString();
const OUTPUT = "[*] payload started\n[*] stage 1 ok\n[*] stage 2 ok\n[+] reading C:\\flag.txt\nMSG{preview_remote_run_output}\n";
const run = (id, status, extra = {}) => ({
  run_id: id, status, counted: !["FAILED", "REJECTED"].includes(status), file_name: "payload.exe", file_size: 182784,
  created_at: minutesAgo(extra.ago ?? 1), started_at: status === "QUEUED" ? null : minutesAgo((extra.ago ?? 1) - 0.1),
  finished_at: ["QUEUED", "RUNNING"].includes(status) ? null : minutesAgo((extra.ago ?? 1) - 0.3),
  duration_ms: ["QUEUED", "RUNNING"].includes(status) ? null : 12400, exit_code: status === "COMPLETED" ? 0 : null,
  stdout: "", stderr: "", message: "", ...extra,
});

const STATES = {
  empty: { label: "제출 전", runs: [], used: 0 },
  queued: { label: "대기", runs: [run("r1", "QUEUED", { queue_position: 2, ago: 0.2 })], used: 0 },
  running: { label: "실행 중", runs: [run("r1", "RUNNING", { ago: 0.7 })], used: 1 },
  done: { label: "완료", runs: [run("r1", "COMPLETED", { stdout: OUTPUT })], used: 1 },
  timeout: { label: "시간 초과", runs: [run("r1", "TIMED_OUT", { duration_ms: 180000, stdout: "[*] payload started\n[*] waiting ...\n" })], used: 1 },
  crashed: { label: "VM 중단", runs: [run("r1", "CRASHED", { duration_ms: 6100, stdout: "[*] payload started\n" })], used: 1 },
  failed: { label: "실행 실패", runs: [run("r1", "FAILED", { duration_ms: null })], used: 0 },
  history: {
    label: "기록 여럿",
    runs: [
      run("r3", "COMPLETED", { stdout: OUTPUT, ago: 2 }),
      run("r2", "TIMED_OUT", { duration_ms: 180000, stdout: "[*] payload started\n[*] waiting ...\n", ago: 12 }),
      run("r1", "COMPLETED", { exit_code: 1, duration_ms: 2300, stdout: "[*] payload started\n[-] stage 2 failed\n", stderr: "error 0x5\n", ago: 30 }),
    ],
    used: 3,
  },
  exhausted: { label: "더 못 냄", runs: [run("r5", "COMPLETED", { exit_code: 1, stdout: "[-] stage 2 failed\n" })], used: 5 },
  solved: { label: "해결함", runs: [run("r1", "COMPLETED", { stdout: OUTPUT })], used: 1, solved: true },
};

// 미리보기에서 RUN 을 누르면 올리기, 대기, 실행, 완료를 짧게 흉내낸다
function useSimulatedRuns(initial) {
  const [runs, setRuns] = useState(() => mapRemoteRuns({ runs: initial.runs }).runs);
  const [used, setUsed] = useState(initial.used);
  const [upload, setUpload] = useState(null);
  const timers = useRef([]);
  useEffect(() => () => timers.current.forEach((timer) => window.clearTimeout(timer)), []);
  const later = (ms, task) => timers.current.push(window.setTimeout(task, ms));
  const submit = useCallback((file) => new Promise((resolve) => {
    const id = `sim-${Date.now()}`;
    const steps = 10;
    for (let index = 0; index <= steps; index += 1)
      later(index * 120, () => setUpload({ name: file.name, progress: index / steps }));
    later(steps * 120 + 200, () => {
      setUpload(null);
      const created = new Date().toISOString();
      const base = { run_id: id, file_name: file.name, file_size: file.size, created_at: created };
      setRuns((current) => [mapRemoteRun({ ...base, status: "QUEUED", queue_position: 1 }), ...current]);
      resolve(true);
      later(3000, () => {
        setUsed((value) => value + 1);
        setRuns((current) => current.map((item) => item.id === id ? mapRemoteRun({ ...base, status: "RUNNING", counted: true, started_at: new Date().toISOString() }) : item));
      });
      later(9000, () => setRuns((current) => current.map((item) => item.id === id
        ? mapRemoteRun({ ...base, status: "COMPLETED", counted: true, exit_code: 0, duration_ms: 6000, stdout: OUTPUT })
        : item)));
    });
  }), []);
  return { runs, used, upload, submit };
}

function Preview({ stateKey }) {
  const state = STATES[stateKey];
  const simulated = useSimulatedRuns(state);
  const challenge = mapChallengeDetail({ ...CHALLENGE, is_solved: state.solved === true });
  return (
    <ChallengeDetailScreen
      challenge={challenge}
      submission={{ remainingSeconds: null, blocked: state.solved === true }}
      instance={null}
      controls={NO_ACTIONS}
      flagValue=""
      onFlagChange={() => {}}
      onSubmitFlag={() => {}}
      retrySeconds={0}
      submitDisabled
      downloadFile={() => {}}
      onBack={() => window.history.back()}
      onRetry={() => {}}
      remoteRun={{
        runs: simulated.runs,
        usedAttempts: simulated.used,
        maxAttempts: 5,
        upload: simulated.upload,
        onSubmit: simulated.submit,
      }}
    />
  );
}

export default function RemoteRunPreviewPage() {
  usePageResources();
  const [params] = useSearchParams();
  const stateKey = Object.hasOwn(STATES, params.get("state")) ? params.get("state") : "empty";
  return (
    <>
      <Preview key={stateKey} stateKey={stateKey} />
      {!params.has("bare") && (
        <nav className={styles.states} aria-label="원격 실행 미리보기 상태">
          {Object.entries(STATES).map(([key, item]) => (
            <Link key={key} to={`?state=${key}`} aria-current={key === stateKey ? "page" : undefined}>{item.label}</Link>
          ))}
        </nav>
      )}
    </>
  );
}
