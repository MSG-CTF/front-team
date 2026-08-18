# 최종 API 명세서 (통합본) — MSG CTF 플랫폼

- 이 문서는 `00_API공통규약_검증.md` ~ `10_브랜치전략_개발가이드.md`에서 기능별로 검증·정리한 내용을 **하나의 소스**로 통합한 최종본입니다. 필드명은 전부 적대적 검증을 거쳐 최종 확정된 값으로 통일되어 있습니다.
- 프론트(React) 개발 시 이 문서 하나만 보고 작업할 수 있도록 작성했습니다. 각 절 끝의 "근거"는 상세 검증 과정이 궁금할 때만 원본 기능별 문서(`0X_*.md`)를 참고하면 됩니다.
- 열린 문제 목록 페이지는 이번 통합 범위에서 제외합니다 — Appendix C 참고.

---

## 0. 공통 규약 (최종 확정)

### 0-1. Base URL

```
http://msgctf.kr/api/v1
http://msgctf.kr/api/v1/admin      (관리자 전용)
http://msgctf.kr/internal/**       (서버-서버 전용, 프론트 대상 아님)
```

프론트 코드에서는 절대 문자열로 하드코딩하지 않고 전역 변수로 관리 — 10번 문서 5-1절 참고.

### 0-2. 응답 포맷

모든 응답은 `{ code, message, data }` 3개 키 고정. **성공 판정은 HTTP 상태코드가 아니라 `code === "SUCCESS"`로 한다.** (예: 플래그 오답 `code: "INCORRECT_FLAG"`, 무인도 탈출 실패 `code: "ESCAPE_FAILED"` — 둘 다 HTTP 200)

- `data`는 항상 객체 또는 `null`.
- **조회 결과가 없음 → `200` + `data: null`이며 `404`가 아니다.** (구 A-1 이슈 최종 확정 — `GET /timer`의 "활성 대회 없음" 케이스로 실증됨)

### 0-3. 인증

- `Authorization: Bearer <JWT_TOKEN>` 헤더. `access_token`은 1시간, `refresh_token`은 12시간 유효.
- claim: `sub`(user_id), `team_id`, `role`, `is_leader`, `exp`.
- 인증 실패는 항상 401 3종 중 하나: `TOKEN_MISSING` / `TOKEN_EXPIRED` / `TOKEN_INVALID`.
- 권한 부족(관리자 API를 참가자가 호출 등)은 `403 FORBIDDEN`.
- **인증이 필요 없는 API**(전체): `GET /board`, `GET /board/chance/catalog`, `GET /leaderboard`, `GET /timer`, `GET /koth/clubs`, `GET /koth/clubs/{club_id}`. 그 외는 전부 인증 필요.
- 🔴 예외(미해결): `GET /ranking/me`만 Bearer 대신 `team: {팀 이름}` 커스텀 헤더 사용 — 보안 이슈로 QA 결정 대기(Appendix B 참고).

### 0-4. Idempotency-Key

다음 쓰기 API는 `Idempotency-Key` 헤더 필수: `POST /board/dice/roll`, `POST /board/cell/open`, `POST /board/airport/move`, `POST /board/quarantine/escape`, `POST /board/chance/now`, `POST /board/chance/use`, `POST /board/chance/confirm`(ERD enum 반영 필요 — Appendix B), `POST /board/roulette/spin`, 인스턴스 생성/재시작/연장/종료 계열.

### 0-5. ID 타입

모든 `*_id` PK/FK는 기본적으로 `String(UUID)`. 예외 2개: `card_id`(문자열 enum, 예 `card_reroll`), `payment_token`(문자열, 예 `pt_9f8a3c2e` — 구 3파전 필드명 최종 확정, Appendix A 참고).

### 0-6. 시간

모든 시간 필드는 ISO-8601 UTC(`Z` 접미사)로 응답. **KST 변환은 전적으로 프론트 책임**(10번 문서 5-3절 유틸 참고). 카운트다운류(주사위 리셋, 타이머, 문제 풀이 제한시간)는 가능하면 `server_time` 기준으로 클라이언트 시계 오차를 보정(단, `GET /timer`는 `server_time`이 없음 — Appendix B).

### 0-7. 페이지네이션

`page`(기본 1) / `size`(기본 API마다 다름, 상한 100, 초과 시 서버가 100으로 클램프) 공통 패턴. 응답엔 `total_count` 포함.

