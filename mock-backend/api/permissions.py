"""권한/상태 체크 헬퍼. README.md 0-4·0-5·0-6절 규칙을 뷰 안에서 명시적으로 부른다.

DRF permission_classes 대신 함수 호출 방식을 쓰는 이유: 엔드포인트마다
"이 체크는 걸고 저 체크는 스킵" 조합이 달라서(예: 조회는 밴 체크 안 함,
관리자 API는 밴 체크 자체를 안 함) 선언적 permission_classes보다
뷰 본문에서 순서대로 호출하는 쪽이 README 규칙과 1:1로 대응되고 읽기 쉽다.
"""

from .exceptions import ApiError


def require_team(request):
    user = request.user
    if not getattr(user, "team_id", None):
        raise ApiError("USER_HAS_NO_TEAM", "소속된 팀이 없습니다", status=404)
    return user.team


def require_team_leader(request):
    # README 0-5절: is_leader는 토큰 claim으로만 판정, 매 요청 DB 조회 안 함
    if not request.auth or not request.auth.get("is_leader"):
        raise ApiError("NOT_TEAM_LEADER", "팀장만 사용할 수 있습니다", status=403)


def require_not_banned(team):
    # README 0-6절: is_banned는 claim에 넣지 않고 쓰기 요청마다 DB에서 조회
    team.refresh_from_db(fields=["is_banned"])
    if team.is_banned:
        raise ApiError("TEAM_BANNED", "활동이 정지된 팀입니다", status=403)


def require_idempotency_key(request):
    # README 0-7절. 실제 재시도 시 같은 응답을 재생하는 것까지는 이 목서버에서
    # 구현하지 않았다 — 헤더 존재 여부만 강제한다(로컬 통합테스트 목적엔 충분).
    key = request.headers.get("Idempotency-Key")
    if not key:
        raise ApiError("IDEMPOTENCY_KEY_REQUIRED", "Idempotency-Key 헤더가 필요합니다", status=400)
    return key


def require_admin(request):
    if not request.auth or request.auth.get("role") != "ADMIN":
        raise ApiError("FORBIDDEN", "권한이 필요합니다", status=403)


def require_empty_body(request):
    if request.data:
        raise ApiError("REQUEST_BODY_NOT_ALLOWED", "요청 본문이 없어야 합니다", status=400)
