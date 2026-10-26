import { useId, useRef, useState } from "react";
import { endpointConnectionCommand, endpointConnectionDetails, endpointCopyText } from "../utils/instanceConnectionDetails.js";
import styles from "./InstanceConnectionDetails.module.css";

export default function InstanceConnectionDetails({ endpoint, compact = false, buttonClassName }) {
  const dialog = useRef(null);
  const titleId = useId();
  const [copyStatus, setCopyStatus] = useState("");
  const details = endpointConnectionDetails(endpoint);
  const command = endpointConnectionCommand(endpoint);
  const copyText = endpointCopyText(endpoint);
  if (!details.length) return null;
  const content = <div className={styles.connection}>
    <dl className={styles.details} aria-label="연결 설정">
      {details.map(({ label, value }) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
    </dl>
    {!endpoint.isWeb && endpoint.tls === true && <p className={styles.hint}>
      TLS 클라이언트로 접속하세요{typeof endpoint.server_name === "string" && endpoint.server_name
        ? " · SNI를 표시된 값으로 지정하세요" : ""}
    </p>}
    {!copyText && <p className={styles.hint} role="status">접속 정보를 확인할 수 없습니다. 잠시 후 다시 확인해주세요.</p>}
  </div>;
  if (!compact) return content;
  async function copy() {
    if (!copyText) return;
    try {
      await navigator.clipboard.writeText(copyText);
      setCopyStatus(command ? "접속 명령을 복사했습니다" : "접속 정보를 복사했습니다");
    } catch {
      setCopyStatus("복사하지 못했습니다 아래 정보를 선택해 복사해주세요");
    }
  }
  return <>
    <button type="button" className={buttonClassName} aria-label={endpoint.name + " 접속 정보"}
      onClick={() => { setCopyStatus(""); dialog.current.showModal(); }}>정보</button>
    <dialog ref={dialog} className={styles.dialog} aria-labelledby={titleId}>
      <h2 id={titleId}>{endpoint.name} 접속 정보</h2>
      <p className={styles.url}>{command || endpoint.url}</p>
      {content}
      <p role="status">{copyStatus}</p>
      <div className={styles.actions}>
        <button type="button" onClick={copy} disabled={!copyText}>{command ? "접속 명령 복사" : "접속 정보 복사"}</button>
        <button type="button" onClick={() => dialog.current.close()} autoFocus>닫기</button>
      </div>
    </dialog>
  </>;
}
