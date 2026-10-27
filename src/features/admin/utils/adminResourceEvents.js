// 관리자 조회는 캐시 없이 매번 가져온다. 열려 있는 관리자 리소스도 즉시 재검증한다.
export const ADMIN_RESOURCE_CHANGED = "msgctf:admin-resource-changed";
export function notifyAdminResourceChanged() {
  window.dispatchEvent(new Event(ADMIN_RESOURCE_CHANGED));
}
