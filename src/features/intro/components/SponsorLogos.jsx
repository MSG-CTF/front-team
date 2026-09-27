export default function SponsorLogos() {
  return (
    <section
      id="sponsors"
      className="identity-section sponsor-section"
      aria-labelledby="sponsors-title"
    >
      <div className="identity-inner">
        <h2 id="sponsors-title">후원</h2>
        <div className="sponsor-lineup">
          <a
            className="sponsor sponsor--monster"
            href="https://www.monsterenergy.com/ko-kr/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="몬스터 에너지 공식 사이트 새 창"
          >
            <img
              className="sponsor-logo"
              src="/assets/intro/monster-energy-logo.png"
              width="700"
              height="316"
              alt="MONSTER ENERGY"
              loading="lazy"
            />
          </a>
          <a
            className="sponsor sponsor--hspace"
            href="https://hspace.io/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="HSPACE 공식 사이트 새 창"
          >
            <img
              className="sponsor-logo"
              src="/assets/intro/hspace-logo.svg"
              alt="HSPACE"
              loading="lazy"
            />
          </a>
          <figure className="sponsor sponsor--siya">
            <img
              className="sponsor-logo"
              src="/assets/intro/siya-insight-logo.svg"
              alt="시야인사이트"
              width="429"
              height="132"
              loading="lazy"
            />
          </figure>
        </div>
      </div>
    </section>
  );
}
