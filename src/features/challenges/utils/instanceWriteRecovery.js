// Only a receipt for this exact failed operation confirms its outcome.
export function attachInstanceWriteRecovery(feedback, error, action, challengeId) {
  const operationId = error?.response?.data?.data?.operation_id;
  if (
    feedback?.type !== "error" ||
    !["create", "restart"].includes(action) ||
    !(error?.response?.status >= 500) ||
    typeof operationId !== "string" ||
    !operationId
  ) return feedback;

  return { ...feedback, recovery: { operationId, challengeId } };
}

export function isConfirmedInstanceWrite(feedback, instance) {
  const recovery = feedback?.recovery;
  return Boolean(
    feedback?.type === "error" &&
    recovery?.operationId &&
    instance?.instance_id &&
    instance.challenge_id === recovery.challengeId &&
    instance.operation_id === recovery.operationId
  );
}
