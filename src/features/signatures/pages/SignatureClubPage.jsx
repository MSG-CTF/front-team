import { Link, useParams } from "react-router-dom";
import { ROUTES } from "../../../routes/routePaths.js";
import { useSignatures } from "../hooks/useSignatures.js";
import { getFestivalBrand } from "../utils/festivalBrand.js";
import { groupSignatureClubs } from "../utils/festivalBooths.js";
import shared from "../../challenges/components/ChallengeDetailScreen.module.css";
import styles from "../components/SignatureScreen.module.css";
import festival from "../components/SignatureFestival.module.css";

export default function SignatureClubPage() {
  const { clubId } = useParams();
  const state = useSignatures();
  const club = groupSignatureClubs(state.data).find(
    (entry) => entry.clubId === clubId,
  );
  const brand = getFestivalBrand(club?.name);
  return (
    <div className={`${shared.page} ${festival.clubPage}`}>
      <nav className={shared.backBar} aria-label="부스 화면 이동">
        <Link to={ROUTES.signatures} className={shared.backButton}>
          ← 축제장으로 돌아가기
        </Link>
        <span className={shared.pageLocation}>SIGNATURE</span>
      </nav>
      <main
        className={`${shared.board} ${festival.clubBoard}`}
        aria-label="동아리 부스 문제"
      >
        {state.status === "loading" && (
          <p className={styles.pageNotice} role="status">
            부스 문제를 불러오는 중
          </p>
        )}
        {state.status === "error" && (
          <div className={styles.pageNotice} role="alert">
            <p>{state.error}</p>
            <button
              type="button"
              onClick={state.retry}
              className={shared.primaryButton}
            >
              다시 불러오기
            </button>
          </div>
        )}
        {state.status === "success" && !club && (
          <div className={styles.pageNotice}>
            <h1>아직 공개된 문제가 없습니다</h1>
            <Link to={ROUTES.signatures} className={shared.primaryButton}>
              다른 부스 둘러보기
            </Link>
          </div>
        )}
        {club && (
          <>
            <header className={festival.clubHeader}>
              {brand && (
                <span className={festival.clubLogo} data-kind={brand.kind}>
                  <img src={brand.src} alt="" />
                </span>
              )}
              <div>
                <p className={shared.eyebrow}>
                  {club.university || "CLUB BOOTH"}
                </p>
                <h1 className={shared.title}>{club.name}</h1>
              </div>
              <p className={festival.clubProgress}>
                풀이 완료{" "}
                <strong>
                  {club.solvedCount} / {club.problems.length}
                </strong>
              </p>
            </header>
            <ul className={festival.problemList}>
              {club.problems.map((entry) => (
                <li key={entry.signature_id}>
                  <Link
                    to={ROUTES.signatureDetail(entry.signature_id)}
                    className={festival.problemLink}
                  >
                    <div>
                      <span className={festival.problemLabel}>
                        {entry.is_solved ? "풀이 완료" : "SIGNATURE"}
                      </span>
                      <h2>{entry.title}</h2>
                      <span className={festival.problemTeams}>
                        {entry.solved_team_count}팀 해결
                      </span>
                    </div>
                    <strong className={festival.problemScore}>
                      {entry.score.toLocaleString("ko-KR")}
                      <small> pts</small>
                    </strong>
                    <span className={festival.problemArrow} aria-hidden="true">
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <p className={styles.footnote}>
              시그니처 문제는 팀 점수에만 반영됩니다 마일리지와 추가 주사위는
              지급되지 않습니다
            </p>
          </>
        )}
      </main>
    </div>
  );
}
