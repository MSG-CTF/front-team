import { useEffect, useRef, useState } from "react";
import {
  INSTANCE_STATUS,
  INSTANCE_STATUS_LABEL,
  UNKNOWN_INSTANCE_STATUS_LABEL,
} from "../../../constants/enums.js";
import { formatRemaining, toKst } from "../../../utils/time.js";
import styles from "./ChallengeDetailScreen.module.css";

function Endpoint({ endpoint }) {
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
    <div className={styles.endpoint}>
      <div className={styles.endpointHeader}>
        <span className={styles.endpointName}>
          {endpoint.name}
          <small>{endpoint.isWeb ? "WEB" : "TCP"}</small>
        </span>
        <button
          type="button"
          className={styles.copyButton}
          onClick={copy}
          aria-label={endpoint.name + " 접속 주소 복사"}
        >
          {copied ? "복사됨" : "복사"}
        </button>
      </div>
      {endpoint.isWeb ? (
        <a
          href={endpoint.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={endpoint.name + " 접속 주소 새 탭에서 열기"}
        >
          {endpoint.url}
          <span aria-hidden="true"> ↗</span>
        </a>
      ) : (
        <span className={styles.connectionText}>{endpoint.url}</span>
      )}
      <span className={styles.screenReaderOnly} role="status">
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

export default function InstancePanel({
  instance,
  otherInstance,
  error,
  children,
}) {
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
  const hasTime =
    instance?.expiresAt && Number.isFinite(Date.parse(instance.expiresAt));
  const hasHardTime =
    instance?.hardExpiresAt &&
    Number.isFinite(Date.parse(instance.hardExpiresAt));
  return (
    <section
      id="challenge-instance"
      className={styles.instancePanel}
      aria-labelledby="instance-heading"
      tabIndex={-1}
    >
      <div className={styles.instanceHeader}>
        <h2 id="instance-heading" className={styles.sectionHeading}>
          인스턴스
        </h2>
        <span className={running ? styles.runningBadge : styles.instanceBadge}>
          <i aria-hidden="true" />
          {statusLabel}
        </span>
      </div>
      {running ? (
        <>
          <p className={styles.consoleLabel}>
            접속 주소 <span>웹 주소는 새 탭에서 열립니다</span>
          </p>
          <div className={styles.endpoints} aria-label="인스턴스 접속 정보">
            {endpoints.length ? (
              endpoints.map((endpoint, index) => (
                <Endpoint
                  key={endpoint.url + "-" + index}
                  endpoint={endpoint}
                />
              ))
            ) : (
              <p className={styles.connectionText}>
                {instance.connectUrl || "접속 주소 준비 중"}
              </p>
            )}
          </div>
        </>
      ) : (
        <div className={styles.instanceEmpty}>
          <svg
            viewBox="0 0 32 32"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            aria-hidden="true"
          >
            <rect x="5" y="5" width="22" height="9" rx="2" />
            <rect x="5" y="18" width="22" height="9" rx="2" />
            <path d="M10 9.5h1m4 0h7M10 22.5h1m4 0h7" />
          </svg>
          <p>
            {error
              ? "접속 정보를 확인할 수 없습니다"
              : status
                ? statusLabel
                : "문제 환경을 생성해주세요"}
          </p>
          <span>
            {error
              ? "다시 조회한 뒤 인스턴스를 조작할 수 있습니다"
              : status
                ? "상태가 바뀌면 자동으로 갱신됩니다"
                : "생성이 완료되면 접속 주소와 남은 시간이 표시됩니다"}
          </span>
        </div>
      )}
      {running && (
        <>
          <dl className={styles.instanceMetrics}>
            <div>
              <dt>남은 시간</dt>
              <dd
                className={
                  instance.remainingSeconds === 0
                    ? styles.expiredTime
                    : undefined
                }
              >
                {formatRemaining(instance.remainingSeconds)}
              </dd>
            </div>
            {instance.extendsUsed != null && (
              <div>
                <dt>연장 횟수</dt>
                <dd>
                  {instance.extendsUsed}
                  <small> / 3</small>
                </dd>
              </div>
            )}
          </dl>
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
        </>
      )}
      {!instance && otherInstance && !error && (
        <p className={styles.otherInstance}>
          <strong>{otherInstance.challengeTitle}</strong>에서 사용 중인
          인스턴스가 있습니다
          <br />
          전환하면 기존 인스턴스가 종료됩니다
        </p>
      )}
      {children}
    </section>
  );
}
