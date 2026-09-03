import { formatRemaining, toKst } from "../../../utils/time.js";

// TODO(timer): Figma 시안이 아직 없어(다른 페이지와 달리 참고할 node ID가
// 없음) 픽셀 단위 디자인 대신 기능 우선으로 만든 화면이다. 시안이 나오면
// 이 컴포넌트만 교체하면 되도록 훅(useTimerController)과 분리해뒀다.

const STATUS_LABEL = {
  BEFORE: "대회 시작 전",
  RUNNING: "대회 진행 중",
  ENDED: "대회 종료",
};

function StatusBadge({ status }) {
  return (
    <span className="inline-block rounded-full border border-current px-3 py-1 text-sm font-semibold">
      {STATUS_LABEL[status] || status}
    </span>
  );
}

export default function TimerScreen({
  status,
  contest,
  error,
  isSynced,
  liveRemainingSeconds,
  onRetry,
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#1c1207] px-6 text-center text-[#fff0c4]">
      {status === "loading" && <p>타이머 정보를 불러오는 중입니다...</p>}

      {status === "error" && (
        <div className="flex flex-col items-center gap-3">
          <p role="alert">{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="rounded border border-[#c89252] bg-[#6d391c] px-4 py-2"
          >
            다시 시도
          </button>
        </div>
      )}

      {status === "empty" && <p>현재 진행 중이거나 예정된 대회가 없습니다.</p>}

      {status === "success" && contest && (
        <>
          <h1 className="text-2xl font-bold">{contest.name}</h1>
          <StatusBadge status={contest.status} />

          {contest.status !== "ENDED" && (
            <p className="font-mono text-5xl tabular-nums" aria-live="polite">
              {formatRemaining(liveRemainingSeconds)}
            </p>
          )}

          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm opacity-80">
            <dt>시작</dt>
            <dd>{toKst(contest.startTime)}</dd>
            <dt>종료</dt>
            <dd>{toKst(contest.endTime)}</dd>
          </dl>

          {!isSynced && (
            <p className="text-xs opacity-60">
              서버 시각 동기화에 실패해 이 기기의 로컬 시계를 기준으로 표시하고
              있습니다. 표시된 시간이 실제와 다를 수 있습니다.
            </p>
          )}
        </>
      )}
    </main>
  );
}
