export function kothLivePreviewUrl(data, challengeUrl) {
  const error = () => new Error("게임 테스트 접속 주소를 확인하지 못했습니다");
  let expected, actual;
  try {
    expected = new URL(challengeUrl);
    actual = new URL(data?.preview_url);
  } catch { throw error(); }
  if (expected.protocol !== "https:" || actual.origin !== expected.origin || actual.username || actual.password
    || actual.pathname !== "/__operator/preview" || actual.search
    || [...new URLSearchParams(actual.hash.slice(1)).keys()].length !== 1
    || !new URLSearchParams(actual.hash.slice(1)).get("ticket")
    || new URLSearchParams(actual.hash.slice(1)).get("ticket").length > 2048
    || !Number.isInteger(data.expires_in_seconds) || data.expires_in_seconds < 1 || data.expires_in_seconds > 300) throw error();
  return actual.href;
}
