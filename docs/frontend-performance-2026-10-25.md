# 프론트 로딩 최적화와 QA, 2026-10-25

PR 기준 main: 14a6c9ec04fca32b9959993ee82f68b6e85210d0
기존 원격 실행 UI 작업과 분리한 작업 트리에서 검증

## 변경과 보존 범위

- PNG 19개의 표시 사본을 무손실 WebP로 생성하고 RGBA 픽셀과 ICC 프로파일 일치 확인
- TTF 6종을 WOFF2로 변환하고 글자 윤곽, 폭, 수직 메트릭 유지
- 로그인과 문제 선택의 한글은 공통 글자를 먼저 받고 임의의 서버 문구는 전체 글꼴로 보완
- 주사위에서 사용하지 않는 UV 데이터만 제거하고 물리 worker를 첫 실제 굴림에서 시작
- 규칙의 세로 화면도 같은 원본 중앙을 사용하고 모바일에서 숨긴 장식 그림은 요청하지 않도록 변경
- 규칙 테두리와 공통 종이 질감은 실제로 그리는 원본 픽셀만 별도 보관하고 필터 경계 여유 유지
- 부스는 작은 화면에서만 768/1024px AVIF를 사용하고 높은 픽셀 밀도와 넓은 화면에서는 원본 WebP 유지
- KoTH는 목록 응답이 오면 먼저 표시하고 팀 점수는 도착한 뒤 반영
- KoTH 점수 실패 시 미확인 점수와 완료 도장을 지우고 유효한 목록은 계속 이용 가능
- KoTH 목록 실패 시 이전 목록의 문제 접속을 막고 새로고침으로 복구
- 인증 확인 뒤 현재 화면의 그림을 미리 받으며 보드 메뉴를 가리키거나 누를 때도 같은 요청 재사용
- Nginx에서 JS/CSS/SVG/GLB 압축, 해시 청크 1년 캐시, HTML과 원본 경로 자산 재검증
- QA 산출물을 Docker 전송과 Vite 감시에서 제외하고 의존성 검색을 index.html에서 시작
- 200% 확대 시 관리자 상단과 문제 상세 상태판/단추의 좁은 폭 넘침 보정

원본 이미지와 글꼴은 보존하며 화면 좌표, 원화 비율, 대회 시간과 인증 조건은 유지
AVIF는 손실 압축이며 동일 크기로 줄인 원본 대비 PSNR 41.5dB 이상 확인
API 경로와 요청/응답 계약은 변경하지 않음

## 로컬 로딩 비교

390×844, DPR 2, 내려받기 4Mbps, 지연 100ms, 빈 캐시에서 각 3회 측정한 중앙값
규칙과 부스는 배경 응답 완료 시각, KoTH는 목록 표시 시각
API는 동일 fixture를 사용하며 일반 응답은 180ms, KoTH 팀 점수는 1,500ms 지연
최적화 작업 중 저장한 비교 빌드에서 규칙/부스/KoTH의 추가 로딩 보정 전후를 측정
수치는 운영 API나 실제 기기의 응답 속도를 의미하지 않음

| 화면 | 변경 전 | 변경 후 | 시간 감소 |
|---|---:|---:|---:|
| 규칙 배경 | 8,480ms | 6,019ms | 29.0% |
| 동아리 부스 배경 | 3,961ms | 2,778ms | 29.9% |
| KoTH 목록 | 3,209ms | 1,944ms | 39.4% |

같은 측정에서 관찰한 압축 해제 리소스 바이트는 규칙 2,280,548 → 1,298,507, 부스 1,164,680 → 1,030,597, KoTH 1,609,634 → 1,120,880
Nginx 압축 전송량과 구분한 값이며 전체 최적화의 누적 개선율로 사용하지 않음

## 검증

- 분리한 PR 작업 트리에서 npm ci, npm test 695/695, production build 통과
- 원본 PNG/WebP 픽셀과 색상 프로파일, 글꼴 윤곽/폭과 부분 글꼴 실패 대체, 주사위 사용 버퍼 일치 검증
- 실제 Nginx 1.31.8에서 압축, 캐시, HTML 재검증, AVIF MIME, API 경로/쿼리, 없는 자산 404 등 14조건 통과
- 이전 로컬 전체 작업 트리에서 Chromium 97조건, WebKit 88조건과 글꼴 렌더 24조건 통과
- 규칙/부스/KoTH의 DPR 2/3, 320/390/844/1440px, 세로/가로/세로 전환, 레이아웃 150/200% 확대 확인
- Chromium visual viewport 200% 확대와 WebKit 모바일 터치 환경 확인
- 점수 지연/실패/재시도, 목록 실패/복구, 점수 감소, 부스 상세 열기/닫기와 모바일 확대 확인
- 종이 질감을 공유하는 규칙/마이페이지/문제 상세의 좁은 화면과 확대 상태 확인

운영 서비스 통합 결과와 브라우저 fixture 결과는 별도로 기록
실제 iPhone/Android 기기는 없어 Chromium과 WebKit 모바일 환경으로 검증
Three.js 청크는 약 555KB이며 빌드의 500KB 경고는 남아 있음
실제 Nginx에서 이 청크 전송은 약 141KB, 주사위 모델은 약 192KB로 압축됨

## 재현

- 자산 생성: python scripts/optimize-ui-assets.py, python scripts/optimize-dice-model.py, python scripts/optimize-page-artwork.py
- 생성에만 Pillow와 fonttools[woff] 사용, 애플리케이션 의존성 변경 없음
- Nginx 검증: python scripts/qa-static-delivery.py --nginx PATH --mime-types PATH --build dist --output output/playwright/QA_DIRECTORY
- 초기 측정과 캡처: output/playwright/performance-20261025
- 규칙/부스/KoTH 비교와 실패 상태 검증: output/playwright/slow-pages-20261025
- 분리한 PR 빌드와 배포 QA: output/playwright/release-20261025
