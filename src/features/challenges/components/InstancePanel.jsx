import {
  INSTANCE_STATUS,
  INSTANCE_STATUS_LABEL,
  UNKNOWN_INSTANCE_STATUS_LABEL,
} from "../../../constants/enums.js";
import { formatRemaining } from "../../../utils/time.js";

// Figma node 307:75 "InstancePanel" (640x300) — node 95:360(ChallengeDetailPage)판.
// "INSTANCE"/"CONNECT"/"TIME TO LIVE"/"EXTENDS n / N" 라벨은 panel-instance.png에
// 이미 그려져 있고, 안쪽 요소는 이 패널 박스(640x300) 기준 %로 배치한다.
//
// RUNNING 배지만 시안 이미지(pill-running.png)로 그리고, 그 외 상태는 텍스트 pill로
// 대체한다(README.md "인스턴스 상태" 표의 참가자 화면 문구). "EXTENDS n / N"의
// 라이브 값은 아직 미표시 — 시안 plate에 "1 / 3"이 구워져 있어 이중으로 보임
// (값 없는 plate 재추출 요청 대상, aria-label로만 노출).
export default function InstancePanel({ instance }) {
  const status = instance?.status ?? null;
  const isRunning = status === INSTANCE_STATUS.RUNNING;
  const statusLabel = status
    ? INSTANCE_STATUS_LABEL[status] ?? UNKNOWN_INSTANCE_STATUS_LABEL
    : "인스턴스 없음";

  const remainingSeconds = isRunning ? instance?.remainingSeconds ?? null : null;
  const ttlSeconds = isRunning ? instance?.ttlSeconds ?? null : null;
  const progressPercent =
    remainingSeconds != null && ttlSeconds
      ? Math.min(100, Math.max(0, (remainingSeconds / ttlSeconds) * 100))
      : 0;

  const extendsUsed = instance?.extendsUsed ?? 0;
  const extendsMax = instance?.extendsMax ?? 3;

  return (
    <div
      className="absolute left-[59.32%] top-[28.83%] w-[33.33%] h-[27.78%]"
      aria-label={`인스턴스 상태 ${statusLabel}, 잔여 ${formatRemaining(remainingSeconds)}, 연장 ${extendsUsed} / ${extendsMax}`}
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

      {/* 접속 정보 (host:port) — 시안 307:80 Kode Mono 24px (= 1.25cqw) */}
      <p className="absolute left-[7.5%] top-[40.67%] font-kode-mono text-[1.25cqw] leading-[normal] text-detail-console">
        {isRunning ? instance.connectUrl ?? "-" : "-"}
      </p>

      {/* TIME TO LIVE 진행바 (node 307:78 TtlTrack / 307:79 TtlProgress).
          테두리 2px / 반지름 5px는 캔버스 1920 기준 값이라 cqw로 환산해야 무대가
          줄었을 때 같이 줄어든다 (px로 두면 축소 시 2배쯤 두꺼워 보인다). */}
      <div className="absolute left-[5.47%] top-[74.67%] w-[89.06%] h-[6.67%] rounded-[0.26cqw] border-[0.104cqw] border-auth-text bg-black overflow-hidden">
        <div
          className="h-full bg-[#e59f29] transition-[width] duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
}
