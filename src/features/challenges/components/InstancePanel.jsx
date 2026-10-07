import { useEffect, useRef, useState } from "react";
import {
  INSTANCE_STATUS,
  INSTANCE_STATUS_LABEL,
  UNKNOWN_INSTANCE_STATUS_LABEL,
} from "../../../constants/enums.js";
import { formatRemaining, toKst } from "../../../utils/time.js";
import styles from "./ChallengeDetailScene.module.css";

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
          복사하지 못했습니다. 주소를 선택해 복사해주세요
        </p>
      )}
    </div>
  );
}

export default function InstancePanel({ instance, otherInstance, error }) {
  const status = instance?.status ?? null;
  const running = !error && status === INSTANCE_STATUS.RUNNING;
  const statusLabel = error
    ? "조회 실패"
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
    : status
      ? statusLabel
      : "문제 환경을 생성해주세요";
  const hint = error
    ? "다시 조회한 뒤 인스턴스를 조작할 수 있습니다"
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
      <h2 id="instance-heading" className={styles.bakedLabel}>
        인스턴스
      </h2>
      <div className={styles.statusSlot}>
        {running ? (
          <span className={styles.statusRunning} role="status">
            <span className={styles.srOnly}>{statusLabel}</span>
          </span>
        ) : (
          <span className={styles.statusBadge} role="status">
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
        ) : (
          <div className={styles.endpointRow}>
            <div className={`${styles.endpointBox} ${styles.endpointBoxEmpty}`}>
              <span className={styles.connectEmpty}>{emptyTitle}</span>
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
            인스턴스가 있습니다. 전환하면 기존 인스턴스가 종료됩니다
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
        role="progressbar"
        aria-label="남은 시간 비율"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(ratio * 100)}
      >
        <div className={styles.ttlFill} style={{ width: `${ratio * 100}%` }} />
      </div>
      <p className={styles.extendsValue} aria-label="연장 횟수">
        {running && instance.extendsUsed != null ? instance.extendsUsed : "—"}{" "}
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
