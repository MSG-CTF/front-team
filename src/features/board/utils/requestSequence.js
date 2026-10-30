// 응답 순서가 뒤집혀 도착해도 가장 나중에 시작한 요청만 화면 상태에 반영하게 한다
// 이동·보정 같은 변경이 시작되면 invalidate 로 그 전에 시작한 조회를 모두 오래된 것으로 만든다
export function createRequestSequence() {
  let latest = 0;
  return {
    begin: () => ++latest,
    isLatest: (token) => token === latest,
    invalidate: () => { ++latest; },
  };
}
