import { useMemo, useRef, useState } from "react";
import {
  INSTANCE_STATUS_LABEL,
  UNKNOWN_INSTANCE_STATUS_LABEL,
} from "../../../constants/enums.js";
import { groupOpenChallenges } from "../utils/openChallengesData.js";
import OpenChallengeCard from "./OpenChallengeCard.jsx";
import styles from "./OpenChallengesScreen.module.css";

const formatNumber = (value) =>
  typeof value === "number" && Number.isFinite(value)
    ? value.toLocaleString("ko-KR")
    : "-";

function InstanceLocation({
  instance,
  challenges,
  loading,
  error,
  onSelect,
  onRetry,
}) {
  if (error)
    return (
      <div className={styles.instanceNotice} role="status">
        <span>{error}</span>
        <button type="button" onClick={onRetry} disabled={loading}>
          다시 확인
        </button>
      </div>
    );
  if (!instance)
    return loading ? (
      <p className={styles.instanceLoading} role="status">
        내 인스턴스 확인 중…
      </p>
    ) : null;
  const challenge = challenges.find(
    (item) => item.challengeId === instance.challengeId,
  );
  const status =
    instance.status === "RUNNING"
      ? "실행 중"
      : INSTANCE_STATUS_LABEL[instance.status] || UNKNOWN_INSTANCE_STATUS_LABEL;
  return (
    <aside className={styles.instanceLocation} aria-label="현재 인스턴스 위치">
      <span className={styles.instanceSymbol} aria-hidden="true">
        ◇
      </span>
      <div className={styles.instanceInfo}>
        <span>
          내 인스턴스 <span className={styles.instanceStatus}>{status}</span>
        </span>
        <strong>{challenge?.title || instance.challengeTitle}</strong>
      </div>
      {challenge && (
        <button type="button" onClick={() => onSelect(challenge.challengeId)}>
          문제로 이동 <span aria-hidden="true">→</span>
        </button>
      )}
    </aside>
  );
}

