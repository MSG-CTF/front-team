import { Link } from "react-router-dom";
import { ROUTES } from "../../../routes/routePaths.js";
import { eventConfig } from "../config/eventConfig.js";
import { getEventLabels, isRegistrationOpen } from "../utils/eventData.js";
import ApplyLink from "./ApplyLink.jsx";
import Countdown from "./Countdown.jsx";
import AutumnLeaves from "./AutumnLeaves.jsx";
import { MotionControl } from "./MotionProvider.jsx";

export default function EventHero() {
  const labels = getEventLabels(eventConfig.event);
  const registrationOpen = isRegistrationOpen(eventConfig.registrationClosesAt);
  return (
    <section className="cover" aria-labelledby="event-title">
      <AutumnLeaves />
      <div className="cover-center">
        <h1 id="event-title" className="sr-only">
          MSG CTF 2026
        </h1>
        <div className="logo-window">
          <img
            src="/assets/intro/event-logo.webp"
            width="1254"
            height="1254"
            alt="MSG CTF"
            fetchpriority="high"
            decoding="async"
          />
        </div>
        <p className="event-date">
          <time dateTime={eventConfig.event.startsAt}>{labels.fullDate}</time>
          <span>{labels.startTime}</span>
        </p>
        <Countdown />
        {/* 모집이 끝나면 첫 화면 버튼은 참가 안내로 보낸다 */}
        <ApplyLink className="apply-button hero-apply" whenClosed="guide" />
        <p className="hero-recruitment">
          {registrationOpen ? "모집" : "모집 마감"} <span>{eventConfig.registrationPeriod}</span>
        </p>
      </div>
      <Link
        className="cover-next"
        to={ROUTES.intro + "#about"}
        aria-label="대회 개요로 내려가기"
      >
        대회 안내 <span aria-hidden="true">↓</span>
      </Link>
      <MotionControl className="effects-toggle" />
    </section>
  );
}
