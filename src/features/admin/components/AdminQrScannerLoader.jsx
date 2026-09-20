import { Component, lazy, Suspense } from "react";
import AdminDialog from "./AdminDialog.jsx";
import styles from "./AdminPayments.module.css";

const Scanner = lazy(() => import("./AdminQrScanner.jsx"));

class ScannerBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <AdminDialog
          variant="payment"
          title="참가자 QR 읽기"
          onClose={this.props.onClose}
        >
          <p role="alert" className={styles.error}>
            카메라 기능을 불러오지 못했습니다 연결을 확인한 뒤 페이지를
            새로고침하거나 토큰을 직접 입력해주세요
          </p>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={this.props.onManual || this.props.onClose}
          >
            토큰 직접 입력
          </button>
        </AdminDialog>
      );
    return this.props.children;
  }
}

export default function AdminQrScannerLoader(props) {
  return (
    <ScannerBoundary onClose={props.onClose} onManual={props.onManual}>
      <Suspense
        fallback={
          <AdminDialog
            variant="payment"
            title="참가자 QR 읽기"
            onClose={props.onClose}
          >
            <p role="status">카메라 기능을 불러오는 중</p>
          </AdminDialog>
        }
      >
        <Scanner {...props} />
      </Suspense>
    </ScannerBoundary>
  );
}
