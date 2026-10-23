import { useEffect, useRef, useState } from "react";
import {
  INSTANCE_STATUS,
  INSTANCE_STATUS_LABEL,
  UNKNOWN_INSTANCE_STATUS_LABEL,
} from "../../../constants/enums.js";
import { formatRemaining, toKst } from "../../../utils/time.js";
import { getInstanceFailureNotice } from "../utils/instanceFailureNotice.js";
import styles from "./ChallengeDetailScene.module.css";
import PanelTexture from "../../../components/common/PanelTexture.jsx";

// 생성은 요청 접수 > 서버 배정 > 환경 준비 순서로 상태가 바뀐다 지금 칸에서 돌고, 지난 칸은 체크한다
const CREATE_STEPS = [
  { label: "요청 접수", status: INSTANCE_STATUS.REQUESTED },
  { label: "서버 배정", status: INSTANCE_STATUS.SCHEDULING },
  { label: "환경 준비", status: INSTANCE_STATUS.PROVISIONING },
];
const BUSY_LABEL = {
  [INSTANCE_STATUS.RESTARTING]: "다시 시작하는 중",
  [INSTANCE_STATUS.RESETTING]: "초기화하는 중",
};

// 인스턴스 응답에 생성 시각이 없어 기다리기 시작한 순간부터 센다 기다림이 끝나면 다음 기다림은 0초부터 다시 센다
function useWaitingSeconds(waitingKey) {
  const [start, setStart] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  if (waitingKey && start?.key !== waitingKey) setStart({ key: waitingKey, at: Date.now() });
  if (!waitingKey && start) setStart(null);
  useEffect(() => {
    if (!waitingKey) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [waitingKey]);
  if (!waitingKey || start?.key !== waitingKey) return 0;
  return Math.max(0, Math.floor((now - start.at) / 1000));
}

function formatElapsed(seconds) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function WaitingProgress({ step, busyLabel, seconds }) {
  return (
    <div className={styles.waiting} role="status">
      {busyLabel ? (
        <p className={styles.waitingBusy}><i aria-hidden="true" />{busyLabel}</p>
      ) : (
        <ol className={styles.createSteps} aria-label="인스턴스 준비 단계">
          {CREATE_STEPS.map((item, index) => {
            const state = index < step ? "done" : index === step ? "active" : "todo";
            return (
              <li key={item.status} data-state={state}>
                <i aria-hidden="true" />
                <span>{item.label}</span>
                <span className={styles.srOnly}>{state === "done" ? " 완료" : state === "active" ? " 진행 중" : " 대기"}</span>
              </li>
            );
          })}
        </ol>
      )}
      <p className={styles.waitingElapsed}>{formatElapsed(seconds)} 경과</p>
    </div>
  );
}

function Endpoint({ endpoint, compact }) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const resetTimer = useRef(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      window.clearTimeout(resetTimer.current);
    };
  }, []);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(endpoint.url);
      if (!mounted.current) return;
      setCopied(true);
      setCopyError(false);
      window.clearTimeout(resetTimer.current);
      resetTimer.current = window.setTimeout(() => setCopied(false), 2000);
    } catch {
      if (mounted.current) setCopyError(true);
    }
  };
  return (
    <div
      className={`${styles.endpoint} ${styles.endpointRow} ${
        compact ? styles.endpointCompact : ""
      }`}
    >
      <div className={styles.endpointBox}>
        <span className={styles.endpointName}>
          {endpoint.name}
          <small>{endpoint.isWeb ? "WEB" : "TCP"}</small>
        </span>
        {endpoint.isWeb ? (
          <a
            href={endpoint.url}
            target="_blank"
            rel="noopener noreferrer"
            title={endpoint.url}
            aria-label={endpoint.name + " 접속 주소 새 탭에서 열기"}
          >
            {endpoint.url}
            <span aria-hidden="true"> ↗</span>
          </a>
        ) : (
          <span className={styles.connectionText} title={endpoint.url}>
            {endpoint.url}
          </span>
        )}
      </div>
      <button
        type="button"
        className={styles.copyButton}
        onClick={copy}
        aria-label={endpoint.name + " 접속 주소 복사"}
      >
        {copied ? "복사됨" : "복사"}
      </button>
      <span className={styles.srOnly} role="status">
        {copied ? endpoint.name + " 주소를 복사했습니다" : ""}
      </span>
      {copyError && (
        <p className={styles.copyError} role="status">
          복사하지 못했습니다 주소를 선택해 복사해주세요
        </p>
      )}
    </div>
  );
}

