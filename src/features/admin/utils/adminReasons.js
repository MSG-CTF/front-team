// 운영 중 자주 쓰는 사유: 칩을 누르면 그대로 들어가고 필요하면 고쳐 쓴다
// 참가자에게 보이는 사유(마일리지)는 참가자가 읽어도 어색하지 않은 말로 둔다
export const REASON_PRESETS = {
  unpublish: ["문제 오류 확인", "점검 중", "플래그 유출 의심", "배점 재조정"],
  publish: ["검수 완료", "점검 완료", "오류 수정 완료", "예정 시각 공개"],
  ban: ["플래그 공유", "운영 방해", "부정 행위", "인프라 공격"],
  mileageGrant: ["부스 이벤트 보상", "운영 오류 보상", "이벤트 당첨"],
  mileageDeduct: ["중복 지급 정정", "잘못된 결제 정정", "부정 획득 회수"],
  rollback: ["운영 오류 복구", "잘못된 개입 되돌리기", "서버 오류 복구"],
  cell: ["채점 지연으로 정답 반영 누락", "잘못 열린 칸 정정", "운영진 판단"],
  move: ["이동 경로 계산 오류 정정", "서버 오류 복구", "운영진 판단"],
  dice: ["주사위 응답 유실 보상", "이벤트 보상", "중복 지급 정정"],
  teamEdit: ["팀원 변경 요청", "팀장 변경 요청", "팀 이름 정정"],
  teamDelete: ["중복 등록", "참가 취소", "테스트 팀 정리"],
};

export const MILEAGE_AMOUNTS = [100, 300, 500, -100];
// 지급·회수를 따로 고르는 폼에서 쓰는 금액 단계
export const MILEAGE_STEPS = [100, 300, 500, 1000];
// 부스 결제는 계산대처럼 누를 때마다 더한다
export const PAYMENT_STEPS = [100, 500, 1000];
export const DICE_AMOUNTS = [1, 2, -1];

// 지급(+)이면 지급 사유, 회수(-)면 회수 사유, 아직 모르면 둘 다 조금씩
export function mileageReasonPresets(amount) {
  const value = Number(amount);
  if (value > 0) return REASON_PRESETS.mileageGrant;
  if (value < 0) return REASON_PRESETS.mileageDeduct;
  return [...REASON_PRESETS.mileageGrant.slice(0, 2), ...REASON_PRESETS.mileageDeduct.slice(0, 1)];
}