### 0-8. 밴(BAN) 처리

밴된 팀은 모든 **쓰기** 요청이 `403 TEAM_BANNED`로 차단(주사위/카드사용/공항이동/룰렛/문제오픈/플래그제출/인스턴스 생성·재시작·연장·종료/QR토큰발급). 모든 **조회(GET)**와 로그인/토큰갱신/로그아웃은 밴 상태와 무관하게 허용.

### 0-9. 공통 에러

| 상황 | code | HTTP |
|---|---|---|
| 인증 토큰 없음 | `TOKEN_MISSING` | 401 |
| 인증 토큰 만료 | `TOKEN_EXPIRED` | 401 |
| 인증 토큰 위조/손상 | `TOKEN_INVALID` | 401 |
| 권한 부족 | `FORBIDDEN` | 403 |
| 밴된 팀의 쓰기 요청 | `TEAM_BANNED` | 403 |
| 요청 형식/필수값 오류 | `INVALID_REQUEST` | 400 |
| 서버 오류 | `INTERNAL_ERROR` | 500 |

아래 각 절에서는 이 공통 에러를 반복 표기하지 않고, **API별 추가 에러만** 표기합니다.

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

> 근거: `01_로그인페이지_인증.md`

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
- `GET /board/me` → `{ position, type, is_quarantined, dice_rolls_left, next_dice_reset_at, quarantine_attempts_left, airport_move_used, has_passed_start, board_completed, consumed_cell_indexes, chance_cards: [{card_id, used}], active_challenge: {challenge_id, opened_at} | null }`. **`type`으로 통일(Appendix A)**.
- `GET /board/dice/status` → `{ can_roll, dice_rolls_left, is_quarantined, timer_running, blocked_reason, server_time, next_dice_reset_at, quarantine_released_at }`. `blocked_reason`: `NO_ROLL_LEFT`/`QUARANTINED`/`BOARD_COMPLETED`.
- `POST /board/dice/roll`(Idempotency-Key) → `{ dice_a, dice_b, rolled_number, previous_position, current_position, movement_path, skipped_cells, passed_start, start_reward: {mileage_gained, roll_gained}, board_event_code }`. 추가 에러: `400 REQUEST_BODY_NOT_ALLOWED` / `400 IDEMPOTENCY_KEY_REQUIRED` / `403 NOT_TEAM_LEADER` / `409 NO_ROLL_LEFT` / `409 TIMER_RUNNING` / `409 QUARANTINED` / `409 BOARD_COMPLETED`.
- `GET /board/cell/current` → `{ cell_index, type, challenge_candidates: [{challenge_id, title, category, score}] }`(3개).
- `POST /board/cell/open`(Idempotency-Key) — Req `{ challenge_id }` → `{ cell_index, challenge_id, opened_at, solve_deadline_at, remaining_seconds }`. 추가 에러: `400 CHALLENGE_ID_REQUIRED` / `409 NOT_CHALLENGE_CELL` / `409 CHALLENGE_NOT_CANDIDATE`.
- `POST /board/airport/move`(Idempotency-Key) — Req `{ destination_index }` → `{ previous_position, current_position, movement_path, board_event_code, passed_start, start_reward }`. 추가 에러: `400 INVALID_DESTINATION_INDEX` / `403 NOT_TEAM_LEADER` / `409 NOT_AIRPORT_CELL` / `409 AIRPORT_MOVE_ALREADY_USED`.
- `POST /board/quarantine/escape`(Idempotency-Key, Body 없음) → 성공 `{ position }` / 실패(HTTP 200, `code: "ESCAPE_FAILED"`) `{ position, quarantine_attempts_left }`. 추가 에러: `400 REQUEST_BODY_NOT_ALLOWED` / `409 NOT_QUARANTINED`.
- `GET /board/chance/catalog` → `{ cards: [{card_id, name, description, effect, usage_timing}], total_count: 7 }`. `effect` 값은 원문 표시상 초안(팀 합의 필요).
- `POST /board/chance/now`(Idempotency-Key, Body 없음) → `{ card_id, name, description, effect, used }`. 추가 에러: `400 REQUEST_BODY_NOT_ALLOWED` / `403 NOT_TEAM_LEADER` / `409 NOT_CHANCE_CELL`.
- `POST /board/chance/use`(Idempotency-Key) — 카드별 Req/Res 형태 다름(전부 초안). 추가 에러: `400 INVALID_DESTINATION_INDEX` / `400 CARD_ID_REQUIRED` / `404 CHANCE_CARD_NOT_FOUND` / `409 CHANCE_CARD_ALREADY_USED` / `409 CHANCE_CARD_WRONG_TIMING`.
- `POST /board/chance/confirm`(Idempotency-Key, `card_roll_twice_choose` 전용) — Req `{ choice: "FIRST"|"SECOND" }` → `{ card_id, effect, choice, chosen_number, from_index, to_index, used }`. 추가 에러: `400 INVALID_REQUEST` / `404 CHANCE_CONFIRM_NOT_FOUND` / `409 CHANCE_CARD_ALREADY_USED`.
- `POST /board/roulette/spin`(Idempotency-Key, Body 없음, 수치 미정) → `{ roulette_result: {label}, mileage_gained, total_mileage }`. 추가 에러: `400 REQUEST_BODY_NOT_ALLOWED` / `403 NOT_TEAM_LEADER` / `409 NOT_ROULETTE_CELL`.

