import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { submitFlag } from "../../../api/challenges.js";
import {
  createInstance,
  extendInstance,
  resetInstance,
  stopInstance,
} from "../../../api/instances.js";
import { ROUTES } from "../../../routes/routePaths.js";
import { isSuccess } from "../../../utils/response.js";
import ChallengeDetailScreen from "../components/ChallengeDetailScreen.jsx";
import useChallengeDetailData from "../hooks/useChallengeDetailData.js";
import {
  getChallengeSubmissionState,
  getInstanceControlState,
  getRetryDeadline,
  mapChallengeDetail,
  mapChallengeInstance,
} from "../utils/challengeDetailMapper.js";

function feedbackFromEnvelope(envelope, fallbackMessage) {
  return {
    type: isSuccess(envelope) ? "success" : "error",
    code: envelope?.code || "REQUEST_FAILED",
    message: envelope?.message || fallbackMessage,
    data: isSuccess(envelope) ? envelope.data : null,
  };
}

export default function ChallengeDetailPage() {
  const { challengeId } = useParams();
  return <ChallengeDetailContent key={challengeId} challengeId={challengeId} />;
}

function ChallengeDetailContent({ challengeId }) {
  const navigate = useNavigate();
  const detail = useChallengeDetailData(challengeId);
  const actionInFlight = useRef(false);
  const mounted = useRef(true);
  const [retryAt, setRetryAt] = useState(null);
  const [flagValue, setFlagValue] = useState("");
  const [pendingAction, setPendingAction] = useState(null);
  const [flagFeedback, setFlagFeedback] = useState(null);
  const [instanceFeedback, setInstanceFeedback] = useState(null);
  const [confirmation, setConfirmation] = useState(null);
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    mounted.current = true;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      mounted.current = false;
      window.clearInterval(timer);
    };
  }, []);

  const challenge = useMemo(
    () =>
      detail.challengeData ? mapChallengeDetail(detail.challengeData) : null,
    [detail.challengeData],
  );
  const instance = useMemo(
    () => mapChallengeInstance(detail.instanceData, now),
    [detail.instanceData, now],
  );
  const otherInstance = useMemo(
    () => mapChallengeInstance(detail.otherInstanceData, now),
    [detail.otherInstanceData, now],
  );
  const submission = getChallengeSubmissionState(challenge, now);
  const controls = getInstanceControlState(instance, otherInstance);
  const retrySeconds =
    retryAt == null ? 0 : Math.max(0, Math.ceil((retryAt - now) / 1000));
  const unavailable = Boolean(
    detail.pageError || detail.refreshError || detail.instanceError,
  );

  const handleSubmitFlag = async () => {
    if (
      !flagValue.trim() ||
      actionInFlight.current ||
      detail.refreshError ||
      (retryAt != null && Date.now() < retryAt) ||
      detail.status !== "success" ||
      getChallengeSubmissionState(challenge).blocked
    )
      return;

    actionInFlight.current = true;
    setPendingAction("submit-flag");
    setFlagFeedback(null);
    try {
      const response = await submitFlag(challengeId, { flag: flagValue });
      if (!mounted.current) return;
      const envelope = response.data;
      setRetryAt(getRetryDeadline(envelope));
      setNow(Date.now());
      setFlagFeedback(
        feedbackFromEnvelope(envelope, "플래그를 제출하지 못했습니다"),
      );
      if (isSuccess(envelope)) {
        setFlagValue("");
        detail.applySolved();
        await detail.refresh();
      }
    } catch (error) {
      if (!mounted.current) return;
      const envelope = error?.response?.data;
      setRetryAt(getRetryDeadline(envelope));
      setNow(Date.now());
      setFlagFeedback(
        feedbackFromEnvelope(
          envelope,
          "플래그를 제출하지 못했습니다. 잠시 후 다시 시도해주세요",
        ),
      );
      if (envelope?.code === "ALREADY_SOLVED") {
        detail.applySolved();
        await detail.refresh();
      }
    } finally {
      actionInFlight.current = false;
      if (mounted.current) setPendingAction(null);
    }
  };

  const runInstanceAction = async (action) => {
    if (actionInFlight.current || unavailable || detail.status !== "success")
      return;
    const allowed = {
      create: controls.canCreate,
      extend: controls.canExtend,
      restart: controls.canRestart,
      stop: controls.canStop,
    };
    if (!allowed[action]) return;
    actionInFlight.current = true;
    setPendingAction(action);
    setInstanceFeedback(null);
    setConfirmation(null);
    try {
      const requests = {
        create: () => createInstance({ challengeId }),
        extend: () => extendInstance(instance.instanceId),
        restart: () => resetInstance(instance.instanceId),
        stop: () => stopInstance(instance.instanceId),
      };
      const response = await requests[action]();
      if (!mounted.current) return;
      setInstanceFeedback(
        feedbackFromEnvelope(
          response.data,
          "인스턴스 요청을 처리하지 못했습니다",
        ),
      );
      if (isSuccess(response.data)) detail.applyInstance(response.data.data);
    } catch (error) {
      if (mounted.current)
        setInstanceFeedback(
          feedbackFromEnvelope(
            error?.response?.data,
            "인스턴스 요청을 처리하지 못했습니다. 상태를 확인한 뒤 다시 시도해주세요",
          ),
        );
    } finally {
      actionInFlight.current = false;
      if (mounted.current) setPendingAction(null);
    }
  };

  const requestAction = (action) => {
    if (actionInFlight.current || unavailable) return;
    if (action === "create" && !otherInstance) runInstanceAction(action);
    else if (action === "extend") runInstanceAction(action);
    else
      setConfirmation({
        action,
        trigger: document.activeElement,
        instanceId:
          action === "create"
            ? otherInstance?.instanceId
            : instance?.instanceId,
      });
  };

  const confirmAction = () => {
    const currentId =
      confirmation?.action === "create"
        ? otherInstance?.instanceId
        : instance?.instanceId;
    const allowed = {
      create: controls.canCreate,
      restart: controls.canRestart,
      stop: controls.canStop,
    };
    if (!confirmation) return;
    if (
      confirmation.instanceId !== currentId ||
      unavailable ||
      !allowed[confirmation.action]
    ) {
      setConfirmation(null);
      setInstanceFeedback({
        type: "error",
        message:
          "인스턴스 상태가 변경됐습니다. 현재 상태를 확인한 뒤 다시 선택해주세요",
      });
      return;
    }
    runInstanceAction(confirmation.action);
  };

  return (
    <ChallengeDetailScreen
      loading={detail.status === "loading"}
      pageError={detail.pageError}
      refreshError={detail.refreshError}
      refreshing={detail.refreshing}
      instanceError={detail.instanceError}
      challenge={challenge}
      submission={submission}
      instance={instance}
      otherInstance={otherInstance}
      controls={controls}
      flagValue={flagValue}
      onFlagChange={setFlagValue}
      onSubmitFlag={handleSubmitFlag}
      onInstanceAction={requestAction}
      retrySeconds={retrySeconds}
      flagFeedback={flagFeedback}
      instanceFeedback={instanceFeedback}
      pendingAction={pendingAction}
      submitDisabled={
        pendingAction != null ||
        !flagValue.trim() ||
        retrySeconds > 0 ||
        submission.blocked ||
        Boolean(detail.refreshError)
      }
      instanceUnavailable={unavailable}
      confirmation={confirmation}
      onConfirmAction={confirmAction}
      onCancelAction={() => setConfirmation(null)}
      onRetry={detail.retry}
      onBack={() => navigate(ROUTES.openChallenges)}
    />
  );
}
