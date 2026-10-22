import { useEffect, useRef, useState } from "react";
import { downloadAdminChallengeFile } from "../../../api/admin.js";
import { safeDownloadName, validateFileBlob } from "../../challenges/utils/challengeFileDownload.js";
import styles from "./AdminWorkspace.module.css";

function downloadError(failure) {
  return failure?.response?.status === 503
    ? "파일 저장소에 연결하지 못했습니다 인증과 읽기 권한을 확인해주세요"
    : failure?.response?.status === 404 ? "저장소에서 ZIP 파일을 찾지 못했습니다 파일 수집 상태를 확인해주세요"
    : failure?.response?.status === 403 ? "파일을 받을 관리자 권한이 없습니다"
    : "ZIP을 받지 못했습니다 잠시 후 다시 시도해주세요";
}

// ZIP 받기 단추: 고정 경로로 받은 응답이 zip 인지 확인한 뒤 저장한다
export function AdminDownloadButton({ fetchFile, fileName, label = "ZIP 받기", ariaLabel, disabled = false, small = false }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const request = useRef(null);
  useEffect(() => () => request.current?.abort(), []);
  async function download() {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true); setError("");
    try {
      const response = await fetchFile({ signal: controller.signal });
      const blob = await validateFileBlob(response.data);
      if (controller.signal.aborted) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url; link.download = safeDownloadName(fileName);
      document.body.append(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (failure) {
      if (!controller.signal.aborted) setError(downloadError(failure));
    } finally {
      request.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  return <div>
    <button type="button" className={small ? `${styles.button} ${styles.small}` : styles.button} disabled={disabled || busy}
      aria-label={ariaLabel} onClick={download}>{busy ? "받는 중…" : label}</button>
    {error && <p role="alert" className={styles.errorNotice}>{error}</p>}
  </div>;
}

export default function AdminFileDownloadButton({ challengeId, file, disabled = false, small = false }) {
  return <AdminDownloadButton fetchFile={(config) => downloadAdminChallengeFile(challengeId, file.file_id, config)} fileName={file.file_name}
    ariaLabel={`발행 ${file.registry_revision} ZIP 받기`} disabled={disabled || !file.download_available} small={small} />;
}
