import { useCallback, useEffect, useRef, useState } from "react";
import {
  getSignature,
  getSignatures,
  submitSignatureFlag,
} from "../../../api/signatures.js";
import { isSuccess } from "../../../utils/response.js";
import {
  getSignatureError,
  getSignatureLockUntil,
  getSignatureRetrySeconds,
  parseSignatureDetail,
  parseSignatureList,
  signatureSubmitFeedback,
} from "../utils/signatureData.js";

export function useSignatures() {
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState({
    status: "loading",
    data: [],
    error: "",
  });
  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading", data: [], error: "" });
    async function load() {
      try {
        const { data: envelope } = await getSignatures({
          signal: controller.signal,
        });
        if (!isSuccess(envelope)) throw { response: { data: envelope } };
        const data = parseSignatureList(envelope.data);
        if (!controller.signal.aborted)
          setState({ status: "success", data, error: "" });
      } catch (error) {
        if (!controller.signal.aborted)
          setState({
            status: "error",
            data: [],
            error: getSignatureError(error.response?.data?.code),
          });
      }
    }
    load();
    return () => controller.abort();
  }, [revision]);
  return { ...state, retry: () => setRevision((value) => value + 1) };
}

export function useSignatureDetail(signatureId) {
  const mounted = useRef(false);
  const readRequest = useRef(null);
  const submitRequest = useRef(null);
  const pending = useRef(false);
  const [state, setState] = useState({
    status: "loading",
    data: null,
    error: "",
  });
  const [flag, setFlag] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [lockedUntil, setLockedUntil] = useState(0);
  const [now, setNow] = useState(Date.now());

  const load = useCallback(async () => {
    readRequest.current?.abort();
    const controller = new AbortController();
    readRequest.current = controller;
    setState((current) => ({ ...current, status: "loading", error: "" }));
    try {
      const { data: envelope } = await getSignature(signatureId, {
        signal: controller.signal,
      });
      if (!isSuccess(envelope)) throw { response: { data: envelope } };
      const data = parseSignatureDetail(envelope.data, signatureId);
      if (mounted.current && !controller.signal.aborted) {
        setState({ status: "success", data, error: "" });
        return data;
      }
    } catch (error) {
      if (mounted.current && !controller.signal.aborted)
        setState({
          status: "error",
          data: null,
          error: getSignatureError(error.response?.data?.code),
        });
    }
  }, [signatureId]);

  useEffect(() => {
    mounted.current = true;
    load();
    return () => {
      mounted.current = false;
      readRequest.current?.abort();
      submitRequest.current?.abort();
    };
  }, [load]);

  useEffect(() => {
    if (!lockedUntil) return;
    setNow(Date.now());
    const timer = window.setInterval(() => {
      const timestamp = Date.now();
      setNow(timestamp);
      if (timestamp >= lockedUntil) window.clearInterval(timer);
    }, 250);
    return () => window.clearInterval(timer);
  }, [lockedUntil]);

  const retrySeconds = getSignatureRetrySeconds(lockedUntil, now);
  const solved =
    state.data?.is_solved === true ||
    feedback?.code === "SUCCESS" ||
    feedback?.code === "ALREADY_SOLVED";
  const disabled =
    state.status !== "success" ||
    busy ||
    solved ||
    retrySeconds > 0 ||
    !flag.length ||
    flag.length > 512;
  const submit = async () => {
    if (
      pending.current ||
      disabled ||
      getSignatureRetrySeconds(lockedUntil) > 0
    )
      return;
    pending.current = true;
    readRequest.current?.abort();
    const controller = new AbortController();
    submitRequest.current = controller;
    setBusy(true);
    setFeedback(null);
    let envelope;
    try {
      const response = await submitSignatureFlag(
        signatureId,
        { flag },
        { signal: controller.signal },
      );
      envelope = response.data;
    } catch (error) {
      envelope = error.response?.data;
    }
    if (!mounted.current || controller.signal.aborted) return;
    const result = signatureSubmitFeedback(
      envelope,
      signatureId,
      state.data.club_id,
    );
    setFeedback(result);
    setLockedUntil(getSignatureLockUntil(envelope));
    if (result.code === "SUCCESS" || result.code === "ALREADY_SOLVED")
      setFlag("");
    // 응답 유실도 성공으로 추측하지 않고 상세 기록을 다시 읽는다
    if (
      !["INCORRECT_FLAG", "TOO_MANY_ATTEMPTS", "INVALID_REQUEST"].includes(
        result.code,
      )
    ) {
      const latest = await load();
      if (
        mounted.current &&
        !controller.signal.aborted &&
        result.type === "error" &&
        latest?.is_solved
      ) {
        setFlag("");
        setFeedback({
          type: "success",
          code: "SOLVE_CONFIRMED",
          message: "우리 팀의 풀이 완료 기록을 확인했습니다",
        });
      }
    }
    if (mounted.current && !controller.signal.aborted) setBusy(false);
    pending.current = false;
  };

  return {
    ...state,
    flag,
    setFlag,
    busy,
    feedback,
    retrySeconds,
    solved,
    disabled,
    submit,
    retry: () => {
      if (!pending.current) load();
    },
  };
}
