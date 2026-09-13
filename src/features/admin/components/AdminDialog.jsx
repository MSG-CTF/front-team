import { useEffect, useRef } from "react";

export default function AdminDialog({ title, onClose, busy = false, children }) {
  const panel = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    panel.current?.focus();
    return () => previous?.focus();
  }, []);
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
    <section ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title}
      className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-admin-divider bg-[#f3e6cf] p-5 text-admin-ink shadow-xl"
      onKeyDown={(event) => {
        if (event.key === "Escape" && !busy) { event.preventDefault(); onClose(); }
        if (event.key === "Tab") {
          const controls = Array.from(panel.current.querySelectorAll("button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled)"));
          const first = controls[0];
          const last = controls[controls.length - 1];
          if (!first) { event.preventDefault(); return; }
          if (event.shiftKey && [first, panel.current].includes(document.activeElement)) { event.preventDefault(); last.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        }
      }}>
      <header className="mb-3 flex items-center justify-between gap-3"><h2 className="font-im-fell text-xl">{title}</h2>
        <button type="button" disabled={busy} onClick={onClose} className="rounded border border-admin-divider px-3 py-1 text-sm disabled:opacity-50">닫기</button>
      </header>
      {children}
    </section>
  </div>;
}