export default function OpenChallengesScreen({
  status,
  error,
  refreshing,
  refreshError,
  challenges = [],
  totalCount = 0,
  solvedCount = 0,
  totalScore,
  instance,
  instanceLoading,
  instanceError,
  onRetry,
  onSelectChallenge,
  onBackToBoard,
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [solvedOpen, setSolvedOpen] = useState(false);
  const archiveSummary = useRef(null);
  const showSolved = () => {
    setSolvedOpen(true);
    requestAnimationFrame(() => {
      archiveSummary.current?.focus({ preventScroll: true });
      archiveSummary.current?.scrollIntoView({ block: "start" });
    });
  };
  const groups = useMemo(
    () =>
      groupOpenChallenges(challenges, {
        query,
        category,
        instanceChallengeId: instance?.challengeId,
      }),
    [challenges, query, category, instance?.challengeId],
  );
  const unsolvedCount = totalCount - solvedCount;
  const filtered = Boolean(query.trim() || category);
  const clearFilters = () => {
    setQuery("");
    setCategory("");
  };
  const countLabel = (visible, total) =>
    filtered ? visible + " / " + total : total;

  return (
    <div className={styles.page}>
      <div className={styles.backBar}>
        <button
          type="button"
          className={styles.backButton}
          onClick={onBackToBoard}
        >
          <span aria-hidden="true">←</span> 보드로 돌아가기
        </button>
        <span>문제 보관함</span>
      </div>
      <main className={styles.board} aria-label="열린 문제 목록">
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>CHALLENGES</p>
            <h1>열린 문제 목록</h1>
            <p className={styles.intro}>
              아직 풀지 않은 문제부터 이어서 도전하세요
            </p>
          </div>
          {status === "success" && (
            <dl className={styles.metrics}>
              <div className={styles.unsolvedMetric}>
                <dt>미해결</dt>
                <dd>
                  {formatNumber(unsolvedCount)}
                  <small> 문제</small>
                </dd>
              </div>
              <div>
                <dt>풀이 완료</dt>
                <dd>
                  {solvedCount > 0 ? (
                    <button
                      type="button"
                      className={styles.solvedShortcut}
                      onClick={showSolved}
                      aria-label={`풀이 완료 ${solvedCount}개 보기`}
                    >
                      {formatNumber(solvedCount)}
                      <small>
                        {" "}
                        문제 <span aria-hidden="true">↓</span>
                      </small>
                    </button>
                  ) : (
                    <>
                      0<small> 문제</small>
                    </>
                  )}
                </dd>
              </div>
              <div>
                <dt>해결 문제 배점</dt>
                <dd>
                  {formatNumber(totalScore)}
                  <small> pts</small>
                </dd>
                <span className={styles.metricHint}>현재 배점 합계</span>
              </div>
            </dl>
          )}
        </header>

        {status === "loading" && (
          <div className={styles.loading} role="status" aria-busy="true">
            <div className={styles.skeleton} aria-hidden="true" />
            <p>열린 문제를 불러오는 중입니다</p>
          </div>
        )}
        {status === "error" && (
          <section className={styles.emptyState} role="alert">
            <h2>목록을 불러오지 못했습니다</h2>
            <p>{error}</p>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={onRetry}
              disabled={refreshing}
            >
              {refreshing ? "확인 중…" : "다시 시도"}
            </button>
          </section>
        )}
        {status === "success" && (
          <>
            {refreshError && (
              <div className={styles.refreshNotice} role="status">
                <span>
                  목록을 갱신하지 못해 마지막으로 확인한 상태를 표시합니다
                </span>
                <button type="button" onClick={onRetry} disabled={refreshing}>
                  {refreshing ? "확인 중…" : "다시 조회"}
                </button>
              </div>
            )}
            <InstanceLocation
              instance={instance}
              challenges={challenges}
              loading={instanceLoading}
              error={instanceError}
              onSelect={onSelectChallenge}
              onRetry={onRetry}
            />

            {totalCount > 0 && (
              <div
                className={styles.filters}
                role="search"
                aria-label="열린 문제 검색"
              >
                <label className={styles.searchField}>
                  <span className={styles.srOnly}>
                    문제 제목 또는 출제 동아리 검색
                  </span>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    aria-hidden="true"
                  >
                    <circle cx="10.5" cy="10.5" r="6.5" />
                    <path d="m15.5 15.5 5 5" />
                  </svg>
                  <input
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="문제 제목 · 출제 동아리 검색"
                  />
                </label>
                <label className={styles.categoryField}>
                  <span className={styles.srOnly}>문제 분야</span>
                  <select
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                  >
                    <option value="">모든 분야</option>
                    {groups.categories.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  className={styles.refreshButton}
                  onClick={onRetry}
                  disabled={refreshing}
                  aria-label="문제 목록 새로고침"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    aria-hidden="true"
                  >
                    <path d="M20 7v5h-5M4 17v-5h5" />
                    <path d="M5.3 7a8 8 0 0 1 13-1L20 8M4 16l1.7 2a8 8 0 0 0 13-1" />
                  </svg>
                  <span>{refreshing ? "확인 중" : "새로고침"}</span>
                </button>
              </div>
            )}

            <section
              className={styles.unsolvedSection}
              aria-labelledby="unsolved-heading"
            >
              <div className={styles.sectionHeader}>
                <h2 id="unsolved-heading">
                  미해결 문제{" "}
                  <span>
                    {countLabel(groups.unsolved.length, unsolvedCount)}
                  </span>
                </h2>
                <span>{filtered ? "검색 결과" : "지금 도전할 문제"}</span>
              </div>
              <p className={styles.srOnly} role="status">
                {filtered
                  ? "검색 결과 미해결 " +
                    groups.unsolved.length +
                    "개, 풀이 완료 " +
                    groups.solved.length +
                    "개"
                  : ""}
              </p>
              {groups.unsolved.length ? (
                <ul className={styles.cardGrid} aria-label="미해결 문제">
                  {groups.unsolved.map((challenge) => (
                    <OpenChallengeCard
                      key={challenge.challengeId}
                      challenge={challenge}
                      hasInstance={
                        challenge.challengeId === instance?.challengeId
                      }
                      onSelect={onSelectChallenge}
                    />
                  ))}
                </ul>
              ) : (
                <div className={styles.emptyState}>
                  <span className={styles.emptySymbol} aria-hidden="true">
                    {totalCount && !filtered ? "✓" : "◇"}
                  </span>
                  <h3>
                    {filtered
                      ? "조건에 맞는 미해결 문제가 없습니다"
                      : totalCount
                        ? "열린 문제를 모두 해결했습니다"
                        : "아직 열린 문제가 없습니다"}
                  </h3>
                  <p>
                    {filtered
                      ? groups.solved.length
                        ? "아래 풀이 완료 목록에서 검색 결과를 확인할 수 있습니다"
                        : "다른 검색어나 분야를 선택해보세요"
                      : "보드에서 다음 문제를 열고 도전해보세요"}
                  </p>
                  <button
                    type="button"
                    className={styles.primaryButton}
                    onClick={filtered ? clearFilters : onBackToBoard}
                  >
                    {filtered ? "검색 조건 초기화" : "보드로 이동"}
                  </button>
                </div>
              )}
            </section>

            {solvedCount > 0 && (
              <details
                className={styles.solvedArchive}
                open={solvedOpen}
                onToggle={(event) => setSolvedOpen(event.currentTarget.open)}
              >
                <summary ref={archiveSummary}>
                  <span className={styles.archiveCheck} aria-hidden="true">
                    ✓
                  </span>
                  <span className={styles.archiveTitle}>
                    풀이 완료{" "}
                    <strong>
                      {countLabel(groups.solved.length, solvedCount)}
                    </strong>
                    <small>해결한 문제는 이곳에 모아두었습니다</small>
                  </span>
                  <span className={styles.archiveToggle}>
                    {solvedOpen ? "접기" : "펼쳐보기"}
                    <span aria-hidden="true">{solvedOpen ? "−" : "+"}</span>
                  </span>
                </summary>
                <div className={styles.archiveContent}>
                  {groups.solved.length ? (
                    <ul className={styles.cardGrid} aria-label="풀이 완료 문제">
                      {groups.solved.map((challenge) => (
                        <OpenChallengeCard
                          key={challenge.challengeId}
                          challenge={challenge}
                          hasInstance={
                            challenge.challengeId === instance?.challengeId
                          }
                          onSelect={onSelectChallenge}
                        />
                      ))}
                    </ul>
                  ) : (
                    <p className={styles.archiveEmpty}>
                      조건에 맞는 풀이 완료 문제가 없습니다
                    </p>
                  )}
                </div>
              </details>
            )}
          </>
        )}
      </main>
    </div>
  );
}
