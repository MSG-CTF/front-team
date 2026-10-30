# 관리자 이미지 준비

`관리자 → 문제 → 배포 설정 → 버전 정보`에서 선택 버전의 **이미지 준비 요청**을
누르면 기존 관리자 인증으로 Backend에 `{}`를 전송한다. 화면 진입, 버전 선택,
**이미지 준비 이력 새로고침**, **상태 보기**, **선택 요청 상태 새로고침**은 GET만
사용하며 Runtime을 직접 호출하지 않는다. 사용 중인 버전을 전환하지 않는다.

- 이력: `GET /api/v1/admin/challenges/{challenge_id}/releases/{release_id}/image_preparations?page=1`
- 명시적 접수: 위 경로 `POST {}`와 `Idempotency-Key`
- 상세: `GET /api/v1/admin/challenges/{challenge_id}/image_preparations/{request_id}`

이력은 20개씩 표시한다. 접수 응답 뒤에도 현재 페이지를 GET으로 다시 조회해
정확한 건수를 표시하며, 같은 접수의 재확인으로 건수를 중복 계산하지 않는다.
이 조회가 실패하면 접수 성공을 유지하고 이력 조회 실패를 별도로 표시한다.
GET은 10초, POST는 15초 제한이며 자동 POST 재전송이나 자동 폴링은 하지 않는다.
중복 클릭은 처리 중에 막는다. 응답 유실이나 처리 중
멱등 충돌은 같은 키로 다시 확인하며, 이 키만 브라우저 탭의 sessionStorage에
보존한다. 창을 닫거나 다른 버전을 선택해도 탭 안에서 유지된다. 명확한 거절이나
유효한 접수 응답을 받으면 키를 지운다. 브라우저 저장소가 제한되면 현재 페이지
메모리에만 유지된다.

지원 범위는 실행 가능한 KUBERNETES, AMD64/ARM64, WEB/PWN 버전이다. 승인
여부와 실제 운영 대상·이미지는 Backend가 검증하고 고정한다. 화면에는 운영
대상, 이미지, 인증 값을 새로 입력하는 기능이 없다. 이력의 `SUCCEEDED` 및
노드의 `READY`는 **과거 작업 결과**이며 현재 노드 캐시 준비를 보증하지 않는다.
Backend DB 기록 조회만으로 현재 readiness를 확인했다고 표시하지 않는다.

배포에는 Backend 이미지 준비 API, 승인된 release, 기능 설정과 처리 워커가
필요하다. 404/미지원 API, 비활성 기능, 설정 오류, 승인 거절은 화면에 표시한다.
이 프런트 변경 자체가 Backend/Runtime 설정이나 에이전트를 활성화하지 않는다.
프런트 CI의 main push 배포 경로는 기존 `.github/workflows/ci.yml`의
`deploy-development`이며 PR 브랜치는 배포하지 않는다.
