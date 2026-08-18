### MVP - 최소 기능 만들어두고 추가 기능 넣어주기

#### 페이지 별 기능 명세서 구성

#### 일단 이렇게 적어두고 추가추가 하는 형식으로 만들기

1. Login page
    - ID, PW POST 메서드로 로그인
    - 팀 토큰 발급
    - 인증, 검증
2. Problem solve page
    - 문제 목록 조회(보드판)
    - 주사위 굴리는 로직
        - 주사위 굴리기 전에 chance 카드 선택
    - 말 이동
    - 보드칸 선택 시 문제 종류 선택
    - 현재 가지고있는 chance카드 목록
    - 무인도칸(아직 미정)
    - 출발칸
    - Airport (1칸)
        - Airport 칸 자유 이동임
    - 찬스칸 2개
    - 클리어칸 처리
3. 문제 상세 페이지
    - 문제 상세 화면
    - 인스턴스 생성 버튼 → 발급
        - 다른 인스턴스 누르면 자동으로 원래 인스턴스 꺼지고 다른 인스턴스 켜지게
    - 인스턴스 종료 버튼
    - 내 팀 인스턴스 상태 표시
    - 인스턴스 재시작 요청(reset)
    - TTL 만료 시간 표시
    - 연장 요청 버튼
    - 플래그 제출
        - 여기서 플래그 검증
4. 열린 문제 목록 페이지
    - 현재 인스턴스 표시
    - 열린 문제 목록
    - 푼 문제 표시
    - 열린문제 클릭시 문제 상세 페이지로 이동
5. 리더보드 페이지
    - 랭킹(team/개인) 페이지 (같이 들어가면 안됨?)
        - 모든 사람의 등수를 볼 수 있음?
    - 스코어 보드 그래프 띄우기
    - TOP3 팀명 띄우기(team/개인)
6. 마이 페이지
    - 현재 점수
    - 현재 마일리지
    - 마일리지 결제 히스토리
    - 팀명
    - 풀이 시간 기록
7. 타이머 페이지
    - 남은 시간 표시
8. ***관리자 페이지*** (살짝 애매함)
    - 팀별 목록
    - 문제 목록
        - 챌린지 별로 인스턴스 관리
            - 꽉차니까 관리해줘야함.
    - 설정
    - 로그
    - 운영 대시보드
    - 팀별 목록 상세 페이지
        - clear 칸 관리
        - 문제 공개상태 관리
        - 팀 상세 정보
        - 전체 인스턴스 목록 화면
        - 팀별/문제별 실행 중 인스턴스 수 표시
        - 인스턴스 상태 필터링
        - 실패 인스턴스 표시
        - 강제 재시작
        - 강제 종료
        - 계정/노드별 리소스 상태 표시
        - 최근 이벤트 로그 표시
        - 마일리지 관리 (넣고뺴기) → 오픈소스
        - 주사위 오류시 고정으로 주사위 지급 (?)
        임의로 넣어주는 기능
        - 칸 위치 이동
        - 벤 때리기?
9. KOTH 페이지
    - 동아리별 KOTH 문제 목록
    - 다음 문제 개방 남은 시간
    - 스코어링 방식이 다름 →누적합산방식
10. 디스코드 봇
    - DJ
    - 퍼블
    - 티켓발급
    - 공지사항
11. 주사위 초기화 시간 알려주고 그 디자인과 위치는 프론트가
    - 시간..?
    - 프론트 시간과 백앤드시간 동기화
    - 브라우저 시간(웹시간) ↔ 백앤드 시간(절대시간)
        - 1초단위 통신 - 좀 어려움
        - 1분마다 통신
        - 통신 방법에 따라서 달라짐…
        → 굳이 많이 통신해야함??
        - 프론트는 초단위로 백엔드는 분단위로 통신

1. 로그인-마이페이지-어드민(준하)
2. 리더보드-랭킹-타이머(가연)
3. 보드-KOTH(지원)
4. 문제상세-열린문제 목록(규민)

→ 각자 그 api명세 적어옵시다(꼼꼼하게 잘~) 401 이런거 자세히/ 200 404 이런거만 적어두면 안됨

관리자만 가능한것들 잘 분리해야함

로그인 기능 베어러 토큰? 프론트에 그거를 전달해주면 작년 msg도 이와 같은 방식임

---

# 공통 규약

**Base URL**: `/api/v1`

**URL 규칙**

