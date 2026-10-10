import { eventConfig } from "../config/eventConfig.js";

export default function VenueSummary() {
  return (
    <aside className="venue-summary" aria-labelledby="venue-summary-title">
      <h3 id="venue-summary-title">오시는 길</h3>
      <div className="venue-map">
        <iframe
          src={eventConfig.venueMapEmbedUrl}
          title="교원챌린지홀 주변 도로와 행사장 위치 지도"
          width="600"
          height="360"
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      </div>
      <p className="venue-name">{eventConfig.venue}</p>
      <p className="venue-address">{eventConfig.venueAddress}</p>
      <p className="venue-transit">
        {eventConfig.venueAccess.station}에서 {eventConfig.venueAccess.walkLabel}
      </p>
      <nav className="venue-map-links" aria-label="대회장 지도">
        {eventConfig.venueMapLinks.map(({ label, url }) => (
          <a
            key={label}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${eventConfig.venue} 위치 ${label}에서 보기 (새 탭)`}
          >
            {label}
            <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
              <path d="M4 12 12 4M4 4h8v8" />
            </svg>
          </a>
        ))}
      </nav>
    </aside>
  );
}