**미해결(요약, 상세는 Appendix B)**: `board/me.active_challenge`에 타이머 필드 부재 · `consumed_cell_indexes` opened/cleared 미구분 · `chance/now` 예시가 카탈로그 밖 카드 · ERD `idempotency_scope`에 `CHANCE_CONFIRM` 누락 · `GET /board/opened_challenges`가 이번 통합 범위(열린문제 페이지 제외) 대상인지 미확정(Appendix C).

> 근거: `02_보드페이지.md`

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

- `GET /challenges/{challenge_id}` → `{ challenge_id, title, category, difficulty, score, description, files: [{file_id,file_name,download_url,file_size}], solved_team_count, is_solved, instance: {instance_id, challenge_id, host, ports, status, expires_at} | null }`. `instance`는 **현재 access token의 `user_id`** 소유 활성 인스턴스가 이 문제와 연결된 경우만 포함. `ports`는 `{port, label}[]`(**Appendix A 최종 확정**). 추가 에러: `403 CHALLENGE_LOCKED` / `404 CHALLENGE_NOT_FOUND` / `404 USER_HAS_NO_TEAM`.
- `POST /challenges/{challenge_id}/submit` — Req `{ flag }` → 정답 `{ challenge_id, earned_score, earned_mileage, is_extra_dice_granted, team_score, mileage, solved_at }` / 오답(3회 미만, HTTP 200) `code: "INCORRECT_FLAG"` / 3회 연속 오답 `429 code: "TOO_MANY_ATTEMPTS"`(`data.retry_after_seconds`). `team_id+challenge_id` 단위 연속 오답 카운트, 3회째 30초 락, 정답 시 초기화. 추가 에러: `409 ALREADY_SOLVED`.
- `POST /instances` — Req `{ challenge_id }` → 202 `{ instance_id, challenge_id, host, ports, status: "REQUESTED", expires_at, replaced_instance_id }`. `user_id` 기준 소유(참가자별 활성 최대 1개, 팀별 최대 2개), 기존 활성 인스턴스는 자동 `STOPPING` 후 새로 생성. 추가 에러: `403 FORBIDDEN` / `404 CHALLENGE_NOT_FOUND`.
- `GET /teams/me/instance` → 있음 `{ instance_id, challenge_id, challenge_title, host, ports, status, expires_at }` / 없음 `data: null`. ⚠️ 이름과 달리 **팀이 아니라 본인(user_id)** 기준(Appendix B).
- `POST /instances/{instance_id}/reset` → 202 `{ instance_id, challenge_id, status: "RESETTING", host, ports, expires_at }`. 추가 에러: `400 INVALID_STATE_TRANSITION` / `403 FORBIDDEN` / `404 INSTANCE_NOT_FOUND`.
- `POST /instances/{instance_id}/extend` — Req `{ extend_minutes }` → 202 `{ instance_id, challenge_id, status, expires_at }`(host/ports 없음 — Appendix B). 추가 에러: `400 TTL_EXTENSION_LIMIT_EXCEEDED` / `403 FORBIDDEN`/`NOT_TEAM_LEADER` / `404 INSTANCE_NOT_FOUND`.
- `DELETE /instances/{instance_id}` → 202 `{ instance_id, challenge_id, status: "STOPPING" }`(host/ports/expires_at 없음 — Appendix B). 추가 에러: `400 INVALID_STATE_TRANSITION` / `403 FORBIDDEN` / `404 INSTANCE_NOT_FOUND`.

