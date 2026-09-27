import { Link } from "react-router-dom";
import { ROUTES } from "../../../routes/routePaths.js";

export default function EventFormats() {
  return (
    <section id="play" className="event-section" aria-labelledby="play-title">
      <div className="section-heading">
        <h2 id="play-title">대회 방식</h2>
        <Link className="text-link" to={ROUTES.introGuide + "#rules"}>
          경기 규칙 보기
        </Link>
      </div>
      <p className="section-intro">
        오프라인으로 진행하는 팀 CTF
        <br />
        주사위로 이동하고 도착한 칸의 문제를 풉니다
      </p>
      <div className="format-list" data-enter-motion="">
        <div>
          <h3 lang="en">JEOPARDY</h3>
          <p>
            보드에서 문제를 열고
            <br />
            팀원과 함께 플래그를 제출
          </p>
        </div>
        <div>
          <h3 lang="en">KoTH</h3>
          <p>
            문제별 규칙에 따라 경쟁
            <br />
            15분 구간별 성적 누적
          </p>
        </div>
        <div>
          <h3 lang="en">SIGNATURE</h3>
          <p>
            동아리 부스에 참여하고
            <br />
            안내받은 플래그를 제출
          </p>
        </div>
      </div>
    </section>
  );
}
