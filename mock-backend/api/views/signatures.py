"""부스(동아리) 시그니처 목 API: 목록, 상세, 플래그 제출.

DB 모델 없이 메모리에만 풀이 기록을 두는 간단한 목이다(서버를 다시 띄우면 초기화).
정답은 모든 부스 공통으로 `MSG{signature_demo}`.
"""

from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from ..exceptions import ApiError
from ..permissions import require_team
from ..response import fail, success

CORRECT_FLAG = "MSG{signature_demo}"
CLUBS = [
    ("mjsec", "MJSEC", 300),
    ("swing", "SWING", 250),
    ("ycert", "Y-CERT", 250),
    ("sekurity", "seKUrity", 300),
    ("codecure", "CodeCure", 350),
    ("aegis", "Aegis", 300),
]
DESCRIPTION = (
    "첫 번째 등불 아래에 작은 초대장이 놓여 있습니다.\n"
    "종이에 남겨진 단서를 따라 축제의 숨겨진 이야기를 찾아보세요.\n"
    f"(목 서버 정답: {CORRECT_FLAG})"
)
# (team_id, signature_id) -> solved_at ISO 문자열
_solved = {}


def _row(team_id, club_id, name, score):
    signature_id = f"sig-{club_id}"
    solved_at = _solved.get((team_id, signature_id))
    return {
        "signature_id": signature_id,
        "club_id": club_id,
        "club_name": name,
        "title": f"{name} 시그니처",
        "description": DESCRIPTION,
        "score": score,
        "is_solved": solved_at is not None,
        "solved_at": solved_at,
        "solved_team_count": sum(1 for (_, sid) in _solved if sid == signature_id),
    }


def _find(signature_id):
    for club_id, name, score in CLUBS:
        if signature_id == f"sig-{club_id}":
            return club_id, name, score
    raise ApiError("SIGNATURE_NOT_FOUND", "문제를 찾을 수 없습니다", status=404)


class SignatureListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        team = require_team(request)
        rows = [_row(team.id, *club) for club in CLUBS]
        return success({"signatures": rows, "total_count": len(rows)})


class SignatureDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, signature_id):
        team = require_team(request)
        return success(_row(team.id, *_find(signature_id)))


class SignatureSubmitView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, signature_id):
        team = require_team(request)
        club_id, name, score = _find(signature_id)
        flag = request.data.get("flag", "")
        if not isinstance(flag, str) or not flag or len(flag) > 512:
            raise ApiError("INVALID_REQUEST", "요청 값이 올바르지 않습니다", status=400)
        if (team.id, signature_id) in _solved:
            return fail("ALREADY_SOLVED", "이미 해결한 문제입니다", status=200)
        if flag.strip() != CORRECT_FLAG:
            return fail("INCORRECT_FLAG", "정답이 아닙니다", status=200)
        solved_at = timezone.now().isoformat()
        _solved[(team.id, signature_id)] = solved_at
        team_score = sum(s for cid, _, s in CLUBS if (team.id, f"sig-{cid}") in _solved)
        return success({
            "signature_id": signature_id,
            "club_id": club_id,
            "earned_score": score,
            "team_score": team_score,
            "solved_at": solved_at,
        })
