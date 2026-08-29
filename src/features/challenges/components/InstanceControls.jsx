import { ACTIVE_INSTANCE_STATUSES } from "../../../constants/enums.js";

// Figma node 296:11~296:14 — 인스턴스 생명주기 버튼(각 154x62), 인스턴스 패널 아래 한 줄.
// 시안에는 create / create-disabled / extend / restart 4개가 나란히 있는데,
// create-disabled는 create 버튼의 "비활성 상태" 스펙이므로 실제로는 3버튼으로 구현하고
// create 버튼이 인스턴스 유무에 따라 두 이미지를 전환한다.
//
// TODO(challenge-detail): 각 핸들러를 src/api/instances.js에 연결.
//  - onCreate  → POST /instances { challenge_id }  (202, 기존 활성 인스턴스는 자동 교체)
//  - onExtend  → POST /instances/{id}/extend { extend_minutes }
//  - onRestart → POST /instances/{id}/reset
//  종료(DELETE /instances/{id}) 버튼은 시안에 없음 — 디자이너 확인 필요.
const BUTTONS = [
  { key: "extend", src: "/assets/challenge-detail/button-instance-extend.png", label: "인스턴스 TTL 연장", left: "67.71%" },
  { key: "restart", src: "/assets/challenge-detail/button-instance-restart.png", label: "인스턴스 재시작", left: "76.15%" },
];

export default function InstanceControls({ instance, onCreate, onExtend, onRestart }) {
  const hasActiveInstance =
    instance?.status != null && ACTIVE_INSTANCE_STATUSES.includes(instance.status);

  const handlers = { extend: onExtend, restart: onRestart };

  return (
    <>
      {/* CREATE — 활성 인스턴스가 있으면 비활성 상태 이미지로 전환 */}
      <button
        type="button"
        onClick={onCreate}
        disabled={hasActiveInstance}
        aria-label="인스턴스 생성"
        className="absolute left-[59.38%] top-[58.7%] w-[8.02%] h-[5.74%] border-0 bg-transparent p-0 cursor-pointer transition-[filter] duration-150 hover:brightness-105 active:brightness-95 disabled:cursor-not-allowed"
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
          disabled={!hasActiveInstance}
          aria-label={button.label}
          className="absolute top-[58.7%] w-[8.02%] h-[5.74%] border-0 bg-transparent p-0 cursor-pointer transition-[filter] duration-150 hover:brightness-105 active:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
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
    </>
  );
}
