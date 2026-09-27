import { useEffect, useRef, useState } from "react";
import { startPaymentQrScanner } from "../utils/paymentQrScanner.js";
import AdminDialog from "./AdminDialog.jsx";
import PaymentIcon from "./PaymentIcon.jsx";
import styles from "./AdminPayments.module.css";

export default function AdminQrScanner({
  onToken,
  onClose,
  onManual = onClose,
}) {
  const video = useRef(null);
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;
  const [attempt, setAttempt] = useState(0);
  const [facingMode, setFacingMode] = useState("environment");
  const [state, setState] = useState("starting");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    setState("starting");
    setMessage("");
    const scanner = startPaymentQrScanner(video.current, {
      facingMode,
      onToken: (token) => {
        if (active) onTokenRef.current(token);
      },
      onError: (error) => {
        if (active) {
          setState("error");
          setMessage(error);
        }
      },
      onStatus: (status) => {
        if (active) setState(status);
      },
      onInvalid: (notice) => {
        if (active) setMessage(notice);
      },
    });
    const pause = () => {
      if (!document.hidden) return;
      scanner.stop();
      setState("paused");
      setMessage("화면을 벗어나 카메라를 껐습니다 다시 시작해 QR을 읽어주세요");
    };
    document.addEventListener("visibilitychange", pause);
    pause();
    return () => {
      active = false;
      scanner.stop();
      document.removeEventListener("visibilitychange", pause);
    };
  }, [attempt, facingMode]);

  return (
    <AdminDialog variant="payment" title="참가자 QR 읽기" onClose={onClose}>
      <p className={styles.scannerLead}>
        QR을 화면 안에
        <br />
        맞춰주세요
      </p>
      <div
        hidden={["error", "paused"].includes(state)}
        className={styles.cameraPreview}
      >
        <video
          ref={video}
          muted
          playsInline
          autoPlay
          aria-label="QR 카메라 화면"
        />
        {state === "scanning" && (
          <div className={styles.viewfinder}>
            <PaymentIcon name="corners" />
          </div>
        )}
        {state === "starting" && (
          <p role="status" className={styles.cameraStarting}>
            카메라 연결 중<br />
            권한 요청이 나오면 허용해주세요
          </p>
        )}
      </div>
      {["error", "paused"].includes(state) && (
        <div className={styles.scannerError}>
          <PaymentIcon name="camera" />
        </div>
      )}
      {message && (
        <p
          role={state === "error" ? "alert" : "status"}
          className={state === "error" ? styles.error : styles.notice}
        >
          {message}
        </p>
      )}
      <p className={styles.scannerHint}>
        참가자 마이페이지의 결제 QR을 읽어주세요
        <br />
        QR을 읽는 것만으로 결제되지는 않아요
      </p>
      <div className={styles.scannerActions}>
        {["error", "paused"].includes(state) && (
          <button
            type="button"
            className={styles.primaryButton}
            onClick={() => setAttempt((value) => value + 1)}
          >
            다시 시작
          </button>
        )}
        {state === "scanning" && (
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() =>
              setFacingMode((mode) =>
                mode === "environment" ? "user" : "environment",
              )
            }
          >
            카메라 전환
          </button>
        )}
        <button type="button" className={styles.textButton} onClick={onManual}>
          토큰 직접 입력
        </button>
      </div>
    </AdminDialog>
  );
}
