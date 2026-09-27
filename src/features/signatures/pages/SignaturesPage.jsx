import { Link } from "react-router-dom";
import { ROUTES } from "../../../routes/routePaths.js";
import { useSignatures } from "../hooks/useSignatures.js";
import { buildFestivalBooths } from "../utils/festivalBooths.js";
import { getBoothProgress } from "../utils/festivalBrand.js";
import ClubBrand from "../components/ClubBrand.jsx";
import BoothAchievement from "../components/BoothAchievement.jsx";
import styles from "../components/SignatureFestival.module.css";

function FestivalBooth({ club, status }) {
  const ready = status === "success";
  const available = ready && club.problems.length > 0;
  const progress = getBoothProgress(club, status);
  const { complete, visited } = progress;
  const contents = (
    <>
      <span className={styles.boothSign}>
        <ClubBrand name={club.name} />
      </span>
      {visited && (
        <>
          <span className={styles.boothGlow} aria-hidden="true" />
          {complete && (
            <span className={styles.achievement} data-achievement="complete">
              <BoothAchievement name={club.name} />
            </span>
          )}
          <span className={styles.srOnly}>
            {complete
              ? "동아리의 공개 문제를 모두 해결했습니다"
              : `${progress.total}문제 중 ${progress.solved}문제 해결`}
          </span>
        </>
      )}
      <span className={styles.boothCaption}>
        <span className={styles.university}>{club.university}</span>
        <span className={styles.enterLabel}>
          {status === "error"
            ? "조회하지 못함"
            : !ready
              ? "확인 중"
              : !available
                ? "공개된 문제 없음"
                : complete
                  ? "부스 다시 보기 →"
                  : visited
                    ? `${progress.solved} / ${progress.total} 해결 · 이어서 도전 →`
                    : "부스 들어가기 →"}
        </span>
      </span>
    </>
  );
  return (
    <li
      className={styles.boothPosition}
      data-booth={club.position}
      data-progress={complete ? "complete" : visited ? "partial" : "open"}
    >
      {available ? (
        <Link
          to={ROUTES.signatureClub(club.clubId)}
          className={styles.booth}
          aria-label={
            club.name + " 부스 들어가기" + (complete ? " 풀이 완료" : "")
          }
        >
          {contents}
        </Link>
      ) : (
        <button
          type="button"
          disabled
          className={styles.booth + " " + styles.unavailable}
          aria-label={
            club.name +
            (status === "error"
              ? " 조회하지 못함"
              : ready
                ? " 공개된 문제 없음"
                : " 확인 중")
          }
        >
          {contents}
        </button>
      )}
    </li>
  );
}

export function SignatureFestivalScreen({ state }) {
  const { booths, otherClubs } = buildFestivalBooths(state.data);
  return (
    <main className={styles.festivalPage} aria-label="동아리 축제장">
      <div className={styles.scene}>
        <nav className={styles.navigation} aria-label="부스 화면 이동">
          <Link to={ROUTES.board}>← 보드로 돌아가기</Link>
          <Link to={ROUTES.openChallenges}>JEOPARDY →</Link>
        </nav>
        <header className={styles.festivalHeader}>
          <p>MSG CTF</p>
          <h1>CLUB FESTIVAL</h1>
          <span>문제를 풀고 동아리 스탬프를 모아보세요</span>
        </header>
        {state.status === "error" && (
          <div className={styles.sceneNotice} role="alert">
            <p>{state.error}</p>
            <button onClick={state.retry} type="button">
              다시 불러오기
            </button>
          </div>
        )}
        <ul
          className={styles.booths}
          aria-label="동아리 부스 선택"
          aria-busy={state.status === "loading"}
        >
          {booths.map((club) => (
            <FestivalBooth key={club.key} club={club} status={state.status} />
          ))}
        </ul>
        <footer className={styles.sceneFooter}>
          <span>
            {state.status === "loading"
              ? "부스 소식을 불러오는 중"
              : "보드 개방과 관계없이 참여할 수 있어요"}
          </span>
          <button
            type="button"
            onClick={state.retry}
            disabled={state.status === "loading"}
          >
            새로고침
          </button>
        </footer>
      </div>
      {state.status === "success" && otherClubs.length > 0 && (
        <section className={styles.otherClubs} aria-label="추가 동아리 부스">
          <h2>함께하는 부스</h2>
          {otherClubs.map((club) => (
            <Link key={club.clubId} to={ROUTES.signatureClub(club.clubId)}>
              {club.name} →
            </Link>
          ))}
        </section>
      )}
    </main>
  );
}

export default function SignaturesPage() {
  const state = useSignatures();
  return <SignatureFestivalScreen state={state} />;
}
