import { Link } from "react-router-dom";
import { ROUTES } from "../../../routes/routePaths.js";

export default function MileageShop() {
  return (
    <section
      id="mileage"
      className="event-section mileage-section"
      aria-labelledby="mileage-title"
    >
      <div className="section-heading">
        <h2 id="mileage-title">마일리지샵</h2>
        <Link className="text-link" to={ROUTES.introGuide + "#mileage-guide"}>
          이용 안내
        </Link>
      </div>
      <div className="mileage-layout">
        <div className="mileage-copy">
          <p className="mileage-message">
            모은 마일리지를
            <br />
            현장에서 교환하세요
          </p>
          <p className="mileage-description">
            문제 풀이와 부스 참여로 적립
            <br />
            대회 점수와는 별도로 사용
          </p>
        </div>
        <div className="shop-categories" data-enter-motion="">
          <div>
            <svg viewBox="0 0 120 120" aria-hidden="true">
              <path d="M64 14C35 10 12 32 12 60c0 27 21 48 48 48 26 0 47-20 48-45-15 2-27-8-27-21-12 1-21-11-17-28Z" />
              <path
                d="m33 37 11-3 3 11-11 3zm20 22 11 3-3 11-11-3zm-24 16 10 3-3 10-10-3zm49 7 11-3 3 11-11 3z"
                className="icon-cutout-fill"
              />
            </svg>
            <h3>간식</h3>
          </div>
          <div>
            <svg viewBox="0 0 120 120" aria-hidden="true">
              <path d="M74 10h27v7H79L68 43h32v10H20V43h40zM27 59h66l-7 49H34z" />
              <path d="M39 75h42l-2 14H41z" className="icon-cutout-fill" />
            </svg>
            <h3>음료</h3>
          </div>
          <div>
            <svg viewBox="0 0 120 120" aria-hidden="true">
              <path
                fillRule="evenodd"
                d="M38 40V30a22 22 0 0 1 44 0v10h18l7 68H13l7-68zm8 0h28V30a14 14 0 0 0-28 0z"
              />
              <path
                d="M43 66h34v6H43zm0 17h34v6H43z"
                className="icon-cutout-fill"
              />
            </svg>
            <h3>굿즈</h3>
          </div>
        </div>
      </div>
      <p className="program-note">세부 품목과 교환 기준은 추후 안내합니다</p>
    </section>
  );
}
