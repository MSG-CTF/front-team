import { INSTANCE_STATUS } from "../../../constants/enums.js";

// Figma의 버튼 크기를 유지하고 패널 폭에 네 동작을 배치한다
const BUTTONS = [
  { key: "extend", src: "/assets/challenge-detail/button-instance-extend.png", label: "인스턴스 TTL 연장", left: "67.812%" },
  { key: "restart", src: "/assets/challenge-detail/button-instance-restart.png", label: "인스턴스 재시작", left: "76.25%" },
];

export default function InstanceControls({
  instance,
  unavailable,
  busy,
  onCreate,
  onExtend,
  onRestart,
  onStop,
}) {
  const hasActiveInstance = Boolean(instance?.instanceId);
  const canManageInstance = instance?.status === INSTANCE_STATUS.RUNNING;

  const handlers = { extend: onExtend, restart: onRestart };

  return (
    <>
      {/* CREATE - 활성 인스턴스가 있으면 비활성 상태 이미지로 전환 */}
      <button
        type="button"
        onClick={onCreate}
        disabled={hasActiveInstance || unavailable || busy}
        aria-label="인스턴스 생성"
        className="absolute left-[59.375%] top-[58.704%] w-[8.021%] h-[5.741%] border-0 bg-transparent p-0 cursor-pointer transition-[filter] duration-150 hover:brightness-105 active:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <img
          src={
            hasActiveInstance
              ? "/assets/challenge-detail/button-instance-create-disabled.png"
              : "/assets/challenge-detail/button-instance-create.png"
          }
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
        />
        <span className="sr-only">인스턴스 생성</span>
      </button>

      {BUTTONS.map((button) => (
        <button
          key={button.key}
          type="button"
          onClick={handlers[button.key]}
          disabled={!canManageInstance || unavailable || busy}
          aria-label={button.label}
          className="absolute top-[58.704%] w-[8.021%] h-[5.741%] border-0 bg-transparent p-0 cursor-pointer transition-[filter] duration-150 hover:brightness-105 active:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
          style={{ left: button.left }}
        >
          <img
            src={button.src}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-contain pointer-events-none"
          />
          <span className="sr-only">{button.label}</span>
        </button>
      ))}
      <button type="button" onClick={onStop} disabled={!canManageInstance || unavailable || busy}
        className="absolute left-[84.583%] top-[58.704%] w-[8.021%] h-[5.741%] rounded border-[0.16cqw] border-auth-text bg-[#4c2814] font-kode-mono text-[0.85cqw] text-[#e9cc93] shadow-inner hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed">
        인스턴스 종료
      </button>
    </>
  );
}