> `POST /admin/challenges/{challenge_id}/docker_image`는 관리자 전용이라 8절(관리자 페이지)로 재분류했습니다(원문은 이 그룹에 있었음).

> 근거: `03_문제상세페이지.md`

---

## 4. 리더보드 페이지

인증 불필요.

| Method | URL | 설명 |
|---|---|---|
| GET | `/leaderboard` | 상위 8팀 점수 그래프 + 팀 이름 |

- `GET /leaderboard` → `{ teams: [{ team_id, team_name, total_score, solves: [{challenge_id, source_type, solved_at, points}] }], total_count }`. **`team_name`으로 통일(Appendix A)**.
- `total_score` = 제오파디 현재 점수 + KOTH 현재 점수, 밴 팀·미풀이 팀 제외, 동점은 `solved_at` 이른 순, 최대 8팀.
- 그래프: `solves`만 사용, `solved_at` 정렬 후 `points` 누적. **KOTH는 새 SOLVE를 만들지 않음** — 처음 양수 점수 시점에만 점이 생기고 이후 15분 점수는 기존 점의 값만 키움.
- 에러: 명시 없음(공통 500 외 없음).

> 근거: `04_리더보드페이지.md`

---

## 5. 랭킹 페이지

| Method | URL | 설명 | 인증 |
|---|---|---|---|
| GET | `/ranking` | 전체 팀 순위(페이지네이션) | 미확정(Appendix B) |
| GET | `/ranking/me` | 내 팀 순위 | 🔴 `team: {팀 이름}` 헤더(Appendix B) |
| GET | `/ranking/member` | 개인 순위 | 명세 없음(Appendix B) |

- `GET /ranking` — Query `page`·`size` → `{ rankings: [{ rank, team_id, team_name, team_score, last_solved_at, mileage }], total_count }`. 정렬: 총점↓ → `last_solved_at`↑ → `team_id` 사전순. 밴 팀 제외.
- `GET /ranking/me` — Header `team: {팀 이름}`(🔴 비표준 인증, Appendix B) → `{ rank, team_name, team_score, mileage }`. **`team_name`으로 통일(Appendix A)**. `team_id`/`last_solved_at`은 `/ranking`과 달리 없음(Appendix B). 추가 에러: `400 INVALID_REQUEST`(team 헤더 누락) / `404 TEAM_NOT_FOUND`.
- `GET /ranking/member` — **Notion 원문 페이지가 완전히 비어 있어 명세 없음**(Appendix B). 기능명세가 요구하는 "개인 순위"를 담당할 유일한 API.

> 근거: `05_랭킹페이지.md`

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
- `GET /teams/me/mileage_history` → `{ mileage, history: [{ history_id, type, amount, reason, item_name, is_refunded, ref_history_id, created_at }], total_count }`. `type` 8종(마일리지 타입 enum). 환불은 새 `REFUND` 행 추가(기존 행 불변).
- `POST /teams/me/qr_token`(Body 없음) → `{ payment_token, expires_at }`. **`payment_token`으로 최종 통일(Appendix A)**. 이전 발급된 미사용 토큰은 즉시 무효화. 추가 에러: `403 TEAM_BANNED`.

> 근거: `06_마이페이지.md`

---

## 7. 타이머 페이지

인증 불필요.

| Method | URL | 설명 |
|---|---|---|
| GET | `/timer` | 대회 상태·남은 시간 조회 |

- `GET /timer` → `{ name, status, start_time, end_time, time_until_start, remaining_seconds, remaining_display }`. `status`: `BEFORE`/`RUNNING`/`ENDED`. **활성 대회 없음 → `200` + `data: null`(0-2절 최종 확정)**.
- `server_time`/`contest_id`는 없음 — 02번 `board/dice/status`와의 패턴 불일치(Appendix B).

> 근거: `07_타이머페이지.md`

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
| POST | `/admin/challenges/{challenge_id}/docker_image` | (원 문제상세 그룹) Docker 이미지 업로드 | 시작 전 |

