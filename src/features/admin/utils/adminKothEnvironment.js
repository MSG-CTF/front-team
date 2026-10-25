export const KOTH_ENV_STATES = {
  UNCONFIGURED: { label: "실행 연결 필요", tone: "warn" }, READY: { label: "적용 확인", tone: "good" },
  QUEUED: { label: "적용 대기", tone: "warn" }, APPLYING: { label: "적용 중", tone: "warn" }, FAILED: { label: "적용 실패", tone: "bad" },
};

export function kothEnvironmentBody(versionId, container, method, content, requestId) {
  if (!versionId || !container || !["file", "repository"].includes(method)) throw new Error("설정 버전과 컨테이너를 선택해주세요");
  return { base_version_id: versionId, container, method,
    ...(method === "file" ? { content } : {}), ...(requestId ? { request_id: requestId } : {}),
  };
}

export function manualKothEnvironment(versionId, container, edits, added, requestId) {
  const lines = [], rules = {};
  const seen = new Set();
  function append(name, value, action, kind, required) {
    if (!/^[A-Z_][A-Z0-9_]{0,63}$/.test(name) || seen.has(name)) throw new Error("환경변수 이름과 중복 여부를 확인해주세요");
    seen.add(name);
    if (action === "unset") {
      if (required) throw new Error(`${name}은 필수 항목입니다`);
      lines.push(name);
    } else {
      if (typeof value !== "string" || /[\r\n\0]/.test(value) || new TextEncoder().encode(value).length > 4096) throw new Error(`${name}은 한 줄에 4096바이트 이하로 입력해주세요`);
      // The server removes one outer quote pair and preserves the value literally.
      lines.push(`${name}="${value}"`);
    }
    rules[name] = { kind, required };
  }
  for (const row of container.entries) {
    const edited = edits[row.name];
    if (!edited) continue;
    if (row.locked) throw new Error(`${row.name}은 보호된 연동 설정입니다`);
    append(row.name, edited.value, edited.action, row.kind, row.required);
  }
  if (added?.name?.trim()) {
    const name = added.name.trim();
    if (container.entries.some((row) => row.name === name)) throw new Error(`${name}은 이미 등록된 항목입니다`);
    append(name, added.value, added.action ?? "update", added.kind, added.required);
  }
  if (!lines.length) throw new Error("바꿀 값을 입력해주세요");
  if (lines.length > 128) throw new Error("환경변수는 128개까지 바꿀 수 있습니다");
  return { ...kothEnvironmentBody(versionId, container.name, "file", lines.join("\n"), requestId), rules };
}
