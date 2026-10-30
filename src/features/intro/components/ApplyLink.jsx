import { Link } from "react-router-dom";
import { ROUTES } from "../../../routes/routePaths.js";
import { eventConfig } from "../config/eventConfig.js";
import { isRegistrationOpen } from "../utils/eventData.js";

function Arrow() {
  return (
    <svg viewBox="0 0 28 16" aria-hidden="true">
      <path d="M0 8h25M18 1l7 7-7 7" />
    </svg>
  );
}

// 모집이 끝나면 whenClosed에 따라 "guide"는 참가 안내로 보내고 "label"은 마감 표시만 두며 null이면 숨긴다
export default function ApplyLink({
  className = "apply-button",
  arrow = true,
  whenClosed = "label",
}) {
  if (!isRegistrationOpen(eventConfig.registrationClosesAt)) {
    if (whenClosed === "guide") {
      return (
        <Link className={className} to={ROUTES.introGuide}>
          <span>참가 안내</span>
          {arrow && <Arrow />}
        </Link>
      );
    }
    if (whenClosed === "label") {
      return (
        <span className={`${className} is-closed`}>
          <span>모집 마감</span>
        </span>
      );
    }
    return null;
  }
  return (
    <a
      className={className}
      href={eventConfig.registrationUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="참가 신청 새 창"
    >
      <span>참가 신청</span>
      {arrow && <Arrow />}
    </a>
  );
}
