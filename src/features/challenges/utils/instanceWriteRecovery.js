// Match the operation receipt or the exact instance whose deletion was requested.
export function attachInstanceWriteRecovery(feedback, error, action, challengeId, instanceId) {
  if (feedback?.type !== "error") return feedback;
  const serverFailure = error?.response?.status >= 500;
  const networkFailure = !error?.response &&
    ["ERR_NETWORK", "ECONNABORTED", "ETIMEDOUT"].includes(error?.code);
  if (action === "stop") {
    const stateAlreadyChanged = error?.response?.status === 400 &&
      error?.response?.data?.code === "INVALID_STATE_TRANSITION";
    if (
      !(serverFailure || networkFailure || stateAlreadyChanged) ||
      typeof instanceId !== "string" || !instanceId ||
      typeof challengeId !== "string" || !challengeId
    ) return feedback;
    return { ...feedback, recovery: { action, instanceId, challengeId } };
  }
  const operationId = error?.response?.data?.data?.operation_id;
  if (
    !["create", "restart"].includes(action) ||
    !serverFailure ||
    typeof operationId !== "string" ||
    !operationId
  ) return feedback;

  return { ...feedback, recovery: { operationId, challengeId } };
}

export function isConfirmedInstanceWrite(feedback, instance) {
  const recovery = feedback?.recovery;
  if (feedback?.type !== "error") return false;
  if (recovery?.action === "stop") {
    return Boolean(
      recovery.instanceId && recovery.challengeId &&
      instance?.instance_id === recovery.instanceId &&
      instance.challenge_id === recovery.challengeId &&
      instance.status === "CLEANED"
    );
  }
  return Boolean(
    recovery?.operationId &&
    instance?.instance_id &&
    instance.challenge_id === recovery.challengeId &&
    instance.operation_id === recovery.operationId
  );
}
