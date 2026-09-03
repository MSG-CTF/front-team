import { useCallback, useEffect, useRef, useState } from "react";
import { getTimer } from "../../../api/timer.js";
import { isSuccess } from "../../../utils/response.js";
import {
  adaptTimer,
  createClockSync,
  getRemainingSeconds,
} from "../utils/timerData.js";

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
    clockSync: null,
    error: "",
  });
  const [now, setNow] = useState(Date.now());
  const autoResyncedRef = useRef(false);

  const load = useCallback(async () => {
    setState((current) => ({ ...current, status: "loading", error: "" }));
    autoResyncedRef.current = false;

    try {
      const response = await getTimer();
      const envelope = response.data;

      if (!isSuccess(envelope)) {
        throw new Error(envelope?.message || "타이머 정보를 불러오지 못했습니다.");
      }

      const clockSync = createClockSync(response.headers);

      if (!envelope.data) {
        setState({ status: "empty", contest: null, clockSync, error: "" });
        return;
      }

      setState({
        status: "success",
        contest: adaptTimer(envelope.data),
        clockSync,
        error: "",
      });
    } catch (error) {
      setState({
        status: "error",
        contest: null,
        clockSync: null,
        error: getErrorMessage(error, "타이머 정보를 불러오지 못했습니다."),
      });
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cancelled) await load();
    })();
    return () => {
      cancelled = true;
    };
  }, [load, requestSequence]);

  // 1초마다 화면을 갱신(클라이언트 측 보간)하고, 별도로 일정 주기마다 서버와
  // 다시 동기화한다(시계 드리프트 누적 방지 + BEFORE/RUNNING/ENDED 전환 반영).
  useEffect(() => {
    const tickId = window.setInterval(() => setNow(Date.now()), TICK_INTERVAL_MS);
    const resyncId = window.setInterval(load, RESYNC_INTERVAL_MS);
    return () => {
      window.clearInterval(tickId);
      window.clearInterval(resyncId);
    };
  }, [load]);

  const retry = useCallback(() => {
    setRequestSequence((sequence) => sequence + 1);
  }, []);

  const contest = state.contest;
  const liveRemainingSeconds = (() => {
    if (!contest || !state.clockSync) return 0;
    if (contest.status === "BEFORE") {
      return getRemainingSeconds(contest.startTime, state.clockSync, now);
    }
    if (contest.status === "RUNNING") {
      return getRemainingSeconds(contest.endTime, state.clockSync, now);
    }
    return 0;
  })();

  // BEFORE -> RUNNING, RUNNING -> ENDED 경계를 넘으면(카운트다운이 0에 닿으면)
  // remaining_seconds/time_until_start가 어느 쪽이든 더는 정확하지 않으므로
  // 한 번만 다시 불러온다.
  useEffect(() => {
    if (
      contest &&
      contest.status !== "ENDED" &&
      liveRemainingSeconds === 0 &&
      !autoResyncedRef.current
    ) {
      autoResyncedRef.current = true;
      load();
    }
  }, [contest, liveRemainingSeconds, load]);

  return {
    status: state.status,
    contest,
    error: state.error,
    isSynced: state.clockSync?.isSynced ?? false,
    liveRemainingSeconds,
    retry,
  };
}
