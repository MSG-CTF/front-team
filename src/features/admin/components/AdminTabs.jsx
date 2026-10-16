import styles from "./AdminWorkspace.module.css";

export default function AdminTabs({ idPrefix, label, items, value, onChange, disabled = false, variant }) {
  function navigate(event, index) {
    const offsets = { ArrowRight: 1, ArrowLeft: -1 };
    let next;
    if (Object.hasOwn(offsets, event.key)) next = (index + offsets[event.key] + items.length) % items.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = items.length - 1;
    else return;
    event.preventDefault();
    onChange(items[next].id);
    event.currentTarget.parentElement.querySelectorAll('[role="tab"]')[next]?.focus();
  }
  return <div role="tablist" aria-label={label} className={variant === "primary" ? styles.primaryTabs : styles.tabs}>
    {items.map((item, index) => <button key={item.id} type="button" role="tab"
      id={`${idPrefix}-tab-${item.id}`} aria-controls={`${idPrefix}-panel-${item.id}`}
      aria-selected={value === item.id} tabIndex={value === item.id ? 0 : -1} disabled={disabled}
      onClick={() => onChange(item.id)} onKeyDown={(event) => navigate(event, index)}>
      {item.label}
    </button>)}
  </div>;
}
