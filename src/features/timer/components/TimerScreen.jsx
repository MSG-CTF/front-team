import ContestCountdown from "../../countdown/components/ContestCountdown.jsx";
import useStartFinale from "../../countdown/hooks/useStartFinale.js";
import LoadingRing from "../../../components/common/LoadingRing.jsx";
import styles from "./TimerScreen.module.css";

// 대회 타이머: 대기 화면과 같은 광장과 로고 위에서 시작 전에는 시작까지, 진행 중에는 종료까지 센다
// 마지막 10초에는 같은 숫자 셈을 하고, 시작과 종료 순간에는 마무리 연출을 덮은 뒤 다음 단계 화면을 연다
// 현장 화면에 띄워 두는 화면이라 다른 화면으로 가는 버튼 없이 시계만 둔다
const UNSYNCED_NOTE = "서버 시각을 받지 못해 이 기기 시계를 기준으로 표시합니다";

export default function TimerScreen({ status, contest, error, isSynced, stage, secondsLeft, onRetry }) {
  const watching = Boolean(contest);
  const startFinale = useStartFinale(stage === "before", watching);
  const endFinale = useStartFinale(stage === "running", watching);

  if (!contest) {
    if (status === "error") {
      return (
        <main className={styles.notice}>
          <p role="alert">{error}</p>
          <button type="button" onClick={onRetry}>다시 시도</button>
        </main>
      );
    }
    if (status === "empty") return <main className={styles.notice}><p>현재 진행 중이거나 예정된 대회가 없습니다</p></main>;
    return <div role="status" className={styles.notice}><LoadingRing size="page">타이머 정보를 불러오는 중입니다</LoadingRing></div>;
  }

  const note = isSynced ? null : UNSYNCED_NOTE;
  // 단계마다 자리를 고정해야 시작과 종료 순간의 셈과 마무리 연출이 끊기지 않고 이어진다
  return <>
    {stage === "ended" && <ContestCountdown variant="timer" goal="end" targetTime={contest.endTime} ended links={false} note={note} />}
    {(stage === "running" || endFinale) && (
      <ContestCountdown variant="timer" goal="end" targetTime={contest.endTime} secondsLeft={stage === "running" ? secondsLeft : 0} overlay={stage !== "running"} links={false} note={note} />
    )}
    {(stage === "before" || startFinale) && (
      <ContestCountdown variant="timer" goal="start" targetTime={contest.startTime} secondsLeft={stage === "before" ? secondsLeft : 0} overlay={stage !== "before"} links={false} note={note} />
    )}
  </>;
}
