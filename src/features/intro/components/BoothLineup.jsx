export default function BoothLineup() {
  return (
    <section
      id="booths"
      className="event-section booth-section"
      aria-labelledby="booths-title"
    >
      <div className="section-heading">
        <h2 id="booths-title">대회 부스</h2>
        <span className="recruitment-count">6개 동아리의 현장 프로그램</span>
      </div>
      <div className="booth-lineup" data-enter-motion="">
        <article>
          <div className="booth-host">
            <img
              src="/assets/intro/club-mjsec.svg"
              width="64"
              height="48"
              alt=""
              loading="lazy"
            />
            <p className="booth-club">MJSEC</p>
          </div>
          <h3>메이드 카페</h3>
          <p>음료와 폴라로이드 포토존</p>
        </article>
        <article>
          <div className="booth-host">
            <img
              src="/assets/intro/club-swing.svg"
              width="64"
              height="48"
              alt=""
              loading="lazy"
            />
            <p className="booth-club">SWING</p>
          </div>
          <h3>대저택 살인사건</h3>
          <p>단서를 모아 범인을 찾는 추리 체험</p>
        </article>
        <article>
          <div className="booth-host">
            <img
              src="/assets/intro/club-ycert.svg"
              width="64"
              height="48"
              alt=""
              loading="lazy"
            />
            <p className="booth-club">Y-CERT</p>
          </div>
          <h3 lang="en">WORDLE</h3>
          <p>6글자 영어 단어를 7번 안에 맞히기</p>
        </article>
        <article>
          <div className="booth-host">
            <img
              src="/assets/intro/club-sekurity.svg"
              width="64"
              height="48"
              alt=""
              loading="lazy"
            />
            <p className="booth-club">seKUrity</p>
          </div>
          <h3>오락실</h3>
          <p>뽑기와 초성 퀴즈, 인물 맞히기</p>
        </article>
        <article>
          <div className="booth-host">
            <img
              src="/assets/intro/club-codecure.svg"
              width="64"
              height="48"
              alt=""
              loading="lazy"
            />
            <p className="booth-club">CodeCure</p>
          </div>
          <h3>자물쇠와 영타 게임</h3>
          <p>자물쇠 풀기 또는 영타로 쓴 한글 맞히기</p>
        </article>
        <article>
          <div className="booth-host">
            <img
              src="/assets/intro/club-aegis.svg"
              width="64"
              height="48"
              alt=""
              loading="lazy"
            />
            <p className="booth-club">Aegis</p>
          </div>
          <h3 lang="en">BREAK THE SYSTEM</h3>
          <p>보안 퀴즈와 하드웨어 체험, 웹 레이싱</p>
        </article>
      </div>
      <p className="program-note">
        준비 중인 프로그램으로 세부 구성은 달라질 수 있습니다
      </p>
    </section>
  );
}
