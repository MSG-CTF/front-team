import { useCallback, useEffect, useRef, useState } from "react";
import { getMyInstances } from "../../../api/instances.js";
import { isSuccess } from "../../../utils/response.js";
import { readCurrentInstance } from "../../challenges/utils/openChallengesData.js";

// 목록을 연 동안에만 본인 인스턴스를 조회한다 보드 조작 요청과 분리한다
export default function useBoardInstance(enabled) {
  const [state, setState] = useState({ instance: null, loading: false, error: "" });
  const sequence = useRef(0);
  const controller = useRef(null);
  const load = useCallback(async () => {
    const request = ++sequence.current;
    controller.current?.abort();
    controller.current = new AbortController();
    setState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const response = await getMyInstances({ signal: controller.current.signal, timeout: 10000 });
      if (!isSuccess(response.data)) throw new Error("INSTANCE_UNAVAILABLE");
      if (request === sequence.current) setState({ instance: readCurrentInstance(response.data.data), loading: false, error: "" });
    } catch {
      if (request === sequence.current) setState({ instance: null, loading: false, error: "인스턴스 상태를 확인하지 못했습니다" });
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
