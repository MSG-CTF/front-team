from rest_framework.permissions import AllowAny
from rest_framework.views import APIView

from ..exceptions import ApiError
from ..models import Team
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

        teams = list(Team.objects.filter(is_banned=False).order_by("-jeopardy_score", "-koth_score", "team_name"))
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


class RankingMeView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        # README 5절 🔴: Bearer 대신 `team: {팀 이름}` 커스텀 헤더 인증 — 보안상
        # 미해결로 남아있는 항목이지만, API 명세 원문 그대로 재현해둔다.
        team_name = request.headers.get("team")
        if not team_name:
            raise ApiError("INVALID_REQUEST", "team 헤더가 필요합니다", status=400)

        try:
            team = Team.objects.get(team_name=team_name)
        except Team.DoesNotExist:
            raise ApiError("TEAM_NOT_FOUND", "팀을 찾을 수 없습니다", status=404)

        all_teams = list(Team.objects.filter(is_banned=False).order_by("-jeopardy_score", "-koth_score", "team_name"))
        rank = next((i + 1 for i, t in enumerate(all_teams) if t.id == team.id), None)

        return success(
            {"rank": rank, "team_name": team.team_name, "team_score": team.team_score, "mileage": team.mileage}
        )


class RankingMemberView(APIView):
    """README 5절: 원문 페이지가 완전히 비어 있어 명세 자체가 없는 API(Appendix B #6).
    이 목서버는 참고용으로 rank + nickname 정도만 임의로 채워 응답한다 — 실제 스펙이
    나오면 이 구현은 바뀌어야 한다."""

    permission_classes = [AllowAny]

    def get(self, request):
        from ..models import User

        users = list(User.objects.filter(team__isnull=False).select_related("team"))
        users.sort(key=lambda u: (-(u.team.jeopardy_score if u.team else 0),))
        members = [
            {"rank": i + 1, "user_id": str(u.id), "nickname": u.nickname, "team_name": u.team.team_name}
            for i, u in enumerate(users)
        ]
        return success({"members": members, "total_count": len(members)})
