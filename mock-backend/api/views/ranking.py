from django.utils import timezone
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.views import APIView

from ..exceptions import ApiError
from ..models import Team
from ..permissions import require_team
from ..response import success


class RankingView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        try:
            page = int(request.query_params.get("page", 1))
            size = int(request.query_params.get("size", 20))
        except ValueError:
            raise ApiError("INVALID_REQUEST", "page/size는 숫자여야 합니다", status=400)
        size = min(size, 100)
        page = max(page, 1)

        teams = _ranked_teams()
        total_count = len(teams)
        start = (page - 1) * size
        page_teams = teams[start : start + size]

        rankings = [
            {
                "rank": start + i + 1,
                "team_id": str(t.id),
                "team_name": t.team_name,
                "team_score": t.team_score,
                "last_solved_at": t.solves.order_by("-solved_at").values_list("solved_at", flat=True).first(),
                "mileage": t.mileage,
            }
            for i, t in enumerate(page_teams)
        ]
        return success({"rankings": rankings, "total_count": total_count})


def _ranked_teams():
    return list(Team.objects.filter(is_banned=False).order_by("-jeopardy_score", "-koth_score", "team_name"))


def _last_solved_at(solves):
    return max((s.solved_at for s in solves), default=None)


class RankingMeView(APIView):
    """README 5절(2026-08-27): 비표준 team 헤더 대신 표준 Bearer로 변경.
    -> { rank, team_id, team_name, team_score, mileage, last_solved_at }. 팀 없으면 404, 밴 팀은 200 + null."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        team = require_team(request)
        if team.is_banned:
            return success(None)
        rank = next((i + 1 for i, t in enumerate(_ranked_teams()) if t.id == team.id), None)
        return success(
            {
                "rank": rank,
                "team_id": str(team.id),
                "team_name": team.team_name,
                "team_score": team.team_score,
                "mileage": team.mileage,
                "last_solved_at": _last_solved_at(team.solves.all()),
            }
        )


class RankingMemberView(APIView):
    """README 5절(2026-08-29): 개인 순위 단건(user_id 기준).
    개인 점수 = 본인이 제출해 정답 처리된 제오파디 문제들의 현재 배점 합(earned_score 미사용).
    정렬 user_score DESC -> last_solved_at ASC -> user_id ASC. 밴 팀 제외, 0솔브 포함."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        from ..models import Solve, User

        team = require_team(request)
        if team.is_banned:
            return success(None)

        entries = []
        users = User.objects.filter(team__isnull=False, team__is_banned=False).select_related("team")
        for user in users:
            solves = list(
                Solve.objects.filter(user=user, source_type="JEOPARDY", challenge__isnull=False).select_related("challenge")
            )
            entries.append(
                {
                    "user": user,
                    "user_score": sum(s.challenge.score for s in solves),
                    "solved_count": len(solves),
                    "last_solved_at": _last_solved_at(solves),
                }
            )
        far_future = timezone.now() + timezone.timedelta(days=36500)
        entries.sort(key=lambda e: (-e["user_score"], e["last_solved_at"] or far_future, str(e["user"].id)))
        rank, entry = next((i + 1, e) for i, e in enumerate(entries) if e["user"].id == request.user.id)
        return success(
            {
                "rank": rank,
                "user_id": str(request.user.id),
                "nickname": request.user.nickname,
                "team_id": str(team.id),
                "team_name": team.team_name,
                "user_score": entry["user_score"],
                "solved_count": entry["solved_count"],
                "last_solved_at": entry["last_solved_at"],
            }
        )
