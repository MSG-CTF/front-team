import {
  INSTANCE_STATUS,
  INSTANCE_STATUS_LABEL,
  UNKNOWN_INSTANCE_STATUS_LABEL,
} from "../../../constants/enums.js";
import { formatRemaining } from "../../../utils/time.js";

// Figma node 307:75 "InstancePanel" (640x300) - node 95:360(ChallengeDetailPage)판.
// "INSTANCE"/"CONNECT"/"TIME TO LIVE"/"EXTENDS n / N" 라벨은 panel-instance.png에
// 이미 그려져 있고, 안쪽 요소는 이 패널 박스(640x300) 기준 %로 배치한다.
//
// RUNNING 배지만 시안 이미지(pill-running.png)로 그리고, 그 외 상태는 텍스트 pill로
// 대체한다(README.md "인스턴스 상태" 표의 참가자 화면 문구). 시안 plate에 구워진
// "EXTENDS 1 / 3"은 API 값으로 오해되지 않도록 같은 위치에 실제 extend_count 또는
// 미제공 표시를 겹쳐 보여준다.
export default function InstancePanel({ instance, error }) {
  const status = instance?.status ?? null;
  const isRunning = status === INSTANCE_STATUS.RUNNING;
  const statusLabel = error
    ? "조회 실패"
    : status
      ? INSTANCE_STATUS_LABEL[status] ?? UNKNOWN_INSTANCE_STATUS_LABEL
      : "인스턴스 없음";

  const remainingSeconds = isRunning ? instance?.remainingSeconds ?? null : null;
  const extendsUsed = instance?.extendsUsed ?? null;

  return (
    <div
      className="absolute left-[59.32%] top-[28.83%] w-[33.33%] h-[27.78%]"
      aria-label={`인스턴스 상태 ${statusLabel}, 잔여 ${formatRemaining(remainingSeconds)}, 연장 횟수 ${extendsUsed ?? "미제공"}`}
    >
      <img
        src="/assets/challenge-detail/panel-instance.png"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-contain pointer-events-none"
      />

      {/* 상태 배지 */}
      {isRunning ? (
        <img
          src="/assets/challenge-detail/pill-running.png"
          alt="RUNNING"
          className="absolute left-[68.28%] top-[6.54%] w-[26.25%] h-[13.33%] object-contain pointer-events-none"
        />
      ) : (
        <span className="absolute left-[68.28%] top-[6.54%] w-[26.25%] h-[13.33%] flex items-center justify-center rounded-full border border-auth-text/60 font-kode-mono text-[0.85cqw] text-detail-console">
          {statusLabel}
        </span>
      )}

      {/* 접속 정보 (host:port) - 시안 307:80 Kode Mono 24px (= 1.25cqw) */}
      <p className="absolute left-[7.5%] top-[40.67%] font-kode-mono text-[1.25cqw] leading-[normal] text-detail-console">
        {isRunning ? instance.connectUrl ?? "-" : "-"}
      </p>

      <p className="absolute right-[6%] top-[61%] font-kode-mono text-[1cqw] leading-[normal] text-[#e59f29]">
        {formatRemaining(remainingSeconds)}
      </p>

      {/* TIME TO LIVE 진행바 (node 307:78 TtlTrack / 307:79 TtlProgress).
          테두리 2px / 반지름 5px는 캔버스 1920 기준 값이라 cqw로 환산해야 무대가
          줄었을 때 같이 줄어든다. API가 전체 TTL을 제공하지 않으므로 실제 비율을
          추측한 progress fill은 그리지 않고 expires_at 기반 잔여시간만 표시한다. */}
      <div className="absolute left-[5.47%] top-[74.67%] w-[89.06%] h-[6.67%] rounded-[0.26cqw] border-[0.104cqw] border-auth-text bg-black overflow-hidden" />

      <p className="absolute left-[5.1%] top-[87%] z-10 m-0 bg-[#1b0d07] pr-[0.8cqw] font-im-fell text-[0.85cqw] tracking-[0.12em] text-[#9c7040]">
        EXTENDS {extendsUsed ?? "—"}
      </p>
    </div>
  );
}
