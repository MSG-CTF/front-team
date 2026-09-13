import { useCallback, useEffect, useRef, useState } from "react";
import { isSuccess } from "../../../utils/response.js";
import { createRequestGuard, getAdminRequestError } from "../utils/adminValidation.js";

export default function useAdminResource(fetcher, deps, fallbackMessage) {
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState({ status: "loading", data: null, error: "" });
  const guard = useRef(null);
  if (!guard.current) guard.current = createRequestGuard();
  const active = useRef(false);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const load = useCallback(async () => {
    if (!active.current) return false;
    const request = guard.current.begin();
    setState((current) => ({ ...current, status: "loading", error: "" }));
    let timer;
    let abortHandler;
    try {
      const response = await Promise.race([
        fetcherRef.current({ signal: request.signal, timeout: 10000 }),
        new Promise((_, reject) => {
          timer = setTimeout(() => {
            reject(new Error("조회 시간이 초과되었습니다. 다시 시도하세요"));
            request.abort();
          }, 10000);
          abortHandler = () => reject(new Error("조회가 취소되었습니다"));
          request.signal.addEventListener("abort", abortHandler, { once: true });
        }),
      ]);
      if (!request.isCurrent() || !active.current) return false;
      const envelope = response.data;
      if (!isSuccess(envelope)) throw new Error(envelope?.message || fallbackMessage);
      setState({ status: "success", data: envelope.data, error: "" });
      return true;
    } catch (error) {
      if (request.isCurrent() && active.current) setState((current) => ({ ...current, ...getAdminRequestError(error, fallbackMessage) }));
      return false;
    } finally {
      clearTimeout(timer);
      request.signal.removeEventListener("abort", abortHandler);
    }
    // fetcher가 참조하는 입력이 바뀔 때 새 조회를 시작한다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    active.current = true;
    load();
    return () => { active.current = false; guard.current.cancel(); };
  }, [load, revision]);

  const retry = useCallback(() => setRevision((value) => value + 1), []);
  return { ...state, retry, reload: load };
}
