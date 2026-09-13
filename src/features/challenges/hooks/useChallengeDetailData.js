import { useCallback, useEffect, useRef, useState } from "react";
import { getChallengeDetail } from "../../../api/challenges.js";
import { getMyInstances } from "../../../api/instances.js";
import {
  INITIAL_DETAIL_STATE,
  readDetailResult,
  resolveDetailState,
} from "../utils/challengeDetailState.js";

export default function useChallengeDetailData(challengeId) {
  const requestSequence = useRef(0);
  const controller = useRef(null);
  const [state, setState] = useState(INITIAL_DETAIL_STATE);

  const load = useCallback(async () => {
    const sequence = ++requestSequence.current;
    controller.current?.abort();
    controller.current = new AbortController();
    const config = { signal: controller.current.signal, timeout: 10000 };
    setState((current) => ({ ...current, refreshing: true }));
    const [detailResult, instanceResult] = await Promise.allSettled([
      getChallengeDetail(challengeId, config),
      getMyInstances(config),
    ]);
    if (sequence !== requestSequence.current) return false;
    const detail = readDetailResult(
      detailResult,
      "문제 정보를 새로 불러오지 못했습니다",
    );
    const instance = readDetailResult(
      instanceResult,
      "인스턴스 정보를 불러오지 못했습니다",
    );
    setState((current) =>
      resolveDetailState(current, detail, instance, challengeId),
    );
    return !detail.error && Boolean(detail.data) && !instance.error;
  }, [challengeId]);

  const invalidateRequest = useCallback(() => {
    ++requestSequence.current;
    controller.current?.abort();
  }, []);

  const applyInstance = useCallback(
    (data) => {
      if (!data) return;
      invalidateRequest();
      setState((current) => ({
        ...current,
        refreshing: false,
        instanceError: null,
        otherInstanceData: null,
        instanceData: {
          ...(current.instanceData?.instance_id === data.instance_id
            ? current.instanceData
            : {}),
          ...data,
          challenge_id: challengeId,
        },
      }));
    },
    [challengeId, invalidateRequest],
  );

  const applySolved = useCallback(() => {
    invalidateRequest();
    setState((current) => ({
      ...current,
      refreshing: false,
      challengeData: current.challengeData
        ? { ...current.challengeData, is_solved: true, status: "CLEARED" }
        : null,
    }));
  }, [invalidateRequest]);

  useEffect(() => {
    let disposed = false;
    let timer;
    const poll = async (force = false) => {
      if (force || !document.hidden) await load();
      if (!disposed) timer = window.setTimeout(poll, 5000);
    };
    const onVisible = () => {
      if (!document.hidden) load();
    };
    poll(true);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      disposed = true;
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      invalidateRequest();
    };
  }, [load, invalidateRequest]);

  return { ...state, retry: load, refresh: load, applyInstance, applySolved };
}