export default function InstancePanel({ instance, otherInstance, error, pendingAction }) {
  const status = instance?.status ?? null;
  // 생성 단추를 누른 직후부터 RUNNING 이 될 때까지, 재시작·초기화가 끝날 때까지 기다리는 화면을 보인다
  const statusStep = error ? -1 : CREATE_STEPS.findIndex((item) => item.status === status);
  const createStep = statusStep >= 0 ? statusStep : !error && pendingAction === "create" ? 0 : null;
  const busyLabel = error || createStep != null ? null : BUSY_LABEL[status] ?? null;
  const waitingKey = createStep != null ? "create" : busyLabel ? `busy:${status}` : null;
  const waitingSeconds = useWaitingSeconds(waitingKey);
  const running = !error && status === INSTANCE_STATUS.RUNNING;
  const failure = error ? null : getInstanceFailureNotice(instance);
  const ended = status === INSTANCE_STATUS.STOPPED || status === INSTANCE_STATUS.CLEANED;
  const requesting = statusStep < 0 && createStep === 0;
  const statusLabel = error
    ? "조회 실패"
    : requesting
      ? INSTANCE_STATUS_LABEL[INSTANCE_STATUS.REQUESTED]
    : failure
      ? "실행 실패"
    : status === "RUNNING"
      ? "실행 중"
      : status
        ? (INSTANCE_STATUS_LABEL[status] ?? UNKNOWN_INSTANCE_STATUS_LABEL)
        : "생성 전";
  const endpoints = instance?.endpoints ?? [];
  const compact = running && endpoints.length > 1;
  const hasTime =
    instance?.expiresAt && Number.isFinite(Date.parse(instance.expiresAt));
  const hasHardTime =
    instance?.hardExpiresAt &&
    Number.isFinite(Date.parse(instance.hardExpiresAt));

  const instanceId = instance?.instanceId ?? null;
  const remaining = running ? instance.remainingSeconds : null;
  const [peak, setPeak] = useState({ id: null, value: 0 });
  if (
    remaining != null &&
    (peak.id !== instanceId || remaining > peak.value)
  ) {
    setPeak({ id: instanceId, value: remaining });
  }
  const ratio =
    remaining != null && peak.id === instanceId && peak.value > 0
      ? Math.min(1, remaining / peak.value)
      : 0;

  const emptyTitle = error
    ? "접속 정보를 확인할 수 없습니다"
    : failure
      ? failure.title
    : ended
      ? "인스턴스가 종료됐습니다"
    : status
      ? statusLabel
      : "문제 환경을 생성해주세요";
  const hint = error
    ? "다시 조회한 뒤 인스턴스를 조작할 수 있습니다"
    : waitingKey
      ? "준비가 끝나면 접속 주소와 남은 시간이 바로 표시됩니다"
    : failure
      ? failure.message
    : ended
      ? "다시 사용하려면 새 인스턴스를 생성해 주세요"
    : running
      ? "웹 주소는 새 탭에서 열립니다"
      : !instance && otherInstance
        ? null
        : status
          ? "상태가 바뀌면 자동으로 갱신됩니다"
          : "생성이 완료되면 접속 주소와 남은 시간이 표시됩니다";

  return (
    <section
      id="challenge-instance"
      className={styles.instancePanel}
      aria-labelledby="instance-heading"
      tabIndex={-1}
    >
      <PanelTexture />
      <h2 id="instance-heading" className={styles.bakedLabel}>
        인스턴스
      </h2>
      <div className={styles.statusSlot}>
        {running ? (
          <span className={styles.statusRunning} role="status">
            <span className={styles.srOnly}>{statusLabel}</span>
          </span>
        ) : (
          <span className={styles.statusBadge} role="status" data-waiting={waitingKey ? "true" : undefined}>
            <i aria-hidden="true" />
            {statusLabel}
          </span>
        )}
      </div>
      <div
        className={`${styles.connect} ${compact ? styles.connectMulti : ""}`}
        aria-label="인스턴스 접속 정보"
      >
        {running ? (
          endpoints.length ? (
            endpoints.map((endpoint, index) => (
              <Endpoint
                key={endpoint.url + "-" + index}
                endpoint={endpoint}
                compact={compact}
              />
            ))
          ) : (
            <div className={styles.endpointRow}>
              <div className={styles.endpointBox}>
                <span className={styles.connectionText}>
                  {instance.connectUrl || "접속 주소 준비 중"}
                </span>
              </div>
            </div>
          )
        ) : waitingKey ? (
          <WaitingProgress step={createStep ?? 0} busyLabel={busyLabel} seconds={waitingSeconds} />
        ) : (
          <div className={styles.endpointRow}>
            <div className={`${styles.endpointBox} ${styles.endpointBoxEmpty}`}>
              <span className={styles.connectEmpty} role={failure ? "status" : undefined}>{emptyTitle}</span>
            </div>
          </div>
        )}
      </div>
      {!compact &&
        (hint ? (
          <p className={styles.instanceHint}>{hint}</p>
        ) : (
          <p className={styles.instanceHint}>
            <strong>{otherInstance.challengeTitle}</strong>에서 사용 중인
            인스턴스가 있습니다 전환하면 기존 인스턴스가 종료됩니다
          </p>
        ))}
      <p
        className={`${styles.ttlValue} ${
          running && instance.remainingSeconds === 0 ? styles.expired : ""
        }`}
        aria-label="남은 시간"
      >
        {running ? formatRemaining(instance.remainingSeconds) : "--:--"}
      </p>
      <div
        className={styles.ttlTrack}
        data-waiting={waitingKey ? "true" : undefined}
        role="progressbar"
        aria-label="남은 시간 비율"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(ratio * 100)}
      >
        <div className={styles.ttlFill} style={{ width: `${ratio * 100}%` }} />
      </div>
      <p className={styles.extendsValue} aria-label="연장 횟수">
        {running && instance.extendsUsed != null ? instance.extendsUsed : "-"}{" "}
        / 3
      </p>
      {running && (hasTime || hasHardTime) && (
        <div className={styles.expiryTimes}>
          {hasTime && (
            <p>
              <span>종료 예정</span>
              <time dateTime={instance.expiresAt}>
                {toKst(instance.expiresAt)} KST
              </time>
            </p>
          )}
          {hasHardTime && (
            <p>
              <span>최대 사용</span>
              <time dateTime={instance.hardExpiresAt}>
                {toKst(instance.hardExpiresAt)} KST
              </time>
            </p>
          )}
        </div>
      )}
    </section>
  );
}
