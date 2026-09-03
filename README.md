# MSG CTF 플랫폼 - 통합 기획/API 명세서

> 이 문서는 아래 3개 문서를 **하나로 통합한 단일 소스**입니다. 앞으로 이 리포에서 개발 작업을 시작할 때는 이 문서 하나만 읽으면 됩니다.
>
> - `archive/최초_MVP_기능요구사항_초안.md` - 최초 MVP 기능 요구사항 + 공통 규약 초안
> - `archive/브랜치전략_개발가이드.md` - 브랜치 전략, 개발 순서, 전역 설정 가이드
> - `archive/최종_API명세서_통합본_1.md` - 페이지별 API 상세 명세 최종본
>
> 세 문서를 대조하는 과정에서 서로 다르게 적힌 부분이 여러 건 있었습니다. **원칙적으로 더 나중에/더 상세하게 검증된 문서(`최종_API명세서_통합본_1.md` > `브랜치전략_개발가이드.md` > `최초_MVP_기능요구사항_초안.md`)를 우선했고**, 단순 최신/구버전 문제가 아니라 실제 제품 동작이 갈리는 지점은 사용자 QA를 거쳐 아래처럼 처리했습니다. 원본 3개 파일은 삭제하지 않고 `archive/`에 보존했으니, 이 문서의 서술이 의심스러우면 그쪽 원문을 대조하면 됩니다.
>
> **이번 통합에서 실제로 방향이 정해진 충돌**
> | # | 충돌 내용 | 처리 |
> |---|---|---|
> | 1 | ID 타입: `최초_MVP_기능요구사항_초안.md`는 전 리소스 `Long`(정수) / 최종 API 명세서는 `String(UUID)` | **`String(UUID)` 채택** (최종 API 명세서 + 브랜치가이드 `routes.ts` 예시 2곳이 일치, `최초_MVP_기능요구사항_초안.md` 쪽이 outlier) |
> | 2 | `challenge_candidates[].title` (`GET /board/cell/current`) - 최종 API 명세서 원문은 `title`인데, 같은 문서의 "다른 리소스에 얹힌 참조는 `challenge_title`" 규칙과 어긋남 | **`challenge_title`로 교정**해서 이 문서에 반영. 원문 오탈자로 추정 - 실제 백엔드 연동 전 재확인 필요(Appendix B 신규 항목 참고) |
> | 3 | 밴(BAN)된 팀의 리더보드/랭킹 노출 - `최초_MVP_기능요구사항_초안.md`: "계속 노출"로 명시적 결정 / 최종 API 명세서 4, 5절: `GET /leaderboard`, `GET /ranking` 둘 다 "밴 팀 제외"라고 명시 | **미해결로 보류.** 아래 0-8절과 Appendix B에 🔴로 남겨둠 - 백엔드/기획 확인 전까지 프론트는 **두 경우 다 깨지지 않게** 방어적으로 짤 것(밴 팀이 응답에 있어도, 없어도 렌더링이 죽지 않도록) |

---

## 0. 공통 규약 (최종)

### 0-1. Base URL

```
http://msgctf.kr/api/v1
http://msgctf.kr/api/v1/admin (관리자 전용)
http://msgctf.kr/internal/** (서버-서버 전용, 프론트 대상 아님)
```

프론트 코드에서는 절대 문자열로 하드코딩하지 않고 전역 변수로 관리한다(7-5-1절 참고).

**URL 규칙**
- 경로 끝에 슬래시를 **붙이지 않는다** (`/api/v1/board` ⭕ / `/api/v1/board/` ❌)
- Path variable은 **snake_case** (`{team_id}`, `{challenge_id}`)
- 리소스명은 복수형 (`/teams`, `/challenges`, `/instances`)

### 0-2. 응답 포맷

모든 응답은 `{ code, message, data }` 3개 키 고정.

```json
{
  "code": "SUCCESS",
  "message": "성공",
  "data": null
}
```

**성공 판정 규칙**
> HTTP status가 200이어도 성공이 아닐 수 있다. 프론트는 반드시 `code === "SUCCESS"`로 성공을 판정한다.
> (예: 플래그 오답은 `200 OK` + `code: "INCORRECT_FLAG"`, 무인도 탈출 실패는 `200 OK` + `code: "ESCAPE_FAILED"`)

**data 형태**
- `data`는 **항상 객체 또는 null**. 배열을 최상위에 두지 않는다.
- 목록은 키로 감싼다: `"data": { "challenges": [...], "total_count": 12 }`
- **조회 결과가 없음 -> `200` + `data: null`이며 `404`가 아니다.** (`GET /timer`의 "활성 대회 없음" 케이스로 최종 확정됨 - 구버전 문서에 남아있던 404 언급은 모순으로 판정되어 폐기됨)

### 0-3. ID 타입

**모든 `*_id` PK/FK는 기본적으로 `String(UUID)`.** 예외 2개:

| 필드 | 타입 | 예시 |
|---|---|---|
| `card_id` | `String`(enum 성격) | `"card_reroll"` |
| `payment_token` | `String` | `"pt_9f8a3c2e"` |

> ⚠️ 이전 초안(`최초_MVP_기능요구사항_초안.md`)에는 이 표가 전부 `Long`(정수)로 되어 있었으나, 최종 API 명세서와 브랜치가이드 예시 코드가 일관되게 `String(UUID)`를 전제하고 있어 이쪽으로 최종 확정했다. 라우팅(`useParams`), 스토어 타입, DTO를 작성할 때 **정수 파싱을 시도하지 말 것**.

### 0-4. 인증

- `Authorization: Bearer <JWT_TOKEN>` 헤더. `access_token`은 1시간, `refresh_token`은 12시간 유효.
- claim: `sub`(user_id), `team_id`, `role`, `is_leader`, `exp`.
- 인증 실패는 항상 401 3종 중 하나: `TOKEN_MISSING` / `TOKEN_EXPIRED` / `TOKEN_INVALID`.
- 권한 부족(관리자 API를 참가자가 호출 등)은 `403 FORBIDDEN`.
- **인증이 필요 없는 API(전체)**: `GET /board`, `GET /board/chance/catalog`, `GET /leaderboard`, `GET /timer`, `GET /koth/clubs`, `GET /koth/clubs/{club_id}`. 그 외는 전부 인증 필요.
- 🔴 예외(미해결): `GET /ranking/me`만 Bearer 대신 `team: {팀 이름}` 커스텀 헤더 사용 - 보안 이슈로 QA 결정 대기(Appendix B 참고).

> `TOKEN_EXPIRED`를 받으면 프론트는 `/auth/refresh`로 자동 재발급 후 1회 재시도한다.
> `TOKEN_MISSING` / `TOKEN_INVALID`는 재시도 없이 로그인 화면으로 보낸다.

### 0-5. 팀장 권한 판정

- 팀장은 **팀 생성 시 확정**되며 대회 중 변경하지 않는다.
- 팀장 여부는 `access_token`의 `is_leader` claim으로 판정한다. **매 요청 DB 조회를 하지 않는다.**
- 서버는 토큰 **서명 검증에 성공한 뒤에만** claim을 읽는다. 요청 body, header, query로 들어온 `is_leader` 값은 절대 신뢰하지 않는다.
- 프론트가 버튼을 숨기는 것은 편의 기능일 뿐이므로, 서버는 항상 독립적으로 재검증한다.
- **팀장만 호출 가능한 API** (엔드포인트는 최종 API 명세서 2절 기준으로 교정):
  - `POST /board/dice/roll`
  - `POST /board/airport/move`
  - `POST /board/chance/use`
  - `POST /board/chance/confirm` <- 초안에는 없었으나 최종 API 명세서 2절에 "팀장만" 명시되어 있어 추가됨
  - `POST /board/roulette/spin`
- 팀장이 아니면 `403 NOT_TEAM_LEADER`
- 관리자(`role: ADMIN`)는 `is_leader`가 항상 `false` -> 위 API 호출 불가

> 운영 중 부득이하게 팀장을 바꿔야 하는 경우(계정 분실 등): DB를 수정한 뒤 해당 팀원의 `refresh_token`을 삭제해 재로그인시켜야 한다. 이미 발급된 `access_token`은 최대 1시간 동안 옛 `is_leader` 값을 그대로 들고 있다.

### 0-6. 밴(BAN) 처리

- 밴된 팀(`is_banned: true`)은 **모든 쓰기 작업이 차단**된다. 조회(`GET`)는 허용한다.
- 쓰기 = `POST` / `PUT` / `PATCH` / `DELETE`. 차단 시 `403 TEAM_BANNED`.
- 대상: 주사위/카드사용/공항이동/룰렛/문제오픈/플래그제출/인스턴스 생성, 재시작, 연장, 종료/QR토큰발급 등.
- **예외 (밴 상태여도 허용)**: `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`
  - 로그인을 막으면 참가자가 "활동이 정지되었습니다" 안내조차 볼 수 없다.
  - 토큰 갱신을 막으면 1시간 뒤 `TOKEN_EXPIRED`가 떠서 밴된 사실이 아니라 장애로 오해한다.
- 관리자 API(`/admin/**`)에는 이 검사를 적용하지 않는다.
- 차단 지점은 **Interceptor 한 곳**으로 일원화한다. API마다 개별 구현하지 않는다.
- 팀을 밴할 때 실행 중인 인스턴스는 관리자가 수동으로 강제 종료한다.

> **`is_banned`는 토큰 claim에 넣지 않는다.** 밴은 대회 중 발생하고 즉시 적용돼야 하므로, 쓰기 요청마다 DB에서 조회한다. claim에 넣으면 밴된 팀이 토큰 만료까지 최대 1시간 동안 계속 플레이할 수 있다(`is_leader`와 반대 - 그쪽은 변경되지 않으므로 claim을 쓴다).

> 🔴 **미해결 - 밴 팀의 리더보드/랭킹 노출 여부.** 초안(`최초_MVP_기능요구사항_초안.md`)은 "밴 팀도 계속 노출"로 명시했으나, 최종 API 명세서 4절(`GET /leaderboard`), 5절(`GET /ranking`)은 둘 다 "밴 팀 제외"라고 명시했다. 정반대 결정이라 이번 통합에서 임의로 고르지 않았다. **백엔드/기획 컨펌 전까지 프론트는 응답에 밴 팀이 섞여 있든 없든 안 죽게 방어적으로 렌더링할 것.**

### 0-7. Idempotency-Key

다음 쓰기 API는 `Idempotency-Key` 헤더 **필수**:
`POST /board/dice/roll`, `POST /board/cell/open`, `POST /board/airport/move`, `POST /board/quarantine/escape`, `POST /board/chance/now`, `POST /board/chance/use`, `POST /board/chance/confirm`(ERD `idempotency_scope` enum에 아직 없음 - Appendix B), `POST /board/roulette/spin`, 인스턴스 생성/재시작/연장/종료 계열.

> `apiClient`(7-5-2절)에 이 헤더를 매번 손으로 안 붙여도 되게 하는 공통 헬퍼가 아직 없다 - Phase 0 인프라 작업 시 반영할 것.

### 0-8. 시간

모든 시간 필드는 **ISO-8601 UTC**(`Z` 접미사)로 응답. **KST 변환은 전적으로 프론트 책임**(7-5-3절 유틸 참고). 카운트다운류(주사위 리셋, 타이머, 문제 풀이 제한시간)는 가능하면 `server_time` 기준으로 클라이언트 시계 오차를 보정한다(단, `GET /timer`는 `server_time`이 없음 - Appendix B).

### 0-9. 페이지네이션

`page`(기본 1) / `size`(기본 API마다 다름, 상한 100, 초과 시 서버가 100으로 클램프) 공통 패턴. 응답엔 `total_count` 포함.

### 0-10. HTTP 상태코드 규칙

| 상황 | 코드 |
|---|---|
| 조회, 수정 성공 | `200` |
| 비동기 큐 적재 (인스턴스 생성/재시작/연장/종료) | `202` |
| 요청 값 오류 | `400` |
| 인증 실패 | `401` |
| 권한 없음 | `403` |
| **상태 충돌** (이미 ~함, ~상태가 아님) | `409` |
| 서버 오류 | `500` |
| 조회 결과가 없음 | `200` - `data: null` (404 아님) |
| 너무 많은 요청 발생 시 | `429` |

### 0-11. 공통 에러 코드

| HTTP | code | message |
|---|---|---|
| 401 | `TOKEN_MISSING` | 로그인이 필요합니다 |
| 401 | `TOKEN_EXPIRED` | 세션이 만료되었습니다 |
| 401 | `TOKEN_INVALID` | 유효하지 않은 인증 정보입니다 |
| 403 | `FORBIDDEN` | 권한이 필요합니다 |
| 403 | `TEAM_BANNED` | 활동이 정지된 팀입니다 |
| 400 | `INVALID_REQUEST` | 요청 값이 올바르지 않습니다 |
| 404 | `USER_HAS_NO_TEAM` | 소속된 팀이 없습니다 |
| 500 | `INTERNAL_ERROR` | 서버 오류가 발생했습니다 |

아래 각 페이지 절에서는 이 공통 에러를 반복 표기하지 않고, **API별 추가 에러만** 표기한다.

### 0-12. 인스턴스 상태 (scheduler 정의)

플랫폼은 상태를 새로 만들거나 압축하지 않는다. **scheduler가 정의한 값을 그대로 전달한다.**

