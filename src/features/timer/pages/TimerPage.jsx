import TimerScreen from "../components/TimerScreen.jsx";
import useTimerController from "../hooks/useTimerController.js";

// 타이머 페이지 - README.md "7. 타이머 페이지".
// 제품 요구사항(README 7절 원문): 남은 시간 표시, 주사위 초기화 시간,
// 프론트-백엔드 시간 동기화. 이 페이지는 그중 "남은 시간 표시 + 시간 동기화"를
// 다룬다(주사위 초기화 시간은 보드 페이지의 DiceStatusPanel 담당).
export default function TimerPage() {
  const timer = useTimerController();

  return (
    <TimerScreen
      status={timer.status}
      contest={timer.contest}
      error={timer.error}
      isSynced={timer.isSynced}
      liveRemainingSeconds={timer.liveRemainingSeconds}
      onRetry={timer.retry}
    />
  );
}