- `GET /admin/teams` → `{ teams: [{ team_id, team_name, team_score, mileage, position, is_banned, members: [{user_id, login_id, nickname, role, is_leader}], member_count }], total_count, page, size }`. **`position`으로 통일(Appendix A)**. `login_id`는 관리자 응답에만 포함.
- `GET /admin/instances` → `{ instances: [{instance_id, team_id, team_name, challenge_id, challenge_title, status, created_at, expires_at}], summary: {by_status, by_team, by_challenge}, total_count, page, size }`. `by_status`는 ERD 12개 상태 항상 전부 포함(0이어도).
- `POST /admin/instances/{instance_id}/reset` → 202 `{ instance_id, team_id, team_name, challenge_id, status: "RESETTING", host, ports, expires_at, forced_by, forced_at }`. **`ports`로 통일(Appendix A)**. 추가 에러: `404 INSTANCE_NOT_FOUND` / `409 INSTANCE_NOT_RESTARTABLE`.
- `DELETE /admin/instances/{instance_id}` → 202 `{ instance_id, team_id, team_name, status: "STOPPING", forced_by, forced_at }`. 추가 에러: `404 INSTANCE_NOT_FOUND` / `409 INSTANCE_ALREADY_TERMINATED`.
- `GET /admin/resources` → 있음 `{ accounts: [{account_id, account_name, status, running_instances, instance_quota, nodes: [{node_id, node_name, status, running_instances, cpu_usage_percent, memory_usage_percent}]}], total_count, collected_at }` / 없음 `data: null`. `status` enum 전체 값 미공개(Appendix B).
- `GET /admin/events` → `{ events: [{event_id, type, severity, message, team_id, team_name, challenge_id, challenge_title, instance_id, actor, created_at}], total_count, page, size }`. `type`/`severity` enum 전체 값 미공개(Appendix B).
- `POST /admin/teams/{team_id}/mileage` — Req `{ amount, reason }`(0 불가) → `{ team_id, previous_mileage, amount, current_mileage, reason, adjusted_at, adjusted_by }`. `mileage_history.type`은 서버가 부호로 자동 결정(`ADMIN_GRANT`/`ADMIN_DEDUCT`). 추가 에러: `400 INVALID_AMOUNT` / `400 INSUFFICIENT_MILEAGE` / `404 TEAM_NOT_FOUND`.
- `POST /admin/teams/{team_id}/ban` — Req `{ ban_reason }` → `{ team_id, is_banned: true, ban_reason, banned_at, banned_by }`. 추가 에러: `404 TEAM_NOT_FOUND` / `409 ALREADY_BANNED`.
- `DELETE /admin/teams/{team_id}/ban` → `{ team_id, is_banned: false, unbanned_at, unbanned_by }`. 추가 에러: `404 TEAM_NOT_FOUND` / `409 NOT_BANNED`.
- `GET /admin/payment/history` — Query `team_id`(선택)·`page`·`size` → `{ history: [...], total_count, page, size }`(06절 `mileage_history.type`과 동일 enum 공유).
- `POST /admin/payment/checkout` — Req `{ payment_token, amount, item_name }` → `{ history_id, team_id, team_name, item_name, amount, current_mileage, processed_at, processed_by }`. `payment_token`(Appendix A 근거 문서). 잔액부족 실패 시 토큰 미소모. 추가 에러: `400 INVALID_AMOUNT` / `400 PAYMENT_TOKEN_EXPIRED` / `400 PAYMENT_TOKEN_INVALID` / `400 INSUFFICIENT_MILEAGE`.
- `DELETE /admin/payment/{history_id}/refund` → `{ history_id(신규 REFUND 행), team_id, team_name, refunded_amount, current_mileage, refunded_at, refunded_by }`. 추가 에러: `404 PAYMENT_NOT_FOUND` / `409 ALREADY_REFUNDED` / `409 NOT_REFUNDABLE`.
- `POST /admin/challenges/{challenge_id}/docker_image`(multipart/form-data) → 201 `{ challenge_id, docker_image_id, github_repository_url, github_commit_sha, image_name, image_tag, status: "READY", uploaded_at }`. 추가 에러: `400 INVALID_FILE_TYPE`/`INVALID_IMAGE_FILE` · `404 CHALLENGE_NOT_FOUND` · `409 DOCKER_IMAGE_ALREADY_EXISTS` · `413 FILE_TOO_LARGE`.

