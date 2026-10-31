import { useCallback, useEffect, useRef, useState } from "react";
import { getMyInstances, getTeamMemberInstances } from "../../../api/instances.js";
import { isSuccess } from "../../../utils/response.js";
import { readCurrentInstance, readTeammateInstances } from "../../challenges/utils/openChallengesData.js";

// 목록을 연 동안에만 본인과 팀원 인스턴스를 조회한다 보드 조작 요청과 분리한다
export default function useBoardInstance(enabled) {
  const [state, setState] = useState({ instance: null, teammates: [], loading: false, error: "" });
  const sequence = useRef(0);
  const controller = useRef(null);
  const load = useCallback(async () => {
    const request = ++sequence.current;
    controller.current?.abort();
    controller.current = new AbortController();
    setState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const config = { signal: controller.current.signal, timeout: 10000 };
      const [response, members] = await Promise.all([
        getMyInstances(config),
        // 팀원 인스턴스는 같은 문제를 이미 켰는지 보는 참고 정보라 실패해도 내 인스턴스 표시는 그대로 둔다
        getTeamMemberInstances(config).catch(() => null),
      ]);
      if (!isSuccess(response.data)) throw new Error("INSTANCE_UNAVAILABLE");
      if (request === sequence.current) setState({ instance: readCurrentInstance(response.data.data), teammates: readTeammateInstances(members?.data), loading: false, error: "" });
    } catch {
      if (request === sequence.current) setState({ instance: null, teammates: [], loading: false, error: "인스턴스 상태를 확인하지 못했습니다" });
    }
  }, []);
  useEffect(() => {
    if (!enabled) return undefined;
    load();
    const onVisible = () => { if (!document.hidden) load(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      ++sequence.current;
      controller.current?.abort();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled, load]);
  return { ...state, retry: load };
}
