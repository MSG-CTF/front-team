export default function EventHistory() {
  return (
    <section
      id="history"
      className="event-section history-section"
      aria-labelledby="history-title"
    >
      <h2 id="history-title" lang="en">
        <span>MSG CTF HISTORY</span>
        <svg
          className="history-leaves"
          viewBox="0 0 160 50"
          aria-hidden="true"
          focusable="false"
        >
          <g
            transform="translate(16 3) scale(.58) rotate(-64 24 32)"
            fill="#8f6345"
          >
            <path d="m24 3 6 15 8-6-1 14 9-2-5 10 4 5-15 10-4-1 1 13h-3l-1-13-5 1L3 39l5-5-6-10 10 2-2-14 9 6Z" />
            <path
              className="leaf-veins"
              d="M24 12v37m0-12L15 24m9 19L9 33m15 4 9-13m-9 19 15-10"
            />
          </g>
          <g
            transform="translate(60 4) scale(.62) rotate(14 24 32)"
            fill="#b18450"
          >
            <path d="m24 3 6 15 8-6-1 14 9-2-5 10 4 5-15 10-4-1 1 13h-3l-1-13-5 1L3 39l5-5-6-10 10 2-2-14 9 6Z" />
            <path
              className="leaf-veins"
              d="M24 12v37m0-12L15 24m9 19L9 33m15 4 9-13m-9 19 15-10"
            />
          </g>
          <g
            transform="translate(108 5) scale(.5) rotate(65 24 32)"
            fill="#9a703e"
          >
            <path d="m24 3 6 15 8-6-1 14 9-2-5 10 4 5-15 10-4-1 1 13h-3l-1-13-5 1L3 39l5-5-6-10 10 2-2-14 9 6Z" />
            <path
              className="leaf-veins"
              d="M24 12v37m0-12L15 24m9 19L9 33m15 4 9-13m-9 19 15-10"
            />
          </g>
        </svg>
      </h2>
      <article className="history-entry" aria-labelledby="history-2025-title">
        <h3 id="history-2025-title">
          <span className="history-year">2025</span> MSG CTF
        </h3>
        <div className="history-record">
          <figure className="history-poster">
            <a
              href="/assets/intro/msg-ctf-2025-poster.png"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="2025 MSG CTF 포스터 원본 새 창"
            >
              <img
                src="/assets/intro/msg-ctf-2025-poster.png"
                width="2527"
                height="3572"
                alt="2025 MSG CTF 공식 포스터, 11월 9일 올댓마인드 문래점에서 열린 행사"
                loading="lazy"
              />
            </a>
            <figcaption>2025년 행사 포스터</figcaption>
          </figure>
          <div className="history-details">
            <p className="history-attendance">
              <strong>
                100<span>명 참가</span>
              </strong>
              <span>50팀</span>
            </p>
            <p className="history-lead">
              5개 대학 보안동아리가 함께한 오프라인 CTF
            </p>
            <dl className="history-facts">
              <div>
                <dt>일시</dt>
                <dd>
                  <time dateTime="2025-11-09">2025년 11월 9일</time>
                  <br />
                  12:00 ~ 21:00
                </dd>
              </div>
              <div>
                <dt>장소</dt>
                <dd>
                  올댓마인드 문래점<span>서울 영등포구 문래로 55 2층</span>
                </dd>
              </div>
              <div>
                <dt>참가 방식</dt>
                <dd>2인 1팀</dd>
              </div>
            </dl>
            <div className="history-links">
              <a
                className="text-link"
                href="/assets/intro/msg-ctf-2025-poster.png"
                target="_blank"
                rel="noopener noreferrer"
              >
                포스터 원본 보기
              </a>
              <a
                className="text-link"
                href="https://www.instagram.com/p/DQ7MN8Hk5Qx/?img_index=3"
                target="_blank"
                rel="noopener noreferrer"
              >
                2025 현장 기록 보기
              </a>
            </div>
          </div>
        </div>
      </article>
    </section>
  );
}
