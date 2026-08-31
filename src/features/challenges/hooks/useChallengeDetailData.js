import { useCallback, useEffect, useRef, useState } from "react";
import { getChallengeDetail } from "../../../api/challenges.js";
import { getMyInstances } from "../../../api/instances.js";
import { isSuccess } from "../../../utils/response.js";
import { findChallengeInstance } from "../utils/challengeDetailMapper.js";

function envelopeError(envelope, fallbackMessage) {
  return {
    code: envelope?.code || "REQUEST_FAILED",
    message: envelope?.message || fallbackMessage,
  };
}

function requestError(error, fallbackMessage) {
  return envelopeError(error?.response?.data, fallbackMessage);
}

export default function useChallengeDetailData(challengeId) {
  const requestSequence = useRef(0);
  const [state, setState] = useState({
    status: "loading",
    challengeData: null,
    instanceData: null,
    pageError: null,
    instanceError: null,
  });

  const load = useCallback(async ({ showLoading = true } = {}) => {
    const currentRequest = requestSequence.current + 1;
    requestSequence.current = currentRequest;

    if (showLoading) {
      setState((current) => ({
        ...current,
        status: "loading",
        pageError: null,
        instanceError: null,
      }));
    }

    const [challengeResult, instancesResult] = await Promise.allSettled([
      getChallengeDetail(challengeId),
      getMyInstances(),
    ]);

    if (requestSequence.current !== currentRequest) return false;

    if (challengeResult.status === "rejected") {
      setState({
        status: "error",
        challengeData: null,
        instanceData: null,
        pageError: requestError(
          challengeResult.reason,
          "문제 정보를 불러오지 못했습니다.",
        ),
        instanceError: null,
      });
      return false;
    }

    const challengeEnvelope = challengeResult.value.data;
    if (!isSuccess(challengeEnvelope) || !challengeEnvelope.data) {
      setState({
        status: "error",
        challengeData: null,
        instanceData: null,
        pageError: envelopeError(
          challengeEnvelope,
          "문제 정보를 불러오지 못했습니다.",
        ),
        instanceError: null,
      });
      return false;
    }

    let instanceData = null;
    let instanceError = null;
    if (instancesResult.status === "rejected") {
      instanceError = requestError(
        instancesResult.reason,
        "인스턴스 정보를 불러오지 못했습니다.",
      );
    } else {
      const instancesEnvelope = instancesResult.value.data;
      if (isSuccess(instancesEnvelope)) {
        instanceData = findChallengeInstance(instancesEnvelope.data, challengeId);
      } else {
        instanceError = envelopeError(
          instancesEnvelope,
          "인스턴스 정보를 불러오지 못했습니다.",
        );
      }
    }

    setState({
      status: "success",
      challengeData: challengeEnvelope.data,
      instanceData,
      pageError: null,
      instanceError,
    });
    return true;
  }, [challengeId]);

  const refreshInstance = useCallback(async () => {
    try {
      const response = await getMyInstances();
      const envelope = response.data;
      if (!isSuccess(envelope)) {
        const error = envelopeError(envelope, "인스턴스 정보를 불러오지 못했습니다.");
        setState((current) => ({ ...current, instanceError: error }));
        return false;
      }

      setState((current) => ({
        ...current,
        instanceData: findChallengeInstance(envelope.data, challengeId),
        instanceError: null,
      }));
      return true;
    } catch (error) {
      setState((current) => ({
        ...current,
        instanceError: requestError(error, "인스턴스 정보를 불러오지 못했습니다."),
      }));
      return false;
    }
  }, [challengeId]);

  useEffect(() => {
    load();
    return () => {
      requestSequence.current += 1;
    };
  }, [load]);

  return {
    ...state,
    retry: load,
    refresh: () => load({ showLoading: false }),
    refreshInstance,
  };
}
