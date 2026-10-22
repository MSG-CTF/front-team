import { AppIcon } from "./AdminGlyph.jsx";
import styles from "./AdminWorkspace.module.css";

// 탭: 기본은 분할 단추, primary는 큰 분할 단추, sidebar는 설정 앱처럼 색 아이콘이 달린 세로 목록
const VARIANTS = { primary: styles.primaryTabs, sidebar: styles.sideTabs };

export default function AdminTabs({ idPrefix, label, items, value, onChange, disabled = false, variant }) {
  const vertical = variant === "sidebar";
  function navigate(event, index) {
    const offsets = vertical ? { ArrowDown: 1, ArrowUp: -1, ArrowRight: 1, ArrowLeft: -1 } : { ArrowRight: 1, ArrowLeft: -1 };
    let next;
    if (Object.hasOwn(offsets, event.key)) next = (index + offsets[event.key] + items.length) % items.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = items.length - 1;
    else return;
    event.preventDefault();
    onChange(items[next].id);
    event.currentTarget.parentElement.querySelectorAll('[role="tab"]')[next]?.focus();
  }
  return <div role="tablist" aria-label={label} aria-orientation={vertical ? "vertical" : undefined} className={VARIANTS[variant] ?? styles.tabs}>
    {items.map((item, index) => <button key={item.id} type="button" role="tab"
      id={`${idPrefix}-tab-${item.id}`} aria-controls={`${idPrefix}-panel-${item.id}`}
      aria-selected={value === item.id} tabIndex={value === item.id ? 0 : -1} disabled={disabled}
      onClick={() => onChange(item.id)} onKeyDown={(event) => navigate(event, index)}>
      {item.icon && <AppIcon name={item.icon} tone={item.tone} size={24} />}
      <span className={styles.tabLabel}>{item.label}</span>
      {item.badge != null && <span className={styles.tabBadge}>{item.badge}</span>}
    </button>)}
  </div>;
}
