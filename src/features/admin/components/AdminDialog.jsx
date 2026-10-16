import { useEffect, useRef } from "react";
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
  useEffect(() => {
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
  return (
    <div
      className={
        variant === "payment"
          ? styles.overlay
          : variant === "workspace" ? workspace.overlay
          : "fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      }
    >
      <section
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={
          variant === "payment"
            ? styles.dialog
            : variant === "workspace" ? workspace.dialog
            : `max-h-[90vh] w-full ${wide ? "max-w-4xl" : "max-w-lg"} overflow-y-auto rounded-xl border border-admin-divider bg-[#f3e6cf] p-5 text-admin-ink shadow-xl`
        }
      >
        <header
          className={
            variant === "payment"
              ? styles.dialogHeader
              : variant === "workspace" ? workspace.dialogHeader
              : "mb-3 flex items-center justify-between gap-3"
          }
        >
          {variant === "workspace" ? <div className={workspace.dialogHeading}>
            <h2>{title}</h2>
            {subtitle && <p className={workspace.dialogSubtitle}>{subtitle}</p>}
          </div> : <h2
            className={
              variant === "payment" || variant === "workspace" ? undefined : "font-im-fell text-xl"
            }
          >
            {title}
          </h2>}
          {variant === "workspace" && headerMeta}
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            aria-label="닫기"
            className={
              variant === "payment"
                ? styles.iconButton
                : variant === "workspace" ? workspace.closeButton
                : "rounded border border-admin-divider px-3 py-1 text-sm disabled:opacity-50"
            }
          >
            {variant === "payment" ? <PaymentIcon name="close" /> : variant === "workspace"
              ? <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="m6 6 12 12M18 6 6 18"/></svg>
              : "닫기"}
          </button>
        </header>
        {variant === "workspace" ? <div className={workspace.dialogBody}>{children}</div> : children}
      </section>
    </div>
  );
}