| 상태 | 의미 | 접속 가능 | 참가자 화면 문구 |
|---|---|---|---|
| `REQUESTED` | 생성 요청이 저장된 상태 | ✕ | 요청 접수됨 |
| `SCHEDULING` | Broker 후보 조회, 선택 진행 중 | ✕ | 준비 중 |
| `PROVISIONING` | Runtime에 workload 생성 요청 중 | ✕ | 준비 중 |
| `RUNNING` | 생성되어 사용 가능 | ○ | 접속 정보 표시 |
| `RESTARTING` | 재시작 요청 처리 중 | ✕ | 재시작 중 |
| `RESETTING` | 초기화 요청 처리 중 | ✕ | 초기화 중 |
| `STOPPING` | 삭제 요청 처리 중 | ✕ | 종료 중 |
| `STOPPED` | Runtime workload 삭제 완료 | ✕ | 종료됨 |
| `FAILED` | 생성, 재시작, 초기화, 정리 중 실패 | ✕ | 오류 - 다시 시도 |
| `EXPIRED` | TTL 또는 hard timeout 만료 | ✕ | 시간 만료 |
| `CLEANUP_PENDING` | 정리 필요하지만 끝나지 않음 | ✕ | (참가자 미표시) |
| `CLEANED` | Runtime 리소스 정리까지 완료 | ✕ | (참가자 미표시) |

**상태 분류**
- **활성(active)**: `REQUESTED`, `SCHEDULING`, `PROVISIONING`, `RUNNING`, `RESTARTING`, `RESETTING`, `STOPPING`
- **종료(terminal)**: `STOPPED`, `FAILED`, `EXPIRED`, `CLEANED`
- `CLEANUP_PENDING`은 리소스가 아직 회수되지 않은 상태다. 팀 동시 실행 제한에 포함할지 확인 필요.

