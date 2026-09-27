import { eventConfig } from "../config/eventConfig.js";
import { getEventLabels } from "../utils/eventData.js";
import MascotSequence from "./MascotSequence.jsx";

export default function EventOverview() {
  const labels = getEventLabels(eventConfig.event);
  return (
    <section id="about" className="event-section" aria-labelledby="about-title">
      <h2 id="about-title">대회 개요</h2>
      <div className="overview-layout">
        <p className="overview-intro">
          6개 대학 보안동아리가 함께 여는
          <strong>
            오프라인 <span className="no-break">해킹 대회</span>
          </strong>
        </p>
        <div className="overview-copy" data-enter-motion="">
          <dl className="event-facts">
            <div>
              <dt>일정</dt>
              <dd>
                <time dateTime={eventConfig.event.date}>
                  {labels.shortDate}
                </time>
                <br />
                {labels.startTime}
              </dd>
            </div>
            <div>
              <dt>참가 규모</dt>
              <dd>
                75팀, 150명 <span>2인 1팀</span>
              </dd>
            </div>
            <div>
              <dt>장소</dt>
              <dd>{eventConfig.venue}</dd>
            </div>
          </dl>
        </div>
        <MascotSequence />
      </div>
    </section>
  );
}
