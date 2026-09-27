import { Link } from "react-router-dom";
import { ROUTES } from "../../routes/routePaths.js";
import { eventConfig } from "./config/eventConfig.js";
import { getEventLabels } from "./utils/eventData.js";
import ApplyLink from "./components/ApplyLink.jsx";
import { PrizeTotal, PrizeList } from "./components/Prizes.jsx";

export default function IntroGuidePage() {
  const labels = getEventLabels(eventConfig.event);
  return (
    <main className="document-body">
      <div className="document-title">
        <Link to={ROUTES.intro} className="text-link">
          대회 메인으로
        </Link>
        <h1>참가 안내와 경기 규칙</h1>
      </div>
      <section
        id="participation"
        className="document-section"
        aria-labelledby="participation-title"
      >
        <h2 id="participation-title">참가 안내</h2>
        <dl className="event-facts">
          <div>
            <dt>진행 방식</dt>
            <dd>오프라인 팀 CTF</dd>
          </div>
          <div>
            <dt>대회 날짜</dt>
            <dd>
              {labels.fullDate}
              <br />
              {labels.startTime}
            </dd>
          </div>
          <div>
            <dt>모집</dt>
            <dd>
              75팀, 총 150명 <span>2인 1팀</span>
              <br />
              내부 50명 / 외부 100명
            </dd>
          </div>
          <div>
            <dt>트랙</dt>
            <dd>
              내부 트랙 25팀 / 외부 트랙 50팀
              <br />두 트랙은 순위와 시상을 따로 운영합니다
            </dd>
          </div>
          <div>
            <dt>참가 자격</dt>
            <dd>
              대회 당일 만 19세 이상인 학생
              <br />
              팀장과 팀원 모두 충족해야 합니다
            </dd>
          </div>
          <div>
            <dt>신청 기간</dt>
            <dd>{eventConfig.registrationPeriod}</dd>
          </div>
          <div>
            <dt>참가비</dt>
            <dd>{eventConfig.participationFee}</dd>
          </div>
        </dl>
        <p>
          내부 트랙은 주최 6개 동아리인 MJSEC, SWING, Y-CERT, seKUrity,
          CodeCure, Aegis 소속 참가자를 대상으로 합니다
        </p>
        <p>
          외부 트랙은 주최 동아리 소속이 아닌 학생을 대상으로 하며 동아리에
          소속되지 않아도 신청 가능합니다
        </p>
        <p>
          학생 신분 인정 범위와 증빙 방법, 팀 구성 예외는 접수 공지에서
          안내합니다
        </p>
        <div id="selection" className="selection-detail">
          <h3>외부 참가팀 선발</h3>
          <p>초심자에게 더 많은 기회를 주기 위해 저학년 팀을 우선 선발합니다</p>
          <dl className="selection-rules">
            <div>
              <dt>우선 선발</dt>
              <dd>팀원 두 명의 평균 학년이 낮은 팀</dd>
            </div>
            <div>
              <dt>평균이 같으면</dt>
              <dd>먼저 신청한 팀</dd>
            </div>
          </dl>
          <p>외부 모집 인원은 100명이며 2인 1팀으로 신청합니다</p>
        </div>
        <ApplyLink className="apply-button guide-apply" />
      </section>
      <section
        id="schedule"
        className="document-section"
        aria-labelledby="schedule-title"
      >
        <h2 id="schedule-title">일정과 시상</h2>
        <p>
          {labels.shortDate}, {labels.startTime}
        </p>
        <p>참가 신청 {eventConfig.registrationPeriod}</p>
        <p>
          참가 확정 일정과 경기 종료 시각, KoTH와 부스 운영 시간은 세부 시간표로
          안내합니다
        </p>
        <div className="guide-prizes">
          <p>
            총상금 <PrizeTotal as="strong" />
          </p>
          <PrizeList table />
        </div>
        <p>부상, 시상 일정과 수상 조건은 확정 후 공개합니다</p>
      </section>
      <section
        id="venue"
        className="document-section"
        aria-labelledby="venue-title"
      >
        <h2 id="venue-title">장소와 준비물</h2>
        <p>대회 장소는 아직 미정입니다</p>
        <p>
          장소가 확정되면 주소와 교통편, 주차, 체크인, 현장 네트워크와 식사
          안내를 공개합니다
        </p>
        <p className="preparation-key">
          개인 노트북과 충전기, 본인 확인용 신분증을 챙겨 주세요
        </p>
        <p>
          주민등록증, 여권, 운전면허증 등 본인 확인이 가능한 신분증을 지참해
          주세요
          <br />
          학생 신분 증빙 방법은 참가 확정 안내에서 별도로 공지합니다
        </p>
        <p>추가 장비와 네트워크 연결 방식은 장소 확정 후 안내합니다</p>
        <p>대회는 오프라인으로 진행하며 참가자는 대회 현장에 참석합니다</p>
      </section>
      <section
        id="rules"
        className="document-section"
        aria-labelledby="rules-title"
      >
        <h2 id="rules-title">경기 규칙</h2>
        <p className="document-note">
          현재 기획 기준이며 공개 전 최종 운영규정 확인이 필요합니다
        </p>
        <details className="rule-detail">
          <summary>보드와 문제 선택</summary>
          <div>
            <p>
              팀장이 36칸 보드를 이동하고 문제 칸에서 최대 3개 후보 중 1개를
              선택합니다
            </p>
            <p>
              팀원 두 명이 함께 문제를 풀고 플래그를 제출할 수 있습니다
              <br />한 번 열린 문제는 대회 종료 전까지 계속 풀 수 있습니다
            </p>
          </div>
        </details>
        <details className="rule-detail">
          <summary>주사위 충전과 문제 풀이 보너스</summary>
          <div>
            <p>주사위 기회는 최대 3회이며 15분마다 1회 충전합니다</p>
            <p>
              3회 미만이면 중간에 소비하거나 보상을 받아도 기존 충전 타이머를
              유지합니다
              <br />
              3회가 되면 충전을 멈추고 다음 소비부터 새 15분을 계산합니다
            </p>
            <p>
              현재 활성 문제를 개방 후 15분 안에 처음 해결하면 주사위 1회
              보너스를 받습니다
              <br />
              15분이 지나도 열린 문제는 대회 종료 전까지 풀 수 있습니다
            </p>
          </div>
        </details>
        <details className="rule-detail">
          <summary>소모한 칸과 START 보상</summary>
          <div>
            <p>
              문제 칸과 특수 칸은 팀별로 소모됩니다
              <br />
              소모한 칸은 다시 목적지로 선택할 수 없지만 경유할 수 있습니다
            </p>
            <p>
              주사위 도착지가 소모한 칸이면 다음 미소모 칸으로 이동합니다
              <br />
              START를 제외한 모든 칸을 소모하면 보드 이동이 끝납니다
            </p>
            <p>
              START 통과 시 100마일리지를 받습니다
              <br />
              처음 정확히 도착하면 100마일리지와 주사위 1회 보너스를 받고
              START도 소모됩니다
              <br />
              단순 통과에는 주사위 보너스가 없습니다
            </p>
          </div>
        </details>
        <details className="rule-detail">
          <summary>문제 서버</summary>
          <div>
            <p>
              참가자마다 최대 1개, 팀 전체 최대 2개의 개인 문제 서버를 사용할 수
              있습니다
              <br />
              본인 서버만 초기화하거나 종료할 수 있습니다
            </p>
            <p>KoTH 문제 서버는 개인 서버 제한과 별도로 운영합니다</p>
          </div>
        </details>
        <details className="rule-detail">
          <summary>KoTH와 SIGNATURE</summary>
          <div>
            <p>
              KoTH는 JEOPARDY와 별도로 경쟁하며 15분 구간별 성적을 누적합니다
              <br />각 문제의 규칙과 공개 일정을 확인해 주세요
            </p>
            <p>
              SIGNATURE는 동아리 부스 프로그램에 참여한 뒤 안내받은 플래그를
              제출하는 방식입니다
            </p>
          </div>
        </details>
        <details className="rule-detail">
          <summary>점수와 마일리지</summary>
          <div>
            <p>
              대회 점수는 팀 순위를 정하는 기준입니다
              <br />
              마일리지는 문제 풀이와 부스 참여로 얻는 별도 포인트입니다
            </p>
            <p>
              마일리지샵을 이용해도 대회 점수는 차감되지 않습니다
              <br />
              최종 배점과 동점 처리, 시상 조건은 운영규정에서 안내합니다
            </p>
          </div>
        </details>
      </section>
      <section
        id="mileage-guide"
        className="document-section"
        aria-labelledby="mileage-guide-title"
      >
        <h2 id="mileage-guide-title">마일리지샵과 부스</h2>
        <p>
          문제 풀이와 부스 참여로 얻은 팀 마일리지는 현장 마일리지샵에서 사용할
          수 있습니다
        </p>
        <p>
          간식, 음료, 굿즈를 준비하고 있습니다
          <br />
          세부 품목과 교환 기준, 운영 시간은 추후 안내합니다
        </p>
        <p>
          동아리 부스에서는 카페, 추리 체험, 단어 게임과 보안 퀴즈 등 현장
          프로그램을 준비하고 있습니다
        </p>
        <Link className="text-link" to={ROUTES.intro + "#booths"}>
          동아리별 부스 보기
        </Link>
      </section>
      <section
        id="faq"
        className="document-section"
        aria-labelledby="faq-title"
      >
        <h2 id="faq-title">자주 묻는 질문</h2>
        <div className="faq-list">
          <details>
            <summary>참가비가 있나요?</summary>
            <p>참가비는 {eventConfig.participationFee}입니다</p>
          </details>
          <details>
            <summary>휴학생이나 대학원생도 참가할 수 있나요?</summary>
            <p>학생 신분 인정 범위와 증빙 방법은 접수 공지에서 안내합니다</p>
          </details>
          <details>
            <summary>동아리에 소속되지 않아도 참가할 수 있나요?</summary>
            <p>
              네, 외부 트랙으로 신청할 수 있습니다
              <br />
              팀원 두 명 모두 대회 당일 만 19세 이상인 학생이어야 합니다
            </p>
          </details>
          <details>
            <summary>
              혼자 신청하거나 다른 학교 사람과 팀을 구성해도 되나요?
            </summary>
            <p>
              기본 구성은 2인 1팀입니다
              <br />
              개인 신청과 팀 매칭, 다른 학교 간 팀 구성과 내부/외부 혼합팀의
              트랙 기준은 접수 전에 안내합니다
            </p>
          </details>
          <details>
            <summary>외부 참가팀은 어떻게 선발하나요?</summary>
            <p>
              팀원 두 명의 평균 학년이 낮은 팀을 우선 선발합니다
              <br />
              평균 학년이 같으면 먼저 신청한 팀을 우선합니다
            </p>
          </details>
          <details>
            <summary>15분 안에 풀지 못하면 문제를 못 푸나요?</summary>
            <p>
              열린 문제는 대회 종료 전까지 계속 풀 수 있습니다
              <br />
              15분 안에 처음 해결했을 때 받는 주사위 보너스는 별도 조건입니다
            </p>
          </details>
          <details>
            <summary>방문한 칸을 다시 지나갈 수 있나요?</summary>
            <p>
              소모한 칸도 경유할 수 있습니다
              <br />
              다시 목적지로 선택할 수는 없습니다
            </p>
          </details>
          <details>
            <summary>AI와 외부 도구를 사용해도 되나요?</summary>
            <p>
              AI와 자동화 도구, 팀 밖 협업의 허용 범위는 최종 운영규정에서
              안내합니다
            </p>
          </details>
        </div>
      </section>
      <section
        id="contact"
        className="document-section"
        aria-labelledby="contact-title"
      >
        <h2 id="contact-title">문의와 운영규정</h2>
        <p>
          <a
            className="contact-mail"
            href={`mailto:${eventConfig.contactEmail}`}
          >
            {eventConfig.contactEmail}
          </a>
        </p>
        <p>
          최종 운영규정에서 부정행위, 이의 제기, 장애 대응, 풀이 공개 기준을
          안내합니다
        </p>
        <p>
          신청을 열기 전 개인정보 수집 항목과 목적, 보관 기간, 처리 주체를
          안내하며 촬영 등 별도 동의가 필요한 항목도 함께 확인합니다
        </p>
        <a
          className="action-button compact"
          href={`mailto:${eventConfig.contactEmail}`}
        >
          메일로 문의
        </a>
      </section>
    </main>
  );
}
