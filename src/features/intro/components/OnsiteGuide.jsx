import { Link } from "react-router-dom";
import { ROUTES } from "../../../routes/routePaths.js";
import { eventConfig } from "../config/eventConfig.js";

export default function OnsiteGuide() {
  return (
    <section
      id="onsite"
      className="event-section onsite-section"
      aria-labelledby="onsite-title"
    >
      <div className="section-heading">
        <h2 id="onsite-title">현장 참가 안내</h2>
        <Link className="text-link" to={ROUTES.introGuide + "#venue"}>
          자세한 현장 안내
        </Link>
      </div>
      <div className="onsite-items">
        <article className="onsite-item">
          <img
            className="onsite-illustration"
            src="/assets/intro/preparation-laptop-v1.png"
            width="1254"
            height="1254"
            alt=""
            loading="lazy"
          />
          <div className="onsite-copy">
            <h3>준비물</h3>
            <p className="onsite-key">개인 노트북과 충전기</p>
          </div>
        </article>
        <article className="onsite-item">
          <img
            className="onsite-illustration"
            src="/assets/intro/preparation-identity-v1.png"
            width="1254"
            height="1254"
            alt=""
            loading="lazy"
          />
          <div className="onsite-copy">
            <h3>참가 확인</h3>
            <p className="onsite-key">본인 확인용 신분증</p>
            <p className="onsite-detail">
              주민등록증 / 여권 /{" "}
              <span className="no-break">운전면허증 등</span>
            </p>
            <p className="onsite-note">학생 신분 증빙은 별도 안내</p>
          </div>
        </article>
      </div>
      <dl className="onsite-contact">
        <div>
          <dt>장소</dt>
          <dd>{eventConfig.venue}</dd>
        </div>
        <div>
          <dt>참가비</dt>
          <dd>{eventConfig.participationFee}</dd>
        </div>
        <div>
          <dt>문의</dt>
          <dd>
            <a href={`mailto:${eventConfig.contactEmail}`}>
              {eventConfig.contactEmail}
            </a>
          </dd>
        </div>
      </dl>
    </section>
  );
}
