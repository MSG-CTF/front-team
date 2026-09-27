import { useEffect, useState } from "react";
import { eventConfig } from "../config/eventConfig.js";
import { getCountdown } from "../utils/eventData.js";

export default function Countdown() {
  const [state, setState] = useState(() => getCountdown(eventConfig.event));
  useEffect(() => {
    const update = () => {
      if (!document.hidden) setState(getCountdown(eventConfig.event));
    };
    update();
    const timer = window.setInterval(update, 1000);
    document.addEventListener("visibilitychange", update);
    window.addEventListener("pageshow", update);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", update);
      window.removeEventListener("pageshow", update);
    };
  }, []);
  if (!state) return null;
  return (
    <div
      className="countdown"
      role="timer"
      aria-live="off"
      aria-label="대회 시작까지 남은 시간"
    >
      {state.mode !== "message" && (
        <p className="countdown-caption" lang="en">
          STARTS IN
        </p>
      )}
      {state.mode === "days" && (
        <p className="countdown-day">
          <span>{state.days}</span>
          <span className="countdown-unit" lang="en">
            DAYS
          </span>
        </p>
      )}
      {state.mode === "exact" && (
        <div className="countdown-clock" lang="en">
          {["days", "hours", "minutes", "seconds"].map((unit) => (
            <span key={unit}>
              <b>{String(state[unit]).padStart(2, "0")}</b>
              <small>{unit.toUpperCase()}</small>
            </span>
          ))}
        </div>
      )}
      {state.mode === "message" && (
        <p className="countdown-message">{state.text}</p>
      )}
    </div>
  );
}
