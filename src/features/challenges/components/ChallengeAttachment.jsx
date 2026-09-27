import { useEffect, useRef, useState } from "react";
import { downloadChallengeFile } from "../../../api/challenges.js";
import {
  fileDownloadError,
  getAttachmentDownload,
  safeDownloadName,
  validateFileBlob,
} from "../utils/challengeFileDownload.js";
import styles from "./ChallengeDetailScreen.module.css";

export default function ChallengeAttachment({ attachment }) {
  const target = getAttachmentDownload(attachment);
  const request = useRef(null);
  const objectUrls = useRef(new Map());
  const [state, setState] = useState({ status: "idle", message: "" });

  useEffect(
    () => () => {
      request.current?.abort();
      for (const [url, timer] of objectUrls.current) {
        clearTimeout(timer);
        URL.revokeObjectURL(url);
      }
      objectUrls.current.clear();
    },
    [],
  );

  async function download() {
    if (request.current || target?.kind !== "authenticated") return;
    const controller = new AbortController();
    request.current = controller;
    setState({ status: "loading", message: "파일을 받는 중입니다" });
    try {
      const response = await downloadChallengeFile(
        target.challengeId,
        target.fileId,
        { signal: controller.signal },
      );
      if (controller.signal.aborted) return;
      const blob = await validateFileBlob(response.data);
      if (controller.signal.aborted) return;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = safeDownloadName(attachment.name);
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      const timer = setTimeout(() => {
        URL.revokeObjectURL(url);
        objectUrls.current.delete(url);
      }, 10000);
      objectUrls.current.set(url, timer);
      setState({
        status: "success",
        message: "브라우저 다운로드 목록을 확인해주세요",
      });
    } catch (error) {
      if (!controller.signal.aborted)
        setState({ status: "error", message: fileDownloadError(error) });
    } finally {
      if (request.current === controller) request.current = null;
    }
  }

  function cancel() {
    request.current?.abort();
    request.current = null;
    setState({ status: "idle", message: "다운로드를 취소했습니다" });
  }

  return (
    <li className={styles.attachmentRow}>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        aria-hidden="true"
      >
        <path d="M7 3h7l4 4v14H7zM14 3v5h4M10 12h5M10 16h5" />
      </svg>
      <div className={styles.attachmentInfo}>
        {target?.kind === "authenticated" ? (
          <button
            type="button"
            className={styles.attachmentButton}
            disabled={state.status === "loading"}
            onClick={download}
            title={attachment.name}
          >
            {attachment.name}
          </button>
        ) : target?.kind === "public" ? (
          <a
            href={target.url}
            download
            rel="noopener noreferrer"
            title={attachment.name}
          >
            {attachment.name}
          </a>
        ) : (
          <span className={styles.attachmentName}>{attachment.name}</span>
        )}
        <span className={styles.fileSize}>
          {attachment.sizeLabel}
          {!target && " · 다운로드 준비 중"}
        </span>
        {state.message && (
          <span
            role={state.status === "error" ? "alert" : "status"}
            className={
              state.status === "error" ? styles.downloadError : styles.fileSize
            }
          >
            {state.message}
          </span>
        )}
      </div>
      {state.status === "loading" ? (
        <button
          type="button"
          className={styles.downloadCancel}
          onClick={cancel}
        >
          취소
        </button>
      ) : (
        target && (
          <span className={styles.downloadIcon} aria-hidden="true">
            ↓
          </span>
        )
      )}
    </li>
  );
}
