import secrets

from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from ..exceptions import ApiError
from ..models import PaymentToken
from ..permissions import require_not_banned, require_team
from ..response import success


class TeamMeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        team = require_team(request)
        return success(
            {
                "team_id": str(team.id),
                "team_name": team.team_name,
                "team_score": team.team_score,
                "jeopardy_score": team.jeopardy_score,
                "koth_score": team.koth_score,
                "mileage": team.mileage,
                "is_banned": team.is_banned,
                "ban_reason": team.ban_reason,
                "members": [
                    {
                        "user_id": str(m.id),
                        "nickname": m.nickname,
                        "role": m.role,
                        "is_leader": m.is_leader,
                    }
                    for m in team.members.all()
                ],
            }
        )


class TeamSolvesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        team = require_team(request)
        solves = team.solves.order_by("-solved_at")
        return success(
            {
                "solves": [
                    {
                        "source_type": s.source_type,
                        "challenge_id": str(s.challenge_id) if s.challenge_id else None,
                        "challenge_title": s.challenge_title,
                        "earned_score": s.earned_score,
                        "earned_mileage": s.earned_mileage,
                        "is_extra_dice_granted": s.is_extra_dice_granted,
                        "solved_by": (
                            {"user_id": str(s.user_id), "nickname": s.user.nickname} if s.user_id else None
                        ),
                        "solved_at": s.solved_at,
                    }
                    for s in solves
                ],
                "total_count": solves.count(),
            }
        )


class TeamMileageHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        team = require_team(request)
        history = team.mileage_history.order_by("-created_at")
        return success(
            {
                "mileage": team.mileage,
                "history": [
                    {
                        "history_id": str(h.id),
                        "type": h.type,
                        "amount": h.amount,
                        "reason": h.reason,
                        "item_name": h.item_name,
                        "is_refunded": h.is_refunded,
                        "ref_history_id": str(h.ref_history_id) if h.ref_history_id else None,
                        "created_at": h.created_at,
                    }
                    for h in history
                ],
                "total_count": history.count(),
            }
        )


class QrTokenView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        team = require_team(request)
        require_not_banned(team)

        PaymentToken.objects.filter(team=team, used=False).update(used=True)

        token = f"pt_{secrets.token_hex(6)}"
        expires_at = timezone.now() + timezone.timedelta(minutes=5)
        PaymentToken.objects.create(token=token, team=team, expires_at=expires_at)

        return success({"payment_token": token, "expires_at": expires_at})
