import { useEffect, useRef, useState } from "react";
import { formatFileSize } from "../utils/challengeDetailMapper.js";
import {
  REMOTE_RUN_LABEL,
  REMOTE_RUN_STATUS,
  checkPayloadFile,
  checkPayloadMachine,
  isActiveRun,
} from "../utils/remoteRun.js";
import { toKst } from "../../../utils/time.js";
import RemoteRunDialog from "./RemoteRunDialog.jsx";
import RemoteRunResultModal from "./RemoteRunResultModal.jsx";
import PanelTexture from "../../../components/common/PanelTexture.jsx";
import styles from "./ChallengeDetailScene.module.css";

// 제한 값은 10 MB 처럼 떨어지는 수로 적는다
function formatLimit(bytes) {
  const megabytes = bytes / 1024 / 1024;
  return Number.isInteger(megabytes) ? `${megabytes} MB` : formatFileSize(bytes);
}

function formatClock(seconds) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

// 대기와 실행 시간은 기록의 시작 시각부터 센다 시각이 없으면 화면에서 본 순간부터 센다
function useElapsed(run) {
  const key = isActiveRun(run) ? `${run.id}:${run.status}` : null;
  const since = run?.status === REMOTE_RUN_STATUS.RUNNING ? run.startedAt : run?.createdAt;
  const [seen, setSeen] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  if (key && seen?.key !== key) setSeen({ key, at: Date.now() });
  useEffect(() => {
    if (!key) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [key]);
  if (!key) return 0;
  const start = Date.parse(since) || (seen?.key === key ? seen.at : now);
  return Math.max(0, Math.floor((now - start) / 1000));
}

function Label({ en, ko, className }) {
  return (
    <p className={`${styles.runLabel} ${className}`}>
      <span className={styles.runEn} aria-hidden="true">{en}</span>
      <span className={styles.runKo}>{ko}</span>
    </p>
  );
}

// 인스턴스 판과 같은 짜임이다 접속 주소 자리에 실행 파일, 남은 시간 자리에 실행 시간, 연장 자리에 최근 실행을 둔다
// 판 아래에는 인스턴스 단추처럼 RUN 과 RESULT 를 두고, 실행이 끝나면 결과 창을 띄운다
export default function RemoteRunPanel({
  config,
  runs = [],
  usedAttempts,
  maxAttempts,
  upload = null,
  submitError = null,
  onSubmit,
  solved = false,
  disabled = false,
  preview = false,
}) {
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [resultId, setResultId] = useState(null);
  const input = useRef(null);
  const checkToken = useRef(0);
  const watched = useRef(new Set());

  // 이 화면에서 기다린 실행이 끝나면 결과 창을 한 번 띄운다 예전 기록은 띄우지 않는다
  useEffect(() => {
    for (const run of runs) {
      if (isActiveRun(run)) watched.current.add(run.id);
      else if (watched.current.has(run.id)) {
        watched.current.delete(run.id);
        setResultId(run.id);
      }
    }
  }, [runs]);

  // 횟수는 보이지 않고 잠글지만 정한다
  const limit = maxAttempts ?? config.maxAttempts;
  const used = usedAttempts ?? config.usedAttempts;
  const exhausted = used >= limit;
  const activeRun = runs.find(isActiveRun) ?? null;
  const finishedIndex = runs.findIndex((run) => !isActiveRun(run));
  const finished = finishedIndex >= 0 ? runs[finishedIndex] : null;
  const finishedNumber = finished ? runs.length - finishedIndex : null;
  const locked = disabled || solved || exhausted;
  const canRun = Boolean(file) && !fileError && !upload && !activeRun && !locked && Boolean(onSubmit);
  const elapsed = useElapsed(activeRun);

  const statusLabel = upload
    ? "올리는 중"
    : activeRun
      ? REMOTE_RUN_LABEL[activeRun.status]
      : solved
        ? "해결함"
        : runs[0]
          ? (REMOTE_RUN_LABEL[runs[0].status] ?? "확인 중")
          : "제출 전";
  const pillStatus = upload || activeRun ? "waiting" : solved ? "COMPLETED" : runs[0]?.status;
  const waiting = Boolean(upload) || activeRun?.status === REMOTE_RUN_STATUS.QUEUED;
  const lockedReason = preview
    ? "미리보기에서는 실행할 수 없습니다"
    : solved
      ? "이미 해결한 문제입니다"
      : exhausted
        ? "더 실행할 수 없습니다"
        : "지금은 낼 수 없습니다";

  const environment = config.environment;
  const amd64 = config.executable === "pe-amd64" && !/x64|amd64/i.test(environment);
  const rules = [
    `${config.accept.join(", ")}${amd64 ? " (x64)" : ""}`,
    `${formatLimit(config.maxBytes)} 이하`,
    `${environment ? `${environment}에서 ` : ""}${config.timeoutSeconds}초 안에 실행`,
  ].join(" · ");
  const errorNote = submitError?.message || fileError || "";
  const hint = errorNote
    || (upload ? "파일을 올리고 있습니다"
      : activeRun?.status === REMOTE_RUN_STATUS.QUEUED
        ? activeRun.queuePosition ? `대기열 ${activeRun.queuePosition}번째입니다 차례가 되면 바로 실행합니다` : "실행 차례를 기다리고 있습니다"
        : activeRun ? "검증 VM에서 실행하고 있습니다 끝나면 결과 창이 뜹니다"
          : rules);

  // 실행 시간 칸: 도는 동안은 지난 시간, 끝나면 걸린 시간 막대는 제한 시간 대비 비율이다
  const finishedSeconds = finished?.durationMs != null ? Math.round(finished.durationMs / 1000) : null;
  const runTime = activeRun?.status === REMOTE_RUN_STATUS.RUNNING
    ? formatClock(elapsed)
    : !activeRun && finishedSeconds != null ? formatClock(finishedSeconds) : "--:--";
  const ratio = activeRun?.status === REMOTE_RUN_STATUS.RUNNING
    ? Math.min(1, elapsed / config.timeoutSeconds)
    : !activeRun && finishedSeconds != null ? Math.min(1, finishedSeconds / config.timeoutSeconds) : 0;
  const trackTone = !activeRun && [REMOTE_RUN_STATUS.TIMED_OUT, REMOTE_RUN_STATUS.CRASHED].includes(finished?.status) ? "bad" : undefined;
  const lastRun = finished
    ? [
        `${finishedNumber}회차`,
        REMOTE_RUN_LABEL[finished.status] ?? "확인 중",
        finished.exitCode != null ? `종료 코드 ${finished.exitCode}` : null,
      ].filter(Boolean).join(" · ")
    : "-";
  const resultRun = runs.find((run) => run.id === resultId && !isActiveRun(run)) ?? null;

  const choose = async (next) => {
    if (!next || upload || locked) return;
    const token = ++checkToken.current;
    setFile(next);
    const quick = checkPayloadFile(next, config);
    setFileError(quick ?? "");
    if (quick) return;
    const machine = await checkPayloadMachine(next, config);
    if (token === checkToken.current) setFileError(machine ?? "");
  };

  const run = async () => {
    const chosen = file;
    setConfirm(null);
    if (!chosen || !onSubmit) return;
    const accepted = await onSubmit(chosen);
    // 낸 파일은 비워 두어 같은 파일을 실수로 다시 내지 않게 한다
    if (accepted) {
      setFile(null);
      if (input.current) input.current.value = "";
    }
  };

  const shownFile = upload ? { name: upload.name, note: `올리는 중 ${Math.round(upload.progress * 100)}%` }
    : file ? { name: file.name, note: formatFileSize(file.size) } : null;

  return (
    <>
      <section
        id="challenge-remote-run"
        className={styles.runPanel}
        aria-labelledby="remote-run-heading"
        tabIndex={-1}
      >
        <PanelTexture />
        {/* 데스크톱은 다른 판의 영문 제목과 맞추고, 휴대폰은 다른 칸처럼 한글 제목을 보인다 */}
        <h2 id="remote-run-heading" className={styles.runTitle}>
          <span className={styles.runEn} aria-hidden="true">Remote run</span>
          <span className={styles.runKo}>원격 실행</span>
        </h2>
        <div className={styles.statusSlot}>
          <span
            className={styles.statusBadge}
            role="status"
            data-waiting={upload || activeRun ? "true" : undefined}
            data-run={pillStatus}
          >
            <i aria-hidden="true" />
            {statusLabel}
          </span>
        </div>

        <Label en="Payload" ko="실행 파일" className={styles.runPayloadLabel} />
        <div className={styles.connect}>
          <div className={styles.endpointRow}>
            <label
              className={`${styles.endpointBox} ${styles.runField}`}
              data-dragging={dragging || undefined}
              data-disabled={locked || upload ? "true" : undefined}
              data-invalid={errorNote ? "true" : undefined}
              onDragOver={(event) => {
                if (locked || upload) return;
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                choose(event.dataTransfer.files?.[0]);
              }}
            >
              <input
                ref={input}
                type="file"
                accept={config.accept.join(",")}
                className={styles.srOnly}
                disabled={locked || Boolean(upload)}
                onChange={(event) => choose(event.target.files?.[0])}
                aria-describedby="remote-run-hint"
              />
              {shownFile ? (
                <>
                  <span className={styles.endpointName}>
                    {shownFile.note}
                    <small>{config.accept[0].replace(".", "").toUpperCase()}</small>
                  </span>
                  <span className={styles.connectionText}>{shownFile.name}</span>
                </>
              ) : (
                <span className={styles.connectEmpty}>
                  {locked ? lockedReason : (
                    <>
                      <span className={styles.runDropMouse}>실행 파일을 끌어다 놓거나 골라 주세요</span>
                      <span className={styles.runDropTouch}>실행 파일을 골라 주세요</span>
                    </>
                  )}
                </span>
              )}
              {upload && <span className={styles.runUpload} style={{ width: `${upload.progress * 100}%` }} aria-hidden="true" />}
            </label>
            <button
              type="button"
              className={styles.copyButton}
              onClick={() => input.current?.click()}
              disabled={locked || Boolean(upload)}
              aria-label="실행 파일 고르기"
            >
              선택
            </button>
          </div>
        </div>
        <p
          id="remote-run-hint"
          className={styles.instanceHint}
          data-error={errorNote ? "true" : undefined}
          role={errorNote ? "alert" : undefined}
        >
          {hint}
        </p>

        <div className={styles.runRow}>
          <Label en="Run time" ko="실행 시간" className={styles.runTimeLabel} />
          <p className={styles.ttlValue} aria-label="실행 시간">{runTime}</p>
        </div>
        <div
          className={styles.ttlTrack}
          data-waiting={waiting ? "true" : undefined}
          data-tone={trackTone}
          role="progressbar"
          aria-label="제한 시간 대비 실행 시간"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(ratio * 100)}
        >
          <div className={styles.ttlFill} style={{ width: `${ratio * 100}%` }} />
        </div>

        <div className={styles.runRow}>
          <Label en="Last run" ko="최근 실행" className={styles.runLastLabel} />
          <p className={styles.runLastValue}>{lastRun}</p>
          {finished?.finishedAt && (
            <p className={styles.runLastTime}>
              <time dateTime={finished.finishedAt}>{toKst(finished.finishedAt)} KST</time>
            </p>
          )}
        </div>
      </section>

      <div className={styles.runControls} role="group" aria-label="원격 실행 작업" aria-busy={Boolean(upload)}>
        <button
          type="button"
          className={`${styles.runPlaque} ${styles.runPlaqueRun}`}
          disabled={!canRun}
          onClick={(event) => setConfirm({ trigger: event.currentTarget })}
          aria-label="원격 실행"
        >
          {upload ? "…" : "RUN"}
        </button>
        <button
          type="button"
          className={`${styles.runPlaque} ${styles.runPlaqueResult}`}
          disabled={!finished}
          onClick={() => setResultId(finished.id)}
          aria-label="최근 실행 결과 보기"
        >
          RESULT
        </button>
      </div>

      {confirm && (
        <RemoteRunDialog
          fileName={file?.name ?? "실행 파일"}
          returnFocusTo={confirm.trigger}
          disabled={!canRun}
          onConfirm={run}
          onCancel={() => setConfirm(null)}
        />
      )}
      {resultRun && (
        <RemoteRunResultModal
          run={resultRun}
          number={runs.length - runs.indexOf(resultRun)}
          onClose={() => setResultId(null)}
        />
      )}
    </>
  );
}
