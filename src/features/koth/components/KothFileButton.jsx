import { useEffect, useRef, useState } from "react";
import { downloadKothFile } from "../../../api/koth.js";
import { fileDownloadError, safeDownloadName, validateFileBlob } from "../../challenges/utils/challengeFileDownload.js";
import { formatFileSize } from "../../challenges/utils/challengeDetailMapper.js";
import styles from "./KothScreen.module.css";

// KoTH 문제 파일 받기: 제오파디 첨부파일처럼 고정 경로만 요청하고 zip 인지 확인한 뒤 저장한다
export default function KothFileButton({ challengeId, file, download = downloadKothFile }) {
  const request = useRef(null);
  const [state, setState] = useState({ status: "idle", message: "" });

  useEffect(() => () => request.current?.abort(), []);

  async function start() {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setState({ status: "loading", message: "파일을 받는 중입니다" });
    try {
      const response = await download(challengeId, { signal: controller.signal });
      const blob = await validateFileBlob(response.data);
      if (controller.signal.aborted) return;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = safeDownloadName(file.name);
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      setState({ status: "success", message: "브라우저 다운로드 목록을 확인해주세요" });
    } catch (error) {
      if (!controller.signal.aborted) setState({ status: "error", message: error?.response ? fileDownloadError(error) : error?.message || fileDownloadError(error) });
    } finally {
      if (request.current === controller) request.current = null;
    }
  }

  return <div className={styles.fileDownload}>
    <button type="button" className={styles.fileButton} onClick={start} disabled={state.status === "loading"} data-file-download>
      {state.status === "loading" ? "받는 중" : "문제 파일 받기"}
    </button>
    <span className={styles.fileMeta}>{file.name}{file.sizeBytes ? ` · ${formatFileSize(file.sizeBytes)}` : ""}</span>
    {state.message && <p className={styles.fileMessage} role={state.status === "error" ? "alert" : "status"}>{state.message}</p>}
  </div>;
}