**기능명세 대비 API 자체가 없는 항목**(구현 전, Appendix B): 설정 / clear 칸 관리 / 문제 공개상태 관리 / 주사위 오류 시 고정 지급 / 칸 위치 이동(수동 보정) / 🔴 롤백 기능.

> 근거: `08_관리자페이지.md`

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
- `GET /koth/me` → `{ team_id, team_name, total_koth_score, challenges: [{koth_challenge_id, club_id, title, category, status, earned_score, rank, solved_at, opened_at, closed_at}](항상 6개 전부), total_count: 6, active_count }`. 전체 팀 순위는 이 API가 아니라 `/ranking`(5절)이 제오파디+KOTH 합산 제공.
- `GET /koth/leaderboard` — Query `koth_challenge_id`(필수) → `{ koth_challenge_id, title, status, leaderboard: [{rank, team_id, team_name, earned_score, solved_at}], total_count, updated_at }`. 추가 에러: `400 KOTH_CHALLENGE_ID_REQUIRED` / `400 INVALID_KOTH_CHALLENGE_ID` / `404 KOTH_CHALLENGE_NOT_FOUND`.
- `GET /koth/team_token` → `{ team_id, team_name, team_token, issued_at }`. 로그인 JWT와 무관한 별도 값(외부 KOTH 문제 서버에 참가자가 직접 입력). 추가 에러: `404 USER_HAS_NO_TEAM`.

**미해결(Appendix B)**: "다음 문제 개방 남은 시간" 필드 없음 · `solves[].challenge_id`(KOTH)와 `koth_challenge_id` 동일 값 공간 여부 미확인.

> 근거: `09_KOTH페이지.md`

---

## Appendix A. 필드명 통일 총괄 (전부 반영 완료)

| # | 필드 | 이전(Notion 원문) | 최종 확정 | 적용된 API | 근거 문서 |
|---|---|---|---|---|---|
| 1 | 칸 타입 | `cell_type` | `type` | `GET /board/me` | `02_보드페이지.md` |
| 2 | 인스턴스 접속 정보 | `port`(단수) | `ports`(복수 배열) | `challenges/{id}.instance`, `POST /instances`, `GET /teams/me/instance`, `POST /instances/{id}/reset`, `POST /admin/instances/{id}/reset` | `03_문제상세페이지.md`, `08_관리자페이지.md` |
| 3 | 팀 이름 | `name` | `team_name` | `GET /leaderboard`, `GET /ranking/me` | `04_리더보드페이지.md`, `05_랭킹페이지.md` |
| 4 | QR 결제 토큰 | `token`/`qr_token`/`payment_token` 3파전 | `payment_token` | `POST /teams/me/qr_token`, `POST /admin/payment/checkout` | `06_마이페이지.md`, `08_관리자페이지.md` |
| 5 | 팀 위치 | `board_position_states` | `position` | `GET /admin/teams` | `08_관리자페이지.md`(근거: `02_보드페이지.md`의 기존 `position` 확정과 통일) |
| — | "활성 대회 없음" 응답 | 문서 내 404 언급(모순) | `200` + `data: null` | `GET /timer` | `07_타이머페이지.md` |

---

## Appendix B. 미해결 이슈 총괄 (QA 결정 필요)

우선순위 🔴(설계/보안) → 🟡(스펙 공백) → 🟢(경미) 순.

### 🔴 설계/보안 결정 필요

1. **`GET /ranking/me`의 `team: {팀 이름}` 헤더 인증** — 프로젝트 유일하게 Bearer가 아닌 클라이언트 입력을 신뢰. 다른 팀 정보 열람 가능성. (`05_랭킹페이지.md` 7절)
2. **관리자 "롤백 기능" API 부재** — 기능명세 정책("벤/강제개입 전 스냅샷, 명시적 복원")과 실제 API 사이 간극. (`08_관리자페이지.md` 7절)
3. **인스턴스 5개 API의 응답 필드 포함 여부 불일치** — `extend`/`delete`엔 `host`/`ports`가 없음, 프론트가 단일 Instance 타입으로 다루기 어려움. (`03_문제상세페이지.md` 5절)

### 🟡 스펙 공백 / 명세 누락

