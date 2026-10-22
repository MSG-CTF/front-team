import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { describeContest } from "../utils/adminContest.js";
import { AppIcon, Glyph } from "./AdminGlyph.jsx";
import ui from "./AdminWorkspace.module.css";
import styles from "./AdminWidgets.module.css";

// 위젯 카드: 머리에 이름과 개수 배지, 오른쪽에 "모두 보기"
// 몸통은 안쪽 스크롤 없이 정해진 줄 수만 보이고 나머지는 "모두 보기"로 넘긴다
export function Widget({ id, title, count, countTone = "bad", meta, more, tools, children, className = "", bodyClassName = "", flush = false }) {
  return <section className={`${ui.card} ${ui.widget} ${className}`} aria-labelledby={id}>
    <header className={styles.widgetHead}>
      <h2 id={id} className={styles.widgetTitle}>
        <span>{title}</span>
        {count != null && <span className={styles.count} data-tone={count > 0 ? countTone : "none"}>{count}</span>}
      </h2>
      {(meta || more || tools) && <div className={styles.widgetTools}>
        {meta && <span className={styles.widgetMeta}>{meta}</span>}
        {tools}
        {more && <Link to={more.to} className={styles.more}>{more.label ?? "모두 보기"}<Glyph name="chevronRight" size={12} strokeWidth={2.4} /></Link>}
      </div>}
    </header>
    <div className={`${flush ? styles.widgetFlush : styles.widgetBody} ${ui.widgetBody} ${bodyClassName}`}>{children}</div>
  </section>;
}

// 지표 묶음: 카드 한 장 안에서 칸마다 가는 세로 선 칸은 눌러서 그 목록으로 들어가는 입구다
export function StatStrip({ children, className = "", label, flush = false }) {
  return <div className={`${flush ? styles.stripFlush : `${ui.card} ${styles.strip}`} ${className}`} role={label ? "group" : undefined} aria-label={label}>{children}</div>;
}

// 지표 칸: 이름, 큰 숫자, 보조 설명 문양은 두지 않는다
export function StatTile({ tone, label, value, unit, sub, alert = false, to, title, text = false }) {
  const body = <>
    <span className={styles.statHead}><span>{label}</span></span>
    <span className={styles.statValue} data-alert={alert || undefined} data-text={text || undefined}>{value}{unit && <small>{unit}</small>}</span>
    {sub && <span className={styles.statSub}>{sub}</span>}
  </>;
  const shared = { className: `${styles.stat}${to ? ` ${styles.statLink}` : ""}`, "data-tone": tone, title };
  return to ? <Link to={to} {...shared}>{body}</Link> : <div {...shared}>{body}</div>;
}

// 동그란 문양 단추: 새로고침처럼 글자 없이 누르는 단추
export function IconButton({ icon, label, onClick, disabled = false }) {
  return <button type="button" className={styles.iconButton} onClick={onClick} disabled={disabled} aria-label={label} title={label}>
    <Glyph name={icon} size={16} strokeWidth={2} />
  </button>;
}

// 필터 타일: 미리알림 앱의 스마트 목록처럼 왼쪽 위 색 원, 오른쪽 위 개수, 아래 이름 누르면 그 색으로 채워진다
export function SmartGrid({ children, label, className = "" }) {
  return <div className={`${styles.smartGrid} ${className}`} role="group" aria-label={label}>{children}</div>;
}

export function SmartTile({ glyph, icon, tone = "gray", label, count, pressed = false, onClick, title }) {
  return <button type="button" className={styles.smart} data-tone={tone} aria-pressed={pressed} onClick={onClick} title={title}>
    <span className={styles.smartIcon}>{icon ?? <Glyph name={glyph} size={15} strokeWidth={2.2} />}</span>
    <span className={styles.smartCount}>{count}</span>
    <span className={styles.smartLabel}>{label}</span>
  </button>;
}

// 빠른 작업: 홈 화면 앱처럼 색 아이콘 아래 이름 한 줄
export function ActionGrid({ children, className = "", label }) {
  return <div className={`${styles.actions} ${className}`} role="group" aria-label={label}>{children}</div>;
}

export function ActionTile({ glyph, tone, label, to, onClick, hint }) {
  const body = <><AppIcon name={glyph} tone={tone} size={46} className={styles.actionIcon} /><span className={styles.actionLabel}>{label}</span></>;
  const shared = { className: styles.action, "data-action": glyph, title: hint };
  return to
    ? <Link to={to} {...shared}>{body}</Link>
    : <button type="button" onClick={onClick} {...shared}>{body}</button>;
}

// 대회 시간 위젯: 남은 시간을 1초마다 세고 지난 비율을 진행 막대로 보인다
export function ContestWidget({ contest, className = "", to }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const view = describeContest(contest, now);
  const body = <>
    <span className={styles.contestHead}><span>{view.label}</span></span>
    <span className={styles.contestValue} data-text={view.text || undefined}>{view.value}</span>
    {view.progress != null && <span className={styles.progress} role="progressbar" aria-label="대회 진행률" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(view.progress * 100)}>
      <span style={{ width: `${view.progress * 100}%` }} />
    </span>}
    <span className={styles.contestSub}>{view.range || view.sub}</span>
  </>;
  const shared = { className: `${ui.card} ${styles.contest}${to ? ` ${styles.statLink}` : ""} ${className}`, "data-tone": view.tone };
  return to ? <Link to={to} {...shared} aria-label={`${view.label} ${view.value}`}>{body}</Link> : <section {...shared} aria-label={view.label}>{body}</section>;
}
