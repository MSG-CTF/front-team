import { useCallback, useEffect, useRef, useState } from "react";
import {
  getKothClubs,
  getKothTeamToken,
  getMyKothProgress,
} from "../../../api/koth.js";
import { isSuccess } from "../../../utils/response.js";

function getErrorMessage(error, fallbackMessage) {
  return error?.response?.data?.message || error?.message || fallbackMessage;
}

function validateKothData(clubsData, progressData) {
  return Array.isArray(clubsData?.clubs)
    && clubsData.clubs.every((club) => Array.isArray(club?.challenges))
    && Array.isArray(progressData?.challenges);
}

export function useKothData() {
  const [requestSequence, setRequestSequence] = useState(0);
  const [state, setState] = useState({
    status: "loading",
    clubsData: null,
    progressData: null,
    error: "",
  });

  useEffect(() => {
    let cancelled = false;

    async function loadKothData() {
      setState((current) => ({
        ...current,
        status: "loading",
        error: "",
      }));

      try {
        const [clubsResponse, progressResponse] = await Promise.all([
          getKothClubs(),
          getMyKothProgress(),
        ]);
        const clubsEnvelope = clubsResponse.data;
        const progressEnvelope = progressResponse.data;

        if (!isSuccess(clubsEnvelope)) {
          throw new Error(clubsEnvelope?.message || "KOTH 문제를 불러오지 못했습니다.");
        }
        if (!isSuccess(progressEnvelope)) {
          throw new Error(progressEnvelope?.message || "내 KOTH 진행 상태를 불러오지 못했습니다.");
        }
        if (!validateKothData(clubsEnvelope.data, progressEnvelope.data)) {
          throw new Error("KOTH API 응답 형식이 올바르지 않습니다.");
        }

        if (!cancelled) {
          setState({
            status: "success",
            clubsData: clubsEnvelope.data,
            progressData: progressEnvelope.data,
            error: "",
          });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            status: "error",
            clubsData: null,
            progressData: null,
            error: getErrorMessage(error, "KOTH 정보를 불러오지 못했습니다."),
          });
        }
      }
    }

    loadKothData();
    return () => {
      cancelled = true;
    };
  }, [requestSequence]);

  const retry = useCallback(() => {
    setRequestSequence((sequence) => sequence + 1);
  }, []);

  return { ...state, retry };
}

export function useKothTeamToken() {
  const requestSequence = useRef(0);
  const [state, setState] = useState({
    status: "idle",
    data: null,
    error: "",
  });

  const requestTeamToken = useCallback(async () => {
    const currentRequest = requestSequence.current + 1;
    requestSequence.current = currentRequest;
    setState({ status: "loading", data: null, error: "" });

    try {
      const response = await getKothTeamToken();
      const envelope = response.data;
      if (!isSuccess(envelope)) {
        throw new Error(envelope?.message || "KOTH 팀 토큰을 불러오지 못했습니다.");
      }
      if (!envelope.data?.team_token?.trim()) {
        throw new Error("KOTH 팀 토큰 응답 형식이 올바르지 않습니다.");
      }

      if (requestSequence.current === currentRequest) {
        setState({ status: "success", data: envelope.data, error: "" });
      }
    } catch (error) {
      if (requestSequence.current === currentRequest) {
        setState({
          status: "error",
          data: null,
          error: getErrorMessage(error, "KOTH 팀 토큰을 불러오지 못했습니다."),
        });
      }
    }
  }, []);

  const clearTeamToken = useCallback(() => {
    requestSequence.current += 1;
    setState({ status: "idle", data: null, error: "" });
  }, []);

  return { ...state, requestTeamToken, clearTeamToken };
}
