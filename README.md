# MSG CTF 플랫폼 — 통합 기획/API 명세서

> 이 문서는 아래 3개 문서를 **하나로 통합한 단일 소스**입니다. 앞으로 이 리포에서 개발 작업을 시작할 때는 이 문서 하나만 읽으면 됩니다.
>
> - `archive/최초_MVP_기능요구사항_초안.md` — 최초 MVP 기능 요구사항 + 공통 규약 초안
> - `archive/브랜치전략_개발가이드.md` — 브랜치 전략 · 개발 순서 · 전역 설정 가이드
> - `archive/최종_API명세서_통합본_1.md` — 페이지별 API 상세 명세 최종본
>
> 세 문서를 대조하는 과정에서 서로 다르게 적힌 부분이 여러 건 있었습니다. **원칙적으로 더 나중에/더 상세하게 검증된 문서(`최종_API명세서_통합본_1.md` > `브랜치전략_개발가이드.md` > `최초_MVP_기능요구사항_초안.md`)를 우선했고**, 단순 최신/구버전 문제가 아니라 실제 제품 동작이 갈리는 지점은 사용자 QA를 거쳐 아래처럼 처리했습니다. 원본 3개 파일은 삭제하지 않고 `archive/`에 보존했으니, 이 문서의 서술이 의심스러우면 그쪽 원문을 대조하면 됩니다.
>
> **이번 통합에서 실제로 방향이 정해진 충돌**
> | # | 충돌 내용 | 처리 |
> |---|---|---|
> | 1 | ID 타입: `최초_MVP_기능요구사항_초안.md`는 전 리소스 `Long`(정수) / 최종 API 명세서는 `String(UUID)` | **`String(UUID)` 채택** (최종 API 명세서 + 브랜치가이드 `routes.ts` 예시 2곳이 일치, `최초_MVP_기능요구사항_초안.md` 쪽이 outlier) |
> | 2 | `challenge_candidates[].title` (`GET /board/cell/current`) — 최종 API 명세서 원문은 `title`인데, 같은 문서의 "다른 리소스에 얹힌 참조는 `challenge_title`" 규칙과 어긋남 | **`challenge_title`로 교정**해서 이 문서에 반영. 원문 오탈자로 추정 — 실제 백엔드 연동 전 재확인 필요(Appendix B 신규 항목 참고) |
> | 3 | 밴(BAN)된 팀의 리더보드/랭킹 노출 — `최초_MVP_기능요구사항_초안.md`: "계속 노출"로 명시적 결정 / 최종 API 명세서 4·5절: `GET /leaderboard`·`GET /ranking` 둘 다 "밴 팀 제외"라고 명시 | **미해결로 보류.** 아래 0-8절과 Appendix B에 🔴로 남겨둠 — 백엔드/기획 확인 전까지 프론트는 **두 경우 다 깨지지 않게** 방어적으로 짤 것(밴 팀이 응답에 있어도, 없어도 렌더링이 죽지 않도록) |

---

## 0. 공통 규약 (최종)

### 0-1. Base URL