- 경로 끝에 슬래시를 **붙이지 않는다** (`/api/v1/board` ⭕ / `/api/v1/board/` ❌)
- Path variable은 **snake_case** (`{team_id}`, `{challenge_id}`)
- 리소스명은 복수형 (`/teams`, `/challenges`, `/instances`)

**응답 봉투** — 성공·실패 무관하게 **항상 3개 키**를 모두 포함한다.

```json
{
  "code": "SUCCESS",
  "message": "성공",
  "data": null
}
```

 **성공 판정 규칙**

> HTTP status가 200이어도 성공이 아닐 수 있다.
> 

> 프론트는 반드시 `code === "SUCCESS"` 로 성공을 판정한다.
> 

> (예: 플래그 오답은 `200 OK` + `code: "INCORRECT_FLAG"`)
> 

**data 형태**

- `data`는 **항상 객체 또는 null**. 배열을 최상위에 두지 않는다.
- 목록은 키로 감싼다: `"data": { "challenges": [...], "total_count": 12 }`

**ID 타입** — 전부 정수(Long)

| 필드 | 타입 | 예시 |
| --- | --- | --- |
| `team_id`, `user_id`, `challenge_id`,  `club_id`, `history_id`, `koth_challenge_id` | `Long` | `1` |
| `card_id` | `String` | `"card_reroll"` (enum 성격) |
| `token` (QR 결제) | `String` | `"pt_9f8a3c2e"` |

**시간 포맷** — 전부 **ISO-8601 UTC**, 끝에 `Z`. (`"2026-11-08T04:00:00Z"`)

표시용 KST 변환은 프론트 책임. `expires_at` 은준다.

**HTTP 상태코드 규칙**

| 상황 | 코드 |
| --- | --- |
| 조회·수정 성공 | `200` |
| 비동기 큐 적재 (인스턴스 생성/재시작/연장/종료) | `202` |
| 요청 값 오류 | `400` |
| 인증 실패 | `401` |
| 권한 없음 | `403` |
| 리소스 없음 | `404` |
| **상태 충돌** (이미 ~함, ~상태가 아님) | `409` |
| 서버 오류 | `500` |
| 조회 결과가 없음 | `200`  • `data: null` (404 아님) |
| 너무 많은 요청 발생 시 | `429` |
|  |  |

**공통 에러 코드**

| HTTP | code | message |
| --- | --- | --- |
| 401 | `TOKEN_MISSING` | 로그인이 필요합니다 |
| 401 | `TOKEN_EXPIRED` | 세션이 만료되었습니다 |
| 401 | `TOKEN_INVALID` | 유효하지 않은 인증 정보입니다 |
| 403 | `FORBIDDEN` | 권한이 필요합니다 |
| 403 | `TEAM_BANNED` | 활동이 정지된 팀입니다 |
| 400 | `INVALID_REQUEST` | 요청 값이 올바르지 않습니다 |
| 404 | `USER_HAS_NO_TEAM` | 소속된 팀이 없습니다 |
| 500 | `INTERNAL_ERROR` | 서버 오류가 발생했습니다 |

> `TOKEN_EXPIRED`를 받으면 프론트는 `/auth/refresh`로 자동 재발급 후 1회 재시도한다.
> 

> `TOKEN_MISSING` / `TOKEN_INVALID` 는 재시도 없이 로그인 화면으로 보낸다.
> 

**Enum 사전**

| 항목 | 값 |
| --- | --- |
| `role` | `PARTICIPANT`, `ADMIN` |
| `difficulty` | `EASY`, `MEDIUM`, `HARD` |
| `category` | `WEB`, `PWN`, `REV`, `CRYPTO`, `FORENSIC`, `MISC`  |
| `instance.status` | `REQUESTED`, `SCHEDULING`, `PROVISIONING`, `RUNNING`, `RESTARTING`, `RESETTING`, `STOPPING`, `STOPPED`, `FAILED`, `EXPIRED`, `CLEANUP_PENDING`, `CLEANED` (scheduler 정의 — 아래 「인스턴스 상태」 표 참조) |
| `mileage.type` | `CHALLENGE_SOLVE`, `START_BONUS`, `ROULETTE`, `KOTH_REWARD`, `ADMIN_GRANT`, `REFUND`, `PURCHASE`, `ADMIN_DEDUCT` (아래 「마일리지 타입」 표 참조) |
| `cell.type` | `START`, `CHALLENGE`, `CHANCE`, `AIRPORT`, `QUARANTINE`, `ROULETTE` |

