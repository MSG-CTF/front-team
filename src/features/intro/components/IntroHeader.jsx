import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ROUTES } from "../../../routes/routePaths.js";
import useMediaQuery from "../hooks/useMediaQuery.js";
import ApplyLink from "./ApplyLink.jsx";

export default function IntroHeader({ guide = false }) {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const toggle = useRef(null);
  const narrow = useMediaQuery("(max-width: 1100px)");
  useEffect(() => setOpen(false), [location, narrow]);
  const links = guide
    ? [
        ["participation", "참가 안내"],
        ["rules", "경기 규칙"],
        ["faq", "FAQ"],
      ]
    : [
        ["about", "대회 안내"],
        ["registration", "참가 안내"],
        ["prizes", "시상 안내"],
      ];
  function onKeyDown(event) {
    if (event.key === "Escape" && open) {
      setOpen(false);
      toggle.current?.focus();
    }
  }
  return (
    <header className="site-header" onKeyDown={onKeyDown}>
      <div className="header-inner">
        <Link
          className="brand-logo"
          to={`${ROUTES.intro}#top`}
          aria-label="MSG CTF 2026 처음으로"
        >
          <img
            src="/assets/login/logo-cutout.png"
            width="1254"
            height="1254"
            alt="MSG CTF"
          />
        </Link>
        <nav
          id="intro-nav"
          className="site-nav"
          aria-label={guide ? "상세 안내 메뉴" : "대회 안내 메뉴"}
          hidden={narrow && !open}
        >
          {links.map(([id, label]) => (
            <Link
              key={id}
              to={`${guide ? ROUTES.introGuide : ROUTES.intro}#${id}`}
              onClick={() => setOpen(false)}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="header-actions">
          <ApplyLink className="header-apply" arrow={false} />
          <Link className="header-login" to={ROUTES.login}>
            LOGIN
          </Link>
          <button
            ref={toggle}
            className="menu-toggle"
            type="button"
            aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
            aria-expanded={open}
            aria-controls="intro-nav"
            onClick={() => setOpen((value) => !value)}
          >
            <span aria-hidden="true" />
            <span aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
}
