import { useEffect, useRef } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { ROUTES } from "../../routes/routePaths.js";
import IntroHeader from "./components/IntroHeader.jsx";
import IntroFooter from "./components/IntroFooter.jsx";
import { MotionProvider, useMotion } from "./components/MotionProvider.jsx";
import "./intro.css";

function IntroFrame() {
  const location = useLocation();
  const root = useRef(null);
  const { mode } = useMotion();
  const guide = location.pathname === ROUTES.introGuide;
  useEffect(() => {
    let secondFrame;
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => {
        const id = location.hash.slice(1);
        const target = id ? document.getElementById(id) : root.current;
        if (target && root.current?.contains(target)) {
          target.scrollIntoView({ block: "start", behavior: "instant" });
          if (id && id !== "top") {
            target.setAttribute("tabindex", "-1");
            target.focus({ preventScroll: true });
          }
        } else window.scrollTo({ top: 0, behavior: "instant" });
      });
    });
    return () => {
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
    };
  }, [location]);
  useEffect(() => {
    if (!("IntersectionObserver" in window)) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        entries
          .filter((entry) => entry.isIntersecting)
          .forEach((entry) => {
            entry.target.classList.add("has-entered");
            observer.unobserve(entry.target);
          });
      },
      { threshold: 0.12 },
    );
    root.current
      ?.querySelectorAll("[data-enter-motion]")
      .forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [location.pathname]);
  return (
    <div id="top" ref={root} className="msg-intro" data-motion-mode={mode}>
      <Link
        className="skip-link"
        to={`${guide ? ROUTES.introGuide : ROUTES.intro}#${guide ? "participation" : "about"}`}
      >
        대회 안내로 건너뛰기
      </Link>
      <IntroHeader guide={guide} />
      <Outlet />
      <IntroFooter />
    </div>
  );
}

export default function IntroLayout() {
  return (
    <MotionProvider>
      <IntroFrame />
    </MotionProvider>
  );
}
