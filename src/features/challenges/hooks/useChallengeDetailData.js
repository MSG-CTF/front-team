import { useCallback, useEffect, useRef, useState } from "react";
import { getChallengeDetail } from "../../../api/challenges.js";
import { getMyInstances } from "../../../api/instances.js";
import { isSuccess } from "../../../utils/response.js";
import { findChallengeInstance } from "../utils/challengeDetailMapper.js";

const INITIAL_STATE = {
  status: "loading", challengeData: null, instanceData: null,
  pageError: null, instanceError: null,
};

function envelopeError(envelope, fallbackMessage) {
  return { code: envelope?.code || "REQUEST_FAILED", message: envelope?.message || fallbackMessage };
}

function readResult(result, fallbackMessage) {
  const envelope = result.status === "fulfilled" ? result.value.data : result.reason?.response?.data;
  return isSuccess(envelope)
    ? { data: envelope.data, error: null }
    : { data: null, error: envelopeError(envelope, fallbackMessage) };
}

export default function useChallengeDetailData(challengeId) {
  const requestSequence = useRef(0);
  const controller = useRef(null);
  const [state, setState] = useState(INITIAL_STATE);

  const load = useCallback(async ({ showLoading = false } = {}) => {
    const sequence = ++requestSequence.current;
    controller.current?.abort();
    controller.current = new AbortController();
    const config = { signal: controller.current.signal, timeout: 10000 };
    if (showLoading) setState(INITIAL_STATE);
    const [detailResult, instanceResult] = await Promise.allSettled([
      getChallengeDetail(challengeId, config),
      getMyInstances(config),
    ]);
    if (sequence !== requestSequence.current) return false;
    const detail = readResult(detailResult, "문제 정보를 불러오지 못했습니다");
    const instance = readResult(instanceResult, "인스턴스 정보를 불러오지 못했습니다");
    setState({
      status: detail.error || !detail.data ? "error" : "success",
      challengeData: detail.data,
      pageError: detail.error || (!detail.data ? envelopeError(null, "문제 정보가 없습니다") : null),
      instanceData: findChallengeInstance(instance.data, challengeId),
      instanceError: instance.error,
    });
    return !detail.error && Boolean(detail.data);
  }, [challengeId]);

  const applyInstance = useCallback((data) => {
    if (!data) return;
    ++requestSequence.current;
    controller.current?.abort();
    setState((current) => ({
      ...current,
      instanceError: null,
      instanceData: {
        ...(current.instanceData?.instance_id === data.instance_id ? current.instanceData : {}),
        ...data,
        challenge_id: challengeId,
      },
    }));
  }, [challengeId]);

  useEffect(() => {
    let disposed = false;
    let timer;
    const poll = async (showLoading = false) => {
      await load({ showLoading });
      if (!disposed) timer = window.setTimeout(() => poll(), 5000);
    };
    poll(true);
    return () => {
      disposed = true;
      window.clearTimeout(timer);
      ++requestSequence.current;
      controller.current?.abort();
    };
  }, [load]);

  return { ...state, retry: load, refresh: load, applyInstance };
}
