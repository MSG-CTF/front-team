import { useCallback, useEffect, useRef, useState } from "react";
import { getOpenChallenges } from "../../../api/challenges.js";
import { getMyInstances } from "../../../api/instances.js";
import { isSuccess } from "../../../utils/response.js";
import {
  getOpenChallengesError,
  readCurrentInstance,
  readOpenChallenges,
} from "../utils/openChallengesData.js";

const INITIAL_STATE = {
  status: "loading",
  challenges: [],
  totalCount: 0,
  solvedCount: 0,
  totalScore: null,
  instance: null,
  instanceLoading: true,
  instanceError: "",
  error: "",
  refreshError: "",
  refreshing: false,
};

function requireSuccess(response, fallback) {
  if (isSuccess(response.data)) return response.data.data;
  const error = new Error(response.data?.message || fallback);
  error.response = response;
  throw error;
}

export default function useOpenChallenges() {
  const [state, setState] = useState(INITIAL_STATE);
  const sequence = useRef(0);
  const controller = useRef(null);

  const load = useCallback(async () => {
    const requestId = ++sequence.current;
    controller.current?.abort();
    controller.current = new AbortController();
    const config = { signal: controller.current.signal, timeout: 10000 };
    const currentRequest = () => sequence.current === requestId;
    setState((current) => ({
      ...current,
      refreshing: true,
      instanceLoading: true,
    }));

    // 보조 인스턴스 조회가 늦어져도 문제 목록은 먼저 표시한다
    await Promise.all([
      (async () => {
        try {
          const response = await getOpenChallenges(config);
          const data = readOpenChallenges(
            requireSuccess(response, "열린 문제 목록을 불러오지 못했습니다"),
          );
          if (currentRequest())
            setState((current) => ({
              ...current,
              ...data,
              status: "success",
              refreshing: false,
              error: "",
              refreshError: "",
            }));
        } catch (error) {
          if (!currentRequest()) return;
          const failure = getOpenChallengesError(error);
          setState((current) =>
            current.status === "success" && failure.recoverable
              ? { ...current, refreshing: false, refreshError: failure.message }
              : {
                  ...INITIAL_STATE,
                  status: "error",
                  instanceLoading: false,
                  error: failure.message,
                },
          );
        }
      })(),
      (async () => {
        try {
          const response = await getMyInstances(config);
          const instance = readCurrentInstance(
            requireSuccess(response, "인스턴스 상태를 불러오지 못했습니다"),
          );
          if (currentRequest())
            setState((current) => ({
              ...current,
              instance,
              instanceLoading: false,
              instanceError: "",
            }));
        } catch {
          if (currentRequest())
            setState((current) => ({
              ...current,
              instance: null,
              instanceLoading: false,
              instanceError: "현재 인스턴스 상태를 확인하지 못했습니다",
            }));
        }
      })(),
    ]);
  }, []);

  useEffect(() => {
    load();
    const onVisible = () => {
      if (!document.hidden) load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      ++sequence.current;
      controller.current?.abort();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  return { ...state, retry: load };
}