**필드 유효 규칙**
- `host`, `port`, `expires_at`, `remaining_seconds`는 **`RUNNING`일 때만 유효**하다.
- ⚠️ 다만 실제 3절(`POST /instances/{id}/extend`, `DELETE /instances/{id}`) 응답 예시에는 `host`/`ports`가 아예 **키 자체가 빠져** 있고 `null`로도 안 내려온다. "무효면 null"과 "무효면 키 자체가 없음"이 API마다 다르다는 뜻 - 프론트에서 단일 Instance 타입 하나로 다루기 어렵다. 미해결(Appendix B #3), 연동 시 실제 응답으로 재확인할 것.
- `GET /teams/me/instance`는 **활성 상태 인스턴스가 있을 때만** 객체를 반환하고, 종료 상태만 남았으면 `data: null`을 반환한다. ⚠️ 이름과 달리 **"팀"이 아니라 "본인(user_id)" 기준**이다(Appendix B #14) - 팀원이 여러 명이면 각자 자기 인스턴스만 보인다.

**상태 전이**
```
REQUESTED -> SCHEDULING -> PROVISIONING -> RUNNING
RUNNING -> RESTARTING -> RUNNING
RUNNING -> RESETTING -> RUNNING
RUNNING -> STOPPING -> STOPPED
RUNNING -> EXPIRED (TTL / hard timeout)
어느 단계든 -> FAILED
STOPPED / FAILED / EXPIRED -> CLEANUP_PENDING -> CLEANED
```

> 프론트는 **모르는 상태값을 받으면 "준비 중"으로 처리하고 폴링을 계속한다.** scheduler에 상태가 추가돼도 화면이 깨지지 않도록 방어적으로 짜둘 것.

### 0-13. 마일리지 타입

마일리지가 오가는 모든 지점을 타입으로 구분한다.

| type | 발생 지점 | 부호 |
|---|---|---|
| `CHALLENGE_SOLVE` | 문제 해결 | + |
| `START_BONUS` | START 칸 통과 | + |
| `ROULETTE` | 룰렛칸 당첨 | + |
| `KOTH_REWARD` | KOTH 보상 | + |
| `ADMIN_GRANT` | 관리자 수동 지급 | + |
| `REFUND` | 결제 환불 | + |
| `PURCHASE` | QR 결제 (부스 구매) | - |
| `ADMIN_DEDUCT` | 관리자 수동 차감 | - |

**규칙**
- 부호는 `amount` 필드가 가진다. `type`은 그 **이유**를 나타낼 뿐이다.
- **`direction`, `EARN`, `SPEND` 같은 별도 부호 필드를 두지 않는다.** 같은 정보를 두 곳에 저장하면 언젠가 서로 어긋난다. 필요하면 `type`에서 유도한다.
- **불변식**: `mileage_history`의 `amount`를 전부 더하면 `Team.mileage`와 일치해야 한다.
- 이미 쌓인 행은 **수정하거나 삭제하지 않는다.** 되돌려야 하면 반대 방향 행을 새로 쌓는다(예: `PURCHASE -30` -> `REFUND +30`).

### 0-14. Enum 사전

| 항목 | 값 |
|---|---|
| `role` | `PARTICIPANT`, `ADMIN` |
| `difficulty` | `EASY`, `MEDIUM`, `HARD` |
| `category` | `WEB`, `PWN`, `REV`, `CRYPTO`, `FORENSIC`, `MISC` |
| `instance.status` | 0-12절 12개 상태 |
| `mileage.type` | 0-13절 8개 타입 |
| `cell.type` | `START`, `CHALLENGE`, `CHANCE`, `AIRPORT`, `QUARANTINE`, `ROULETTE` |

### 0-15. 용어

- 보드판 칸은 **cell**로 통일 (`total_cells`, `cells`, `CELL_NOT_FOUND`). `tile` 사용 금지.
- 문제 리소스 자체의 제목은 `title`, **다른 리소스에 얹힌 참조는 `challenge_title`**. (`GET /board/cell/current`의 `challenge_candidates[].title`은 이 규칙에 따라 `challenge_title`로 교정 - 0-3절 위 표 참고)

---

## 1. 로그인 페이지(인증)

인증 불필요(모든 API). `Idempotency-Key` 불필요.

| Method | URL | 설명 |
|---|---|---|
| POST | `/auth/login` | 로그인 + 토큰 발급 |
| POST | `/auth/refresh` | access_token 재발급 |
| POST | `/auth/logout` | 로그아웃(refresh_token 폐기) |
| GET | `/auth/me` | 로그인 상태 확인(Bearer 필요) |

- `POST /auth/login` - Req `{ login_id, password }` -> Res `{ access_token, refresh_token, role, is_leader, nickname, team_id, team_name, user_id, is_banned, ban_reason }`. **`is_banned`/`ban_reason` 추가** - 밴 팀도 로그인은 허용되므로 직후 안내용(`is_banned=false`면 `ban_reason: null`, 팀 없는 계정도 false). 추가 에러: `400 INVALID_REQUEST` / `401 INVALID_CREDENTIALS`(아이디, 비번 구분 안 함) / **`429 TOO_MANY_REQUESTS`** (IP + `login_id` 조합 분당 10회 - Argon2 무차별 대입 방어. 플래그의 `TOO_MANY_ATTEMPTS`와 다른 코드).
- `POST /auth/refresh` - Req `{ refresh_token }` -> Res `{ access_token }`(1시간 유효, refresh_token은 재발급 안 함, 기존 것 12시간까지 재사용). 추가 에러: `401 REFRESH_TOKEN_EXPIRED` / `401 REFRESH_TOKEN_NOT_FOUND` / `401 REFRESH_TOKEN_INVALID` / `400 INVALID_REQUEST`.
- `POST /auth/logout` - Bearer + Req `{ refresh_token }` -> Res `data: null`(서버가 DB에서 refresh_token 삭제). 추가 에러: `400 INVALID_REQUEST` / `401 TOKEN_MISSING`.
- `GET /auth/me` - Bearer -> Res `{ user_id, nickname, is_leader, team_id, team_name, role }`.

**제품 요구사항(기능명세 원문)**: ID/PW POST 로그인, 팀 토큰 발급, 인증/검증.

---

## 2. 문제 리스트(보드) 페이지

인증: `GET /board`, `GET /board/chance/catalog`만 불필요, 나머지 전부 Bearer 필요.

> **이 절은 Notion [API명세서 -> 보드 페이지] DB(2026-08-23 스냅샷) 기준으로 전면 갱신되었다.** 16개 엔드포인트 전부 백엔드 "완료". 굴림 -> 확정 2단계 흐름, 찬스카드 폐기, `cell_states`, 무인도 탈출 코드 방식이 초안에서 크게 바뀌었다. `POST` 쓰기 계열은 전부 `Idempotency-Key` 헤더(`<이름>-<UUID>`) 필수, 이동/굴림 계열은 팀장만.

| Method | URL | 설명 |
|---|---|---|
| GET | `/board` | 보드판 전체 칸 배치(36칸) |
| GET | `/board/me` | 내 팀 보드 상태 전체 |
| GET | `/board/dice/status` | 주사위 굴릴 수 있는지 상태 |
| POST | `/board/dice/roll` | 주사위 2개 굴려 이동(팀장만) |
| POST | `/board/dice/confirm` | 보류된 굴림 결과 확정(팀장만) |
| GET | `/board/cell/current` | 도착한 칸 상세 + 문제 후보 3개 |
| POST | `/board/cell/open` | 문제 선택해 오픈 |
| GET | `/board/opened_challenges` | 열어둔 문제 목록 + 풀이 여부 |
| POST | `/board/airport/move` | 세계여행(공항) 자유 이동(팀장만) |
| POST | `/board/quarantine/escape` | 무인도 탈출(탈출 코드 제출, 팀장만) |
| POST | `/board/roulette/spin` | 룰렛 돌려 마일리지 획득(팀장만) |
| GET | `/board/chance/catalog` | 전체 chance 카드 종류(7종) |
| POST | `/board/chance/now` | 찬스칸 도착 시 카드 뽑기(팀장만) |
| POST | `/board/chance/use` | chance 카드 사용(팀장만) |
| POST | `/board/chance/confirm` | `card_roll_twice_choose` 2단계 확정(팀장만) |
| POST | `/board/chance/discard` | 보유 카드 2장 중 1장 폐기(팀장만) |

### 조회

- `GET /board` (인증 없음) -> `{ total_cell_count: 36, cells: [{ cell_index, type, difficulty, name }] }`. 특수칸 고정: 1=START, 7, 30=CHANCE("황금열쇠"), 16=QUARANTINE, 21=AIRPORT("세계여행"), 25=ROULETTE, 나머지 30칸 CHALLENGE. `difficulty`는 CHALLENGE 칸만(`EASY`/`MEDIUM`/`HARD`), 그 외 null. 칸별 난이도는 36칸 전체 확정값(2026-08-19). 추가 에러: `500 BOARD_LOAD_FAILED`. (동아리별 분야x난이도 배정표는 Notion 원문 하단 참고 - 프론트는 `club_name`을 `cell/current`, `opened_challenges`에서 받는다)
- `GET /board/me` -> `{ position, type, is_quarantined, dice_rolls_left, next_dice_reset_at, quarantine_attempts_left(항상 0, deprecated), airport_move_used, has_passed_start, board_completed, consumed_cell_indexes: [n], cell_states: [{cell_index, status, category}], chance_cards: [{card_id, used, discarded, usable_now}], active_challenge: {challenge_id, opened_at, solve_deadline_at, remaining_seconds} | null }`. **`cell_states[].status`: `CONSUMED`(소모됐지만 문제 미오픈) / `OPENED` / `CLEARED`.** `chance_cards`는 뽑은 전체 이력(`used`, `discarded` 둘 다 false + `usable_now`인 것이 보유분, 최대 2장). `board_completed`는 START 포함 36칸 전부 소모 시 true. `active_challenge`의 `solve_deadline_at` = `opened_at + 15분`.
- `GET /board/dice/status` -> `{ can_roll, dice_rolls_left, is_quarantined, timer_running, blocked_reason, server_time, next_dice_reset_at, quarantine_released_at }`. `blocked_reason`(먼저 걸리는 하나): `QUARANTINED` -> `BOARD_COMPLETED` -> `CHALLENGE_NOT_SELECTED` -> `TIMER_RUNNING` -> `PENDING_CONFIRM` -> `NO_ROLL_LEFT`. **주사위 충전: 잔여 0이 된 시각 + 15분에 1개**(정시 아님, 팀별 상이). `next_dice_reset_at`은 잔여 0일 때만 값, 그 외 null. 남은 초는 프론트가 `next_dice_reset_at - server_time`로 계산.

### 이동 / 굴림 (전부 팀장만, Idempotency-Key 필수)

- `POST /board/dice/roll` (Body 없음, `Idempotency-Key: dice-roll-<UUID>`) -> `{ dice_a, dice_b, rolled_number, previous_position, current_position, movement_path: [n], skipped_cells: [n], passed_start, start_reward: {mileage_gained, roll_gained}, board_event_code, pending_confirm, usable_chance_card: {card_id, effect} | null }`. **POST_ROLL 카드(다시굴리기/주변이동)를 보유한 채 굴리면 `pending_confirm: true`로 이동 미확정 -> `dice/confirm` 또는 `chance/use`로 결정.** 보유 POST_ROLL 카드 없으면 `pending_confirm: false`로 즉시 확정. `movement_path` 순서대로 말 이동 애니메이션. 소모 칸이 목적지면 같은 방향 다음 미소모 칸까지 전진(`skipped_cells`). START **통과** 시 `mileage_gained: 100`(매번), START **정확히 도착** 시 `roll_gained: 1`(게임 1회). 추가 에러: `400 REQUEST_BODY_NOT_ALLOWED` / `400 IDEMPOTENCY_KEY_REQUIRED` / `403 NOT_TEAM_LEADER` / `409` `NO_ROLL_LEFT`, `TIMER_RUNNING`, `CHALLENGE_NOT_SELECTED`, `QUARANTINED`, `BOARD_COMPLETED`, `PENDING_CONFIRM`.
- `POST /board/dice/confirm` (Body 없음, `Idempotency-Key: dice-confirm-<UUID>`) -> `dice/roll`과 동일 형태(`pending_confirm: false`, `usable_chance_card: null` 고정), `board_event_code`는 여기서 확정. 추가 에러: `400 REQUEST_BODY_NOT_ALLOWED` / `409 NO_PENDING_ROLL` / `404 CHANCE_CONFIRM_NOT_FOUND`(`card_roll_twice_choose` 선택 대기면 `chance/confirm`을 써야 함).
- `POST /board/airport/move` (`Idempotency-Key: airport-move-<UUID>`) - Req `{ destination_index }`(1~36, 미소모 칸만) -> `{ previous_position, current_position, movement_path: [목적지], board_event_code, passed_start, start_reward }`. 직접 이동이라 경유 칸 없음. 목적지가 START일 때만 `passed_start: true` + 보상(100/1). 추가 에러: `400 INVALID_DESTINATION_INDEX` / `403 NOT_TEAM_LEADER` / `409 NOT_AIRPORT_CELL` / `409 AIRPORT_MOVE_ALREADY_USED`.
- `POST /board/quarantine/escape` (`Idempotency-Key: quarantine-escape-<UUID>`) - Req `{ code }`(현장에서 찾은 탈출 코드) -> 성공 `{ is_quarantined: false }`. **위치는 안 바뀜**(16번 칸에 선 채 해제). 탈출 코드는 공용 풀(150개, 1회용, 검증 성공 시 소멸). 확정 로직이라 시도 횟수 제한 없음(구초안의 `ESCAPE_FAILED`/`remaining_attempts` 삭제). 추가 에러: `400 QUARANTINE_CODE_REQUIRED` / `404 QUARANTINE_CODE_INVALID` / `409 QUARANTINE_CODE_ALREADY_USED` / `409 NOT_QUARANTINED` / `403 NOT_TEAM_LEADER`.
- `POST /board/roulette/spin` (Body 없음, `Idempotency-Key: roulette-spin-<UUID>`) -> `{ roulette_result: {label}, mileage_gained, total_mileage }`. **결과: 50/100/150/200 각 25%.** `mileage_history`에 `ROULETTE` 타입. 팀당 1회. 추가 에러: `400 REQUEST_BODY_NOT_ALLOWED` / `403 NOT_TEAM_LEADER` / `409 NOT_ROULETTE_CELL` / `409 ROULETTE_ALREADY_SPUN`.

### 문제 선택

- `GET /board/cell/current` -> `{ cell_index, type, challenge_candidates: [{challenge_id, title, category, club_name, score}] }`(최대 3개, 같은 난이도, 미풀이 문제에서 배정, 한 번 배정되면 고정). CHALLENGE 아니거나 이미 오픈한 칸이면 `challenge_candidates: []`(에러 아님). ⚠️ 필드명 `title`(구 README는 `challenge_title`로 교정했었으나 Notion 최신본은 `title`을 씀 - 0-15절 재검토). 추가 에러: `409 PENDING_CONFIRM`.
- `POST /board/cell/open` (`Idempotency-Key: cell-open-<UUID>`) - Req `{ challenge_id }`(cell_index 안 보냄, 서버가 현재 위치로 검증) -> `{ cell_index, challenge_id, opened_at, solve_deadline_at, remaining_seconds: 900 }`. 추가 에러: `400 CHALLENGE_ID_REQUIRED` / `409 NOT_CHALLENGE_CELL` / `409 CHALLENGE_NOT_CANDIDATE` / `409 CELL_ALREADY_OPENED` / `409 PENDING_CONFIRM`.
- `GET /board/opened_challenges` -> `{ opened_challenges: [{challenge_id, cell_index, title, category, club_name, score, is_solved, solved_at, opened_at}], total_count, solved_count, total_score }`. 정렬 `opened_at` 오름차순. `is_solved`는 `solves` 테이블 LEFT JOIN 판정. 없으면 빈 배열 + 집계 0. 추가 에러: `404 USER_HAS_NO_TEAM`. (구 README 10 "통합 범위 제외"였으나 이제 보드 API로 확정)

### 찬스카드 (7종, 전부 팀장만, Idempotency-Key 필수)

- `GET /board/chance/catalog` (인증 없음) -> `{ cards: [{card_id, name, description, effect, usage_timing}], total_count: 7 }`. 7종: `card_reroll`(RE_ROLL, POST_ROLL) / `card_roll_twice_choose`(ROLL_TWICE_CHOOSE, PRE_ROLL) / `card_move_offset`(MOVE_OFFSET, POST_ROLL) / `card_free_travel`(FREE_MOVE, PRE_ROLL) / `card_extra_roll`(GRANT_EXTRA_ROLL, PRE_ROLL) / `card_quarantine_defense`(QUARANTINE_ESCAPE_FREE, QUARANTINE_STATE) / `card_move_to_quarantine`(FORCE_MOVE_TO_QUARANTINE, PRE_ROLL). `usage_timing`: `PRE_ROLL`/`POST_ROLL`/`QUARANTINE_STATE`. 시드 비면 빈 목록 200(`/board`는 500 - 동작 불일치 미확정).
- `POST /board/chance/now` (Body 없음, `Idempotency-Key: chance-draw-<UUID>`) -> `{ card_id, name, description, effect, usage_timing, used: false, dice_rolls_left, awaiting_discard }`. 찬스칸은 카드 뽑는 시점에 주사위 +1 지급(카드 사용과 무관). `awaiting_discard: true`면 보유 2장 -> `chance/discard` 전까지 `chance/use` 불가. 찬스칸 2개라 팀당 최대 2회. 추가 에러: `400 REQUEST_BODY_NOT_ALLOWED` / `403 NOT_TEAM_LEADER` / `409 NOT_CHANCE_CELL`(같은 칸 재호출 포함) / `409 PENDING_CONFIRM`.
- `POST /board/chance/use` (`Idempotency-Key: chance-use-<UUID>`) - Req 카드별: `card_move_offset` -> `{card_id, offset: -3~3(0 제외)}` / `card_free_travel` -> `{card_id, destination_index}`(미소모 칸) / 그 외 -> `{card_id}`. Res `effect`별: 이동형(RE_ROLL/MOVE_OFFSET/FREE_MOVE/FORCE_MOVE) -> `{card_id, effect, from_index, to_index, movement_path, skipped_cells, used: true}` / GRANT_EXTRA_ROLL -> `{..., dice_rolls_left, used: true}` / QUARANTINE_ESCAPE_FREE -> `{..., is_quarantined: false, dice_rolls_left(+1 지급), used: true}` / ROLL_TWICE_CHOOSE -> `{..., first_number, second_number, awaiting_confirm: true, used: false}`(주사위 1개 소모, `chance/confirm` 필요). **시점 판정**: PRE_ROLL은 `blocked_reason == null`일 때(`card_extra_roll`은 `NO_ROLL_LEFT`여도 가능), POST_ROLL은 직전 굴림이 `pending_confirm` 상태일 때, QUARANTINE_STATE는 `is_quarantined`일 때. 추가 에러: `400 INVALID_DESTINATION_INDEX` / `400 CARD_ID_REQUIRED` / `404 CHANCE_CARD_NOT_FOUND` / `409 CHANCE_CARD_ALREADY_USED` / `409 CHANCE_CARD_WRONG_TIMING` / `409 CHANCE_CARD_AWAITING_DISCARD` / `403 NOT_TEAM_LEADER`.
- `POST /board/chance/confirm` (`Idempotency-Key: chance-confirm-<UUID>`, `card_roll_twice_choose` 전용) - Req `{ choice: "FIRST"|"SECOND" }` -> `{ card_id, effect, choice, chosen_number, from_index, to_index, used: true }`. 확정 시에만 이동, 소모, 부수효과 처리. 추가 에러: `404 CHANCE_CONFIRM_NOT_FOUND`(잘못된 choice, 대기 없음, 이미 확정 전부 이 코드) / `403 NOT_TEAM_LEADER`.
- `POST /board/chance/discard` (`Idempotency-Key: chance-discard-<UUID>`) - Req `{ card_id }` -> `{ discarded_card_id, kept_card_id }`. 보유 2장일 때 1장 폐기(팀장이 선택). 추가 에러: `400 CARD_ID_REQUIRED` / `404 CHANCE_CARD_NOT_FOUND` / `409 NO_CARD_TO_DISCARD` / `403 NOT_TEAM_LEADER`.

**칸 소모 규칙**: CHALLENGE/CHANCE/AIRPORT/QUARANTINE/ROULETTE는 첫 도착 시 소모, 이후 최종 목적지 불가(경유는 가능). CHALLENGE는 도착 즉시 소모되므로 문제를 골라야(`cell/open`) 다음 굴림 가능(`CHALLENGE_NOT_SELECTED`). RE_ROLL로 버린 도착 칸은 소모 취소.

**제품 요구사항(기능명세 원문)**: 문제 목록 조회(보드판), 주사위 굴리는 로직(굴리기 전 chance 카드 선택), 말 이동, 보드칸 선택 시 문제 종류 선택, 현재 보유 chance 카드 목록, 무인도칸, 출발칸, Airport(1칸, 자유 이동), 찬스칸 2개, 클리어칸 처리.

**프론트 구현 상태(2026-08-29, feature/board / PR #7)**: Figma node 3:2, 146:19 기준 정적 UI만. 36칸은 board-grid.png 한 장으로 처리, 무인도 모달은 `/board?preview=quarantine`로 확인. 위 API 연동은 `src/api/board.js`에 함수만 있고 화면 결선은 후속(`TODO(board)`).

**미해결(Appendix B)**: `chance/catalog` 빈 시드 처리(200 vs 500), 룰렛/무인도 중복 판정을 `reason` 문자열에 칸 번호 넣는 방식(ERD 규약 위반), `opened_challenges.is_solved`를 `solves` vs `team_challenge_accesses.status`로 판정할지(PR #14 구현이 후자라 리더보드와 소스 갈림), `quarantine_attempts_left` deprecated 필드 제거.

---

## 3. 문제 상세 페이지

인증 전부 필요.

| Method | URL | 설명 |
|---|---|---|
| GET | `/challenges/{challenge_id}` | 문제 상세 조회 |
| POST | `/challenges/{challenge_id}/submit` | 플래그 제출 |
| POST | `/instances` | 인스턴스 생성 |
| GET | `/teams/me/instances` | (본인) 인스턴스 상태 조회 |
| POST | `/instances/{instance_id}/reset` | 인스턴스 재시작(초기화) |
| POST | `/instances/{instance_id}/extend` | TTL 연장 |
| DELETE | `/instances/{instance_id}` | 인스턴스 종료 |

> **이 절은 Notion [API명세서 -> 문제 상세] DB(2026-08~) 기준으로 갱신되었다.** 인스턴스 계열은 백엔드가 Scheduler HTTP API를 프록시하는 구조로 바뀌었다: 생성/재시작/연장/종료 전부 `202 Accepted` 후 `GET /teams/me/instances` 또는 문제 상세를 폴링. Scheduler 장애는 `503 SCHEDULER_UNAVAILABLE`. `ports`는 현재 Scheduler 연동에서 항상 빈 배열 `[]`, `host`는 `RUNNING`일 때만 값(그 외 null).

- `GET /challenges/{challenge_id}` -> `{ challenge_id, title, category, club_name, difficulty, score, description, files: [{file_id, file_name, download_url, file_size}], solved_team_count, is_solved, instance: {instance_id, challenge_id, host, ports, status, expires_at, hard_expires_at} | null }`. **`club_name` 추가**(출제 동아리). `instance`는 현재 access token의 `user_id` 소유 활성 인스턴스가 이 문제와 연결된 경우만(동기화 후 active 아니면 `instance: null`). 다른 문제 인스턴스는 `/teams/me/instances`로 확인. ⚠️ KOTH 순위 필드 없음 - 필요 시 `GET /koth/me` 별도 조회, 클라이언트 조합(설계 없음, Appendix B). 추가 에러: `403 CHALLENGE_LOCKED` / `404 CHALLENGE_NOT_FOUND` / `404 USER_HAS_NO_TEAM` / `503 SCHEDULER_UNAVAILABLE`.
- `POST /challenges/{challenge_id}/submit` (`Content-Type: application/json`) - Req `{ flag }` -> **정답 + 15분 이내 + 방금 도착한 최신 칸**: `{ challenge_id, earned_score, earned_mileage: 100, is_extra_dice_granted: true, team_score, mileage, solved_at }` / **정답이지만 15분 초과 또는 옛날 칸**: 같은 형태에 `is_extra_dice_granted: false` / 오답(3회 미만, HTTP 200) `code: "INCORRECT_FLAG"` / 3회째 연속 오답 `429 TOO_MANY_ATTEMPTS`(`data.retry_after_seconds`). `team_id+challenge_id` 단위, 3회째 30초 락(`locked_until = 서버시각 + 30초`), 정답 시 초기화. 추가 에러: `409 ALREADY_SOLVED`.
- `POST /instances` (`Content-Type: application/json`) - Req `{ challenge_id }`(나머지 container/ttl 등은 백엔드가 현재 활성 릴리스에서 조회) -> 202 `{ instance_id, challenge_id, host: null, ports: [], status: "REQUESTED", expires_at, hard_expires_at, replaced_instance_id }`. 참가자별 활성 최대 1개, 팀별 최대 2개(기본), 기존 `RUNNING`은 자동 교체(`replaced_instance_id`). 추가 에러: `400 INVALID_REQUEST` / `400 INVALID_TTL_RANGE` / `400 HARD_TIMEOUT_LIMIT_EXCEEDED` / `403 FORBIDDEN` / `404 USER_HAS_NO_TEAM` / `404 CHALLENGE_NOT_FOUND` / `404 RUNTIME_CONFIG_NOT_FOUND`(릴리스 없음) / `409 ACTIVE_INSTANCE_EXISTS`(전이 중 상태, 동시 요청) / `409 TEAM_INSTANCE_LIMIT_EXCEEDED` / `503 SCHEDULER_UNAVAILABLE`. (`INVALID_TTL_RANGE`, `HARD_TIMEOUT_LIMIT_EXCEEDED`, `ACTIVE_INSTANCE_EXISTS`, `TEAM_INSTANCE_LIMIT_EXCEEDED`는 Scheduler가 4xx로 반환한 것을 전달)
- `GET /teams/me/instances` -> 있음 `{ instance_id, challenge_id, challenge_title, host, ports: [], status, expires_at, hard_expires_at }` / 없음 `200 + data: null`. **URL이 `/instance` -> `/instances`(복수)로 변경.** **본인(user_id)** 기준 - 같은 팀 다른 사용자의 인스턴스는 미포함. 사용자당 활성 최대 1개라 단건 객체. `STOPPING`부터는 비활성으로 간주. 추가 에러: `404 USER_HAS_NO_TEAM` / `404 CHALLENGE_NOT_FOUND` / `503 SCHEDULER_UNAVAILABLE`.
- `POST /instances/{instance_id}/reset` (Body 없음/`{}`) -> 202 `{ instance_id(신규 발급), challenge_id, status: "REQUESTED", host: null, ports: [], expires_at, hard_expires_at, replaced_instance_id }`. ⚠️ **`RUNNING -> RESETTING -> RUNNING` 전이 안 씀** - Scheduler가 새 `instance_id`로 교체(기존은 자동 정리). `RUNNING`만 가능. 추가 에러: `400 INVALID_REQUEST` / `400 INVALID_STATE_TRANSITION` / `403 FORBIDDEN` / `404 INSTANCE_NOT_FOUND` / `503 SCHEDULER_UNAVAILABLE`.
- `POST /instances/{instance_id}/extend` (Body 없음/`{}`, 프론트가 연장 시간 안 보냄 - 백엔드 설정 30분) -> 202 `{ instance_id, challenge_id, host, ports: [], status: "RUNNING", expires_at, hard_expires_at }`. `RUNNING`만 가능. 추가 에러: `400 INVALID_REQUEST` / `400 INVALID_STATE_TRANSITION` / `400 HARD_TIMEOUT_EXCEEDED`(hard timeout 초과 연장) / `403 FORBIDDEN` / `404 INSTANCE_NOT_FOUND` / `503 SCHEDULER_UNAVAILABLE`.
- `DELETE /instances/{instance_id}` (Body 없음/`{}`) -> 202 `{ instance_id, challenge_id, host: null, ports: [], status: "STOPPING", expires_at, hard_expires_at }`. `RUNNING`만 종료 가능(생성 중 취소 미지원). 추가 에러: `400 INVALID_REQUEST` / `400 INVALID_STATE_TRANSITION` / `403 FORBIDDEN` / `404 INSTANCE_NOT_FOUND` / `503 SCHEDULER_UNAVAILABLE`.

> `POST /admin/challenges/{challenge_id}/docker_image`( -> `releases` 체계)는 관리자 전용이라 8절로 재분류했다.
> **신규 공통 에러**: `SCHEDULER_UNAVAILABLE`(503), `RUNTIME_CONFIG_NOT_FOUND`, `ACTIVE_INSTANCE_EXISTS`, `TEAM_INSTANCE_LIMIT_EXCEEDED`, `HARD_TIMEOUT_EXCEEDED`, `INVALID_TTL_RANGE`, `HARD_TIMEOUT_LIMIT_EXCEEDED` - 0-11절 표에 추가 필요.

**제품 요구사항(기능명세 원문)**: 문제 상세 화면, 인스턴스 생성 버튼(발급, 다른 인스턴스 누르면 기존 인스턴스 자동 종료 후 전환), 인스턴스 종료 버튼, 내 팀 인스턴스 상태 표시, 인스턴스 재시작 요청(reset), TTL 만료 시간 표시, 연장 요청 버튼, 플래그 제출(제출 즉시 검증).

**프론트 구현 상태(2026-08-29, feature/challenge-detail / PR #8)**: Figma node 95:360(ChallengeDetailPage) 기준 UI 구현됨. 기존 node 104:459("Koth problem solve page") 기반 KOTH 전용 헤더(KOTH/순위 배지)는 일반 category(3글자 축약)/difficulty/SOLVED 배지로 대체. 인스턴스 생명주기 버튼(CREATE/EXTEND/RESTART)은 UI만, `src/api/challenges.js`, `src/api/instances.js` 결선은 후속(`TODO(challenge-detail)`).

> ⚠️ **구현 상태 캡션(현재 코드 스냅샷 기준, 문서가 아니라 확인차 남김)**: `expires_at`(절대시각)만 오고 `remaining_seconds`/`ttl_seconds` 같은 카운트다운 전용 필드는 이 응답에 없다. 화면의 잔여시간 진행바/타이머는 `expires_at - 현재시각`을 프론트에서 매초 재계산해야 한다(`setInterval` 등으로 "지금" 자체가 흘러야 함) - 단순히 fetch 결과를 그대로 렌더링하면 타이머가 멈춰 보인다.

---

## 4. 리더보드 페이지

인증 불필요.

| Method | URL | 설명 |
|---|---|---|
| GET | `/leaderboard` | 상위 8팀 점수 그래프 + 팀 이름 |

- `GET /leaderboard` -> `{ teams: [{ team_id, team_name, team_score, is_top3, solves: [{challenge_id, source_type: "JEOPARDY"|"KOTH", solved_at, points}] }], total_count }`. 팀 없으면 `teams: []`.
- ⚠️ 필드명 `team_score`(구 README는 `total_score`), `is_top3`(boolean, 상위 3팀) **신규**. `total_count`는 반환 팀 수(최대 8).
- `team_score` = 제오파디 현재 점수 + KOTH 현재 점수(팀별 KOTH SOLVE `earned_score` 합, KOTH 공통 value 미사용). **밴 팀 제외 + 제오파디/KOTH solve가 하나도 없는 팀 제외**(그래프 특성상 - 0솔브 팀도 포함하는 `/ranking`과 대상 팀이 다를 수 있음).
- 정렬: `team_score DESC -> last_solved_at ASC -> team_id ASC`. `last_solved_at` = `MAX(solves.solved_at)`, 제오파디 solve 없으면 `MIN(koth_solves.solved_at)`. `is_top3`는 이 정렬 상위 3팀만 true(동점이어도 순서가 정해지므로 3팀 이하).
- 그래프: 프론트는 `points`를 재계산하지 않고 백엔드가 준 `solves`를 `solved_at` 순으로 누적. **KOTH는 새 SOLVE를 만들지 않음** - 처음 양수 점수 시점에만 점이 생기고 이후 15분 점수는 기존 점(그 팀의 현재 `earned_score`)의 값만 키운다.
- 백엔드 상태: **완료**(2026-09-03 Notion 갱신). 에러: 공통 외 없음.

**제품 요구사항(기능명세 원문)**: 랭킹(team/개인) 페이지, 스코어보드 그래프, TOP3 팀명 표시(team/개인).

---

## 5. 랭킹 페이지

| Method | URL | 설명 | 인증 | 백엔드 |
|---|---|---|---|---|
| GET | `/ranking` | 전체 팀 순위(페이지네이션) | 불필요 | **완료** |
| GET | `/ranking/me` | 내 팀 순위 | Bearer | **완료** |
| GET | `/ranking/member` | 개인 순위(제오파디만) | Bearer | **완료** |

> **Notion 갱신(2026-08-27~29)으로 구 README의 🔴 이슈 3개가 전부 해소됨**: `/ranking`은 인증 불필요로 확정, `/ranking/me`는 비표준 `team:` 헤더 -> **표준 Bearer**로 변경, `/ranking/member`는 완전 스펙화. 전부 밴 팀 제외 + 0솔브 팀 포함.
> **2026-09-03 재갱신**: 3개 엔드포인트 전부 백엔드 상태 **완료**로 전환(정렬/동점 처리 기준 문서도 같이 보강됨, 아래 각 항목의 정렬 설명이 그 내용). 필드 자체는 변경 없음.

- `GET /ranking` - Query `page`(기본 1), `size`(기본 20, 최대 100) -> `{ rankings: [{ rank, team_id, team_name, team_score, mileage, last_solved_at }], total_count, page, size }`. 정렬: `team_score DESC -> last_solved_at ASC -> team_id ASC`. `team_score` = 제오파디 + KOTH. `last_solved_at` = 제오파디 `MAX(solves.solved_at)`, 없으면 KOTH `MIN(koth_solves.solved_at)`, 둘 다 없으면 null(동점 시 맨 뒤). **밴 팀 제외**(0-6절), **0솔브 팀 포함**. 팀 없으면 `rankings: []`.
- `GET /ranking/me` (Bearer) -> `{ rank, team_id, team_name, team_score, mileage, last_solved_at }`. 팀 없으면 `404 USER_HAS_NO_TEAM`, 밴돼서 집계 제외면 `200 + data: null`.
- `GET /ranking/member` (Bearer, `user_id` 기준) -> `{ rank, user_id, nickname, team_id, team_name, user_score, solved_count, last_solved_at }`. **개인 점수 = 본인이 제출해 정답 처리된 제오파디 문제들의 현재 `challenges.current_score` 합**(`solves.solved_by_user_id` == 본인, `solves.earned_score` 미사용). KOTH, 마일리지 보너스는 개인 배분 불가라 미반영. `solved_by_user_id`가 null인 solve 제외. 정렬 `user_score DESC -> last_solved_at ASC -> user_id ASC`. 팀 없으면 `404 USER_HAS_NO_TEAM`, 밴 팀 사용자는 `200 + data: null`.

**제품 요구사항(기능명세 원문)**: 랭킹(team/개인) - 모든 사람의 등수를 볼 수 있는지는 미확정 -> `/ranking`이 전체 페이지네이션으로 확정.

---

## 6. 마이 페이지

인증 전부 필요.

| Method | URL | 설명 |
|---|---|---|
| GET | `/teams/me` | 내 정보 조회(팀+팀원) |
| GET | `/teams/me/solves` | 풀이 기록 |
| GET | `/teams/me/mileage_history` | 마일리지 히스토리 |
| POST | `/teams/me/qr_token` | QR 결제 토큰 발급(5분 만료) |

- `GET /teams/me` -> `{ team_id, team_name, team_score, jeopardy_score, koth_score, mileage, is_banned, ban_reason, members: [{user_id, nickname, role, is_leader}] }`. `team_score = jeopardy_score + koth_score`(세 값 다 내려 화면마다 점수 안 달라지게). `jeopardy_score` = `teams.team_score`(보드 문제 풀이 누적), `koth_score` = `SUM(koth_solves.earned_score)`. `is_banned=false`면 `ban_reason: null`. members에 `login_id` 없음(관리자 API에만). 백엔드: 완료.
- `GET /teams/me/solves` -> `{ solves: [{ source_type: "JEOPARDY"|"KOTH", challenge_id(JEOPARDY) 또는 koth_challenge_id(KOTH), challenge_title, earned_score, earned_mileage, is_extra_dice_granted, solved_by: {user_id, nickname} | null, solved_at }], total_count }`. **KOTH 항목은 `koth_challenge_id` 필드 사용**(`challenge_id` 아님), `solved_by: null`(팀 단위 집계), `earned_score`는 누적값, `solved_at` 고정, `earned_mileage: 0`, `is_extra_dice_granted: false`. 정렬 `solved_at` 최신순. 없으면 `solves: []`. 백엔드: **완료**(2026-09-03 갱신, 이전 PR 대기에서 전환).
- `GET /teams/me/mileage_history` -> `{ mileage, history: [{ history_id, type, amount, reason, item_name, is_refunded, ref_history_id, created_at }], total_count }`. `type`은 0-13절 8종. `amount` 전부 더하면 `mileage`와 일치. `ref_history_id`는 `REFUND` 행이 되돌린 원본 `PURCHASE`의 `history_id`(그 외 null - reason 문자열에 식별자 안 넣음). `is_refunded`는 이 행이 이후 환불됐는지. `item_name`은 `PURCHASE`만. 정렬 `created_at` 최신순. 없으면 `history: []` + `mileage: 0`. 백엔드: 완료.
- `POST /teams/me/qr_token`(Body 없음) -> `{ payment_token, expires_at }`(발급 5분 후). 이전 미사용 토큰 즉시 무효화, 교체. 추가 에러: `403 TEAM_BANNED`. 백엔드: 완료.

**제품 요구사항(기능명세 원문)**: 현재 점수, 현재 마일리지, 마일리지 결제 히스토리, 팀명, 풀이 시간 기록.

---

## 7. 타이머 페이지

인증 불필요.

| Method | URL | 설명 |
|---|---|---|
| GET | `/timer` | 대회 상태, 남은 시간 조회 |

- `GET /timer` -> `{ name, status, start_time, end_time, time_until_start, remaining_seconds, remaining_display, server_time }`. `status`: `BEFORE`/`RUNNING`/`ENDED`. **활성 대회 없음 -> `200` + `data: null`**(0-2절 최종 확정 - 구버전 문서의 404 언급은 폐기).
- `server_time`은 2026-09-03 Notion API명세서 갱신으로 추가됨(Appendix B #11 해소). `board/dice/status`와 동일하게 응답을 생성한 서버 시각이며, 클라이언트 시계가 어긋났을 때 이 값을 기준으로 카운트다운을 보정한다. `contest_id`는 여전히 없음.

**제품 요구사항(기능명세 원문)**: 남은 시간 표시, 주사위 초기화 시간, 프론트-백엔드 시간 동기화(초 단위 프론트 <-> 분 단위 백엔드 통신 검토).
**프론트 구현 상태**: `feature/timer-time-sync`에서 `server_time` 기반 시간 동기화 + 실시간 카운트다운 구현(2026-09-03). Figma 시안은 아직 없어 기능 우선으로 구현.

---

## 8. 관리자 페이지

인증: 전부 Bearer + `role: ADMIN` 필요(아니면 `403 FORBIDDEN`). 공통 401 3종(`TOKEN_MISSING`/`TOKEN_EXPIRED`/`TOKEN_INVALID`), 500 `INTERNAL_ERROR`는 아래에서 반복 표기하지 않는다.

> **이 절은 Notion [API명세서 -> 관리자 페이지] DB(2026-08-26 스냅샷) 기준으로 전면 갱신되었다.** 이전 버전(archive 3문서 통합본)에서 "API 자체가 없다"고 🔴로 남겨둔 항목(설정, clear 칸, 공개상태, 주사위 지급, 칸 이동, 롤백)은 이제 전부 엔드포인트가 정의돼 있다. `백엔드 상태`는 Notion 각 페이지의 status 속성을 옮긴 것이다.

| Method | URL | 설명 | 백엔드 |
|---|---|---|---|
| GET | `/admin/dashboard` | 운영 대시보드 요약 지표 | 논의 |
| GET | `/admin/teams` | 팀별 목록(검색/정렬) | **완료** |
| GET | `/admin/teams/{team_id}` | 팀 상세(벤 이력, 마일리지 요약, 최근 내역) | 진행 중 |
| POST | `/admin/teams/{team_id}/ban` | 팀 벤 처리 | **완료** |
| DELETE | `/admin/teams/{team_id}/ban` | 팀 벤 해제 | **완료** |
| POST | `/admin/teams/{team_id}/mileage` | 마일리지 지급/회수 | **완료** |
| GET | `/admin/teams/{team_id}/snapshots` | 롤백 지점(스냅샷) 목록 | 논의 |
| POST | `/admin/teams/{team_id}/rollback` | 스냅샷 시점으로 롤백 | 논의 |
| PATCH | `/admin/teams/{team_id}/board/cells/{cell_index}` | clear 칸 상태 수정 | 논의 |
| PATCH | `/admin/teams/{team_id}/board/position` | 말 위치 강제 이동 | 논의 |
| POST | `/admin/teams/{team_id}/board/dice` | 주사위 횟수 지급/회수 | 논의 |
| GET | `/admin/instances` | 인스턴스 목록(상태, 팀, 문제별 집계) | PR 대기 |
| POST | `/admin/instances/{instance_id}/reset` | 인스턴스 강제 재시작 | **완료** |
| DELETE | `/admin/instances/{instance_id}` | 인스턴스 강제 종료 | **완료** |
| GET | `/admin/challenges` | 문제 목록(문제별 인스턴스 현황) | 논의 |
| PATCH | `/admin/challenges/{challenge_id}/visibility` | 문제 공개/비공개 전환 | 논의 |
| POST | `/admin/challenges/{challenge_id}/releases` | 문제 릴리스 등록(publish bundle) | 시작 전 |
| GET | `/admin/challenges/{challenge_id}/releases` | 릴리스 이력 조회 | 시작 전 |
| POST | `/admin/challenges/{challenge_id}/releases/{release_id}/activate` | 현재 릴리스 전환(=롤백) | 시작 전 |
| GET | `/admin/resources` | 계정/노드별 리소스 상태 | 진행 중 |
| GET | `/admin/events` | 최근 이벤트 로그 | 진행 중 |
| GET | `/admin/payment/history` | 전체 결제 히스토리 | **완료** |
| POST | `/admin/payment/checkout` | QR 스캔 결제 처리(부스) | **완료** |
| DELETE | `/admin/payment/{history_id}/refund` | 결제 환불 | **완료** |
| GET | `/admin/settings` | 대회 설정 조회 | 논의 |
| PATCH | `/admin/settings` | 대회 설정 변경(부분 수정) | 논의 |

**대시보드**

- `GET /admin/dashboard` (Path, Query, Body 없음) -> `{ teams: {total_count, banned_count, total_mileage}, payment: {purchase_count, refund_count, net_spent}, contest: {status, start_time, end_time, remaining_seconds} | null, instances: {running, failed, total}, challenges: {total, published, solved_total}, collected_at }`. 집계 전용. `contest.status`: `BEFORE`/`RUNNING`/`ENDED`, 활성 대회 없으면 `contest: null`. `payment.net_spent` = `PURCHASE`합 + `REFUND`합의 절댓값.

**팀**

- `GET /admin/teams` - Query `search`, `sort`(`score`|`name`), `page`, `size`(상한 100) -> `{ teams: [{ team_id, team_name, team_score, mileage, board_position_states, is_banned, members: [{user_id, login_id, nickname, role, is_leader}], member_count }], total_count, page, size }`. `login_id`는 관리자 응답에만. `members`는 팀장 우선, 닉네임 순. `password_hash`는 절대 미포함. 없으면 `teams: []`. 추가 에러: `400 INVALID_REQUEST`(sort 값). ⚠️ 필드명 `board_position_states`(Appendix A #5는 `position`으로 교정했었으나 Notion 최신본이 이 이름을 씀 - 재확인 필요).
- `GET /admin/teams/{team_id}` - Query `history_limit`(기본 10, 상한 50) -> 팀 목록 요약 + `{ ban_reason, banned_at, banned_by, created_at, mileage_summary: {total_earned, total_spent, purchase_count, refund_count}, recent_mileage_history: [{history_id, type, amount, reason, processed_by, created_at}] }`. `is_banned=false`면 `ban_*`는 null. `board_position_states`는 보드 앱 붙기 전 null. 보드 진행 상세, 인스턴스 목록은 별도 API. 추가 에러: `404 TEAM_NOT_FOUND`.
- `POST /admin/teams/{team_id}/ban` - Req `{ ban_reason }`(1자 이상) -> `{ team_id, is_banned: true, ban_reason, banned_at, banned_by }`. 밴 시 쓰기 전면 차단(`403 TEAM_BANNED`, 0-6절). 추가 에러: `400 INVALID_REQUEST` / `404 TEAM_NOT_FOUND` / `409 ALREADY_BANNED`(data `{team_id, ban_reason, banned_at}`).
- `DELETE /admin/teams/{team_id}/ban` (Body 없음) -> `{ team_id, is_banned: false, unbanned_at, unbanned_by }`. 추가 에러: `404 TEAM_NOT_FOUND` / `409 NOT_BANNED`(data `{team_id, is_banned}`). ⚠️ **벤 해제가 자동 롤백까지 하지 않는다** - 롤백은 아래 `/rollback`으로 별도 조작(Notion 초안 전제, 팀 합의 대기 - Appendix B).
- `POST /admin/teams/{team_id}/mileage` - Req `{ amount, reason }`(amount 0 불가, 양수=지급/음수=회수) -> `{ team_id, previous_mileage, amount, current_mileage, reason, adjusted_at, adjusted_by }`. `mileage_history.type`은 서버가 부호로 결정(`ADMIN_GRANT`/`ADMIN_DEDUCT`). 추가 에러: `400 INVALID_REQUEST` / `400 INVALID_AMOUNT`(0) / `400 INSUFFICIENT_MILEAGE`(data `{current_mileage, requested_amount}`, `requested_amount`는 항상 양수) / `404 TEAM_NOT_FOUND`.

**팀 강제 개입 (전부 "논의", 보드 도메인 PR #14 확정 후 구현 가능)**

- `GET /admin/teams/{team_id}/snapshots` -> `{ snapshots: [{ snapshot_id, reason: "BAN"|"MANUAL", team_score, mileage, is_rolled_back, created_by, created_at }], total_count }`. 벤 등 되돌릴 필요가 생기는 순간 서버가 스냅샷을 남긴다. `TeamSnapshot` 테이블 신설 필요. 추가 에러: `404 TEAM_NOT_FOUND`.
- `POST /admin/teams/{team_id}/rollback` - Req `{ snapshot_id, reason }`(1~500자) -> `{ team_id, snapshot_id, restored: {team_score: {before, after}, mileage: {before, after}}, adjustment_history_id, rolled_back_at, rolled_back_by }`. 마일리지는 기존 행 유지 + 차액 보정 행 추가(불변식 유지). 차액 0이면 `adjustment_history_id: null`. 추가 에러: `400 INVALID_REQUEST` / `404 TEAM_NOT_FOUND` / `404 SNAPSHOT_NOT_FOUND` / `409 ALREADY_ROLLED_BACK`(data `{snapshot_id, rolled_back_at}`).
- `PATCH /admin/teams/{team_id}/board/cells/{cell_index}` - `cell_index` 0~35. Req `{ status: "UNVISITED"|"CONSUMED"|"OPENED"|"CLEARED", reason }`(1~500자) -> `{ team_id, cell_index, previous_status, status, changed_at, changed_by }`. **점수는 건드리지 않는다** - 필요하면 mileage API 별도 호출. `UNVISITED`는 요청 값으로만 허용. 추가 에러: `400 INVALID_REQUEST` / `404 TEAM_NOT_FOUND`.
- `PATCH /admin/teams/{team_id}/board/position` - Req `{ position: 0~35, consume_cell: bool(기본 false), reason }`(1~500자) -> `{ team_id, previous_position, position, type, cell_consumed, moved_at, moved_by }`. 이동만 하고 도착 칸 효과(찬스/룰렛/무인도)는 미발동. `type`은 `cell.type` enum. 추가 에러: `400 INVALID_REQUEST` / `404 TEAM_NOT_FOUND`.
- `POST /admin/teams/{team_id}/board/dice` - Req `{ amount: -20~20(0 불가), reason }`(1~500자) -> `{ team_id, previous_dice_rolls_left, amount, dice_rolls_left, reason, adjusted_at, adjusted_by }`. 기능명세 "주사위 오류 시 고정 지급" + 임의 지급. 추가 에러: `400 INVALID_REQUEST` / `400 INVALID_AMOUNT`(0) / `400 INSUFFICIENT_DICE`(data `{current_dice_rolls_left, requested_amount}`) / `404 TEAM_NOT_FOUND`.

**인스턴스**

- `GET /admin/instances` - Query `status`, `team_id`, `challenge_id`, `page`, `size` -> `{ instances: [{instance_id, team_id, team_name, challenge_id, challenge_title, status, created_at, expires_at}], summary: {by_status: {12개 상태 전부}, by_team: [{team_id, team_name, running_count}], by_challenge: [{challenge_id, challenge_title, running_count}]}, total_count, page, size }`. 추가 에러: `400 INVALID_REQUEST`.
- `POST /admin/instances/{instance_id}/reset` (Body 없음) -> 202 `{ instance_id, team_id, team_name, challenge_id, status: "RESETTING", host: null, port: null, expires_at: null, forced_by, forced_at }`. ⚠️ `port`(단수, null) - Appendix A #2는 `ports`(복수)로 통일했으나 이 응답은 단수. 추가 에러: `404 INSTANCE_NOT_FOUND` / `409 INSTANCE_NOT_RESTARTABLE`(data `{instance_id, status}`).
- `DELETE /admin/instances/{instance_id}` (Body 없음) -> 202 `{ instance_id, team_id, team_name, status: "STOPPING", forced_by, forced_at }`. 추가 에러: `404 INSTANCE_NOT_FOUND` / `409 INSTANCE_ALREADY_TERMINATED`(data `{instance_id, status}`).

**문제 / 릴리스**

- `GET /admin/challenges` - Query `category`(0-14절 8종), `is_published`, `sort`(`running`|`title`|`score`, 기본 `running`), `page`, `size`(기본 50, 상한 100) -> `{ challenges: [{ challenge_id, title, category, difficulty, score, is_published, solved_team_count, running_instance_count, failed_instance_count }], total_count, page, size }`. `failed_instance_count > 0`이면 화면 강조. 개별 인스턴스 조작은 `/admin/instances` 계열. 추가 에러: `400 INVALID_REQUEST`.
- `PATCH /admin/challenges/{challenge_id}/visibility` - Req `{ is_published: bool, reason }`(1~500자) -> `{ challenge_id, title, previous_is_published, is_published, affected_team_count, changed_at, changed_by }`. 비공개로 바꿔도 **이미 연 팀의 진행은 유지**(Notion 초안 가정). 보드 팀별 open(`opened_challenges`)과는 다른 층위. 추가 에러: `400 INVALID_REQUEST` / `404 CHALLENGE_NOT_FOUND`.
- `POST /admin/challenges/{challenge_id}/releases` - 공급망 `artifact-v2.json`의 `artifact` 블록을 그대로 담고 `note`만 선택 추가. Req `{ artifact: {schema_version:"2.0", challenge_slug, revision, name, runtime_type, architecture, workload:{containers:[{name, image(digest 고정), ports:[{port, public}]}]}, resource_profile:{cpu_millicores, memory_mib, ephemeral_storage_mib}, source_ref, scan_result}, note? }` -> `{ release_id, challenge_id, version, registry_revision, challenge_slug, architecture, containers: [{name, image_ref, ports}], is_current, is_deployable, note, created_at }`. `version`은 문제별 1부터 서버 자동 증가. `is_deployable`: 컨테이너 1개 + public 포트 1개면 true(멀티 컨테이너는 등록, 이력만, Scheduler 계약 확장 전까지 활성화 불가). 검증: `schema_version` `2.0`만, `scan_result` `PASS`만, image는 `ghcr.io/msg-ctf/challenges/<slug>/<name>@sha256:<64hex>` digest 고정만(태그, latest 거절), `challenge_slug` 문제 slug와 일치. `docker_image` API는 이 릴리스 체계로 대체됨. 추가 에러: `400 RELEASE_INVALID` / `404 CHALLENGE_NOT_FOUND` / `409 RELEASE_DUPLICATED`(같은 `registry_revision`).
- `GET /admin/challenges/{challenge_id}/releases` (Query 없음) -> `{ challenge_id, current_release_id: string|null, releases: [{ release_id, version, registry_revision, architecture, containers, is_current, is_deployable, note, created_at }](버전 내림차순), total_count }`. `current_release_id: null`이면 릴리스 없음 -> 인스턴스 생성 시 `RUNTIME_CONFIG_NOT_FOUND`. 추가 에러: `404 CHALLENGE_NOT_FOUND`.
- `POST /admin/challenges/{challenge_id}/releases/{release_id}/activate` (Body 없음) -> `{ challenge_id, release_id, version, registry_revision, previous_release_id: string|null, activated_at }`. 옛 릴리스를 지정하면 그대로 롤백. 전환 이후 생성 인스턴스부터 새 릴리스 적용(실행 중 인스턴스, `reset`은 기존 유지, 재생성 필요). 이미 현재 버전이면 멱등(200, `previous_release_id: null`). 추가 에러: `400 RELEASE_NOT_DEPLOYABLE` / `404 CHALLENGE_NOT_FOUND` / `404 RELEASE_NOT_FOUND`.

**리소스 / 로그**

- `GET /admin/resources` -> 있음 `{ accounts: [{account_id, account_name, status, running_instances, instance_quota, nodes: [{node_id, node_name, status, running_instances, cpu_usage_percent, memory_usage_percent}]}], total_count, collected_at }` / 없음 `data: null`. `status` 관측값: `HEALTHY` / `DEGRADED` (전체 enum 미공개 - Appendix B).
- `GET /admin/events` - Query `type`(선택), `team_id`(선택), `page`, `size` -> `{ events: [{event_id, type, severity, message, team_id, team_name, challenge_id, challenge_title, instance_id, actor, created_at}], total_count, page, size }`. 관측값: `type` `INSTANCE_FAILED`/`TEAM_BANNED` 등, `severity` `ERROR`/`WARNING` 등(전체 enum 미공개 - Appendix B). 팀, 문제, 인스턴스 무관 이벤트는 해당 필드 null. 없으면 `events: []`. 추가 에러: `400 INVALID_REQUEST`(type 값).

**결제**

- `GET /admin/payment/history` - Query `team_id`(선택), `page`, `size`(기본 50) -> `{ history: [{ history_id, team_id, team_name, type, amount, reason, is_refunded, processed_by, created_at }], total_count, page, size }`. `type`은 0-13절 `mileage.type` enum 공유. 없으면 `history: []`.
- `POST /admin/payment/checkout` - Req `{ payment_token, amount(>=1), item_name }` -> `{ history_id, team_id, team_name, item_name, amount(음수로 기록), current_mileage, processed_at, processed_by }`. 잔액부족 실패 시 QR 토큰 미소모(재시도 가능). "없는 토큰"과 "무효 토큰"은 존재 여부 노출 방지를 위해 `PAYMENT_TOKEN_INVALID` 하나로 병합. 추가 에러: `400 INVALID_AMOUNT` / `400 PAYMENT_TOKEN_EXPIRED` / `400 PAYMENT_TOKEN_INVALID` / `400 INSUFFICIENT_MILEAGE`(data `{current_mileage, requested_amount}`).
- `DELETE /admin/payment/{history_id}/refund` (Body 없음) -> `{ history_id(신규 REFUND 행 ID), team_id, team_name, refunded_amount(양수), current_mileage, refunded_at, refunded_by }`. 기존 `PURCHASE` 행은 불변, `REFUND` 양수 행을 새로 쌓음(불변식 유지). `reason`에 원본 `history_id` 명시. 추가 에러: `404 PAYMENT_NOT_FOUND` / `409 ALREADY_REFUNDED`(data `{history_id, refunded_at}`) / `409 NOT_REFUNDABLE`.

**설정**

- `GET /admin/settings` -> `{ contest: {status, started_at, ends_at}, board: {dice_rolls_per_reset, dice_reset_interval_minutes, solve_deadline_minutes}, flag: {max_attempts, lock_seconds}, updated_at, updated_by }`. 대회 시각 원본은 타이머 도메인(`timer.Contest`), 이 API는 읽기용. `board`/`flag` 값은 흩어져 있던 상수를 설정으로 끌어올린 것 - 각 도메인 담당자가 자기 상수를 등록해야 완성. `AdminSetting` 키-값 테이블 신설 필요.
- `PATCH /admin/settings` - Req는 보낸 키만 부분 수정(예 `{ board: {dice_rolls_per_reset: 4}, flag: {lock_seconds: 60} }`). 범위: `dice_rolls_per_reset` 1~20 / `dice_reset_interval_minutes` 1~1440 / `solve_deadline_minutes` 1~180 / `max_attempts` 1~10 / `lock_seconds` 1~3600 / `contest.ends_at > started_at`. -> `GET`과 동일한 전체 설정 객체 반환. 추가 에러: `400 INVALID_REQUEST` / `409 CONTEST_ALREADY_STARTED`(시작된 대회의 시작 시각 변경 시도).

**신규 에러 코드**: `RELEASE_INVALID` / `RELEASE_DUPLICATED` / `RELEASE_NOT_FOUND` / `RELEASE_NOT_DEPLOYABLE` / `SNAPSHOT_NOT_FOUND` / `ALREADY_ROLLED_BACK` / `INSUFFICIENT_DICE` / `CONTEST_ALREADY_STARTED` - 공통 에러 코드 표(0-11절)에는 아직 없으니 연동 시 추가.

**제품 요구사항 <-> 엔드포인트 매핑**: 팀별 목록 -> `/admin/teams`, 팀 상세 -> `/admin/teams/{id}`, 문제 목록(인스턴스 현황) -> `/admin/challenges`, 운영 대시보드 -> `/admin/dashboard`, 로그 -> `/admin/events`, 설정 -> `/admin/settings`, clear 칸 관리 -> `.../board/cells/{i}`, 문제 공개상태 -> `.../visibility`, 전체 인스턴스 목록/집계/필터/실패표시 -> `/admin/instances`, 강제 재시작, 종료 -> `/admin/instances/{id}/reset`, `DELETE`, 리소스 -> `/admin/resources`, 마일리지 관리 -> `.../mileage`, 주사위 오류/임의 지급 -> `.../board/dice`, 칸 위치 이동 -> `.../board/position`, 벤 -> `.../ban`, 롤백 -> `.../snapshots`+`.../rollback`, Docker 이미지 -> `.../releases`(체계 교체).

**여전히 미해결(Appendix B)**: 벤 해제 <-> 자동 롤백 여부(팀 합의), `GET /admin/resources`, `/admin/events` enum 전체 값, `board_position_states` vs `position` 필드명(Appendix A #5), 인스턴스 `port`(단수) vs `ports`(복수, Appendix A #2), 보드 강제 개입 5종은 보드 도메인(PR #14) 모델 확정 후.

---

## 9. KOTH 페이지

인증: `GET /koth/clubs`, `GET /koth/clubs/{club_id}`만 불필요, 나머지 Bearer 필요.

| Method | URL | 설명 |
|---|---|---|
| GET | `/koth/clubs` | 동아리 3개 목록, 각 아래 KOTH 문제 2개(총 6) + 공개 상태 |
| GET | `/koth/clubs/{club_id}` | 동아리별 문제 상세 + 현재 점유 상태 |
| GET | `/koth/me` | 내 팀 KOTH 문제별 점수, 순위 |
| GET | `/koth/team_token` | 내 팀 KOTH 팀 토큰 조회 |

> **Notion 갱신(2026-08-23)으로 구조가 바뀜**: (1) **6클럽x1문제 -> 3동아리x2문제**. `clubs[].challenges[]` 배열로 문제가 중첩됨. (2) **`GET /koth/leaderboard` 삭제** - KOTH 문제별 팀 순위 전용 엔드포인트 없어짐, 전체 순위는 `/ranking`. (3) **KOTH 문제에 `category` 없음**. `status`/`open_group`은 동아리가 아니라 문제 단위. 전부 백엔드 "시작 전".
> `/internal/koth/team_tokens/verify`, `/internal/teams`, `/internal/koth/scores`는 서버-서버 전용(문제 서버 <-> 플랫폼) - 프론트 대상 아님.

- `GET /koth/clubs` (인증 없음) -> `{ clubs: [{club_id, name, challenges: [{koth_challenge_id, title, status, open_group, current_owner_team_id, current_owner_team_name, current_score, opened_at, closed_at}]}], total_count: 3(동아리 수), challenge_count: 6, active_count: 2 }`. `status`: `SCHEDULED`(미개방) / `ACTIVE`(현재 15분 채점 대상) / `CLOSED`(채점 끝). 동시 `ACTIVE`는 2개. `open_group`은 공개 순번(플랫폼 배정). `current_score`는 그 문제 현재 1위 팀의 누적 KOTH 점수(점수 없으면 owner 필드 null). 추가 에러: `500 KOTH_CHALLENGES_LOAD_FAILED`.
- `GET /koth/clubs/{club_id}` (인증 없음) -> `{ club_id, name, challenges: [...위와 동일 필드...], challenge_count: 2 }`. 문제 없는 동아리는 `challenges: []` + 200(404 아님). 추가 에러: `400 INVALID_CLUB_ID` / `404 CLUB_NOT_FOUND`.
- `GET /koth/me` (Bearer) -> `{ team_id, team_name, total_koth_score, challenges: [{koth_challenge_id, club_id, title, status, earned_score, rank, solved_at, opened_at, closed_at}](항상 6개), total_count: 6, active_count: 2 }`. `rank`는 그 문제 안 `earned_score` 기준(점수 없으면 null). `earned_score`는 누적, `solved_at`은 첫 양수 점수 시각 고정. 전체 팀 순위는 여기서 안 줌 - 5절 `/ranking`.
- `GET /koth/team_token` (Bearer) -> `{ team_id, team_name, team_token, issued_at }`. 로그인 JWT와 무관, 팀당 하나, DB엔 해시 저장. 참가자가 외부 KOTH 문제 서버에 직접 입력. 추가 에러: `404 USER_HAS_NO_TEAM`.

**제품 요구사항(기능명세 원문)**: 동아리별 KOTH 문제 목록, 다음 문제 개방 남은 시간, 스코어링 방식(누적합산)은 일반 문제와 다름.

**미해결(Appendix B)**: "다음 문제 개방 남은 시간" 필드 여전히 없음(`open_group`은 순번이지 시각 아님), `solves[].koth_challenge_id`와 KOTH API의 `koth_challenge_id` 동일 값 공간(Notion은 동일하다고 명시), KOTH가 8개 분야 enum을 쓸지(ERD, KOTH 페이지는 아직 구 6개 상태).

---

## 10. 열린 문제 목록 페이지

- Notion [열린 문제 목록] DB는 **여전히 비어 있음**(전용 엔드포인트 0개, 2026-08-29 확인).
- 대신 **`GET /board/opened_challenges`(2절)가 이 페이지를 담당**하는 것으로 확정됨 - 열어둔 문제 목록 + `is_solved`/`solved_at` + 집계(`total_count`/`solved_count`/`total_score`)를 준다. "현재 인스턴스 표시"는 `GET /teams/me/instances`(3절), 보드 진행은 `GET /board/me`.
- 즉 이 페이지 프론트는 `/board/opened_challenges` + `/teams/me/instances` 조합으로 구현하면 되고, 별도 API 그룹을 기다릴 필요 없다.
- **제품 요구사항(기능명세 원문)**: 현재 인스턴스 표시, 열린 문제 목록, 푼 문제 표시, 클릭 시 문제 상세 페이지로 이동.

---

## 11. 기타 제품 요구사항 (API 스펙 대상 외)

API 문서 3개엔 없지만 원 기능명세(`archive/최초_MVP_기능요구사항_초안.md`)에만 있던, 아직 API로 안 내려온 항목들 - 스펙 논의가 더 필요한 채로 남겨둔다.

- **디스코드 봇**: DJ, 퍼블, 티켓발급, 공지사항.
- **팀장 권한/밴 처리 정책은 0-5, 0-6절로 흡수 완료.**

---

## Appendix A. 필드명 통일 총괄

> ⚠️ **Notion 대조(2026-08-29): 아래 #2/#5/#7이 Notion 최신본과 어긋남.** 백엔드 실제 응답으로 재확인 필요.

| # | 필드 | 이전(원문) | 최종 확정 | 적용된 API |
|---|---|---|---|---|
| 1 | 칸 타입 | `cell_type` | `type` | `GET /board/me` (Notion 최신본도 `type` 확인) |
| 2 | 인스턴스 접속 정보 | `port`(단수) | `ports`(복수 배열) | 3절 인스턴스 API 전부 `ports`(현재 Scheduler 연동에선 항상 `[]`). ⚠️ 단 **`POST /admin/instances/{id}/reset`은 Notion 최신본이 `port`(단수, null)** - 8절 참고, 미해결 |
| 3 | 팀 이름 | `name` | `team_name` | `GET /leaderboard`, `GET /ranking/*` |
| 4 | QR 결제 토큰 | `token`/`qr_token`/`payment_token` 3파전 | `payment_token` | `POST /teams/me/qr_token`, `POST /admin/payment/checkout` |
| 5 | 팀 위치 | `board_position_states` | ~~`position`~~ -> ⚠️ **Notion 최신본이 `board_position_states`로 되돌림** | `GET /admin/teams`, `GET /admin/teams/{id}` (8절). 프론트가 어느 이름을 원할지 재논의 |
| 6 | ID 타입 | `Long`(정수, `최초_MVP_기능요구사항_초안.md` 초안) | `String(UUID)` | 전체 `*_id` (예외: `card_id`, `payment_token`) |
| 7 | 보드 후보 문제 제목 | `title` | ~~`challenge_title`~~ -> ⚠️ **Notion 최신본은 `title`을 씀** (`GET /board/cell/current`, `/board/opened_challenges`). 0-15절 "다른 리소스에 얹힌 참조는 `challenge_title`" 규칙과 어긋나 재논의 |
| - | "활성 대회 없음" 응답 | 문서 내 404 언급(모순) | `200` + `data: null` | `GET /timer` |

---

## Appendix B. 미해결 이슈 총괄 (QA 결정 필요)

우선순위 🔴(설계/보안/제품결정), 🟡(스펙 공백), 🟢(경미) 순.

> 2026-08-29 Notion [API명세서] 전 페이지 대조 갱신. 아래 다수 항목이 그 사이 스펙이 채워지며 해소됐다(취소선). 새로 생긴 미해결은 "신규" 절에 모았다.

### 🔴 설계/보안/제품 결정 필요

1. **밴된 팀의 리더보드/랭킹 노출 여부** - 초안은 "계속 노출", 최종 명세와 Notion 최신본은 `/leaderboard`, `/ranking`, `/ranking/me`, `/ranking/member` 전부 "밴 팀 제외"로 통일. 이 방향으로 정리된 듯하나 초안(사용자 QA 결정)과 상충하므로 최종 컨펌 필요. 프론트는 두 경우 다 방어적으로 렌더링. (0-6절)
2. ~~**`GET /ranking/me`의 `team: {팀 이름}` 헤더 인증**~~ - 해소(2026-08-27). 표준 Bearer로 변경(5절).
3. ~~**관리자 "롤백 기능" API 부재**~~ - 해소(2026-08-26). `GET /admin/teams/{id}/snapshots` + `POST /admin/teams/{id}/rollback`(8절). 남은 결정: 벤 해제가 자동 롤백까지 할지(Notion 초안은 별도 조작 전제). `TeamSnapshot` 테이블 신설 필요.
4. ~~**인스턴스 5개 API의 응답 필드 불일치**~~ - 대체로 해소. 3절 인스턴스 API는 전부 `host`, `ports`, `expires_at`, `hard_expires_at`을 일관되게 내림(`ports`는 현재 항상 `[]`). 단 8절 `POST /admin/instances/{id}/reset`만 `port`(단수) - 여전히 불일치.
5. ~~**`GET /board/cell/current`의 `challenge_title` 필드명**~~ - 역전(2026-08-23). Notion 최신본은 `title`을 씀. Appendix A #7, 0-15절 규칙과 어긋나므로 재논의.

### 🟡 스펙 공백 / 명세 누락

6. ~~`GET /ranking/member`(개인 순위) - 원문 완전 공백.~~ 해소(2026-08-29). 완전 스펙화(5절, 제오파디 개인 점수만).
7. ~~`GET /ranking` 인증 필요 여부 미확정.~~ 해소. 인증 불필요로 확정.
8. ~~`GET /ranking` vs `GET /ranking/me` 필드 불일치.~~ 해소. 둘 다 `{rank, team_id, team_name, team_score, mileage, last_solved_at}`로 통일.
9. ~~`board/me.active_challenge`에 `solve_deadline_at`/`remaining_seconds` 없음.~~ 해소(2026-08-23). 둘 다 포함(`solve_deadline_at = opened_at + 15분`).
10. ~~`consumed_cell_indexes`가 opened/cleared 단계를 구분 못함.~~ 해소(2026-08-23). `cell_states: [{cell_index, status, category}]` 추가(`status`: `CONSUMED`/`OPENED`/`CLEARED`). ERD `team_cell_status` enum에 `consumed` 추가 필요.
11. ~~`GET /timer`에 `server_time`/`contest_id` 없음.~~ `server_time`은 해소(2026-09-03, 7절). `contest_id`는 여전히 없음.
12. ~~관리자 페이지 - 설정/clear칸/공개상태/주사위지급/칸이동 API 부재.~~ 해소(2026-08-26). 8절. 보드 강제 개입 5종은 백엔드 "논의" + 보드 도메인 PR #14 대기.
13. `GET /admin/resources`의 `status`(관측 `HEALTHY`/`DEGRADED`), `GET /admin/events`의 `type`(관측 `INSTANCE_FAILED`/`TEAM_BANNED`), `severity`(관측 `ERROR`/`WARNING`) - enum 전체 목록 여전히 미공개.
14. KOTH - "다음 문제 개방 남은 시간" 필드 여전히 없음(`open_group`은 순번, 시각 아님).
15. ~~KOTH - `solves[].challenge_id`와 `koth_challenge_id` 동일 값 공간 미확인.~~ 부분 해소. Notion이 "동일 값"이라고 명시. `solves` 응답도 KOTH 항목은 `koth_challenge_id` 필드를 씀(6절).
16. ~~`GET /teams/me/instance`가 "본인(user_id)" 기준.~~ 명시화. URL이 `/teams/me/instances`(복수)로 바뀌고 "본인 기준, 같은 팀 다른 사용자 미포함"이 스펙에 명기됨(3절).
17. ~~`POST /board/chance/now` 응답이 카탈로그 7종에 없음.~~ 해소(2026-08-23). 7종 카드, `effect`, `usage_timing` 전부 확정, 응답 일치.
18. ERD `idempotency_scope` enum - `CHANCE_CONFIRM` 외에 이제 `dice-confirm`, `chance-discard`, `quarantine-escape` 등 신규 Idempotency-Key 다수. ERD enum 갱신 필요.
19. ~~`GET /board/opened_challenges` 범위 미확정.~~ 해소. 보드 API로 확정, 10절 페이지를 담당.
20. `GET /challenges/{challenge_id}` 응답에 KOTH 배지/순위 필드 없음 - `GET /koth/me` 클라이언트 조합 필요, 설계 없음(3절).

### 신규 (Notion 대조에서 발견)

21. **벤 해제와 자동 롤백** - 8절 `DELETE .../ban`이 롤백까지 할지 팀 합의(Notion 초안은 별도 조작 전제).
22. **`board_position_states` vs `position` / `port` vs `ports`** - Appendix A #5, #2 참고. 8절 신규 엔드포인트가 구 이름을 씀.
23. **`opened_challenges.is_solved` 판정 소스** - 명세는 `solves` LEFT JOIN, PR #14 구현은 `team_challenge_accesses.status == CLEARED`. 리더보드와 랭킹이 전부 `solves` 전제라 소스가 갈릴 수 있음(2절).
24. **`GET /admin/challenges/{id}/releases` multi-container** - `is_deployable: false`인 멀티 컨테이너 릴리스는 Scheduler 계약(단일 `container_image`) 확장 전까지 활성화 불가(8절).
25. **`category` enum 8종 확산 범위** - 보드와 문제상세는 8종(WEB3, OSINT 포함), KOTH와 ERD는 아직 구 6종. 통일 필요(0-14절).

### 🟢 경미(문서/표기 문제, 실 스펙엔 영향 없음)

26. ~~`login`/`logout` 400 케이스 미문서화.~~ 해소. `400 INVALID_REQUEST` 명시(1절). `login`엔 `429 TOO_MANY_REQUESTS`도 추가.
27. `board/me` 문서의 상호참조 링크 오류(`/board/challenges` -> 실제는 `/board/opened_challenges`).
28. KOTH `team-token`(하이픈) vs `team_token`(언더스코어) - 언더스코어가 정답.
29. Notion 원문 URL의 이스케이프 문자 잔존(`\{challenge_id\}`) - 표시상 문제일 뿐.

---

## 12. 브랜치 전략, 개발 순서, 전역 설정

### 12-1. 브랜치 전략 - GitHub Flow

**Git Flow가 아니라 GitHub Flow를 권장한다.**

| 판단 근거 | 설명 |
|---|---|
| 배포 대상이 단일 | 여러 버전을 동시에 유지보수하는 제품이 아니라, 정해진 대회 일자에 배포되는 단일 웹앱. |
| 일정이 짧고 고정 | 대회 날짜라는 하드 데드라인이 있어 브랜치 전환, 머지 절차가 무거우면 속도가 떨어진다. |
| 페이지/컴포넌트 단위 병렬 작업이 핵심 | 여러 페이지를 여러 사람이 동시에 짧은 주기로 `main`에 합치는 게 필요 - GitHub Flow(`main` + 짧은 수명 feature 브랜치 + PR)가 정확히 이 요구에 맞음. |
| `main`은 항상 배포 가능 상태 유지 | 대회 직전 급한 수정도 별도 hotfix 절차 없이 `main`에서 바로 브랜치 파서 고치고 PR로 합침. |

**예외 - 대형 페이지는 "통합 브랜치"를 하나 더 둔다**

보드 페이지(14개 API)와 관리자 페이지(12개 API)처럼 컴포넌트가 많은 페이지는 페이지 전용 통합 브랜치를 추가로 둔다.

```
main
 └─ feature/board (보드 페이지 통합 브랜치)
     ├─ feature/board/dice (주사위 컴포넌트)
     ├─ feature/board/chance (찬스카드 컴포넌트)
     └─ feature/board/cell-open (칸 오픈/문제선택 컴포넌트)
```

- 컴포넌트 브랜치는 `feature/board`에서 분기해 `feature/board`로만 머지한다(`main`으로 직접 머지 금지).
- `feature/board`가 페이지 단위로 완성되면 그때 `main`으로 PR을 올린다.
- 소규모 페이지(로그인/타이머/랭킹/리더보드/KOTH 등)는 이 단계 없이 `feature/<page>` 하나로 충분하다.

### 12-2. 브랜치 네이밍 규칙

```
main # 항상 배포 가능한 상태
feature/<page-slug> # 페이지 단위 기본 브랜치
feature/<page-slug>/<part> # (대형 페이지에 한해) 컴포넌트 단위 하위 브랜치
fix/<slug> # 버그 수정
chore/<slug> # 설정, 빌드, 문서 등 기능 외 작업
```

| 페이지 | slug | 담당 |
|---|---|---|
| 로그인 페이지(인증) | `auth` | 준하 |
| 문제 리스트(보드) 페이지 | `board` | 지원 |
| 문제 상세 페이지 | `challenge-detail` | 규민 |
| 열린 문제 목록 페이지 | `open-challenges` | 규민 (문서화 보류, 10절 참고) |
| 리더보드 페이지 | `leaderboard` | 가연 |
| 랭킹 페이지 | `ranking` | 가연 |
| 마이 페이지 | `mypage` | 준하 |
| 타이머 페이지 | `timer` | 가연 |
| 관리자 페이지 | `admin` | 준하 |
| KOTH 페이지 | `koth` | 지원 |
| (페이지 아님) 공통 인프라 | `infra` 또는 `common` | - |

예: `feature/auth`, `feature/board`, `feature/board/dice`, `feature/admin`, `fix/ranking-team-name`.

> **예외**: `feature/scoreboard`는 리더보드(4절)+랭킹(5절) 두 페이지를 가연이 한 브랜치에서 같이 진행하기로 승인된 통합 브랜치다. 표의 slug 1:1 원칙에 대한 명시적 예외이며, 이후 두 페이지가 커지면 `feature/board`처럼 `feature/scoreboard/leaderboard` / `feature/scoreboard/ranking` 하위 분기를 고려할 것.

> ⚠️ **브랜치 정리 진행 중 - 남은 항목.** (2026-08-17 기준)
> - ~~`feature/login` -> `feature/auth` 리네임~~ **완료** (빈 브랜치라 데이터 손실 없이 rename).
> - `feature/koth`는 이미 규칙과 일치, 손대지 않음.
> - `feature/scoreboard`는 위 예외로 승인, 손대지 않음.
> - **비어 있던 6개 페이지 중 5개**(`board`, `mypage`, `admin`, `timer`, `open-challenges`)는 `main`에서 새로 브랜치를 파서 **완료**. 담당자는 12-2절 표 참고.
> - `feature/hwan`은 **여전히 미정리 - 2번 연속 보류 결정.** 여기에 Phase 0 스캐폴드 커밋(`e3fc761`)과 문제상세 페이지 작업(로컬 미커밋)이 같이 있고, 그 스캐폴드가 아직 `main`에 없다. `main`은 여전히 Initial commit뿐이라 방금 새로 판 `feature/board`/`feature/mypage`/`feature/admin`/`feature/timer`/`feature/open-challenges`를 포함한 모든 브랜치가 **로그인 페이지/라우팅/apiClient도 없는 빈 상태**에서 시작한다. 이게 풀리기 전까진 "페이지당 브랜치" 원칙은 이름만 갖춰졌을 뿐 실질적으로는 완성되지 않은 상태다. **처리 전까지는**: (1) 스캐폴드를 `main`에 병합, (2) 문제상세 작업을 `feature/challenge-detail`로 분리, (3) `feature/hwan` 정리(rename 또는 삭제) - 이 세 가지가 다음 정리 단계의 최우선 순위로 남아있다.
>
> **업데이트(2026-08-29):** (1), (2) 사실상 해소됨. `main`에는 이제 Phase 0 스캐폴드, 로그인/라우팅/`apiClient`, 리더보드, 스코어보드, 마이페이지, 로컬 목 백엔드, 보드 페이지(PR #7), 문제상세 개편안(PR #8)이 모두 병합돼 있다. 남은 항목: (3) `feature/hwan` 정리. `feature/admin`(PR #9), `chore/api-spec-sync`(PR #10)는 현재 `main` 기준으로 만든 것이다.

### 12-3. 개발 순서 (의존성 + 백엔드 상태 기준 권장안)

```
Phase 0 - 공통 인프라 (전부 선행 필요, 다른 모든 브랜치가 여기서 분기)
  feature/infra
    - API 클라이언트(axios 인스턴스) + baseURL 전역 변수화
    - Authorization: Bearer 인터셉터 + 401 처리(재발급/로그아웃)
    - 라우팅 스켈레톤, 전역 레이아웃/스타일
    - KST 변환 유틸

Phase 1 - 인증 (Phase 0 다음 최우선, 다른 모든 페이지가 로그인 의존)
  feature/auth

Phase 2 - 핵심 게임 플로우 (병렬 가능, 서로 약하게 의존)
  feature/board
  feature/challenge-detail (board에서 칸 오픈 -> 문제 상세로 연결)
  feature/mypage (팀 상태를 상시 참조하는 화면이라 일찍 필요)

Phase 3 - 조회 전용 페이지 (Phase 2와 병렬 가능, 서로 독립적)
  feature/leaderboard
  feature/ranking
  feature/timer
  feature/open-challenges

Phase 4 - 운영/부가 기능 (백엔드 상태가 대부분 "시작 전"/"논의"라 자연히 후순위)
  feature/admin
  feature/koth
```

- `admin`/`koth`는 API 자체가 "시작 전"/"논의" 상태가 많아 백엔드 확정을 기다리기보다 **목업 데이터로 UI를 먼저 만들고 나중에 연동**하는 순서를 권장한다.

### 12-4. PR / 커밋 규칙

- **모든 변경은 PR을 통해서만 `main`(대형 페이지는 `feature/<page>`)에 들어간다.** 직접 push 금지.
- 커밋 메시지: `<type>(<scope>): <설명>` (Conventional Commits 스타일)
  - `type`: `feat`/`fix`/`refactor`/`style`/`chore`/`docs`
  - `scope`: 12-2절의 slug (예: `feat(board): 주사위 굴리기 API 연동`)
- PR 제목도 동일 규칙, 본문에 관련 문서 링크와 QA 체크포인트 반영 여부 명시.
- 머지 방식: **Squash merge** 권장(컴포넌트 단위의 자잘한 커밋이 `main` 히스토리를 어지럽히지 않도록).
- 머지 후 브랜치는 즉시 삭제.

### ⚠️ 커밋 작성자(Authorship) 규칙 - 반드시 준수

> **어떤 커밋에도 AI(Claude)가 기여자로 들어가면 안 된다.** `Co-Authored-By: Claude ...`, `Authored-By: Claude ...` 같은 trailer를 커밋 메시지에 절대 포함하지 말 것. 커밋 author/committer는 항상 실제 작업자(팀원) 계정이어야 한다. **Claude Code가 이 리포에서 커밋을 생성/제안할 때도 이 규칙을 그대로 따라야 하며, 세션 기본 설정으로 자동 삽입되는 `Co-Authored-By`/`Claude-Session` trailer는 이 리포 한정으로 반드시 빼야 한다.**

### ⚠️ 문서/서술 표기 규칙 - 반드시 준수

> **README, PR 본문, 커밋 메시지, 코드 주석의 한국어 서술에는 보통 키보드 자판으로 칠 수 있는 기호만 쓴다.** 아래 "AI 티" 기호를 쓰지 말 것:
> - 가운뎃점 `·` -> 쉼표 `,` 또는 슬래시 `/`
> - 문단 기호 `§` -> `N절` 또는 그냥 생략
> - 줄표(em/en dash) `—` `–` -> 붙임표 `-` (앞뒤 공백 포함)
> - 낫표 `「」` `『』` -> 대괄호 `[]`
> - 수학 기호 `≲` `≥` `≤` `−`(U+2212) `×` -> `~` `>=` `<=` `-` `x`
> - 곡선 따옴표 `" "` `' '`, 말줄임표 `…` -> `" "` `' '`, `...`
> - 장식용 이모지(`📌` `✅` `🔄` 등) -> 생략
>
> **허용**: 화살표 `->` 는 `->`로 쓴다(유니코드 화살표 대신). 상태 표시 이모지 `⚠️` `🔴` `🟡` `🟢` 는 기존 관례상 유지한다. 코드 예시 블록 안(JSON, 표의 값 등)은 대상 아님.
>
> Claude Code가 이 리포에서 문서/PR/커밋/주석을 쓸 때도 이 규칙을 그대로 따른다.

### 12-5. 전역 설정 체크리스트 (모든 페이지 브랜치 공통 적용)

이 항목들은 페이지별 브랜치에서 개별로 만들지 말고 **Phase 0(`feature/infra`)에서 한 번만 만들어 전체가 재사용**한다.

**Base URL - 전역 변수, 하드코딩 금지**

```env
# .env
VITE_API_BASE_URL=http://msgctf.kr
VITE_API_PREFIX=/api/v1
```

```ts
// src/lib/apiClient.ts
import axios from "axios";

const baseURL = `${import.meta.env.VITE_API_BASE_URL}${import.meta.env.VITE_API_PREFIX}`;
// 예: http://msgctf.kr/api/v1
// 관리자 API 호출 시엔 baseURL + "/admin/..." 형태로 이어붙임(별도 baseURL 분리 불필요)

export const api = axios.create({ baseURL });
```

- 코드 어디에서도 `"http://msgctf.kr/..."`를 문자열로 직접 쓰지 않는다 - 전부 `api.get("/board")`처럼 `apiClient` 경유.
- ⚠️ 현재 `src/api/client.js`는 `baseURL: "/api/v1"`을 상대경로로 하드코딩하고 있어 위 `.env` 패턴을 아직 안 쓰고 있다. 배포 시 API가 같은 오리진에 리버스프록시로 붙는다는 전제가 맞는지 확인 후, 맞다면 이 문서에 그 전제를 명시하고, 아니라면 `.env` 패턴으로 옮길 것.

**인증 - Bearer 토큰 전역 인터셉터**

```ts
// src/lib/apiClient.ts (이어서)
api.interceptors.request.use((config) => {
  const token = getAccessToken(); // 인증 필요 없는 API는 토큰 없어도 무방
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  config.headers["Content-Type"] = "application/json";
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.data?.code === "TOKEN_EXPIRED") {
      // POST /auth/refresh로 재발급 후 원 요청 재시도
    }
    return Promise.reject(error);
  }
);
```

- 인증 불필요 API 목록은 0-4절 참고.
- 응답 판정은 **HTTP 상태코드가 아니라 `code === "SUCCESS"` 여부**로 한다(0-2절).
- ⚠️ 현재 `src/api/client.js`의 응답 인터셉터는 TODO 주석만 있고 실제 401 재발급/재시도 로직이 구현돼 있지 않다. Phase 0 완료 기준(12-6절) 항목인데 아직 미완이다.

**KST 시간 - 전역 변환 유틸**

```ts
// src/lib/time.ts
export function toKst(isoUtc: string | null): Date | null {
  if (!isoUtc) return null;
  return new Date(isoUtc);
}

export function formatKst(isoUtc: string | null, pattern = "yyyy-MM-dd HH:mm:ss") {
  if (!isoUtc) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).format(new Date(isoUtc));
}
```

- 카운트다운(타이머/보드 주사위 리셋/문제 풀이 제한시간)은 `server_time`(내려주는 API에 한해)을 기준으로 클라이언트 시계 오차를 보정한다. `server_time`이 없는 `GET /timer`는 미해결 이슈(Appendix B #11)이므로, 연동 시 재확인 필요.

**상대 경로 - 문자열 하드코딩 대신 라우트 상수/헬퍼**

```ts
// src/routes.ts
export const ROUTES = {
  board: "/board",
  challengeDetail: (id: string) => `/challenges/${id}`,
  kothClub: (kothChallengeId: string) => `/koth/leaderboard/${kothChallengeId}`,
} as const;

// 사용 예 (❌ 금지: navigate("./page/1"))
navigate(ROUTES.challengeDetail(challengeId));
```

- `react-router`의 `<Link to={...}>`/`navigate()`에 리터럴 문자열 대신 항상 `ROUTES` 헬퍼를 통해 경로를 만든다.
- 페이지네이션 등 쿼리스트링도 `URLSearchParams`로 조립하고 `?page=${n}` 같은 수동 문자열 조합을 지양한다.

**Swagger/Postman 예시**

- 이 문서의 "3. 상세 명세" 코드블록(Request/Response/Error)이 Swagger(OpenAPI) `example`/Postman Collection의 소스가 된다. 리포 루트의 `MsgCTF.postmancollection.json` / `MsgCTF.postmanenviroment.json`이 이 스펙 기준으로 이미 만들어져 있다 - Postman에 두 파일을 Import한 뒤 `access_token`/`admin_access_token`/`refresh_token`/`team_name` 환경변수만 채우면 바로 테스트할 수 있다. 미확정/보류 상태인 엔드포인트(`GET /ranking/me`, `GET /ranking/member` 등)는 요청 이름에 ⚠️ 표시가 되어 있다.

### 12-6. 페이지 브랜치 완료 기준 (Definition of Done)

각 `feature/<page>` PR을 `main`에 올리기 전 체크:

- [ ] `apiClient` 경유로만 API 호출 - `fetch`/`axios` 직접 호출, baseURL 하드코딩 없음
- [ ] 인증 필요 API에 Bearer 헤더가 인터셉터를 통해 자동으로 실림
- [ ] 화면에 노출되는 모든 시간 필드가 KST로 변환되어 표시됨
- [ ] 페이지 내비게이션이 `ROUTES` 헬퍼 경유(상대경로 문자열 하드코딩 없음)
- [ ] 응답 성공 판정이 `code === "SUCCESS"` 기준(HTTP 상태코드만으로 판단하지 않음)
- [ ] 해당 페이지의 Appendix B 관련 미해결 이슈를 확인했거나, 담당자 확인 대기 중임을 PR에 명시
- [ ] 커밋에 AI 공동저자 trailer 없음(12-4절)

---

## 부록: 이 문서의 출처 파일

원본은 삭제하지 않고 `archive/`에 보존되어 있다. 이 문서와 원본이 어긋나면(특히 위에서 "이번 통합에서 확정/교정"이라고 표시한 항목), 실제 백엔드 응답을 기준으로 재검증하고 이 문서를 갱신할 것.

- `archive/최초_MVP_기능요구사항_초안.md`
- `archive/브랜치전략_개발가이드.md`
- `archive/최종_API명세서_통합본_1.md`