4. `GET /ranking/member`(개인 순위) — Notion 원문 완전 공백, 기능명세 요구사항인데 명세 자체가 없음.
5. `GET /ranking` 인증 필요 여부 미확정(원문 플레이스홀더 그대로).
6. `GET /ranking` vs `GET /ranking/me` 필드 불일치(`team_id`/`last_solved_at` 누락).
7. `board/me.active_challenge`에 `solve_deadline_at`/`remaining_seconds` 없음(기능명세가 요구하는 "진행 중 타이머 정보").
8. `consumed_cell_indexes`가 opened/cleared 3단계를 구분 못함.
9. `GET /timer`에 `server_time`/`contest_id` 없음(02번 `dice/status` 패턴과 불일치).
10. 관리자 페이지 — "설정 / clear 칸 관리 / 문제 공개상태 관리 / 주사위 오류 고정 지급 / 칸 위치 이동" API 부재.
11. `GET /admin/resources`의 `status`, `GET /admin/events`의 `type`/`severity` enum 전체 값 목록 미공개.
12. KOTH — "다음 문제 개방 남은 시간" 필드 없음.
13. KOTH — `solves[].challenge_id`(KOTH 항목)와 `koth_challenge_id` 동일 값 공간 여부 미확인(04/06/09번 문서에 걸친 이슈).
14. `GET /teams/me/instance`가 "팀"이 아니라 "본인(user_id)" 기준 — 기능명세 문구와 실제 범위 불일치.
15. `POST /board/chance/now` 응답 예시가 `chance/catalog`의 실제 7종 카드 목록에 없음(오래된 예시).
16. ERD `idempotency_scope` enum에 `CHANCE_CONFIRM` 누락.
17. `GET /board/opened_challenges`가 "열린문제 API 제외" 범위에 포함되는지 미확정(Appendix C 참고).

### 🟢 경미(문서/표기 문제, 실 스펙엔 영향 없음)

18. `login`/`logout` 400 유효성 오류 케이스 미문서화.
19. `board/me` 문서의 상호참조 링크 오류(`/board/challenges` → 실제는 `/board/opened_challenges`).
20. 보드 페이지 그룹 내 문서 포맷 불일치(자유서술 vs 표 형식).
21. KOTH 참고 문서의 하이픈 표기(`team-token`) vs 실제 DB 등록값 언더스코어(`team_token`) — 실 스펙은 언더스코어가 맞음.
22. Notion 원문 URL의 이스케이프 문자 잔존(`\{challenge_id\}`) — 표시상 문제일 뿐.

---

## Appendix C. 제외 범위 — 열린 문제 목록 페이지

- 담당(기능명세 명시): 규민 · API 그룹: "열린 문제 목록" 페이지(문제 상세와 별도 DB)
- **상태: 문서화 보류(스킵)**. 사용자 확인: 백엔드 측 작성 내용이 아직 부실하고 미완성 항목이 많아, 현재 시점 문서화를 진행하지 않기로 결정(2026-08-16).
- 참고: 02번 문서(보드 페이지)의 `GET /board/opened_challenges`는 이 그룹이 아니라 "보드 페이지" API 그룹 소속으로 확인되어 2절에 이미 포함되어 있습니다. 이 API가 사용자의 원 "열린문제 API 제외" 지침 대상인지는 Appendix B #17에 미해결로 남아 있습니다.
- 백엔드 명세가 보강되는 대로 `12_열린문제목록페이지.md`로 별도 정리하고 이 문서에 10번 절로 추가할 예정입니다.

---

## 참고 — React 구현 시

Base URL 전역변수, Bearer 인터셉터, KST 변환, 라우트 헬퍼, 브랜치 전략은 `10_브랜치전략_개발가이드.md`를 참고하세요. 이 문서(11번)는 "무엇을 호출하는지", 10번 문서는 "어떻게 조직해서 만드는지"를 다룹니다.

## 참고 — Swagger/Postman

이 문서의 모든 엔드포인트(9개 페이지, 52개 요청)를 Postman Collection(`MSG_CTF.postman_collection.json`)과 Environment(`MSG_CTF.postman_environment.json`)로 만들어뒀습니다. Postman에 두 파일을 Import한 뒤 `access_token`/`admin_access_token`/`refresh_token`/`team_name` 환경변수만 채우면 바로 테스트할 수 있습니다. 필드명은 전부 Appendix A 최종본 반영, 미확정/보류 상태인 엔드포인트(`GET /ranking/me`, `GET /ranking/member` 등)는 요청 이름에 ⚠️ 표시와 설명을 달아뒀습니다.
