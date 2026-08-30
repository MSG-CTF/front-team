from rest_framework.permissions import AllowAny
from rest_framework.views import APIView

from ..models import Solve, Team
from ..response import success


class LeaderboardView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        # README 4절: 밴 팀·미풀이 팀 제외, 최대 8팀, 동점은 solved_at 이른 순
        # (🔴 0-6절과 상충하는 미해결 이슈지만, 이 목서버는 API 명세 원문 그대로 구현한다)
        teams = (
            Team.objects.filter(is_banned=False)
            .filter(solves__isnull=False)
            .distinct()
            .order_by("-jeopardy_score", "-koth_score")[:8]
        )

        result = []
        for team in teams:
            solves = team.solves.order_by("solved_at")
            result.append(
                {
                    "team_id": str(team.id),
                    "team_name": team.team_name,
                    "total_score": team.team_score,
                    "solves": [
                        {
                            "challenge_id": str(s.challenge_id) if s.challenge_id else None,
                            "source_type": s.source_type,
                            "solved_at": s.solved_at,
                            "points": s.earned_score,
                        }
                        for s in solves
                    ],
                }
            )

        return success({"teams": result, "total_count": len(result)})