```
http://msgctf.kr/api/v1
http://msgctf.kr/api/v1/admin      (관리자 전용)
http://msgctf.kr/internal/**       (서버-서버 전용, 프론트 대상 아님)
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
- **조회 결과가 없음 → `200` + `data: null`이며 `404`가 아니다.** (`GET /timer`의 "활성 대회 없음" 케이스로 최종 확정됨 — 구버전 문서에 남아있던 404 언급은 모순으로 판정되어 폐기됨)

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
- 🔴 예외(미해결): `GET /ranking/me`만 Bearer 대신 `team: {팀 이름}` 커스텀 헤더 사용 — 보안 이슈로 QA 결정 대기(Appendix B 참고).

> `TOKEN_EXPIRED`를 받으면 프론트는 `/auth/refresh`로 자동 재발급 후 1회 재시도한다.
> `TOKEN_MISSING` / `TOKEN_INVALID`는 재시도 없이 로그인 화면으로 보낸다.

### 0-5. 팀장 권한 판정

- 팀장은 **팀 생성 시 확정**되며 대회 중 변경하지 않는다.
- 팀장 여부는 `access_token`의 `is_leader` claim으로 판정한다. **매 요청 DB 조회를 하지 않는다.**
- 서버는 토큰 **서명 검증에 성공한 뒤에만** claim을 읽는다. 요청 body·header·query로 들어온 `is_leader` 값은 절대 신뢰하지 않는다.
- 프론트가 버튼을 숨기는 것은 편의 기능일 뿐이므로, 서버는 항상 독립적으로 재검증한다.
- **팀장만 호출 가능한 API** (엔드포인트는 최종 API 명세서 2절 기준으로 교정):
  - `POST /board/dice/roll`
  - `POST /board/airport/move`
  - `POST /board/chance/use`
  - `POST /board/chance/confirm` ← 초안에는 없었으나 최종 API 명세서 2절에 "팀장만" 명시되어 있어 추가됨
  - `POST /board/roulette/spin`
- 팀장이 아니면 `403 NOT_TEAM_LEADER`
- 관리자(`role: ADMIN`)는 `is_leader`가 항상 `false` → 위 API 호출 불가

> 운영 중 부득이하게 팀장을 바꿔야 하는 경우(계정 분실 등): DB를 수정한 뒤 해당 팀원의 `refresh_token`을 삭제해 재로그인시켜야 한다. 이미 발급된 `access_token`은 최대 1시간 동안 옛 `is_leader` 값을 그대로 들고 있다.

### 0-6. 밴(BAN) 처리

- 밴된 팀(`is_banned: true`)은 **모든 쓰기 작업이 차단**된다. 조회(`GET`)는 허용한다.
- 쓰기 = `POST` / `PUT` / `PATCH` / `DELETE`. 차단 시 `403 TEAM_BANNED`.
- 대상: 주사위/카드사용/공항이동/룰렛/문제오픈/플래그제출/인스턴스 생성·재시작·연장·종료/QR토큰발급 등.
- **예외 (밴 상태여도 허용)**: `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`
  - 로그인을 막으면 참가자가 "활동이 정지되었습니다" 안내조차 볼 수 없다.
  - 토큰 갱신을 막으면 1시간 뒤 `TOKEN_EXPIRED`가 떠서 밴된 사실이 아니라 장애로 오해한다.
- 관리자 API(`/admin/**`)에는 이 검사를 적용하지 않는다.
- 차단 지점은 **Interceptor 한 곳**으로 일원화한다. API마다 개별 구현하지 않는다.
- 팀을 밴할 때 실행 중인 인스턴스는 관리자가 수동으로 강제 종료한다.

> **`is_banned`는 토큰 claim에 넣지 않는다.** 밴은 대회 중 발생하고 즉시 적용돼야 하므로, 쓰기 요청마다 DB에서 조회한다. claim에 넣으면 밴된 팀이 토큰 만료까지 최대 1시간 동안 계속 플레이할 수 있다(`is_leader`와 반대 — 그쪽은 변경되지 않으므로 claim을 쓴다).

> 🔴 **미해결 — 밴 팀의 리더보드/랭킹 노출 여부.** 초안(`최초_MVP_기능요구사항_초안.md`)은 "밴 팀도 계속 노출"로 명시했으나, 최종 API 명세서 4절(`GET /leaderboard`)·5절(`GET /ranking`)은 둘 다 "밴 팀 제외"라고 명시했다. 정반대 결정이라 이번 통합에서 임의로 고르지 않았다. **백엔드/기획 컨펌 전까지 프론트는 응답에 밴 팀이 섞여 있든 없든 안 죽게 방어적으로 렌더링할 것.**

### 0-7. Idempotency-Key

다음 쓰기 API는 `Idempotency-Key` 헤더 **필수**:
`POST /board/dice/roll`, `POST /board/cell/open`, `POST /board/airport/move`, `POST /board/quarantine/escape`, `POST /board/chance/now`, `POST /board/chance/use`, `POST /board/chance/confirm`(ERD `idempotency_scope` enum에 아직 없음 — Appendix B), `POST /board/roulette/spin`, 인스턴스 생성/재시작/연장/종료 계열.

> `apiClient`(7-5-2절)에 이 헤더를 매번 손으로 안 붙여도 되게 하는 공통 헬퍼가 아직 없다 — Phase 0 인프라 작업 시 반영할 것.

### 0-8. 시간

모든 시간 필드는 **ISO-8601 UTC**(`Z` 접미사)로 응답. **KST 변환은 전적으로 프론트 책임**(7-5-3절 유틸 참고). 카운트다운류(주사위 리셋, 타이머, 문제 풀이 제한시간)는 가능하면 `server_time` 기준으로 클라이언트 시계 오차를 보정한다(단, `GET /timer`는 `server_time`이 없음 — Appendix B).

### 0-9. 페이지네이션

`page`(기본 1) / `size`(기본 API마다 다름, 상한 100, 초과 시 서버가 100으로 클램프) 공통 패턴. 응답엔 `total_count` 포함.

### 0-10. HTTP 상태코드 규칙

| 상황 | 코드 |
|---|---|
| 조회·수정 성공 | `200` |
| 비동기 큐 적재 (인스턴스 생성/재시작/연장/종료) | `202` |
| 요청 값 오류 | `400` |
| 인증 실패 | `401` |
| 권한 없음 | `403` |
| **상태 충돌** (이미 ~함, ~상태가 아님) | `409` |
| 서버 오류 | `500` |
| 조회 결과가 없음 | `200` • `data: null` (404 아님) |
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
| `SCHEDULING` | Broker 후보 조회·선택 진행 중 | ✕ | 준비 중 |
| `PROVISIONING` | Runtime에 workload 생성 요청 중 | ✕ | 준비 중 |
| `RUNNING` | 생성되어 사용 가능 | ○ | 접속 정보 표시 |
| `RESTARTING` | 재시작 요청 처리 중 | ✕ | 재시작 중 |
| `RESETTING` | 초기화 요청 처리 중 | ✕ | 초기화 중 |
| `STOPPING` | 삭제 요청 처리 중 | ✕ | 종료 중 |
| `STOPPED` | Runtime workload 삭제 완료 | ✕ | 종료됨 |
| `FAILED` | 생성·재시작·초기화·정리 중 실패 | ✕ | 오류 — 다시 시도 |
| `EXPIRED` | TTL 또는 hard timeout 만료 | ✕ | 시간 만료 |
| `CLEANUP_PENDING` | 정리 필요하지만 끝나지 않음 | ✕ | (참가자 미표시) |
| `CLEANED` | Runtime 리소스 정리까지 완료 | ✕ | (참가자 미표시) |

**상태 분류**
- **활성(active)**: `REQUESTED`, `SCHEDULING`, `PROVISIONING`, `RUNNING`, `RESTARTING`, `RESETTING`, `STOPPING`
- **종료(terminal)**: `STOPPED`, `FAILED`, `EXPIRED`, `CLEANED`
- `CLEANUP_PENDING`은 리소스가 아직 회수되지 않은 상태다. 팀 동시 실행 제한에 포함할지 확인 필요.

**필드 유효 규칙**
- `host`, `port`, `expires_at`, `remaining_seconds`는 **`RUNNING`일 때만 유효**하다.
- ⚠️ 다만 실제 3절(`POST /instances/{id}/extend`, `DELETE /instances/{id}`) 응답 예시에는 `host`/`ports`가 아예 **키 자체가 빠져** 있고 `null`로도 안 내려온다. "무효면 null"과 "무효면 키 자체가 없음"이 API마다 다르다는 뜻 — 프론트에서 단일 Instance 타입 하나로 다루기 어렵다. 미해결(Appendix B #3), 연동 시 실제 응답으로 재확인할 것.
- `GET /teams/me/instance`는 **활성 상태 인스턴스가 있을 때만** 객체를 반환하고, 종료 상태만 남았으면 `data: null`을 반환한다. ⚠️ 이름과 달리 **"팀"이 아니라 "본인(user_id)" 기준**이다(Appendix B #14) — 팀원이 여러 명이면 각자 자기 인스턴스만 보인다.

**상태 전이**
```
REQUESTED → SCHEDULING → PROVISIONING → RUNNING
RUNNING → RESTARTING → RUNNING
RUNNING → RESETTING  → RUNNING
RUNNING → STOPPING   → STOPPED
RUNNING → EXPIRED (TTL / hard timeout)
어느 단계든 → FAILED
STOPPED / FAILED / EXPIRED → CLEANUP_PENDING → CLEANED
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
| `PURCHASE` | QR 결제 (부스 구매) | − |
| `ADMIN_DEDUCT` | 관리자 수동 차감 | − |

**규칙**
- 부호는 `amount` 필드가 가진다. `type`은 그 **이유**를 나타낼 뿐이다.
- **`direction`·`EARN`·`SPEND` 같은 별도 부호 필드를 두지 않는다.** 같은 정보를 두 곳에 저장하면 언젠가 서로 어긋난다. 필요하면 `type`에서 유도한다.
- **불변식**: `mileage_history`의 `amount`를 전부 더하면 `Team.mileage`와 일치해야 한다.
- 이미 쌓인 행은 **수정하거나 삭제하지 않는다.** 되돌려야 하면 반대 방향 행을 새로 쌓는다(예: `PURCHASE -30` → `REFUND +30`).

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
- 문제 리소스 자체의 제목은 `title`, **다른 리소스에 얹힌 참조는 `challenge_title`**. (`GET /board/cell/current`의 `challenge_candidates[].title`은 이 규칙에 따라 `challenge_title`로 교정 — 0-3절 위 표 참고)

---

## 1. 로그인 페이지(인증)

인증 불필요(모든 API). `Idempotency-Key` 불필요.

| Method | URL | 설명 |
|---|---|---|
| POST | `/auth/login` | 로그인 + 토큰 발급 |
| POST | `/auth/refresh` | access_token 재발급 |
| POST | `/auth/logout` | 로그아웃(refresh_token 폐기) |
| GET | `/auth/me` | 로그인 상태 확인(Bearer 필요) |

- `POST /auth/login` — Req `{ login_id, password }` → Res `{ access_token, refresh_token, role, is_leader, nickname, team_id, team_name, user_id }`. 추가 에러: `401 INVALID_CREDENTIALS`.
- `POST /auth/refresh` — Req `{ refresh_token }` → Res `{ access_token }`(refresh_token은 재발급하지 않음, 기존 것 12시간까지 재사용). 추가 에러: `401 REFRESH_TOKEN_EXPIRED` / `401 REFRESH_TOKEN_NOT_FOUND` / `401 REFRESH_TOKEN_INVALID` / `400 INVALID_REQUEST`.
- `POST /auth/logout` — Bearer + Req `{ refresh_token }` → Res `data: null`.
- `GET /auth/me` — Bearer → Res `{ user_id, nickname, is_leader, team_id, team_name, role }`(login 응답과 필드 완전 일치).

**제품 요구사항(기능명세 원문)**: ID/PW POST 로그인, 팀 토큰 발급, 인증/검증.

---

## 2. 문제 리스트(보드) 페이지

인증: `GET /board`, `GET /board/chance/catalog`만 불필요, 나머지 전부 Bearer 필요.

| Method | URL | 설명 |
|---|---|---|
| GET | `/board` | 보드판 전체 칸 배치(36칸) |
| GET | `/board/me` | 내 팀 보드 상태 전체 |
| GET | `/board/dice/status` | 주사위 굴릴 수 있는지 상태 |
| POST | `/board/dice/roll` | 주사위 2개 굴려 이동(팀장만) |
| GET | `/board/cell/current` | 도착한 칸 상세 + 문제 후보 3개 |
| POST | `/board/cell/open` | 문제 선택해 오픈 |
| POST | `/board/airport/move` | Airport 자유 이동(팀장만) |
| POST | `/board/quarantine/escape` | 무인도 탈출 |
| GET | `/board/chance/catalog` | 전체 chance 카드 종류(7종) |
| POST | `/board/chance/now` | 찬스칸 도착 시 카드 뽑기 |
| POST | `/board/chance/use` | chance 카드 사용(팀장만) |
| POST | `/board/chance/confirm` | chance 카드 2단계 확정(팀장만) |
| POST | `/board/roulette/spin` | 룰렛 돌려 마일리지 획득(수치 미정) |

- `GET /board` → `{ total_cell_count: 36, cells: [{ cell_index, type, difficulty, name }] }`. 특수칸 고정: 1=START, 7·30=CHANCE, 16=QUARANTINE, 21=AIRPORT, 25=ROULETTE, 나머지 30칸 CHALLENGE.
- `GET /board/me` → `{ position, type, is_quarantined, dice_rolls_left, next_dice_reset_at, quarantine_attempts_left, airport_move_used, has_passed_start, board_completed, consumed_cell_indexes, chance_cards: [{card_id, used}], active_challenge: {challenge_id, opened_at} | null }`.
- `GET /board/dice/status` → `{ can_roll, dice_rolls_left, is_quarantined, timer_running, blocked_reason, server_time, next_dice_reset_at, quarantine_released_at }`. `blocked_reason`: `NO_ROLL_LEFT`/`QUARANTINED`/`BOARD_COMPLETED`.
- `POST /board/dice/roll`(Idempotency-Key) → `{ dice_a, dice_b, rolled_number, previous_position, current_position, movement_path, skipped_cells, passed_start, start_reward: {mileage_gained, roll_gained}, board_event_code }`. 추가 에러: `400 REQUEST_BODY_NOT_ALLOWED` / `400 IDEMPOTENCY_KEY_REQUIRED` / `403 NOT_TEAM_LEADER` / `409 NO_ROLL_LEFT` / `409 TIMER_RUNNING` / `409 QUARANTINED` / `409 BOARD_COMPLETED`.
- `GET /board/cell/current` → `{ cell_index, type, challenge_candidates: [{challenge_id, challenge_title, category, score}] }`(3개). **(`challenge_title`로 교정 — 0-15절 근거)**
- `POST /board/cell/open`(Idempotency-Key) — Req `{ challenge_id }` → `{ cell_index, challenge_id, opened_at, solve_deadline_at, remaining_seconds }`. 추가 에러: `400 CHALLENGE_ID_REQUIRED` / `409 NOT_CHALLENGE_CELL` / `409 CHALLENGE_NOT_CANDIDATE`.
- `POST /board/airport/move`(Idempotency-Key) — Req `{ destination_index }` → `{ previous_position, current_position, movement_path, board_event_code, passed_start, start_reward }`. 추가 에러: `400 INVALID_DESTINATION_INDEX` / `403 NOT_TEAM_LEADER` / `409 NOT_AIRPORT_CELL` / `409 AIRPORT_MOVE_ALREADY_USED`.
- `POST /board/quarantine/escape`(Idempotency-Key, Body 없음) → 성공 `{ position }` / 실패(HTTP 200, `code: "ESCAPE_FAILED"`) `{ position, quarantine_attempts_left }`. 추가 에러: `400 REQUEST_BODY_NOT_ALLOWED` / `409 NOT_QUARANTINED`.
- `GET /board/chance/catalog` → `{ cards: [{card_id, name, description, effect, usage_timing}], total_count: 7 }`. `effect` 값은 원문 표시상 초안(팀 합의 필요).
- `POST /board/chance/now`(Idempotency-Key, Body 없음) → `{ card_id, name, description, effect, used }`. 추가 에러: `400 REQUEST_BODY_NOT_ALLOWED` / `403 NOT_TEAM_LEADER` / `409 NOT_CHANCE_CELL`.
- `POST /board/chance/use`(Idempotency-Key) — 카드별 Req/Res 형태 다름(전부 초안). 추가 에러: `400 INVALID_DESTINATION_INDEX` / `400 CARD_ID_REQUIRED` / `404 CHANCE_CARD_NOT_FOUND` / `409 CHANCE_CARD_ALREADY_USED` / `409 CHANCE_CARD_WRONG_TIMING`.
- `POST /board/chance/confirm`(Idempotency-Key, `card_roll_twice_choose` 전용) — Req `{ choice: "FIRST"|"SECOND" }` → `{ card_id, effect, choice, chosen_number, from_index, to_index, used }`. 추가 에러: `400 INVALID_REQUEST` / `404 CHANCE_CONFIRM_NOT_FOUND` / `409 CHANCE_CARD_ALREADY_USED`.
- `POST /board/roulette/spin`(Idempotency-Key, Body 없음, 수치 미정) → `{ roulette_result: {label}, mileage_gained, total_mileage }`. 추가 에러: `400 REQUEST_BODY_NOT_ALLOWED` / `403 NOT_TEAM_LEADER` / `409 NOT_ROULETTE_CELL`.

**제품 요구사항(기능명세 원문)**: 문제 목록 조회(보드판), 주사위 굴리는 로직(굴리기 전 chance 카드 선택), 말 이동, 보드칸 선택 시 문제 종류 선택, 현재 보유 chance 카드 목록, 무인도칸(미정), 출발칸, Airport(1칸, 자유 이동), 찬스칸 2개, 클리어칸 처리.

**미해결(요약, Appendix B)**: `board/me.active_challenge`에 타이머 필드 부재 · `consumed_cell_indexes` opened/cleared 미구분 · `chance/now` 예시가 카탈로그 밖 카드 · ERD `idempotency_scope`에 `CHANCE_CONFIRM` 누락 · `GET /board/opened_challenges`가 "열린문제 페이지 제외" 범위에 포함되는지 미확정(Appendix C).

> ⚠️ **구현 상태(2026-08-29, `feature/board`)**: Figma node **3:2(BoardPage) / 146:19(무인도 클릭)** 기준 **정적 UI만** 구현됨(12-3절 "목업으로 UI 먼저" 지침). 36칸은 `board-grid.png` 한 장으로 처리(칸별 분해 없음), 무인도 모달은 `?preview=quarantine`로 확인. 주사위 굴리기·칸 오픈·찬스·룰렛·무인도 탈출 API 연동은 후속(`TODO(board)`). 주사위 상태 HUD·무인도 카운트다운의 라이브 값은 시안 plate에 샘플 값이 구워져 있어 미표시(값 없는 plate 재추출 대상). 36칸 클릭 히트스팟은 `GET /board` 칸 좌표 명세(미해결) 확정 후.

---

## 3. 문제 상세 페이지

인증 전부 필요.

| Method | URL | 설명 |
|---|---|---|
| GET | `/challenges/{challenge_id}` | 문제 상세 조회 |
| POST | `/challenges/{challenge_id}/submit` | 플래그 제출 |
| POST | `/instances` | 인스턴스 생성 |
| GET | `/teams/me/instance` | (본인) 인스턴스 상태 조회 |
| POST | `/instances/{instance_id}/reset` | 인스턴스 재시작 |
| POST | `/instances/{instance_id}/extend` | TTL 연장 |
| DELETE | `/instances/{instance_id}` | 인스턴스 종료 |

- `GET /challenges/{challenge_id}` → `{ challenge_id, title, category, difficulty, score, description, files: [{file_id,file_name,download_url,file_size}], solved_team_count, is_solved, instance: {instance_id, challenge_id, host, ports, status, expires_at} | null }`. `instance`는 **현재 access token의 `user_id`** 소유 활성 인스턴스가 이 문제와 연결된 경우만 포함. `ports`는 `{port, label}[]`(복수 배열 — 접속 URL 한 줄이 아니라 `host` + `ports[]`를 조합해서 표시해야 함). ⚠️ 이 응답에는 KOTH 관련 필드(순위 등)가 없다 — KOTH 배지/순위를 이 화면에 보여주려면 `GET /koth/me`를 별도로 조회해 클라이언트에서 합쳐야 하고, 그 조합 로직은 아직 어디에도 없다. 추가 에러: `403 CHALLENGE_LOCKED` / `404 CHALLENGE_NOT_FOUND` / `404 USER_HAS_NO_TEAM`.
- `POST /challenges/{challenge_id}/submit` — Req `{ flag }` → 정답 `{ challenge_id, earned_score, earned_mileage, is_extra_dice_granted, team_score, mileage, solved_at }` / 오답(3회 미만, HTTP 200) `code: "INCORRECT_FLAG"` / 3회 연속 오답 `429 code: "TOO_MANY_ATTEMPTS"`(`data.retry_after_seconds`). `team_id+challenge_id` 단위 연속 오답 카운트, 3회째 30초 락, 정답 시 초기화. 추가 에러: `409 ALREADY_SOLVED`.
- `POST /instances` — Req `{ challenge_id }` → 202 `{ instance_id, challenge_id, host, ports, status: "REQUESTED", expires_at, replaced_instance_id }`. `user_id` 기준 소유(참가자별 활성 최대 1개, 팀별 최대 2개), 기존 활성 인스턴스는 자동 `STOPPING` 후 새로 생성. 추가 에러: `403 FORBIDDEN` / `404 CHALLENGE_NOT_FOUND`.
- `GET /teams/me/instance` → 있음 `{ instance_id, challenge_id, challenge_title, host, ports, status, expires_at }` / 없음 `data: null`. ⚠️ 이름과 달리 **팀이 아니라 본인(user_id)** 기준(0-12절, Appendix B).
- `POST /instances/{instance_id}/reset` → 202 `{ instance_id, challenge_id, status: "RESETTING", host, ports, expires_at }`. 추가 에러: `400 INVALID_STATE_TRANSITION` / `403 FORBIDDEN` / `404 INSTANCE_NOT_FOUND`.
- `POST /instances/{instance_id}/extend` — Req `{ extend_minutes }` → 202 `{ instance_id, challenge_id, status, expires_at }`(host/ports 없음 — 0-12절). 추가 에러: `400 TTL_EXTENSION_LIMIT_EXCEEDED` / `403 FORBIDDEN`/`NOT_TEAM_LEADER` / `404 INSTANCE_NOT_FOUND`.
- `DELETE /instances/{instance_id}` → 202 `{ instance_id, challenge_id, status: "STOPPING" }`(host/ports/expires_at 없음 — 0-12절). 추가 에러: `400 INVALID_STATE_TRANSITION` / `403 FORBIDDEN` / `404 INSTANCE_NOT_FOUND`.

> `POST /admin/challenges/{challenge_id}/docker_image`는 관리자 전용이라 8절(관리자 페이지)로 재분류했다(원문은 이 그룹에 있었음).

**제품 요구사항(기능명세 원문)**: 문제 상세 화면, 인스턴스 생성 버튼(발급, 다른 인스턴스 누르면 기존 인스턴스 자동 종료 후 전환), 인스턴스 종료 버튼, 내 팀 인스턴스 상태 표시, 인스턴스 재시작 요청(reset), TTL 만료 시간 표시, 연장 요청 버튼, 플래그 제출(제출 즉시 검증).

> ⚠️ **구현 상태 캡션(현재 코드 스냅샷 기준, 문서가 아니라 확인차 남김)**: `expires_at`(절대시각)만 오고 `remaining_seconds`/`ttl_seconds` 같은 카운트다운 전용 필드는 이 응답에 없다. 화면의 잔여시간 진행바/타이머는 `expires_at - 현재시각`을 프론트에서 매초 재계산해야 한다(`setInterval` 등으로 "지금" 자체가 흘러야 함) — 단순히 fetch 결과를 그대로 렌더링하면 타이머가 멈춰 보인다.

---

## 4. 리더보드 페이지

인증 불필요.

| Method | URL | 설명 |
|---|---|---|
| GET | `/leaderboard` | 상위 8팀 점수 그래프 + 팀 이름 |

- `GET /leaderboard` → `{ teams: [{ team_id, team_name, total_score, solves: [{challenge_id, source_type, solved_at, points}] }], total_count }`.
- `total_score` = 제오파디 현재 점수 + KOTH 현재 점수, **밴 팀·미풀이 팀 제외**(🔴 0-6절 미해결 항목과 상충 — 위 표 참고), 동점은 `solved_at` 이른 순, 최대 8팀.
- 그래프: `solves`만 사용, `solved_at` 정렬 후 `points` 누적. **KOTH는 새 SOLVE를 만들지 않음** — 처음 양수 점수 시점에만 점이 생기고 이후 15분 점수는 기존 점의 값만 키운다.
- 에러: 명시 없음(공통 500 외 없음).

**제품 요구사항(기능명세 원문)**: 랭킹(team/개인) 페이지, 스코어보드 그래프, TOP3 팀명 표시(team/개인).

---

## 5. 랭킹 페이지

| Method | URL | 설명 | 인증 |
|---|---|---|---|
| GET | `/ranking` | 전체 팀 순위(페이지네이션) | 미확정(Appendix B) |
| GET | `/ranking/me` | 내 팀 순위 | 🔴 `team: {팀 이름}` 헤더(Appendix B) |
| GET | `/ranking/member` | 개인 순위 | 명세 없음(Appendix B) |

- `GET /ranking` — Query `page`·`size` → `{ rankings: [{ rank, team_id, team_name, team_score, last_solved_at, mileage }], total_count }`. 정렬: 총점↓ → `last_solved_at`↑ → `team_id` 사전순. **밴 팀 제외**(🔴 0-6절 미해결 항목과 상충).
- `GET /ranking/me` — Header `team: {팀 이름}`(🔴 비표준 인증) → `{ rank, team_name, team_score, mileage }`. `team_id`/`last_solved_at`은 `/ranking`과 달리 없음(Appendix B). 추가 에러: `400 INVALID_REQUEST`(team 헤더 누락) / `404 TEAM_NOT_FOUND`.
- `GET /ranking/member` — **원문 페이지가 완전히 비어 있어 명세 없음**(Appendix B). 기능명세가 요구하는 "개인 순위"를 담당할 유일한 API인데 스펙 자체가 없다.

**제품 요구사항(기능명세 원문)**: 랭킹(team/개인) — 모든 사람의 등수를 볼 수 있는지는 미확정.

---

## 6. 마이 페이지

인증 전부 필요.

| Method | URL | 설명 |
|---|---|---|
| GET | `/teams/me` | 내 정보 조회(팀+팀원) |
| GET | `/teams/me/solves` | 풀이 기록 |
| GET | `/teams/me/mileage_history` | 마일리지 히스토리 |
| POST | `/teams/me/qr_token` | QR 결제 토큰 발급(5분 만료) |

- `GET /teams/me` → `{ team_id, team_name, team_score, jeopardy_score, koth_score, mileage, is_banned, ban_reason, members: [{user_id, nickname, role, is_leader}] }`. `team_score = jeopardy_score + koth_score`.
- `GET /teams/me/solves` → `{ solves: [{ source_type, challenge_id, challenge_title, earned_score, earned_mileage, is_extra_dice_granted, solved_by: {user_id,nickname} | null, solved_at }], total_count }`. KOTH 항목은 `solved_by: null`, `earned_score`는 누적값. 정렬 `solved_at` 최신순.
- `GET /teams/me/mileage_history` → `{ mileage, history: [{ history_id, type, amount, reason, item_name, is_refunded, ref_history_id, created_at }], total_count }`. `type`은 0-13절 8종. 환불은 새 `REFUND` 행 추가(기존 행 불변).
- `POST /teams/me/qr_token`(Body 없음) → `{ payment_token, expires_at }`. 이전 발급된 미사용 토큰은 즉시 무효화. 추가 에러: `403 TEAM_BANNED`.

**제품 요구사항(기능명세 원문)**: 현재 점수, 현재 마일리지, 마일리지 결제 히스토리, 팀명, 풀이 시간 기록.

---

## 7. 타이머 페이지

인증 불필요.

| Method | URL | 설명 |
|---|---|---|
| GET | `/timer` | 대회 상태·남은 시간 조회 |

- `GET /timer` → `{ name, status, start_time, end_time, time_until_start, remaining_seconds, remaining_display }`. `status`: `BEFORE`/`RUNNING`/`ENDED`. **활성 대회 없음 → `200` + `data: null`**(0-2절 최종 확정 — 구버전 문서의 404 언급은 폐기).
- `server_time`/`contest_id`는 없음 — 2절 `board/dice/status`와의 패턴 불일치(Appendix B).

**제품 요구사항(기능명세 원문)**: 남은 시간 표시, 주사위 초기화 시간, 프론트-백엔드 시간 동기화(초 단위 프론트 ↔ 분 단위 백엔드 통신 검토).

---

## 8. 관리자 페이지

인증: 전부 Bearer + `role: ADMIN` 필요(아니면 `403 FORBIDDEN`).

| Method | URL | 설명 | 백엔드 상태 |
|---|---|---|---|
| GET | `/admin/teams` | 팀별 목록(검색/정렬) | 시작 전 |
| GET | `/admin/instances` | 인스턴스 목록(상태별 집계) | 논의 |
| POST | `/admin/instances/{instance_id}/reset` | 인스턴스 강제 재시작 | 시작 전 |
| DELETE | `/admin/instances/{instance_id}` | 인스턴스 강제 종료 | 논의 |
| GET | `/admin/resources` | 계정/노드별 리소스 상태 | 논의 |
| GET | `/admin/events` | 최근 이벤트 로그 | 논의 |
| POST | `/admin/teams/{team_id}/mileage` | 마일리지 지급/회수 | 시작 전 |
| POST\|DELETE | `/admin/teams/{team_id}/ban` | 팀 벤 처리/해제 | 시작 전 |
| GET | `/admin/payment/history` | 전체 결제 히스토리 | 시작 전 |
| POST | `/admin/payment/checkout` | QR 스캔 결제 처리(부스) | 시작 전 |
| DELETE | `/admin/payment/{history_id}/refund` | 결제 환불 | 시작 전 |
| POST | `/admin/challenges/{challenge_id}/docker_image` | Docker 이미지 업로드 | 시작 전 |

- `GET /admin/teams` → `{ teams: [{ team_id, team_name, team_score, mileage, position, is_banned, members: [{user_id, login_id, nickname, role, is_leader}], member_count }], total_count, page, size }`. `login_id`는 관리자 응답에만 포함.
- `GET /admin/instances` → `{ instances: [{instance_id, team_id, team_name, challenge_id, challenge_title, status, created_at, expires_at}], summary: {by_status, by_team, by_challenge}, total_count, page, size }`. `by_status`는 ERD 12개 상태 항상 전부 포함(0이어도).
- `POST /admin/instances/{instance_id}/reset` → 202 `{ instance_id, team_id, team_name, challenge_id, status: "RESETTING", host, ports, expires_at, forced_by, forced_at }`. 추가 에러: `404 INSTANCE_NOT_FOUND` / `409 INSTANCE_NOT_RESTARTABLE`.
- `DELETE /admin/instances/{instance_id}` → 202 `{ instance_id, team_id, team_name, status: "STOPPING", forced_by, forced_at }`. 추가 에러: `404 INSTANCE_NOT_FOUND` / `409 INSTANCE_ALREADY_TERMINATED`.
- `GET /admin/resources` → 있음 `{ accounts: [{account_id, account_name, status, running_instances, instance_quota, nodes: [{node_id, node_name, status, running_instances, cpu_usage_percent, memory_usage_percent}]}], total_count, collected_at }` / 없음 `data: null`. `status` enum 전체 값 미공개(Appendix B).
- `GET /admin/events` → `{ events: [{event_id, type, severity, message, team_id, team_name, challenge_id, challenge_title, instance_id, actor, created_at}], total_count, page, size }`. `type`/`severity` enum 전체 값 미공개(Appendix B).
- `POST /admin/teams/{team_id}/mileage` — Req `{ amount, reason }`(0 불가) → `{ team_id, previous_mileage, amount, current_mileage, reason, adjusted_at, adjusted_by }`. `mileage_history.type`은 서버가 부호로 자동 결정(`ADMIN_GRANT`/`ADMIN_DEDUCT`). 추가 에러: `400 INVALID_AMOUNT` / `400 INSUFFICIENT_MILEAGE` / `404 TEAM_NOT_FOUND`.
- `POST /admin/teams/{team_id}/ban` — Req `{ ban_reason }` → `{ team_id, is_banned: true, ban_reason, banned_at, banned_by }`. 추가 에러: `404 TEAM_NOT_FOUND` / `409 ALREADY_BANNED`.
- `DELETE /admin/teams/{team_id}/ban` → `{ team_id, is_banned: false, unbanned_at, unbanned_by }`. 추가 에러: `404 TEAM_NOT_FOUND` / `409 NOT_BANNED`.
- `GET /admin/payment/history` — Query `team_id`(선택)·`page`·`size` → `{ history: [...], total_count, page, size }`(6절 `mileage_history.type`과 동일 enum 공유).
- `POST /admin/payment/checkout` — Req `{ payment_token, amount, item_name }` → `{ history_id, team_id, team_name, item_name, amount, current_mileage, processed_at, processed_by }`. 잔액부족 실패 시 토큰 미소모. 추가 에러: `400 INVALID_AMOUNT` / `400 PAYMENT_TOKEN_EXPIRED` / `400 PAYMENT_TOKEN_INVALID` / `400 INSUFFICIENT_MILEAGE`.
- `DELETE /admin/payment/{history_id}/refund` → `{ history_id(신규 REFUND 행), team_id, team_name, refunded_amount, current_mileage, refunded_at, refunded_by }`. 추가 에러: `404 PAYMENT_NOT_FOUND` / `409 ALREADY_REFUNDED` / `409 NOT_REFUNDABLE`.
- `POST /admin/challenges/{challenge_id}/docker_image`(multipart/form-data) → 201 `{ challenge_id, docker_image_id, github_repository_url, github_commit_sha, image_name, image_tag, status: "READY", uploaded_at }`. 추가 에러: `400 INVALID_FILE_TYPE`/`INVALID_IMAGE_FILE` · `404 CHALLENGE_NOT_FOUND` · `409 DOCKER_IMAGE_ALREADY_EXISTS` · `413 FILE_TOO_LARGE`.

**제품 요구사항(기능명세 원문)**: 팀별 목록, 문제 목록(챌린지별 인스턴스 관리), 설정, 로그, 운영 대시보드. 팀별 목록 상세: clear 칸 관리, 문제 공개상태 관리, 팀 상세 정보, 전체 인스턴스 목록, 팀별/문제별 실행 중 인스턴스 수, 인스턴스 상태 필터링, 실패 인스턴스 표시, 강제 재시작/종료, 계정·노드별 리소스 상태, 최근 이벤트 로그, 마일리지 관리(오픈소스 검토), 주사위 오류 시 고정 지급, 칸 위치 이동, 벤 처리.

**기능명세 대비 API 자체가 없는 항목**(구현 전, Appendix B): 설정 / clear 칸 관리 / 문제 공개상태 관리 / 주사위 오류 시 고정 지급 / 칸 위치 이동(수동 보정) / 🔴 롤백 기능.

---

## 9. KOTH 페이지

인증: `GET /koth/clubs`, `GET /koth/clubs/{club_id}`만 불필요, 나머지 Bearer 필요.

| Method | URL | 설명 |
|---|---|---|
| GET | `/koth/clubs` | KOTH 6개 클럽 목록 + 활성 상태 |
| GET | `/koth/clubs/{club_id}` | 클럽별 상세 + 현재 점유 상태 |
| GET | `/koth/me` | 내 팀 KOTH 문제별 점수·순위 |
| GET | `/koth/leaderboard` | KOTH 문제 하나의 팀 순위(`koth_challenge_id` 필수 쿼리) |
| GET | `/koth/team_token` | 내 팀 KOTH 팀 토큰 조회 |

> `/internal/koth/team_tokens/verify`(POST), `/internal/teams`(GET), `/internal/koth/scores`(GET)는 서버-서버 전용(문제 서버 ↔ 플랫폼 백엔드) — 프론트 구현 대상 아님.

- `GET /koth/clubs` → `{ clubs: [{club_id, name, koth_challenge_id, title, category, status, open_group, current_owner_team_id, current_owner_team_name, current_score, opened_at, closed_at}], total_count: 6, active_count }`. `status`: `SCHEDULED`/`ACTIVE`/`CLOSED`.
- `GET /koth/clubs/{club_id}` → 목록 원소와 동일 필드 구조 단건.
- `GET /koth/me` → `{ team_id, team_name, total_koth_score, challenges: [{koth_challenge_id, club_id, title, category, status, earned_score, rank, solved_at, opened_at, closed_at}](항상 6개 전부), total_count: 6, active_count }`. 전체 팀 순위는 이 API가 아니라 5절 `/ranking`이 제오파디+KOTH 합산 제공.
- `GET /koth/leaderboard` — Query `koth_challenge_id`(필수) → `{ koth_challenge_id, title, status, leaderboard: [{rank, team_id, team_name, earned_score, solved_at}], total_count, updated_at }`. 추가 에러: `400 KOTH_CHALLENGE_ID_REQUIRED` / `400 INVALID_KOTH_CHALLENGE_ID` / `404 KOTH_CHALLENGE_NOT_FOUND`.
- `GET /koth/team_token` → `{ team_id, team_name, team_token, issued_at }`. 로그인 JWT와 무관한 별도 값(외부 KOTH 문제 서버에 참가자가 직접 입력). 추가 에러: `404 USER_HAS_NO_TEAM`.

**제품 요구사항(기능명세 원문)**: 동아리별 KOTH 문제 목록, 다음 문제 개방 남은 시간, 스코어링 방식(누적합산)은 일반 문제와 다름.

**미해결(Appendix B)**: "다음 문제 개방 남은 시간" 필드 없음 · `solves[].challenge_id`(KOTH)와 `koth_challenge_id` 동일 값 공간 여부 미확인.

---

## 10. 열린 문제 목록 페이지 — 통합 범위 제외

- 담당(기능명세 명시): 규민 · API 그룹: "열린 문제 목록" 페이지(문제 상세와 별도 DB)
- **상태: 문서화 보류(스킵)**. 백엔드 측 작성 내용이 아직 부실하고 미완성 항목이 많아, 현재 시점 문서화를 진행하지 않기로 결정(2026-08-16).
- 참고: 2절(보드 페이지)의 `GET /board/opened_challenges`는 이 그룹이 아니라 "보드 페이지" API 그룹 소속으로 확인되어 2절에 이미 포함되어 있다. 이 API가 "열린문제 API 제외" 지침 대상인지는 Appendix B #17에 미해결로 남아 있다.
- 백엔드 명세가 보강되는 대로 별도 절로 정리해 추가할 예정.
- **제품 요구사항(기능명세 원문)**: 현재 인스턴스 표시, 열린 문제 목록, 푼 문제 표시, 클릭 시 문제 상세 페이지로 이동.

---

## 11. 기타 제품 요구사항 (API 스펙 대상 외)

API 문서 3개엔 없지만 원 기능명세(`archive/최초_MVP_기능요구사항_초안.md`)에만 있던, 아직 API로 안 내려온 항목들 — 스펙 논의가 더 필요한 채로 남겨둔다.

- **디스코드 봇**: DJ, 퍼블, 티켓발급, 공지사항.
- **팀장 권한/밴 처리 정책은 0-5·0-6절로 흡수 완료.**

---

## Appendix A. 필드명 통일 총괄

| # | 필드 | 이전(원문) | 최종 확정 | 적용된 API |
|---|---|---|---|---|
| 1 | 칸 타입 | `cell_type` | `type` | `GET /board/me` |
| 2 | 인스턴스 접속 정보 | `port`(단수) | `ports`(복수 배열) | `challenges/{id}.instance`, `POST /instances`, `GET /teams/me/instance`, `POST /instances/{id}/reset`, `POST /admin/instances/{id}/reset` |
| 3 | 팀 이름 | `name` | `team_name` | `GET /leaderboard`, `GET /ranking/me` |
| 4 | QR 결제 토큰 | `token`/`qr_token`/`payment_token` 3파전 | `payment_token` | `POST /teams/me/qr_token`, `POST /admin/payment/checkout` |
| 5 | 팀 위치 | `board_position_states` | `position` | `GET /admin/teams` |
| 6 | ID 타입 | `Long`(정수, `최초_MVP_기능요구사항_초안.md` 초안) | `String(UUID)` | 전체 `*_id` (예외: `card_id`, `payment_token`) — **이번 통합에서 확정** |
| 7 | 보드 후보 문제 제목 | `title`(최종 API 명세서 원문, 용어 규칙 위반으로 판단) | `challenge_title` | `GET /board/cell/current` — **이번 통합에서 교정, 백엔드 재확인 필요** |
| — | "활성 대회 없음" 응답 | 문서 내 404 언급(모순) | `200` + `data: null` | `GET /timer` |

---

## Appendix B. 미해결 이슈 총괄 (QA 결정 필요)

우선순위 🔴(설계/보안/제품결정) → 🟡(스펙 공백) → 🟢(경미) 순.

### 🔴 설계/보안/제품 결정 필요

1. **밴된 팀의 리더보드/랭킹 노출 여부** — `최초_MVP_기능요구사항_초안.md`(초안)는 "계속 노출"로 명시, 최종 API 명세서 4·5절은 "밴 팀 제외"로 명시. **이번 통합에서 사용자 QA 결과 미해결로 보류.** 프론트는 두 경우 다 방어적으로 렌더링할 것. (0-6절)
2. **`GET /ranking/me`의 `team: {팀 이름}` 헤더 인증** — 프로젝트 유일하게 Bearer가 아닌 클라이언트 입력을 신뢰. 다른 팀 정보 열람 가능성.
3. **관리자 "롤백 기능" API 부재** — 기능명세 정책("벤/강제개입 전 스냅샷, 명시적 복원")과 실제 API 사이 간극.
4. **인스턴스 5개 API의 응답 필드 포함 여부 불일치** — `extend`/`delete`엔 `host`/`ports`가 없음, 프론트가 단일 Instance 타입으로 다루기 어려움.
5. **`GET /board/cell/current`의 `challenge_title` 필드명 교정(Appendix A #7)** — 이번 통합에서 명명 규칙에 맞춰 임의로 고쳤을 뿐 백엔드 실제 응답으로 확인된 것은 아님. 연동 첫 시도에서 반드시 재확인.

### 🟡 스펙 공백 / 명세 누락

6. `GET /ranking/member`(개인 순위) — 원문 완전 공백, 기능명세 요구사항인데 명세 자체가 없음.
7. `GET /ranking` 인증 필요 여부 미확정.
8. `GET /ranking` vs `GET /ranking/me` 필드 불일치(`team_id`/`last_solved_at` 누락).
9. `board/me.active_challenge`에 `solve_deadline_at`/`remaining_seconds` 없음(기능명세가 요구하는 "진행 중 타이머 정보").
10. `consumed_cell_indexes`가 opened/cleared 단계를 구분 못함.
11. `GET /timer`에 `server_time`/`contest_id` 없음(`board/dice/status` 패턴과 불일치).
12. 관리자 페이지 — "설정 / clear 칸 관리 / 문제 공개상태 관리 / 주사위 오류 고정 지급 / 칸 위치 이동" API 부재.
13. `GET /admin/resources`의 `status`, `GET /admin/events`의 `type`/`severity` enum 전체 값 목록 미공개.
14. KOTH — "다음 문제 개방 남은 시간" 필드 없음.
15. KOTH — `solves[].challenge_id`(KOTH 항목)와 `koth_challenge_id` 동일 값 공간 여부 미확인.
16. `GET /teams/me/instance`가 "팀"이 아니라 "본인(user_id)" 기준 — 기능명세 문구와 실제 범위 불일치.
17. `POST /board/chance/now` 응답 예시가 `chance/catalog`의 실제 7종 카드 목록에 없음(오래된 예시).
18. ERD `idempotency_scope` enum에 `CHANCE_CONFIRM` 누락.
19. `GET /board/opened_challenges`가 "열린문제 API 제외" 범위에 포함되는지 미확정(10절 참고).
20. `GET /challenges/{challenge_id}` 응답에 KOTH 배지/순위 필드가 없음 — 문제 상세 화면에서 KOTH 정보를 보여주려면 `GET /koth/me`와 클라이언트 조합이 필요한데 그 설계가 없음(3절 참고).

### 🟢 경미(문서/표기 문제, 실 스펙엔 영향 없음)

21. `login`/`logout` 400 유효성 오류 케이스 미문서화.
22. `board/me` 문서의 상호참조 링크 오류(`/board/challenges` → 실제는 `/board/opened_challenges`).
23. KOTH 참고 문서의 하이픈 표기(`team-token`) vs 실제 DB 등록값 언더스코어(`team_token`) — 실 스펙은 언더스코어가 맞음.
24. Notion 원문 URL의 이스케이프 문자 잔존(`\{challenge_id\}`) — 표시상 문제일 뿐.

---

## 12. 브랜치 전략 · 개발 순서 · 전역 설정

### 12-1. 브랜치 전략 — GitHub Flow

**Git Flow가 아니라 GitHub Flow를 권장한다.**

| 판단 근거 | 설명 |
|---|---|
| 배포 대상이 단일 | 여러 버전을 동시에 유지보수하는 제품이 아니라, 정해진 대회 일자에 배포되는 단일 웹앱. |
| 일정이 짧고 고정 | 대회 날짜라는 하드 데드라인이 있어 브랜치 전환·머지 절차가 무거우면 속도가 떨어진다. |
| 페이지/컴포넌트 단위 병렬 작업이 핵심 | 여러 페이지를 여러 사람이 동시에 짧은 주기로 `main`에 합치는 게 필요 — GitHub Flow(`main` + 짧은 수명 feature 브랜치 + PR)가 정확히 이 요구에 맞음. |
| `main`은 항상 배포 가능 상태 유지 | 대회 직전 급한 수정도 별도 hotfix 절차 없이 `main`에서 바로 브랜치 파서 고치고 PR로 합침. |

**예외 — 대형 페이지는 "통합 브랜치"를 하나 더 둔다**

보드 페이지(14개 API)와 관리자 페이지(12개 API)처럼 컴포넌트가 많은 페이지는 페이지 전용 통합 브랜치를 추가로 둔다.

```
main
 └─ feature/board                      (보드 페이지 통합 브랜치)
     ├─ feature/board/dice             (주사위 컴포넌트)
     ├─ feature/board/chance           (찬스카드 컴포넌트)
     └─ feature/board/cell-open        (칸 오픈/문제선택 컴포넌트)
```

- 컴포넌트 브랜치는 `feature/board`에서 분기해 `feature/board`로만 머지한다(`main`으로 직접 머지 금지).
- `feature/board`가 페이지 단위로 완성되면 그때 `main`으로 PR을 올린다.
- 소규모 페이지(로그인/타이머/랭킹/리더보드/KOTH 등)는 이 단계 없이 `feature/<page>` 하나로 충분하다.

### 12-2. 브랜치 네이밍 규칙

```
main                        # 항상 배포 가능한 상태
feature/<page-slug>         # 페이지 단위 기본 브랜치
feature/<page-slug>/<part>  # (대형 페이지에 한해) 컴포넌트 단위 하위 브랜치
fix/<slug>                  # 버그 수정
chore/<slug>                # 설정, 빌드, 문서 등 기능 외 작업
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
| (페이지 아님) 공통 인프라 | `infra` 또는 `common` | — |

예: `feature/auth`, `feature/board`, `feature/board/dice`, `feature/admin`, `fix/ranking-team-name`.

> **예외**: `feature/scoreboard`는 리더보드(4절)+랭킹(5절) 두 페이지를 가연이 한 브랜치에서 같이 진행하기로 승인된 통합 브랜치다. 표의 slug 1:1 원칙에 대한 명시적 예외이며, 이후 두 페이지가 커지면 `feature/board`처럼 `feature/scoreboard/leaderboard` / `feature/scoreboard/ranking` 하위 분기를 고려할 것.

> ⚠️ **브랜치 정리 진행 중 — 남은 항목.** (2026-08-17 기준)
> - ~~`feature/login` → `feature/auth` 리네임~~ **완료** (빈 브랜치라 데이터 손실 없이 rename).
> - `feature/koth`는 이미 규칙과 일치, 손대지 않음.
> - `feature/scoreboard`는 위 예외로 승인, 손대지 않음.
> - **비어 있던 6개 페이지 중 5개**(`board`, `mypage`, `admin`, `timer`, `open-challenges`)는 `main`에서 새로 브랜치를 파서 **완료**. 담당자는 12-2절 표 참고.
> - `feature/hwan`은 **여전히 미정리 — 2번 연속 보류 결정.** 여기에 Phase 0 스캐폴드 커밋(`e3fc761`)과 문제상세 페이지 작업(로컬 미커밋)이 같이 있고, 그 스캐폴드가 아직 `main`에 없다. `main`은 여전히 Initial commit뿐이라 방금 새로 판 `feature/board`/`feature/mypage`/`feature/admin`/`feature/timer`/`feature/open-challenges`를 포함한 모든 브랜치가 **로그인 페이지/라우팅/apiClient도 없는 빈 상태**에서 시작한다. 이게 풀리기 전까진 "페이지당 브랜치" 원칙은 이름만 갖춰졌을 뿐 실질적으로는 완성되지 않은 상태다. **처리 전까지는**: (1) 스캐폴드를 `main`에 병합, (2) 문제상세 작업을 `feature/challenge-detail`로 분리, (3) `feature/hwan` 정리(rename 또는 삭제) — 이 세 가지가 다음 정리 단계의 최우선 순위로 남아있다.

### 12-3. 개발 순서 (의존성 + 백엔드 상태 기준 권장안)

```
Phase 0 — 공통 인프라 (전부 선행 필요, 다른 모든 브랜치가 여기서 분기)
  feature/infra
    - API 클라이언트(axios 인스턴스) + baseURL 전역 변수화
    - Authorization: Bearer 인터셉터 + 401 처리(재발급/로그아웃)
    - 라우팅 스켈레톤, 전역 레이아웃/스타일
    - KST 변환 유틸

Phase 1 — 인증 (Phase 0 다음 최우선, 다른 모든 페이지가 로그인 의존)
  feature/auth

Phase 2 — 핵심 게임 플로우 (병렬 가능, 서로 약하게 의존)
  feature/board
  feature/challenge-detail   (board에서 칸 오픈 → 문제 상세로 연결)
  feature/mypage             (팀 상태를 상시 참조하는 화면이라 일찍 필요)

Phase 3 — 조회 전용 페이지 (Phase 2와 병렬 가능, 서로 독립적)
  feature/leaderboard
  feature/ranking
  feature/timer
  feature/open-challenges

Phase 4 — 운영/부가 기능 (백엔드 상태가 대부분 "시작 전"/"논의"라 자연히 후순위)
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

### ⚠️ 커밋 작성자(Authorship) 규칙 — 반드시 준수

> **어떤 커밋에도 AI(Claude)가 기여자로 들어가면 안 된다.** `Co-Authored-By: Claude ...`, `Authored-By: Claude ...` 같은 trailer를 커밋 메시지에 절대 포함하지 말 것. 커밋 author/committer는 항상 실제 작업자(팀원) 계정이어야 한다. **Claude Code가 이 리포에서 커밋을 생성/제안할 때도 이 규칙을 그대로 따라야 하며, 세션 기본 설정으로 자동 삽입되는 `Co-Authored-By`/`Claude-Session` trailer는 이 리포 한정으로 반드시 빼야 한다.**

### 12-5. 전역 설정 체크리스트 (모든 페이지 브랜치 공통 적용)

이 항목들은 페이지별 브랜치에서 개별로 만들지 말고 **Phase 0(`feature/infra`)에서 한 번만 만들어 전체가 재사용**한다.

**Base URL — 전역 변수, 하드코딩 금지**

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

- 코드 어디에서도 `"http://msgctf.kr/..."`를 문자열로 직접 쓰지 않는다 — 전부 `api.get("/board")`처럼 `apiClient` 경유.
- ⚠️ 현재 `src/api/client.js`는 `baseURL: "/api/v1"`을 상대경로로 하드코딩하고 있어 위 `.env` 패턴을 아직 안 쓰고 있다. 배포 시 API가 같은 오리진에 리버스프록시로 붙는다는 전제가 맞는지 확인 후, 맞다면 이 문서에 그 전제를 명시하고, 아니라면 `.env` 패턴으로 옮길 것.

**인증 — Bearer 토큰 전역 인터셉터**

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

**KST 시간 — 전역 변환 유틸**

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

**상대 경로 — 문자열 하드코딩 대신 라우트 상수/헬퍼**

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

- 이 문서의 "3. 상세 명세" 코드블록(Request/Response/Error)이 Swagger(OpenAPI) `example`/Postman Collection의 소스가 된다. 리포 루트의 `MsgCTF.postmancollection.json` / `MsgCTF.postmanenviroment.json`이 이 스펙 기준으로 이미 만들어져 있다 — Postman에 두 파일을 Import한 뒤 `access_token`/`admin_access_token`/`refresh_token`/`team_name` 환경변수만 채우면 바로 테스트할 수 있다. 미확정/보류 상태인 엔드포인트(`GET /ranking/me`, `GET /ranking/member` 등)는 요청 이름에 ⚠️ 표시가 되어 있다.

### 12-6. 페이지 브랜치 완료 기준 (Definition of Done)

각 `feature/<page>` PR을 `main`에 올리기 전 체크:

- [ ] `apiClient` 경유로만 API 호출 — `fetch`/`axios` 직접 호출·baseURL 하드코딩 없음
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
