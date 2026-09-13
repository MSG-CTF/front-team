import { useCallback, useEffect, useRef, useState } from "react";
import { getKothClubs, getKothTeamToken, getMyKothProgress, getKothLeaderboard } from "../../../api/koth.js";
import { ACCESS_TOKEN_STORAGE_KEY } from "../../../api/client.js";
import { isSuccess } from "../../../utils/response.js";
import { validateKothClubs } from "../utils/kothChallengeState.js";

function getErrorMessage(error, fallbackMessage) {
  return error?.response?.data?.message || error?.message || fallbackMessage;
}

export function useKothData() {
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState({ status: "loading", clubsData: null, progressData: null, error: "", clubsStale: false });
  const authenticated = Boolean(localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY));
  useEffect(() => {
    const controller = new AbortController();
    const config = { signal: controller.signal, timeout: 10000 };
    let active = true;
    let timer;
    async function load() {
      const [clubsResult, progressResult] = await Promise.allSettled([
        getKothClubs(config),
        authenticated ? getMyKothProgress(config) : Promise.resolve(null),
      ]);
      if (!active) return;
      const clubs = clubsResult.status === "fulfilled" ? clubsResult.value?.data : null;
      const progress = progressResult.status === "fulfilled" ? progressResult.value?.data : null;
      const clubsOk = isSuccess(clubs) && validateKothClubs(clubs.data);
      const progressOk = isSuccess(progress) && Array.isArray(progress.data?.challenges);
      setState((current) => ({
        status: clubsOk || current.clubsData ? "success" : "error",
        clubsData: clubsOk ? clubs.data : current.clubsData,
        progressData: progressOk ? progress.data : null,
        clubsStale: !clubsOk,
        error: !clubsOk ? "KOTH 목록을 갱신하지 못했습니다"
          : authenticated && !progressOk ? "내 팀 점수를 갱신하지 못했습니다" : "",
      }));
      timer = window.setTimeout(load, 30000);
    }
    load();
    return () => { active = false; controller.abort(); window.clearTimeout(timer); };
  }, [revision, authenticated]);
  return { ...state, authenticated, retry: () => setRevision((value) => value + 1) };
}

export function useKothLeaderboard(challengeId, authenticated) {
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState({ status: "idle", data: null, error: "" });
  useEffect(() => {
    setState({ status: authenticated ? "loading" : "unauthenticated", data: null, error: "" });
    if (!challengeId || !authenticated) return;
    let active = true;
    let timer;
    const controller = new AbortController();
    async function load() {
      try {
        const response = await getKothLeaderboard(challengeId, { signal: controller.signal, timeout: 10000 });
        const envelope = response.data;
        if (!isSuccess(envelope) || envelope.data?.koth_challenge_id !== challengeId || !Array.isArray(envelope.data?.leaderboard)) {
          throw new Error("문제 순위표를 불러오지 못했습니다");
        }
        if (active) setState({ status: "success", data: envelope.data, error: "" });
      } catch (error) {
        if (active) setState({ status: "error", data: null, error: getErrorMessage(error, "문제 순위표를 불러오지 못했습니다") });
      }
      if (active) timer = window.setTimeout(load, 30000);
    }
    load();
    return () => { active = false; controller.abort(); window.clearTimeout(timer); };
  }, [challengeId, authenticated, revision]);
  return { ...state, retry: () => setRevision((value) => value + 1) };
}

export function useKothTeamToken() {
  const sequence = useRef(0);
  const pending = useRef(false);
  const controller = useRef(null);
  const [state, setState] = useState({ status: "idle", data: null, error: "" });
  useEffect(() => () => { ++sequence.current; controller.current?.abort(); }, []);
  const requestTeamToken = useCallback(async () => {
    if (pending.current) return;
    pending.current = true;
    const request = ++sequence.current;
    controller.current = new AbortController();
    setState({ status: "loading", data: null, error: "" });
    try {
      const response = await getKothTeamToken({ signal: controller.current.signal, timeout: 10000 });
      const envelope = response.data;
      if (!isSuccess(envelope) || typeof envelope.data?.team_token !== "string" || !envelope.data.team_token.trim()) {
        throw new Error("KOTH 팀 토큰을 불러오지 못했습니다");
      }
      if (request === sequence.current) setState({ status: "success", data: envelope.data, error: "" });
    } catch (error) {
      if (request === sequence.current) setState({ status: "error", data: null, error: getErrorMessage(error, "KOTH 팀 토큰을 불러오지 못했습니다") });
    } finally { if (request === sequence.current) pending.current = false; }
  }, []);
  const clearTeamToken = useCallback(() => {
    ++sequence.current;
    controller.current?.abort();
    pending.current = false;
    setState({ status: "idle", data: null, error: "" });
  }, []);
  return { ...state, requestTeamToken, clearTeamToken };
}
