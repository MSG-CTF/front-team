import { INSTANCE_STATUS, INSTANCE_STATUS_LABEL, UNKNOWN_INSTANCE_STATUS_LABEL } from "../../../constants/enums.js";
import { formatRemaining } from "../../../utils/time.js";

// Figma node 182:81 (instance_no_bar 그룹, 640x300) — 안쪽 요소들은 이 박스
// 기준 %로 배치한다(위치/텍스트 좌표는 root 1920x1080이 아니라 이 640x300 기준).
export default function InstancePanel({ instance }) {
  const status = instance?.status ?? null;
  const isRunning = status === INSTANCE_STATUS.RUNNING;
  const statusLabel = status ? INSTANCE_STATUS_LABEL[status] ?? UNKNOWN_INSTANCE_STATUS_LABEL : "인스턴스 없음";

  const remainingSeconds = isRunning ? instance?.remainingSeconds ?? null : null;
  const ttlSeconds = isRunning ? instance?.ttlSeconds ?? null : null;
  const progressPercent =
    remainingSeconds != null && ttlSeconds ? Math.min(100, Math.max(0, (remainingSeconds / ttlSeconds) * 100)) : 0;

  return (
    <div className="absolute left-[59.69%] top-[33.43%] w-[33.33%] h-[27.78%] overflow-hidden">
      <img
        src="/assets/challenge-detail/panel-instance.png"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
      />

      {/* 상태 pill — RUNNING이면 배경 시안 그대로, 그 외 상태는 텍스트 pill로 대체 */}
      {isRunning ? (
        <img
          src="/assets/challenge-detail/pill-running.png"
          alt="RUNNING"
          className="absolute left-[68.28%] top-[6.33%] w-[26.25%] h-[13.33%] object-contain pointer-events-none"
        />
      ) : (
        <span className="absolute left-[68.28%] top-[6.33%] w-[26.25%] h-[13.33%] flex items-center justify-center rounded-full border border-auth-text/60 font-kode-mono text-[0.9cqw] text-auth-text">
          {statusLabel}
        </span>
      )}

      <p className="absolute left-[7.5%] top-[40%] font-kode-mono text-[1.25cqw] text-detail-console">
        {isRunning ? instance.connectUrl ?? "https://....." : "https://....."}
      </p>

      {/* 진행상황바 (Figma node 182:83) — 검정 배경 + auth-text 테두리는 시안 그대로,
          내부 채움/잔여시간 텍스트는 TTL 표시(README.md "3. 문제 상세 페이지") 요구사항을
          위해 추가한 것으로 원본 레이어에는 없다. */}
      <div className="absolute left-[5.47%] top-[74.67%] w-[89.06%] h-[6.67%] rounded-[5px] border-2 border-auth-text bg-black overflow-hidden">
        <div
          className="h-full bg-detail-solved transition-[width] duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      <p className="absolute left-[5.47%] top-[65%] font-kode-mono text-[0.9cqw] text-detail-console">
        {formatRemaining(remainingSeconds)}
      </p>
    </div>
  );
}
