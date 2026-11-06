// Match the operation receipt or the exact instance whose deletion was requested.
export function attachInstanceWriteRecovery(feedback, error, action, challengeId, instanceId, snapshot) {
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
  if (!["create", "restart"].includes(action)) return feedback;
  if (serverFailure && typeof operationId === "string" && operationId) {
    return { ...feedback, recovery: { operationId, challengeId } };
  }
  const lostReceipt = networkFailure || [502, 503, 504].includes(error?.response?.status);
  if (
    !lostReceipt || typeof challengeId !== "string" || !challengeId ||
    !snapshot || !Object.hasOwn(snapshot, "replacementInstanceId") ||
    !(snapshot.replacementInstanceId === null ||
      (typeof snapshot.replacementInstanceId === "string" && snapshot.replacementInstanceId)) ||
    (action === "restart" && (!instanceId || snapshot.replacementInstanceId !== instanceId))
  ) return feedback;
  return {
    ...feedback,
    recovery: {
      action, challengeId, lostReceipt: true,
      baselineInstanceId: instanceId || null,
      baselineOperationId: snapshot.operationId || null,
      replacementInstanceId: snapshot.replacementInstanceId,
    },
  };
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
  if (recovery?.lostReceipt) {
    return Boolean(
      typeof instance?.instance_id === "string" && instance.instance_id &&
      typeof instance.operation_id === "string" && instance.operation_id &&
      instance.instance_id !== recovery.baselineInstanceId &&
      instance.operation_id !== recovery.baselineOperationId &&
      instance.challenge_id === recovery.challengeId &&
      instance.status === "RUNNING" &&
      Object.hasOwn(instance, "replaced_instance_id") &&
      instance.replaced_instance_id === recovery.replacementInstanceId
    );
  }
  return Boolean(
    recovery?.operationId &&
    instance?.instance_id &&
    instance.challenge_id === recovery.challengeId &&
    instance.operation_id === recovery.operationId
  );
}
