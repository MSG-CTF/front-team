export function validateSignature(form, editing = false) {
  if (!editing && !form.clubId) return "동아리를 선택하세요";
  if (!form.title.trim() || [...form.title.trim()].length > 200) return "제목은 1~200자로 입력하세요";
  if (!form.description.trim()) return "문제 설명을 입력하세요";
  // 수정에서 빈 입력은 기존 플래그 유지, 새 플래그의 공백은 원문 그대로 전송
  if ((!editing && !form.flag) || [...form.flag].length > 512) return "플래그는 1~512자로 입력하세요";
  const score = String(form.score).trim();
  if (!/^\d{1,10}(\.\d{1,2})?$/.test(score) || Number(score) <= 0 || Number(score) > 9999999999.99) {
    return "점수는 0.01~9999999999.99 사이로 소수 둘째 자리까지 입력하세요";
  }
  return "";
}

export function signaturePayload(form, editing = false) {
  return {
    ...(editing ? {} : { clubId: form.clubId }),
    title: form.title.trim(), description: form.description.trim(), score: Number(form.score),
    ...(!editing || form.flag !== "" ? { flag: form.flag } : {}),
  };
}
