import { useCallback, useEffect, useRef, useState } from "react";
import { getChallengeDetail } from "../../../api/challenges.js";
import { getMyInstances, getTeamMemberInstances } from "../../../api/instances.js";
import { findTeammateInstance } from "../utils/challengeDetailMapper.js";
import { startVisiblePolling } from "../../../utils/visiblePolling.js";
import {
  INITIAL_DETAIL_STATE,
  isInstanceChanging,
  needsInstanceLookup,
  readDetailResult,
  resolveDetailState,
} from "../utils/challengeDetailState.js";

// 팀원 인스턴스는 같이 쓸지 정하는 참고 정보라 내 인스턴스보다 드물게 묻는다
const MEMBER_LOOKUP_MS = 15000;

export default function useChallengeDetailData(challengeId) {
  const requestSequence = useRef(0);
  const memberLookup = useRef({ id: null, at: 0 });
  const controller = useRef(null);
  const instanceLookupRequired = useRef(true);
  const [state, setState] = useState(INITIAL_DETAIL_STATE);
  const fastPolling = !state.instanceError && isInstanceChanging(state.instanceData);

  const load = useCallback(async () => {
    const sequence = ++requestSequence.current;
    controller.current?.abort();
    controller.current = new AbortController();
    const config = { signal: controller.current.signal, timeout: 10000 };
    setState((current) => ({ ...current, refreshing: true }));
    const [detailResult] = await Promise.allSettled([
      getChallengeDetail(challengeId, config),
    ]);
    if (sequence !== requestSequence.current) return false;
    const detail = readDetailResult(
      detailResult,
      "문제 정보를 새로 불러오지 못했습니다",
    );
    if (!detail.error) instanceLookupRequired.current = needsInstanceLookup(detail.data);
    let instance = { data: { instances: [] }, error: null };
    let members;
    if (instanceLookupRequired.current) {
      const askMembers = memberLookup.current.id !== challengeId || Date.now() - memberLookup.current.at >= MEMBER_LOOKUP_MS;
      if (askMembers) memberLookup.current = { id: challengeId, at: Date.now() };
      const [instanceResult, memberResult] = await Promise.allSettled([
        getMyInstances({ ...config, params: { challenge_id: challengeId } }),
        askMembers ? getTeamMemberInstances(config) : null,
      ]);
      if (sequence !== requestSequence.current) return false;
      instance = readDetailResult(instanceResult, "인스턴스 정보를 불러오지 못했습니다");
      // 팀원 조회가 실패하면(구버전 서버 포함) 팀원 표시만 지우고 화면은 그대로 둔다
      if (askMembers) members = readDetailResult(memberResult, "").data;
    }
    setState((current) => {
      const next = resolveDetailState(current, detail, instance, challengeId);
      return members === undefined ? next : { ...next, teammateInstanceData: findTeammateInstance(members, challengeId) };
    });
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
    const stopPolling = startVisiblePolling(load, {
      intervalMs: fastPolling ? 1500 : 5000,
    });
    return () => {
      stopPolling();
      invalidateRequest();
    };
  }, [load, invalidateRequest, fastPolling]);

  return { ...state, retry: load, refresh: load, applyInstance, applySolved };
}
