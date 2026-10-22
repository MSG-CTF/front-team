import { useLayoutEffect, useRef } from "react";
import PaymentIcon from "./PaymentIcon.jsx";
import styles from "./AdminPayments.module.css";
import workspace from "./AdminWorkspace.module.css";

export default function AdminDialog({
  title,
  subtitle,
  headerMeta,
  onClose,
  busy = false,
  variant,
  wide = false,
  children,
}) {
  const panel = useRef(null);
  const latest = useRef({ onClose, busy });
  latest.current = { onClose, busy };
  useLayoutEffect(() => {
    const previous = document.activeElement;
    panel.current?.focus();
    const handleKey = (event) => {
      const dialogs = document.querySelectorAll(
        '[role="dialog"][aria-modal="true"]',
      );
      if (!panel.current || dialogs[dialogs.length - 1] !== panel.current)
        return;
      if (event.key === "Escape" && !latest.current.busy) {
        event.preventDefault();
        latest.current.onClose();
      }
      if (event.key !== "Tab") return;
      const controls = Array.from(
        panel.current.querySelectorAll(
          "button:not(:disabled):not([tabindex='-1']), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], summary, [tabindex='0']",
        ),
      ).filter((element) => element.getClientRects().length > 0);
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (!first) {
        event.preventDefault();
        panel.current.focus();
        return;
      }
      const active = document.activeElement;
      if (!panel.current.contains(active) || active === panel.current) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    // 카메라 전환처럼 포커스된 버튼이 사라져도 모달의 키보드 제어를 유지한다
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  // 결제 창만 별도 틀을 쓰고 나머지는 같은 양피지 창에 폭만 다르게 연다
  const payment = variant === "payment";
  const size = variant === "workspace" ? "" : wide ? workspace.dialogWide : workspace.dialogCompact;
  return (
    <div className={payment ? styles.overlay : workspace.overlay}>
      <section
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={payment ? styles.dialog : `${workspace.dialog} ${size}`}
      >
        <header className={payment ? styles.dialogHeader : workspace.dialogHeader}>
          {payment ? <h2>{title}</h2> : <div className={workspace.dialogHeading}>
            <h2>{title}</h2>
            {subtitle && <p className={workspace.dialogSubtitle}>{subtitle}</p>}
          </div>}
          {!payment && headerMeta}
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            aria-label="닫기"
            className={payment ? styles.iconButton : workspace.closeButton}
          >
            {payment ? <PaymentIcon name="close" />
              : <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="m6 6 12 12M18 6 6 18"/></svg>}
          </button>
        </header>
        {payment ? children : <div className={workspace.dialogBody}>{children}</div>}
      </section>
    </div>
  );
}
