import { useCallback, useEffect, useRef, useState } from "react";
import { getTimer } from "../../../api/timer.js";
import { isSuccess } from "../../../utils/response.js";
import { startVisiblePolling } from "../../../utils/visiblePolling.js";
import { adaptTimer, getRemainingSeconds } from "../utils/timerData.js";

const RESYNC_INTERVAL_MS = 30_000; // 클라이언트 시계 오차 누적 방지용 주기 재동기화
const TICK_INTERVAL_MS = 1_000;

function getErrorMessage(error, fallbackMessage) {
  return error?.response?.data?.message || error?.message || fallbackMessage;
}

export default function useTimerController() {
  const [requestSequence, setRequestSequence] = useState(0);
  const [state, setState] = useState({
    status: "loading", // loading | success | empty | error
    contest: null,
    error: "",
  });
  const [now, setNow] = useState(Date.now);
  const lastBoundaryRef = useRef(null);
  const active = useRef(false);
  const requestId = useRef(0);
  const controller = useRef(null);

  const load = useCallback(async () => {
    if (!active.current) return;
    const sequence = ++requestId.current;
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    setState((current) => ({ ...current, status: "loading", error: "" }));

    try {
      const response = await getTimer({ signal: request.signal, timeout: 10000 });
      if (!active.current || request.signal.aborted || sequence !== requestId.current) return;
      const envelope = response.data;

      if (!isSuccess(envelope)) {
        throw new Error(envelope?.message || "타이머 정보를 불러오지 못했습니다");
      }

      if (!envelope.data) {
        setState({ status: "empty", contest: null, error: "" });
        return;
      }

      setState({
        status: "success",
        contest: adaptTimer(envelope.data),
        error: "",
      });
    } catch (error) {
      if (!active.current || request.signal.aborted || sequence !== requestId.current) return;
      setState({
        status: "error",
        contest: null,
        error: getErrorMessage(error, "타이머 정보를 불러오지 못했습니다"),
      });
    }
  }, []);

  useEffect(() => {
    active.current = true;
    const stopPolling = startVisiblePolling(load, { intervalMs: RESYNC_INTERVAL_MS });
    return () => {
      stopPolling();
      active.current = false;
      requestId.current++;
      controller.current?.abort();
    };
  }, [load, requestSequence]);

  // 1초마다 화면을 갱신(클라이언트 측 보간)하고, 별도로 일정 주기마다 서버와
  // 다시 동기화한다(시계 드리프트 누적 방지 + BEFORE/RUNNING/ENDED 전환 반영).
  useEffect(() => {
    return startVisiblePolling(() => setNow(Date.now()), { intervalMs: TICK_INTERVAL_MS });
  }, []);

  const retry = useCallback(() => {
    setRequestSequence((sequence) => sequence + 1);
  }, []);

  const contest = state.contest;
  const liveRemainingSeconds = (() => {
    if (!contest) return 0;
    if (contest.status === "BEFORE") {
      return getRemainingSeconds(contest.startTime, contest, now);
    }
    if (contest.status === "RUNNING") {
      return getRemainingSeconds(contest.endTime, contest, now);
    }
    return 0;
  })();

  // BEFORE -> RUNNING, RUNNING -> ENDED 경계를 넘으면(카운트다운이 0에 닿으면)
  // remaining_seconds/time_until_start가 어느 쪽이든 더는 정확하지 않으므로
  // 한 번만 다시 불러온다.
  useEffect(() => {
    const target = contest?.status === "BEFORE" ? contest.startTime
      : contest?.status === "RUNNING" ? contest.endTime : null;
    const boundary = target && Number.isFinite(Date.parse(target)) ? `${contest.status}:${target}` : null;
    if (
      boundary && state.status === "success" && !document.hidden &&
      liveRemainingSeconds === 0 &&
      lastBoundaryRef.current !== boundary
    ) {
      // A server still reporting the same expired phase must not cause a loop.
      lastBoundaryRef.current = boundary;
      load();
    }
  }, [contest, state.status, liveRemainingSeconds, load]);

  return {
    status: state.status,
    contest,
    error: state.error,
    isSynced: contest?.serverTime != null,
    liveRemainingSeconds,
    retry,
  };
}
