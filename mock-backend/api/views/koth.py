from django.utils import timezone
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.views import APIView

from ..exceptions import ApiError
from ..models import KothClub, KothScore
from ..permissions import require_team
from ..response import success


def _club_dict(club):
    return {
        "club_id": club.club_id,
        "name": club.name,
        "koth_challenge_id": str(club.koth_challenge_id),
        "title": club.title,
        "category": club.category,
        "status": club.status,
        "open_group": club.open_group,
        "current_owner_team_id": str(club.current_owner_team_id) if club.current_owner_team_id else None,
        "current_owner_team_name": club.current_owner_team.team_name if club.current_owner_team else None,
        "current_score": club.current_score,
        "opened_at": club.opened_at,
        "closed_at": club.closed_at,
    }


class KothClubsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        clubs = list(KothClub.objects.order_by("club_id"))
        return success(
            {
                "clubs": [_club_dict(c) for c in clubs],
                "total_count": len(clubs),
                "active_count": sum(1 for c in clubs if c.status == "ACTIVE"),
            }
        )


class KothClubDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, club_id):
        try:
            club = KothClub.objects.get(club_id=club_id)
        except KothClub.DoesNotExist:
            raise ApiError("KOTH_CLUB_NOT_FOUND", "클럽을 찾을 수 없습니다", status=404)
        return success(_club_dict(club))


class KothMeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        team = require_team(request)
        clubs = list(KothClub.objects.order_by("club_id"))
        challenges = []
        for club in clubs:
            score = KothScore.objects.filter(club=club, team=team).first()
            rank = None
            if score:
                all_scores = list(
                    KothScore.objects.filter(club=club).order_by("-earned_score", "solved_at")
                )
                rank = next((i + 1 for i, s in enumerate(all_scores) if s.team_id == team.id), None)
            challenges.append(
                {
                    "koth_challenge_id": str(club.koth_challenge_id),
                    "club_id": club.club_id,
                    "title": club.title,
                    "category": club.category,
                    "status": club.status,
                    "earned_score": score.earned_score if score else 0,
                    "rank": rank,
                    "solved_at": score.solved_at if score else None,
                    "opened_at": club.opened_at,
                    "closed_at": club.closed_at,
                }
            )
        return success(
            {
                "team_id": str(team.id),
                "team_name": team.team_name,
                "total_koth_score": team.koth_score,
                "challenges": challenges,
                "total_count": len(challenges),
                "active_count": sum(1 for c in clubs if c.status == "ACTIVE"),
            }
        )


class KothLeaderboardView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        koth_challenge_id = request.query_params.get("koth_challenge_id")
        if not koth_challenge_id:
            raise ApiError("KOTH_CHALLENGE_ID_REQUIRED", "koth_challenge_id가 필요합니다", status=400)

        try:
            club = KothClub.objects.get(koth_challenge_id=koth_challenge_id)
        except (KothClub.DoesNotExist, ValueError):
            raise ApiError("INVALID_KOTH_CHALLENGE_ID", "koth_challenge_id가 올바르지 않습니다", status=400)

        scores = list(KothScore.objects.filter(club=club).order_by("-earned_score", "solved_at"))
        return success(
            {
                "koth_challenge_id": str(club.koth_challenge_id),
                "title": club.title,
                "status": club.status,
                "leaderboard": [
                    {
                        "rank": i + 1,
                        "team_id": str(s.team_id),
                        "team_name": s.team.team_name,
                        "earned_score": s.earned_score,
                        "solved_at": s.solved_at,
                    }
                    for i, s in enumerate(scores)
                ],
                "total_count": len(scores),
                "updated_at": club.opened_at,
            }
        )


class KothTeamTokenView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        team = require_team(request)
        return success(
            {
                "team_id": str(team.id),
                "team_name": team.team_name,
                # 로그인 JWT와 무관한 별도 값(README 9절) — 목서버에서는 team_id 기반 고정값으로 대체
                "team_token": f"koth_{str(team.id).replace('-', '')[:16]}",
                "issued_at": timezone.now(),
            }
        )
