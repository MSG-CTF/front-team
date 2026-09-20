import { Link, useParams } from "react-router-dom";
import { ROUTES } from "../../../routes/routePaths.js";
import { toKst } from "../../../utils/time.js";
import FlagSubmitPanel from "../../challenges/components/FlagSubmitPanel.jsx";
import { useSignatureDetail } from "../hooks/useSignatures.js";
import { getFestivalBrand } from "../utils/festivalBrand.js";
import BoothAchievement from "../components/BoothAchievement.jsx";
import shared from "../../challenges/components/ChallengeDetailScreen.module.css";
import styles from "../components/SignatureScreen.module.css";
import festival from "../components/SignatureFestival.module.css";

function SignatureDetail({ signatureId }) {
  const state = useSignatureDetail(signatureId);
  const challenge = state.data;
  const brand = getFestivalBrand(challenge?.club_name);
  return (
    <div className={`${shared.page} ${festival.clubPage}`}>
      <div className={shared.backBar}>
        <Link
          to={
            challenge
              ? ROUTES.signatureClub(challenge.club_id)
              : ROUTES.signatures
          }
          className={shared.backButton}
        >
          {challenge
            ? `← ${challenge.club_name} 부스`
            : "← 축제장으로 돌아가기"}
        </Link>
        <span className={shared.pageLocation}>SIGNATURE</span>
      </div>
      <main className={shared.board} aria-label="부스 문제 상세">
        {state.status === "loading" && !challenge && (
          <p className={styles.pageNotice} role="status">
            문제 정보를 불러오는 중
          </p>
        )}
        {state.status === "error" && (
          <section className={styles.pageNotice} role="alert">
            <h1>문제를 확인하지 못했습니다</h1>
            <p>{state.error}</p>
            <button
              type="button"
              className={shared.primaryButton}
              onClick={state.retry}
            >
              다시 확인
            </button>
          </section>
        )}
        {challenge && (
          <>
            <header className={shared.header}>
              <div className={shared.titleGroup}>
                <div className={styles.detailClub}>
                  {brand && (
                    <span className={styles.clubMark} data-kind={brand.kind}>
                      <img src={brand.src} alt="" />
                    </span>
                  )}
                  <span>{challenge.club_name}</span>
                  {state.solved && brand && (
                    <span
                      className={festival.detailAchievement}
                      aria-hidden="true"
                    >
                      <BoothAchievement name={challenge.club_name} />
                    </span>
                  )}
                </div>
                <h1 className={shared.title}>{challenge.title}</h1>
              </div>
              <dl className={shared.metrics}>
                <div>
                  <dt>배점</dt>
                  <dd>
                    {challenge.score.toLocaleString("ko-KR")}
                    <small> pts</small>
                  </dd>
                </div>
                <div>
                  <dt>해결한 팀</dt>
                  <dd>
                    {challenge.solved_team_count}
                    <small> 팀</small>
                  </dd>
                </div>
              </dl>
            </header>
            <div className={shared.contentGrid}>
              <section
                className={shared.descriptionPanel}
                aria-labelledby="signature-description"
              >
                <div className={shared.sectionIntro}>
                  <span className={shared.sectionNumber} aria-hidden="true">
                    01
                  </span>
                  <h2
                    id="signature-description"
                    className={shared.sectionHeading}
                  >
                    문제 설명
                  </h2>
                </div>
                <div className={shared.descriptionBody}>
                  {challenge.description ||
                    "현장 부스에서 문제 설명을 확인해주세요"}
                </div>
                {challenge.solved_at && (
                  <p className={styles.solvedAt}>
                    풀이 완료 {toKst(challenge.solved_at)} KST
                  </p>
                )}
              </section>
              <div className={shared.actionColumn}>
                <FlagSubmitPanel
                  value={state.flag}
                  onChange={state.setFlag}
                  onSubmit={state.submit}
                  disabled={state.disabled}
                  inputDisabled={
                    state.busy || state.solved || state.status !== "success"
                  }
                  busy={state.busy}
                  retrySeconds={state.retrySeconds}
                  solved={state.solved}
                  feedback={state.feedback}
                  maxLength={512}
                >
                  <p className={styles.rewardNote}>
                    팀 점수에만 반영됩니다
                    <br />
                    마일리지와 추가 주사위는 지급되지 않습니다
                  </p>
                </FlagSubmitPanel>
                {state.status === "loading" && (
                  <p role="status">풀이 기록을 확인하는 중</p>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default function SignatureDetailPage() {
  const { signatureId } = useParams();
  // 다른 문제로 이동하면 입력한 플래그와 이전 요청 상태를 함께 버린다
  return <SignatureDetail key={signatureId} signatureId={signatureId} />;
}
