import { Link } from "react-router-dom";
import { ROUTES } from "../../../routes/routePaths.js";
import { eventConfig } from "../config/eventConfig.js";
import ApplyLink from "./ApplyLink.jsx";

export default function EventRegistration() {
  return (
    <section
      id="registration"
      className="event-section registration-section"
      aria-labelledby="registration-title"
    >
      <div className="section-heading">
        <h2 id="registration-title">참가 신청 안내</h2>
        <Link className="text-link" to={ROUTES.introGuide + "#participation"}>
          참가 조건과 FAQ
        </Link>
      </div>
      <div className="registration-summary">
        <div className="recruitment-dates">
          <span>모집 기간</span>
          <p>{eventConfig.registrationPeriod}</p>
        </div>
        <p className="eligibility-note">
          <strong>공통 참가 자격</strong>대회 당일 만 19세 이상인 학생
          <br />
          2인 1팀, 팀원 두 명 모두 해당
        </p>
      </div>
      <div className="registration-eligibility">
        <div className="track-lineup" data-enter-motion="">
          <div className="track-internal">
            <div className="track-heading">
              <h3>내부 트랙</h3>
              <p className="track-quota">25팀 / 50명</p>
            </div>
            <p className="track-definition">주최 6개 동아리 소속 참가자</p>
            <p className="track-clubs">
              MJSEC / SWING / Y-CERT
              <br />
              seKUrity / CodeCure / Aegis
            </p>
          </div>
          <div className="track-external">
            <div className="track-heading">
              <h3>외부 트랙</h3>
              <p className="track-quota">50팀 / 100명</p>
            </div>
            <p className="track-definition">주최 동아리 소속이 아닌 학생</p>
            <p className="track-clubs">동아리에 소속되지 않아도 신청 가능</p>
            <div className="selection-summary">
              <h4>선발 기준</h4>
              <p>
                팀원 평균 학년이 낮은 팀 우선
                <br />
                평균이 같으면 먼저 신청한 팀 우선
              </p>
            </div>
          </div>
        </div>
        <p className="track-note">
          참가비 {eventConfig.participationFee}
          <br />
          내부와 외부는 순위와 시상을 따로 운영합니다
        </p>
      </div>
      <div className="registration-action">
        <ApplyLink className="apply-button" />
      </div>
    </section>
  );
}
