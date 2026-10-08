# 문제별 실행 설정

관리자 문제 목록에서 실행 설정을 열면 해당 문제의 릴리스와 비밀값 연결을 확인할 수 있습니다

| 항목 | 확인할 내용 |
| --- | --- |
| 릴리스 | 사용 중인 버전과 이전 발행 이력 |
| 이미지 | 컨테이너별 GHCR 주소와 고정 digest |
| 환경변수 | 해당 릴리스에서 전달하는 이름과 값 |
| 비밀값 연결 | 컨테이너의 주입 이름, 저장된 이름, 연결 버전 |
| 저장된 비밀값 | 저장 시각, 버전, 최신 저장값 여부 |
| 격리와 자원 | 격리 프로필, 공개·내부 포트, CPU·메모리 |

비밀값 원문과 hash는 조회하지 않습니다
화면의 연결됨은 저장된 버전이 릴리스에 연결됐다는 뜻이며 실제 컨테이너 주입을 검증했다는 뜻은 아닙니다

## 변경 순서

1) 필요한 비밀값을 이름과 함께 저장합니다
2) CI에서 받은 실행 릴리스 JSON을 등록합니다
3) 환경변수와 비밀값 연결 버전을 확인합니다
4) 이 버전 사용을 누르고 적용 내용을 확인합니다

비밀값을 새로 저장해도 기존 릴리스는 이전 버전을 유지합니다
릴리스 전환은 새 인스턴스부터 적용하며 기존 인스턴스와 재시작은 생성 당시 릴리스를 유지합니다

이미지가 GHCR에 있어도 발행 파일에 비밀값 연결 정보가 없으면 주입 경로에 연결되지 않습니다
이 경우 연결 없음으로 표시하며 이름과 버전을 임의로 만들어 표시하지 않습니다

## 백엔드 계약

[백엔드 실행 설정 PR](https://github.com/MSG-CTF/msg-backend/pull/101)의 관리자 메타데이터 조회가 필요합니다

| API | 용도 |
| --- | --- |
| GET /admin/challenges/{challenge_id}/releases | 릴리스와 컨테이너별 secret_bindings 조회 |
| GET /admin/challenges/{challenge_id}/runtime-secrets | 비밀값 이름과 버전 조회 |
| POST /admin/challenges/{challenge_id}/runtime-secrets | 비밀값 새 버전 저장 |
| POST /admin/challenges/{challenge_id}/releases | 발행 파일 등록 |
| POST /admin/challenges/{challenge_id}/releases/{release_id}/activate | 새 인스턴스에 적용할 릴리스 선택 |

모든 경로는 /api/v1 아래에 있고 관리자 JWT가 필요합니다
