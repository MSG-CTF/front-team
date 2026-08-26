# MSG CTF 목(mock) 백엔드

**실제 프로덕션 백엔드가 아니다.** 실제 백엔드가 아직 준비되지 않았거나("시작 전"/"논의" 상태인 API가 많음 — 루트 `README.md` 8절 참고) 로컬에서 프론트-백엔드 연동을 빠르게 테스트하고 싶을 때, 루트 `README.md`의 API 명세를 최대한 그대로 흉내내는 Django + DRF + SimpleJWT 서버다.

## 실행 방법

### 로컬(venv)

```bash
cd mock-backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_demo_data
python manage.py runserver 0.0.0.0:8000
```

### Docker

리포 루트에서:

```bash
docker compose up --build
```

프론트(nginx, 3000번 포트) + 목 백엔드(8000번 포트)가 같이 뜬다. 컨테이너 시작 시 `entrypoint.sh`가 `migrate` → `seed_demo_data`를 자동으로 실행한다(재실행해도 데이터가 중복 생성되지 않도록 `update_or_create`/`get_or_create`로 작성됨).

## 데모 계정 (`seed_demo_data`)

| login_id | password | 소속 | 비고 |
|---|---|---|---|
| `admin1` | `admin1234` | — | `role: ADMIN` |
| `leader1` | `password1` | Alpha팀 | 팀장(`is_leader: true`) |
| `member1` | `password1` | Alpha팀 | 팀원 |
| `leader2` | `password2` | Bravo팀 | 팀장, **`is_banned: true`**(밴 처리 테스트용) |

문제 정답 플래그 규칙(이 목서버 한정, 실제 문제와 무관): `MSGCTF{<challenge_id 앞 8자>}`.

## 구현 범위

루트 `README.md`의 1~9절(로그인/보드/문제상세/리더보드/랭킹/마이페이지/타이머/관리자/KOTH) 엔드포인트를 전부 구현했다. 응답 포맷(`{code, message, data}`), 인증(Bearer + `sub`/`team_id`/`role`/`is_leader` claim, 1시간/12시간 만료), 팀장 권한(`403 NOT_TEAM_LEADER`), 밴 처리(쓰기만 차단, `403 TEAM_BANNED`), `Idempotency-Key` 헤더 요구, 공통 에러 코드(0-11절)를 README 규칙대로 따른다.

**의도적으로 단순화한 부분** (전부 로컬 통합테스트 목적엔 지장 없다고 판단한 것들):

- **Chance 카드 효과** — README 자체가 "카드별 Req/Res 형태 다름(전부 초안)"이라고 명시한 API라, 카드별 실제 효과(전진/후퇴/무인도 면제 등)는 구현하지 않고 사용 처리만 한다. `card_roll_twice_choose`(2단계 확정이 명세된 유일한 카드)만 실제로 동작한다.
- **Idempotency-Key 재생(replay)** — 헤더 존재 여부만 강제하고, 같은 키로 같은 응답을 재생하는 것까지는 구현하지 않았다.
- **`GET /ranking/member`** — 루트 README Appendix B #6에 "원문이 완전히 비어 있어 명세 자체가 없다"고 되어 있는 API라, 이 목서버의 구현은 참고용 추측이다. 실제 스펙이 나오면 다시 맞춰야 한다.
- **`GET /admin/resources`, `GET /admin/events`** — 실제 리소스/이벤트 수집기가 없으므로 응답 " 형태"만 맞춘 고정/빈 값이다.
- **TOKEN_EXPIRED vs TOKEN_INVALID 구분**(`api/authentication.py`) — SimpleJWT 예외 메시지에 "expired"가 포함되는지 보는 휴리스틱이라 100% 정확하진 않다.
- **밴 팀·미풀이 팀의 리더보드/랭킹 노출**(README 0-6절 🔴 미해결 이슈) — 이 목서버는 최종 API 명세서 원문("밴 팀 제외")을 따랐다. 실제 정책이 확정되면 `api/views/leaderboard.py`, `api/views/ranking.py`를 맞춰야 한다.

## 알려진 제약

- SQLite + 단일 프로세스 — 동시성/트랜잭션 경쟁 조건은 실제 백엔드와 다를 수 있다.
- CORS를 전체 허용(`CORS_ALLOW_ALL_ORIGINS = True`)해뒀다 — 로컬 통합테스트 전용 설정이며 운영에는 절대 쓰면 안 된다.
- `DJANGO_SECRET_KEY` 기본값이 코드에 하드코딩돼 있다 — 로컬/CI 전용이라는 전제.
