import { eventConfig } from "../config/eventConfig.js";

export default function ApplyLink({
  className = "apply-button",
  arrow = true,
}) {
  return (
    <a
      className={className}
      href={eventConfig.registrationUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="참가 신청 새 창"
    >
      <span>참가 신청</span>
      {arrow && (
        <svg viewBox="0 0 28 16" aria-hidden="true">
          <path d="M0 8h25M18 1l7 7-7 7" />
        </svg>
      )}
    </a>
  );
}
