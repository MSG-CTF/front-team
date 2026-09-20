// 파일 요청의 JSON 오류도 일반 API와 같은 인증 갱신 경로로 보낸다
export async function readBlobError(response) {
  const body = response?.data;
  if (!(body instanceof Blob) || body.size > 64 * 1024) return;
  const contentType = body.type || response.headers?.["content-type"] || "";
  if (!contentType.toLowerCase().includes("json")) return;
  try {
    const data = JSON.parse(await body.text());
    if (data && typeof data === "object" && !Array.isArray(data))
      response.data = data;
  } catch {
    // HTML 오류나 손상된 본문을 파일 또는 정상 응답으로 취급하지 않는다
  }
}
