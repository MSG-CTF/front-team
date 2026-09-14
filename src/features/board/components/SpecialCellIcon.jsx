// Keep special-cell symbols in sync with the API, including older board artwork.
export default function SpecialCellIcon({ type }) {
  if (!["CHANCE", "ROULETTE", "AIRPORT"].includes(type)) return null;

  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" className="absolute left-[15%] top-[11%] h-[78%] w-[70%] pointer-events-none">
      <rect x="1" y="1" width="98" height="98" rx="22" fill="#e9a768" />
      <g fill="none" stroke="#82440f" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
        {type === "ROULETTE" && (
          <>
            <circle cx="50" cy="50" r="34" />
            <circle cx="50" cy="50" r="26" />
            <path d="M50 16v25m0 18v25M16 50h25m18 0h25M26 26l18 18m12 12 18 18M26 74l18-18m12-12 18-18" />
            <circle cx="50" cy="50" r="9" fill="#f8cb86" />
          </>
        )}
        {type === "CHANCE" && (
          <>
            <rect x="21" y="18" width="45" height="61" rx="5" transform="rotate(-10 43 49)" />
            <rect x="35" y="23" width="45" height="61" rx="5" transform="rotate(10 57 53)" fill="#f4bd78" />
            <path d="m57 38 4 9 10 1-7 7 2 10-9-5-9 5 2-10-7-7 10-1Z" />
          </>
        )}
        {type === "AIRPORT" && (
          <path d="m50 16 7 30 27 17v8l-29-8v15l10 9H35l10-9V63l-29 8v-8l27-17Z" fill="#f4bd78" />
        )}
      </g>
    </svg>
  );
}
