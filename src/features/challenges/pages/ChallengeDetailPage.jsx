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
  getRetryDeadline,
  mapChallengeDetail,
  mapChallengeInstance,
} from "../utils/challengeDetailMapper.js";

function feedbackFromEnvelope(envelope, fallbackMessage) {
  return {
    type: isSuccess(envelope) ? "success" : "error",
    code: envelope?.code || "REQUEST_FAILED",
    message: envelope?.message || fallbackMessage,
  };
}

function feedbackFromError(error, fallbackMessage) {
  return feedbackFromEnvelope(error?.response?.data, fallbackMessage);
}

export default function ChallengeDetailPage() {
  const { challengeId } = useParams();
  return <ChallengeDetailContent key={challengeId} challengeId={challengeId} />;
}

function ChallengeDetailContent({ challengeId }) {
  const navigate = useNavigate();
  const challengeDetail = useChallengeDetailData(challengeId);
  const actionInFlight = useRef(false);
  const mounted = useRef(true);
  const [retryAt, setRetryAt] = useState(null);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  const [flagValue, setFlagValue] = useState("");
  const [pendingAction, setPendingAction] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setFlagValue("");
    setFeedback(null);
  }, [challengeId]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const challenge = useMemo(
    () => (
      challengeDetail.challengeData
        ? mapChallengeDetail(challengeDetail.challengeData)
        : null
    ),
    [challengeDetail.challengeData],
  );
  const instance = useMemo(
    () => mapChallengeInstance(challengeDetail.instanceData, now),
    [challengeDetail.instanceData, now],
  );
  const submission = getChallengeSubmissionState(challenge, now);
  const retrySeconds = retryAt == null ? 0 : Math.max(0, Math.ceil((retryAt - now) / 1000));

  const handleSubmitFlag = async () => {
    if (
      !flagValue.trim() || actionInFlight.current || (retryAt != null && Date.now() < retryAt)
      || challengeDetail.status !== "success"
      || getChallengeSubmissionState(challenge).blocked
    ) return;

    actionInFlight.current = true;
    setPendingAction("submit-flag");
    setFeedback(null);
    try {
      const response = await submitFlag(challengeId, { flag: flagValue });
      if (!mounted.current) return;
      const envelope = response.data;
      setRetryAt(getRetryDeadline(envelope));
      setNow(Date.now());
      const nextFeedback = feedbackFromEnvelope(
        envelope,
        "플래그를 제출하지 못했습니다.",
      );
      setFeedback(nextFeedback);

      if (isSuccess(envelope)) {
        setFlagValue("");
        await challengeDetail.refresh();
      }
    } catch (error) {
      if (!mounted.current) return;
      const envelope = error?.response?.data;
      setRetryAt(getRetryDeadline(envelope));
      setNow(Date.now());
      setFeedback(feedbackFromError(error, "플래그를 제출하지 못했습니다."));
      if (envelope?.code === "ALREADY_SOLVED") await challengeDetail.refresh();
    } finally {
      actionInFlight.current = false;
      if (mounted.current) setPendingAction(null);
    }
  };

  const runInstanceAction = async (actionName, request, fallbackMessage) => {
    if (actionInFlight.current) return;

    actionInFlight.current = true;
    setPendingAction(actionName);
    setFeedback(null);
    try {
      const response = await request();
      if (!mounted.current) return;
      const envelope = response.data;
      const nextFeedback = feedbackFromEnvelope(envelope, fallbackMessage);
      setFeedback(nextFeedback);

      if (isSuccess(envelope)) {
        challengeDetail.applyInstance(envelope.data);
      }
    } catch (error) {
      if (mounted.current) setFeedback(feedbackFromError(error, fallbackMessage));
    } finally {
      actionInFlight.current = false;
      if (mounted.current) setPendingAction(null);
    }
  };

  const handleCreateInstance = () => runInstanceAction(
    "create-instance",
    () => createInstance({ challengeId }),
    "인스턴스를 생성하지 못했습니다.",
  );

  const handleExtendInstance = () => {
    if (!instance?.instanceId) return;
    runInstanceAction(
      "extend-instance",
      () => extendInstance(instance.instanceId),
      "인스턴스를 연장하지 못했습니다.",
    );
  };

  const handleRestartInstance = () => {
    if (!instance?.instanceId) return;
    runInstanceAction(
      "reset-instance",
      () => resetInstance(instance.instanceId),
      "인스턴스를 재시작하지 못했습니다.",
    );
  };

  const handleStopInstance = () => {
    if (!instance?.instanceId) return;
    runInstanceAction("stop-instance", () => stopInstance(instance.instanceId), "인스턴스를 종료하지 못했습니다");
  };

  return (
    <ChallengeDetailScreen
      loading={challengeDetail.status === "loading"}
      pageError={challengeDetail.pageError}
      instanceError={challengeDetail.instanceError}
      challenge={challenge}
      submission={submission}
      instance={instance}
      flagValue={flagValue}
      onFlagChange={setFlagValue}
      onSubmitFlag={handleSubmitFlag}
      onCreateInstance={handleCreateInstance}
      onExtendInstance={handleExtendInstance}
      onRestartInstance={handleRestartInstance}
      onStopInstance={handleStopInstance}
      retrySeconds={retrySeconds}
      feedback={feedback}
      actionPending={pendingAction != null}
      submitDisabled={
        pendingAction != null
        || flagValue.trim().length === 0
        || retrySeconds > 0
        || submission.blocked
      }
      onRetry={() => challengeDetail.retry()}
      onBack={() => navigate(ROUTES.openChallenges)}
    />
  );
}
