import { useCallback, useEffect, useRef, useState } from "react";
import { getKothClub, getKothClubs, getKothTeamToken, getMyKothProgress, getKothLeaderboard } from "../../../api/koth.js";
import { ACCESS_TOKEN_STORAGE_KEY } from "../../../api/client.js";
import { isSuccess } from "../../../utils/response.js";
import { startVisiblePolling } from "../../../utils/visiblePolling.js";
import { validateKothClubs, validateKothClubDetail } from "../utils/kothChallengeState.js";

function getErrorMessage(error, fallbackMessage) {
  return error?.response?.data?.message || error?.message || fallbackMessage;
}

export function useKothData() {
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState({ status: "loading", clubsData: null, progressData: null, progressError: "", clubsStale: false });
  const authenticated = Boolean(localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY));
  useEffect(() => {
    const controller = new AbortController();
    const config = { signal: controller.signal, timeout: 10000 };
    let active = true;
    async function loadClubs() {
      let clubs;
      try { clubs = (await getKothClubs(config)).data; } catch { /* 이전 목록은 갱신 실패 상태로 남긴다 */ }
      if (!active) return;
      const clubsOk = isSuccess(clubs) && validateKothClubs(clubs.data);
      setState((current) => ({
        ...current,
        status: clubsOk || current.clubsData ? "success" : "error",
        clubsData: clubsOk ? clubs.data : current.clubsData,
        clubsStale: !clubsOk,
      }));
    }
    async function loadProgress() {
      if (!authenticated) return;
      let progress;
      try { progress = (await getMyKothProgress(config)).data; } catch { /* 점수 오류는 목록 이용을 막지 않는다 */ }
      if (!active) return;
      const progressOk = isSuccess(progress) && Array.isArray(progress.data?.challenges);
      setState((current) => ({
        ...current,
        progressData: progressOk ? progress.data : null,
        progressError: progressOk ? "" : "내 팀 점수를 갱신하지 못했습니다",
      }));
    }
    // 응답은 도착하는 대로 반영하되 다음 폴링은 두 요청이 끝난 뒤에 시작한다
    const load = () => Promise.allSettled([loadClubs(), loadProgress()]);
    const stopPolling = startVisiblePolling(load);
    return () => { stopPolling(); active = false; controller.abort(); };
  }, [revision, authenticated]);
  return { ...state, error: state.clubsStale ? "KOTH 목록을 갱신하지 못했습니다" : state.progressError,
    authenticated, retry: () => setRevision((value) => value + 1) };
}

export function useKothLeaderboard(challengeId, authenticated) {
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState({ status: "idle", data: null, error: "" });
  useEffect(() => {
    setState({ status: authenticated ? "loading" : "unauthenticated", data: null, error: "" });
    if (!challengeId || !authenticated) return;
    let active = true;
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
    }
    const stopPolling = startVisiblePolling(load);
    return () => { stopPolling(); active = false; controller.abort(); };
  }, [challengeId, authenticated, revision]);
  return { ...state, retry: () => setRevision((value) => value + 1) };
}

export function useKothClubDetail(clubId, challengeId) {
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState({ key: null, status: "idle", data: null, error: "" });
  const key = clubId && challengeId ? `${clubId}:${challengeId}` : null;
  useEffect(() => {
    if (!key) return;
    const controller = new AbortController();
    async function load() {
      setState({ key, status: "loading", data: null, error: "" });
      try {
        const { data: envelope } = await getKothClub(clubId, { signal: controller.signal, timeout: 10000 });
        if (!isSuccess(envelope) || !validateKothClubDetail(envelope.data, clubId, challengeId)) {
          throw new Error("선택한 문제의 최신 상태를 확인하지 못했습니다");
        }
        if (!controller.signal.aborted) setState({ key, status: "success", data: envelope.data, error: "" });
      } catch {
        if (!controller.signal.aborted) setState({ key, status: "error", data: null, error: "선택한 문제의 최신 상태를 확인하지 못했습니다" });
      }
    }
    const stopPolling = startVisiblePolling(load);
    return () => { stopPolling(); controller.abort(); };
  }, [clubId, challengeId, key, revision]);
  const current = state.key === key ? state : { status: key ? "loading" : "idle", data: null, error: "" };
  return { ...current, retry: () => setRevision((value) => value + 1) };
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
