export function parseReleaseFile(text) {
  let parsed;
  try { parsed = JSON.parse(text); }
  catch { throw new Error("JSON 파일을 읽을 수 없습니다"); }
  const artifact = parsed?.artifact ?? parsed;
  if (!artifact || typeof artifact !== "object" || Array.isArray(artifact)
      || !["2.0", "2.1"].includes(artifact.schema_version)
      || !Array.isArray(artifact.workload?.containers)
      || artifact.workload.containers.length === 0
      || artifact.workload.containers.some((container) => !container || typeof container !== "object" || Array.isArray(container)
        || typeof container.name !== "string"
        || [container.env, container.secret_env].some((entries) => entries !== undefined
          && (!entries || typeof entries !== "object" || Array.isArray(entries)
            || Object.values(entries).some((value) => typeof value !== "string"))))) {
    throw new Error("CI에서 받은 실행 릴리스 파일을 선택해주세요");
  }
  return artifact;
}

export function orderReleasesByPublication(releases) {
  return [...releases].sort((left, right) =>
    right.registry_revision - left.registry_revision || right.version - left.version);
}

export function releaseRequirements(artifact, secrets = []) {
  const containers = artifact.workload.containers.map((container) => ({
    name: container.name,
    envNames: Object.keys(container.env ?? {}).sort(),
    secretBindings: Object.entries(container.secret_env ?? {}).sort(([a], [b]) => a.localeCompare(b)),
  }));
  const requiredSecrets = [...new Set(containers.flatMap((container) => container.secretBindings.map(([, name]) => name)))].sort();
  const storedNames = new Set(secrets.map((secret) => secret.name));
  return { containers, requiredSecrets, missingSecrets: requiredSecrets.filter((name) => !storedNames.has(name)) };
}

export function validateRuntimeSecret(name, value) {
  if (!/^[a-z][a-z0-9_]{0,63}$/.test(name)) return "이름은 소문자로 시작하고 숫자·밑줄을 포함한 64자 이하여야 합니다";
  if (!value || value.includes("\0")) return "비밀값을 입력해주세요";
  if (new TextEncoder().encode(value).length > 4096) return "비밀값은 4096바이트 이하여야 합니다";
  return "";
}

export function releaseSettingsDraft(release) {
  return release.containers.map((container) => ({
    name: container.name,
    env: Object.entries(container.env ?? {}).map(([name, value]) => ({ name, value })),
    secret_env: (container.secret_bindings ?? []).map((binding) => ({ name: binding.env_name, value: binding.name ?? "" })),
  }));
}

export function buildDerivedSettings(draft, secrets) {
  const available = new Set(secrets.map((secret) => secret.name));
  const containers = draft.map((container) => {
    const env = {};
    const secret_env = {};
    for (const row of container.env) {
      const name = row.name.trim();
      if (!/^[A-Z_][A-Z0-9_]{0,63}$/.test(name)) throw new Error(`${container.name}: 환경변수 이름을 확인해주세요`);
      if (/SECRET|TOKEN|PASSWORD|PASSWD|(?:^|_)PASS(?:_|$)|PRIVATE_KEY|API_KEY|CREDENTIAL|SIGNING_KEY|CARTRIDGE_KEY|(?:^|_)FLAG$/.test(name)) throw new Error(`${name}은 비밀값 연결에서 설정해주세요`);
      if (Object.hasOwn(env, name)) throw new Error(`${container.name}: ${name}이 중복됐습니다`);
      env[name] = row.value;
    }
    for (const row of container.secret_env) {
      const name = row.name.trim();
      const alias = row.value.trim();
      if (!/^[A-Z_][A-Z0-9_]{0,63}$/.test(name)) throw new Error(`${container.name}: 비밀값 주입 이름을 확인해주세요`);
      if (!/^[a-z][a-z0-9_]{0,63}$/.test(alias) || !available.has(alias)) throw new Error(`${container.name}: ${name}에 연결할 비밀값을 먼저 저장해주세요`);
      if (name === "FLAG" && alias !== "flag") throw new Error("FLAG에는 flag 비밀값만 연결할 수 있습니다");
      if (Object.hasOwn(env, name) || Object.hasOwn(secret_env, name)) throw new Error(`${container.name}: ${name}이 중복됐습니다`);
      secret_env[name] = alias;
    }
    if (Object.keys(env).length + Object.keys(secret_env).length > 128) throw new Error(`${container.name}: 환경변수는 합쳐서 128개까지 저장할 수 있습니다`);
    return { name: container.name, env, secret_env };
  });
  return { containers };
}

// 배포 버전의 출처: 백엔드가 origin 을 주면 그 값을, 아니면 지금 응답 필드로 가른다
// derived_from_release_id 가 있으면 플랫폼에서 고친 버전, CI 자동 수집과 GitHub 발행본 가져오기는 note 로 남는다
export const RELEASE_ORIGINS = {
  GITHUB: { label: "GitHub 원본", tone: "blue" },
  PLATFORM: { label: "플랫폼 수정", tone: "purple" },
  MANUAL: { label: "수동 등록", tone: "neutral" },
  BACKFILL: { label: "이전 기록", tone: "quiet" },
};
const GITHUB_NOTE = /^(공급망 자동 등록|GitHub 발행본 가져오기|GitHub CI)/;

export function releaseOrigin(release) {
  if (RELEASE_ORIGINS[release?.origin]) return release.origin;
  if (release?.derived_from_release_id) return "PLATFORM";
  if (release?.source_ref === "backfill" || release?.registry_revision === 0) return "BACKFILL";
  if (GITHUB_NOTE.test(String(release?.note ?? ""))) return "GITHUB";
  return "MANUAL";
}

// GitHub 에 가장 최근에 올린 버전: 플랫폼 수정이 아닌 버전 중 발행 번호(실행 번호)가 가장 큰 것
export function latestGithubRelease(releases = []) {
  return releases.filter((release) => releaseOrigin(release) === "GITHUB")
    .sort((a, b) => b.registry_revision - a.registry_revision || b.version - a.version)[0] ?? null;
}

export function describeRelease(release, releases = []) {
  const origin = releaseOrigin(release);
  const base = release?.derived_from_release_id ? releases.find((item) => item.release_id === release.derived_from_release_id) : null;
  const latest = latestGithubRelease(releases);
  return {
    origin, ...RELEASE_ORIGINS[origin],
    baseVersion: base?.version ?? null,
    isLatestGithub: Boolean(latest && latest.release_id === release?.release_id),
    newerGithub: latest && release && latest.release_id !== release.release_id && latest.registry_revision > (release.registry_revision ?? 0) ? latest : null,
  };
}
