export function parseReleaseFile(text) {
  let parsed;
  try { parsed = JSON.parse(text); }
  catch { throw new Error("JSON 파일을 읽을 수 없습니다"); }
  const artifact = parsed?.artifact ?? parsed;
  if (!artifact || typeof artifact !== "object" || Array.isArray(artifact)
      || !["2.0", "2.1"].includes(artifact.schema_version)
      || !Array.isArray(artifact.workload?.containers)
      || artifact.workload.containers.length === 0) {
    throw new Error("CI에서 받은 실행 릴리스 파일을 선택해주세요");
  }
  return artifact;
}

export function validateRuntimeSecret(name, value) {
  if (!/^[a-z][a-z0-9_]{0,63}$/.test(name)) return "이름은 소문자로 시작하고 숫자·밑줄을 포함한 64자 이하여야 합니다";
  if (!value || value.includes("\0")) return "비밀값을 입력해주세요";
  if (new TextEncoder().encode(value).length > 4096) return "비밀값은 4096바이트 이하여야 합니다";
  return "";
}
