import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { formatAdminNumber } from "../utils/adminNumber.js";
import { searchItems } from "../utils/adminSearch.js";
import { Glyph } from "./AdminGlyph.jsx";
import ui from "./AdminWorkspace.module.css";
import styles from "./AdminPicker.module.css";

// 팀이 수백 개여도 고를 수 있는 검색 선택기: 이름 일부나 초성(ㄷㅌㄹ)을 치면 바로 걸러지고 방향키와 Enter로 고른다
// 목록은 화면 맨 위 층에 띄워서 대화상자나 스크롤 영역에 잘리지 않는다
// capped는 팀이 너무 많아 이름순 앞부분만 받아 왔다는 뜻이다 목록 아래에 알린다
const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;
const LIMIT = 80;

function teamMeta(team) {
  const members = team.member_count ?? team.members?.length;
  return [team.team_score != null && `점수 ${formatAdminNumber(team.team_score)}`, members != null && `${members}명`].filter(Boolean).join(" · ");
}

export default function AdminTeamPicker({
  teams = [], value = "", onChange, label = "팀", allowAll = false, allLabel = "모든 팀",
  placeholder = "팀 이름이나 초성으로 찾기", disabled = false, loading = false, compact = false, capped = false, id,
}) {
  const baseId = useId();
  const inputId = id ?? `${baseId}-input`;
  const listId = `${baseId}-list`;
  const inputRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [box, setBox] = useState(null);
  const selected = teams.find((team) => team.team_id === value) ?? null;
  const matches = useMemo(() => searchItems(teams, query, (team) => team.team_name), [teams, query]);
  const options = useMemo(() => {
    const list = matches.slice(0, LIMIT);
    return allowAll && !query.trim() ? [{ team_id: "", team_name: allLabel, all: true }, ...list] : list;
  }, [matches, allowAll, allLabel, query]);

  useIsoLayoutEffect(() => {
    if (!open) return undefined;
    const update = () => {
      const rect = inputRef.current?.getBoundingClientRect();
      if (rect) setBox({ top: rect.top, bottom: rect.bottom, left: rect.left, width: rect.width, viewport: window.innerHeight });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open]);

  useEffect(() => { setActive(0); }, [query]);
  useEffect(() => {
    if (open) document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [active, open, listId]);

  function choose(option) {
    onChange(option.team_id);
    setQuery("");
    setOpen(false);
    inputRef.current?.blur();
  }

  function onKeyDown(event) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) setOpen(true);
      else setActive((index) => Math.min(options.length - 1, index + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => Math.max(0, index - 1));
    } else if (event.key === "Enter" && open && options[active]) {
      event.preventDefault();
      choose(options[active]);
    } else if (event.key === "Escape" && open) {
      // 열린 목록만 닫고 바깥 대화상자는 그대로 둔다
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      setQuery("");
    }
  }

  const room = box ? box.viewport - box.bottom : 0;
  const above = box && room < 260 && box.top > room;
  const position = box && (above ? { bottom: box.viewport - box.top + 6 } : { top: box.bottom + 6 });

  return <div className={styles.picker} data-compact={compact || undefined}>
    <Glyph name="search" size={15} strokeWidth={2} className={styles.icon} />
    <input id={inputId} ref={inputRef} type="text" role="combobox" className={`${ui.input} ${styles.input}`}
      aria-label={label} aria-expanded={open} aria-controls={listId} aria-autocomplete="list"
      aria-activedescendant={open && options[active] ? `${listId}-${active}` : undefined}
      value={open ? query : (selected?.team_name ?? "")}
      placeholder={open ? (selected?.team_name ?? placeholder) : (allowAll ? allLabel : placeholder)}
      disabled={disabled} autoComplete="off" spellCheck={false}
      onFocus={() => { setOpen(true); setQuery(""); }}
      onBlur={() => { setOpen(false); setQuery(""); }}
      onChange={(event) => { setQuery(event.target.value); setOpen(true); }}
      onKeyDown={onKeyDown} />
    {selected && !disabled && <button type="button" className={styles.clear} aria-label={`${label} 선택 지우기`}
      onMouseDown={(event) => event.preventDefault()} onClick={() => onChange("")}>
      <Glyph name="close" size={10} strokeWidth={3} />
    </button>}
    {open && box && createPortal(<div className={`${ui.workspace} ${styles.layer}`} style={{ left: box.left, width: Math.max(box.width, 260), ...position }}>
      <ul id={listId} role="listbox" aria-label={`${label} 목록`} className={styles.list}>
        {options.map((option, index) => <li key={option.team_id || "all"} id={`${listId}-${index}`} role="option"
          aria-selected={option.team_id === value} className={styles.option} data-active={index === active || undefined}
          onMouseDown={(event) => event.preventDefault()} onMouseEnter={() => setActive(index)} onClick={() => choose(option)}>
          <span className={styles.optionText}>
            <strong>{option.team_name}</strong>
            {!option.all && teamMeta(option) && <small>{teamMeta(option)}</small>}
          </span>
          {option.is_banned && <span className={styles.flag}>밴</span>}
          {option.team_id === value && <Glyph name="solve" size={14} strokeWidth={2.6} className={styles.check} />}
        </li>)}
        {options.length === 0 && <li role="presentation" className={styles.empty}>{loading ? "팀 목록을 불러오는 중" : "맞는 팀이 없습니다"}</li>}
      </ul>
      {matches.length > LIMIT && <p className={styles.more}>{formatAdminNumber(matches.length - LIMIT)}팀 더 있음 · 이름을 더 입력해 좁혀주세요</p>}
      {capped && <p className={styles.more}>팀이 많아 이름순 앞 {formatAdminNumber(teams.length)}팀만 불러왔습니다</p>}
    </div>, document.body)}
  </div>;
}
