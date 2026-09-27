import { useEffect, useRef } from "react";
import PaymentIcon from "./PaymentIcon.jsx";
import styles from "./AdminPayments.module.css";

export default function AdminDialog({
  title,
  onClose,
  busy = false,
  variant,
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
          "button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex='0']",
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
            : "max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-admin-divider bg-[#f3e6cf] p-5 text-admin-ink shadow-xl"
        }
      >
        <header
          className={
            variant === "payment"
              ? styles.dialogHeader
              : "mb-3 flex items-center justify-between gap-3"
          }
        >
          <h2
            className={
              variant === "payment" ? undefined : "font-im-fell text-xl"
            }
          >
            {title}
          </h2>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            aria-label="닫기"
            className={
              variant === "payment"
                ? styles.iconButton
                : "rounded border border-admin-divider px-3 py-1 text-sm disabled:opacity-50"
            }
          >
            {variant === "payment" ? <PaymentIcon name="close" /> : "닫기"}
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