---

---

---

---

---

(여기서부터는 미정)

**팀장 권한 판정**

- 팀장은 **팀 생성 시 확정**되며 대회 중 변경하지 않는다.
- 팀장 여부는 `access_token`의 `is_leader` claim으로 판정한다. **매 요청 DB 조회를 하지 않는다.**
- 서버는 토큰 **서명 검증에 성공한 뒤에만** claim을 읽는다. 요청 body·header·query로 들어온 `is_leader` 값은 절대 신뢰하지 않는다.
- 프론트가 버튼을 숨기는 것은 편의 기능일 뿐이므로, 서버는 항상 독립적으로 재검증한다.
- 팀장만 호출 가능한 API: `POST /board/dice`, `POST /board/airport/move`, `POST /board/chance/use`, `POST /board/roulette/spin`
- 팀장이 아니면 `403 NOT_TEAM_LEADER`
- 관리자(`role: ADMIN`)는 `is_leader`가 항상 `false` → 위 API 호출 불가

> 운영 중 부득이하게 팀장을 바꿔야 하는 경우(계정 분실 등): DB를 수정한 뒤 해당 팀원의 `refresh_token`을 삭제해 재로그인시켜야 한다. 이미 발급된 `access_token`은 최대 1시간 동안 옛 `is_leader` 값을 그대로 들고 있다.
> 

**밴(BAN) 처리**

- 밴된 팀(`is_banned: true`)은 **모든 쓰기 작업이 차단**된다. 조회(`GET`)는 허용한다.
- 쓰기 = `POST` / `PUT` / `PATCH` / `DELETE`
- 차단 시 `403 TEAM_BANNED`
- **예외 (밴 상태여도 허용)**: `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`
    - 로그인을 막으면 참가자가 "활동이 정지되었습니다" 안내조차 볼 수 없다.
    - 토큰 갱신을 막으면 1시간 뒤 `TOKEN_EXPIRED`가 떠서 밴된 사실이 아니라 장애로 오해한다.
- 관리자 API(`/admin/**`)에는 이 검사를 적용하지 않는다.
- 차단 지점은 **Interceptor 한 곳**으로 일원화한다. API마다 개별 구현하지 않는다.

> **`is_banned`는 토큰 claim에 넣지 않는다.**
> 

> 밴은 대회 중에 발생하고 **즉시 적용돼야 하므로**, 쓰기 요청마다 DB에서 조회한다.
> 

> claim에 넣으면 밴된 팀이 토큰 만료까지 최대 1시간 동안 계속 플레이할 수 있다.
> 

> (`is_leader`와 반대 — 그쪽은 변경되지 않으므로 claim을 쓴다.)
> 

- 팀을 밴할 때 실행 중인 인스턴스 관리자가 수동으로 강제 종료
- 밴된 팀을 리더보드/랭킹에 계속 노출하는걸로

**인스턴스 상태 (scheduler 정의)**

플랫폼은 상태를 새로 만들거나 압축하지 않는다. **scheduler가 정의한 값을 그대로 전달한다.**

| 상태 | 의미 | 접속 가능 | 참가자 화면 문구 |
| --- | --- | --- | --- |
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

- `host`, `port`, `expires_at`, `remaining_seconds`는 **`RUNNING`일 때만 유효**하다. 그 외 상태에서는 `null`을 내린다.
- `GET /teams/me/instance`는 **활성 상태 인스턴스가 있을 때만** 객체를 반환하고, 종료 상태만 남았으면 `data: null`을 반환한다.

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
> 

**마일리지 타입**

마일리지가 오가는 모든 지점을 타입으로 구분한다.

| type | 발생 지점 | 부호 |
| --- | --- | --- |
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
- 이미 쌓인 행은 **수정하거나 삭제하지 않는다.** 되돌려야 하면 반대 방향 행을 새로 쌓는다(예: `PURCHASE -30` → `REFUND +30`). 장부와 같은 원리로, "무슨 일이 있었는지" 기록이 남는다.

**용어**

- 보드판 칸은 **cell** 로 통일 (`total_cells`, `cells`, `CELL_NOT_FOUND`). `tile` 사용 금지.
- 문제 리소스 자체의 제목은 `title`, 다른 리소스에 얹힌 참조는 `challenge_title`.

## response 404: 활성 대회 없음