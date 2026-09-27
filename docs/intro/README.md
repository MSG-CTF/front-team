# MSG CTF 2026 인트로

2026년 9월 19일 확인한 시안을 기존 React 앱에 연결

## 화면 경로

| 주소 | 화면 |
| --- | --- |
| / | 대회 소개와 참가 신청 |
| /guide | 참가 조건, 경기 규칙, FAQ |
| /login | 기존 대회 로그인 |

로그인과 보드, 문제, 관리자 화면의 동작은 변경하지 않음
인트로는 별도 청크로 읽고 CSS 선택자는 msg-intro 안으로 제한
로그인에 쓰던 배경, 로고와 Pretendard 파일은 그대로 재사용
카운트다운은 안내용이며 대회 개시나 접수 상태를 제어하지 않음

## 수정할 위치

| 내용 | 파일 |
| --- | --- |
| 시작 시각, 참가비, 신청 링크, 문의, 상금 | src/features/intro/config/eventConfig.js |
| 개요와 신청 안내 | src/features/intro/components/EventOverview.jsx, EventRegistration.jsx |
| 부스와 마일리지샵 | src/features/intro/components/BoothLineup.jsx, MileageShop.jsx |
| 준비물과 신분 확인 | src/features/intro/components/OnsiteGuide.jsx |
| 지난 대회 기록 | src/features/intro/components/EventHistory.jsx |
| 상세 안내와 FAQ | src/features/intro/IntroGuidePage.jsx |
| 간격과 반응형 배치 | src/features/intro/intro.css |

## 반영한 운영 정보

- 11월 8일 오전 10시, 오프라인 진행
- 참가비 무료
- 팀원 모두 대회 당일 만 19세 이상인 학생, 2인 1팀
- 75팀 150명, 내부 25팀 50명과 외부 50팀 100명
- 내부는 주최 6개 동아리, 외부는 그 외 학생이며 동아리 소속 불필요
- 외부 선발은 팀 평균 학년이 낮은 순, 평균이 같으면 신청 순
- 모집은 10월 12일부터 25일까지
- 총상금 150만원, 내부 30/20/10만원과 외부 50/30/10만원
- 지난 2025년 대회 실적은 100명, 50팀

신청 버튼은 제공받은 Google Form으로 연결하며 접수 중이라고 표시하지 않음
신청 폼 제출, 로그인 요청, 메일 발송은 검수에서 수행하지 않음

## 공개 전 확인

- 장소와 경기 종료 시각
- 접수 시작과 종료 시각, 신청 폼 문항과 개인정보 안내
- 학생 신분 인정 범위와 증빙, 내부/외부 혼합팀 기준
- 최종 경기 규칙과 수상 조건, 부스 운영 시간과 마일리지 교환 기준
- 후원사 로고 배치 승인, 특히 MONSTER ENERGY 담당 C A T 사전 검토

참가비는 확정된 무료로 안내하며 미정 항목에 포함하지 않음
후원 로고 반영이 후원사 승인 절차 완료를 뜻하지는 않음
후원사 브랜드 가이드 PDF와 개인 연락처는 저장소에 넣지 않음

## 확인 방법

npm ci로 설치하고 npm run dev로 실행
npm test로 기존 기능과 인트로 회귀 검사
npm run build로 운영 빌드 검사

PC와 320px, 390px, 768px에서 가로 넘침과 글자 잘림 확인
모바일 메뉴 열기, Escape 닫기, 본문 링크 이동과 뒤로 가기 확인
일시정지와 재생, 동작 줄이기 설정, 화면 밖 모션 중지 확인
LOGIN이 기존 로그인 화면으로 이어지고 인트로 CSS가 남지 않는지 확인
상세 안내 주소로 직접 진입하거나 새로 고쳐도 표시되는지 확인
