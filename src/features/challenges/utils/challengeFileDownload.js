import { challengeFilePath } from "../../../api/challenges.js";

export function getAttachmentDownload(
  attachment,
  origin = globalThis.location?.origin || "http://localhost",
) {
  if (typeof attachment?.url !== "string" || !attachment.url.trim())
    return null;
  try {
    const url = new URL(attachment.url, origin);
    if (
      !["https:", "http:"].includes(url.protocol) ||
      url.username ||
      url.password
    )
      return null;
    if (url.pathname.startsWith("/api/")) {
      const path = `/api/v1${challengeFilePath(attachment.challengeId, attachment.fileId)}`;
      if (
        url.origin !== origin ||
        url.pathname !== path ||
        url.search ||
        url.hash
      )
        return null;
      return {
        kind: "authenticated",
        challengeId: attachment.challengeId,
        fileId: attachment.fileId,
      };
    }
    return { kind: "public", url: url.href };
  } catch {
    return null;
  }
}

export function safeDownloadName(value) {
  const name =
    typeof value === "string"
      ? value
          .replace(/[\\/:*?"<>|\u0000-\u001f\u007f]/g, "_")
          .trim()
          .slice(0, 180)
      : "";
  return name && !/^\.+$/.test(name) ? name : "user-files.zip";
}

export async function validateFileBlob(blob) {
  const type = blob?.type?.split(";")[0].toLowerCase();
  if (
    !(blob instanceof Blob) ||
    !blob.size ||
    ![
      "application/zip",
      "application/octet-stream",
      "application/x-zip-compressed",
    ].includes(type)
  ) {
    throw new Error("파일 응답을 확인하지 못했습니다 잠시 후 다시 받아주세요");
  }
  const header = new Uint8Array(await blob.slice(0, 4).arrayBuffer());
  const zipHeader =
    header[0] === 0x50 &&
    header[1] === 0x4b &&
    ((header[2] === 3 && header[3] === 4) ||
      (header[2] === 5 && header[3] === 6) ||
      (header[2] === 7 && header[3] === 8));
  if (!zipHeader) throw new Error("ZIP 파일 응답이 아닙니다");
  return blob;
}

export function fileDownloadError(error) {
  const code = error?.response?.data?.code;
  if (["TOKEN_EXPIRED", "TOKEN_INVALID", "TOKEN_MISSING"].includes(code))
    return "로그인이 만료됐습니다 다시 로그인한 뒤 받아주세요";
  if (code === "CHALLENGE_LOCKED" || error?.response?.status === 403)
    return "이 문제의 파일을 받을 권한이 없습니다 문제 개방 상태를 확인해주세요";
  if (error?.response?.status === 404)
    return "현재 파일이 없거나 교체됐습니다 문제를 새로고침한 뒤 다시 받아주세요";
  if (error?.response?.status === 429)
    return "다운로드 요청이 많습니다 잠시 후 다시 받아주세요";
  if (["ECONNABORTED", "ETIMEDOUT"].includes(error?.code))
    return "파일을 받는 시간이 초과됐습니다 연결을 확인한 뒤 다시 받아주세요";
  return "파일을 받지 못했습니다 연결을 확인한 뒤 다시 시도해주세요";
}
