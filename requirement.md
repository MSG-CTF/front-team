# 프론트엔드 실행/연동 요구사항

백엔드가 로컬(또는 통합 테스트) 환경에서 프론트엔드를 같이 띄우기 위해 필요한 정보를 정리한 문서다. 상세 API 규약·응답 포맷은 이 문서가 아니라 `README.md`가 기준이다.

## 1. 실행 환경

| 항목 | 값 |
|---|---|
| 런타임 | Node.js 20 이상 (Vite 5, react-router-dom v7 요구사항) |
| 패키지 매니저 | npm (`package-lock.json` 커밋되어 있음, `npm ci` 사용 권장) |
| 프레임워크 | React 18 + Vite |
| 빌드 산출물 | 정적 파일(`dist/`) — SPA, 클라이언트 사이드 라우팅 |

## 2. 실행 방법

- 개발 서버: `npm install` → `npm run dev` (Vite 기본 포트 5173)
- 프로덕션 빌드: `npm run build` → `dist/` 정적 파일 생성 → 임의의 정적 서버(nginx 등)로 서빙
- 미리보기: `npm run preview`

Docker로 띄우는 방법은 `Dockerfile` / `docker-compose.yml` / `nginx.conf` 참고(같은 커밋에 포함).

## 3. 백엔드 연동 시 반드시 필요한 것 — API 프록시

**현재 코드(`src/api/client.js`)는 API base URL을 상대경로 `/api/v1`로 하드코딩하고 있다.** 즉 프론트는 자기 자신과 "같은 오리진"에 `/api/v1/*`가 떠 있다고 가정하고 요청을 보낸다.

- 개발 서버(`npm run dev`)로 띄운다면: Vite dev server에 `/api/v1` → 백엔드로 넘기는 프록시 설정이 필요하다(현재 `vite.config.js`에는 없음 — 아직 추가 안 된 상태).
- Docker/프로덕션 빌드로 띄운다면: 이 리포에 포함된 `nginx.conf`가 그 프록시 역할을 한다(`location /api/v1/ { proxy_pass http://backend:8080/api/v1/; }`). **`backend:8080` 부분은 실제 백엔드 서비스명·포트로 바꿔야 동작한다.**

이 부분은 README.md 12-5절에도 "Phase 0 인프라 미완 항목"으로 적혀 있는 알려진 이슈다. 절대경로(`VITE_API_BASE_URL` env 변수) 방식으로 바꿀지, 계속 상대경로+리버스프록시 방식으로 갈지는 아직 팀 내 결정 전이다 — 백엔드가 선호하는 방식이 있으면 알려주면 그쪽으로 맞춘다.

## 4. 포트

| 용도 | 포트 |
|---|---|
| Vite 개발 서버 | 5173 (기본값) |
| Docker 컨테이너 내부(nginx) | 80 |
| Docker 호스트 매핑(`docker-compose.yml` 기준) | 3000 → 80 |

## 5. 환경 변수

현재 빌드/실행에 **필수인 환경 변수는 없다**(위 3번 이슈 때문에 base URL이 코드에 하드코딩돼 있음). 추후 `VITE_API_BASE_URL` / `VITE_API_PREFIX` 방식으로 전환되면 이 문서에도 반영한다.

## 6. 인증/CORS 관련 참고

- 프론트는 `Authorization: Bearer <access_token>` 헤더로 인증한다(로그인 응답에서 발급).
- 프론트-백엔드가 같은 오리진(리버스프록시 경유)이면 CORS 설정이 따로 필요 없다. 만약 백엔드를 별도 오리진으로 직접 호출하는 방식을 원한다면 CORS 허용 + 위 3번의 base URL을 절대경로로 바꾸는 작업이 같이 필요하다 — 이 경우 회의에서 미리 알려주면 좋다.

## 7. 아직 미해결/확인 필요 (연동 전 체크)

- 위 3번 base URL 처리 방식(상대경로+프록시 vs 절대경로+env) 최종 결정
- 백엔드 서비스명/포트 확정 → `nginx.conf`, `docker-compose.yml`의 자리표시자(`backend:8080`) 교체
- README.md Appendix B에 정리된 API 스펙 미해결 이슈들(밴 팀 노출 여부, `GET /ranking/me` 인증 방식 등) — 연동 전 백엔드와 재확인 필요
