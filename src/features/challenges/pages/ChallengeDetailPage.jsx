import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { submitFlag } from "../../../api/challenges.js";
import {
  createInstance,
  extendInstance,
  resetInstance,
} from "../../../api/instances.js";
import { isSuccess } from "../../../utils/response.js";
import ChallengeDetailScreen from "../components/ChallengeDetailScreen.jsx";
import useChallengeDetailData from "../hooks/useChallengeDetailData.js";
import {
  mapChallengeDetail,
  mapChallengeInstance,
} from "../utils/challengeDetailMapper.js";

function feedbackFromEnvelope(envelope, fallbackMessage) {
  const retryAfterSeconds = envelope?.data?.retry_after_seconds;
  const retryMessage = retryAfterSeconds == null
    ? ""
    : ` (${retryAfterSeconds}초 후 재시도)`;

  return {
    type: isSuccess(envelope) ? "success" : "error",
    code: envelope?.code || "REQUEST_FAILED",
    message: `${envelope?.message || fallbackMessage}${retryMessage}`,
  };
}

function feedbackFromError(error, fallbackMessage) {
  return feedbackFromEnvelope(error?.response?.data, fallbackMessage);
}

export default function ChallengeDetailPage() {
  const { challengeId } = useParams();
  const navigate = useNavigate();
  const challengeDetail = useChallengeDetailData(challengeId);
  const actionInFlight = useRef(false);
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

  const handleSubmitFlag = async () => {
    if (!flagValue || actionInFlight.current) return;

    actionInFlight.current = true;
    setPendingAction("submit-flag");
    setFeedback(null);
    try {
      const response = await submitFlag(challengeId, { flag: flagValue });
      const envelope = response.data;
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
      setFeedback(feedbackFromError(error, "플래그를 제출하지 못했습니다."));
    } finally {
      actionInFlight.current = false;
      setPendingAction(null);
    }
  };

  const runInstanceAction = async (actionName, request, fallbackMessage) => {
    if (actionInFlight.current) return;

    actionInFlight.current = true;
    setPendingAction(actionName);
    setFeedback(null);
    try {
      const response = await request();
      const envelope = response.data;
      const nextFeedback = feedbackFromEnvelope(envelope, fallbackMessage);
      setFeedback(nextFeedback);

      if (isSuccess(envelope)) {
        await challengeDetail.refreshInstance();
      }
    } catch (error) {
      setFeedback(feedbackFromError(error, fallbackMessage));
    } finally {
      actionInFlight.current = false;
      setPendingAction(null);
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

  return (
    <ChallengeDetailScreen
      loading={challengeDetail.status === "loading"}
      pageError={challengeDetail.pageError}
      instanceError={challengeDetail.instanceError}
      challenge={challenge}
      instance={instance}
      flagValue={flagValue}
      onFlagChange={setFlagValue}
      onSubmitFlag={handleSubmitFlag}
      onCreateInstance={handleCreateInstance}
      onExtendInstance={handleExtendInstance}
      onRestartInstance={handleRestartInstance}
      feedback={feedback}
      actionPending={pendingAction != null}
      submitDisabled={
        pendingAction != null
        || flagValue.length === 0
        || Boolean(challenge?.solved)
      }
      onRetry={() => challengeDetail.retry()}
      onBack={() => navigate(-1)}
    />
  );
}
