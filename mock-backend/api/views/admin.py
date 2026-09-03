from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from ..exceptions import ApiError
from ..models import Instance, MileageHistory, PaymentHistory, PaymentToken, Team
from ..permissions import require_admin
from ..response import success

INSTANCE_STATUSES = [
    "REQUESTED", "SCHEDULING", "PROVISIONING", "RUNNING", "RESTARTING",
    "RESETTING", "STOPPING", "STOPPED", "FAILED", "EXPIRED",
    "CLEANUP_PENDING", "CLEANED",
]


def _paginate(request):
    try:
        page = max(1, int(request.query_params.get("page", 1)))
        size = min(100, int(request.query_params.get("size", 20)))
    except ValueError:
        raise ApiError("INVALID_REQUEST", "page/size는 숫자여야 합니다", status=400)
    return page, size


class AdminTeamsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        require_admin(request)
        page, size = _paginate(request)
        qs = Team.objects.order_by("team_name")
        total_count = qs.count()
        teams = qs[(page - 1) * size : (page - 1) * size + size]
        return success(
            {
                "teams": [
                    {
                        "team_id": str(t.id),
                        "team_name": t.team_name,
                        "team_score": t.team_score,
                        "mileage": t.mileage,
                        "position": t.position,
                        "is_banned": t.is_banned,
                        "members": [
                            {
                                "user_id": str(m.id),
                                "login_id": m.login_id,
                                "nickname": m.nickname,
                                "role": m.role,
                                "is_leader": m.is_leader,
                            }
                            for m in t.members.all()
                        ],
                        "member_count": t.members.count(),
                    }
                    for t in teams
                ],
                "total_count": total_count,
                "page": page,
                "size": size,
            }
        )


class AdminInstancesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        require_admin(request)
        page, size = _paginate(request)
        qs = Instance.objects.select_related("team", "challenge").order_by("-created_at")
        total_count = qs.count()
        instances = qs[(page - 1) * size : (page - 1) * size + size]

        by_status = {s: Instance.objects.filter(status=s).count() for s in INSTANCE_STATUSES}
        by_team = {}
        for t in Team.objects.all():
            count = Instance.objects.filter(team=t).count()
            if count:
                by_team[str(t.id)] = count
        by_challenge = {}
        for i in Instance.objects.values_list("challenge_id", flat=True).distinct():
            by_challenge[str(i)] = Instance.objects.filter(challenge_id=i).count()

        return success(
            {
                "instances": [
                    {
                        "instance_id": str(i.id),
                        "team_id": str(i.team_id),
                        "team_name": i.team.team_name,
                        "challenge_id": str(i.challenge_id),
                        "challenge_title": i.challenge.title,
                        "status": i.status,
                        "created_at": i.created_at,
                        "expires_at": i.expires_at,
                    }
                    for i in instances
                ],
                "summary": {"by_status": by_status, "by_team": by_team, "by_challenge": by_challenge},
                "total_count": total_count,
                "page": page,
                "size": size,
            }
        )


class AdminInstanceResetView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, instance_id):
        require_admin(request)
        try:
            instance = Instance.objects.select_related("team").get(id=instance_id)
        except Instance.DoesNotExist:
            raise ApiError("INSTANCE_NOT_FOUND", "인스턴스를 찾을 수 없습니다", status=404)
        if instance.status in ("STOPPED", "CLEANED", "STOPPING"):
            raise ApiError("INSTANCE_NOT_RESTARTABLE", "재시작할 수 없는 상태입니다", status=409)

        instance.status = "RESETTING"
        instance.save()
        return success(
            {
                "instance_id": str(instance.id),
                "team_id": str(instance.team_id),
                "team_name": instance.team.team_name,
                "challenge_id": str(instance.challenge_id),
                "status": instance.status,
                "host": instance.host,
                "ports": instance.ports,
                "expires_at": instance.expires_at,
                "forced_by": request.user.nickname,
                "forced_at": timezone.now(),
            },
            status=202,
        )


class AdminInstanceDeleteView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, instance_id):
        require_admin(request)
        try:
            instance = Instance.objects.select_related("team").get(id=instance_id)
        except Instance.DoesNotExist:
            raise ApiError("INSTANCE_NOT_FOUND", "인스턴스를 찾을 수 없습니다", status=404)
        if instance.status in ("STOPPED", "CLEANED"):
            raise ApiError("INSTANCE_ALREADY_TERMINATED", "이미 종료된 인스턴스입니다", status=409)

        instance.status = "STOPPING"
        instance.save()
        return success(
            {
                "instance_id": str(instance.id),
                "team_id": str(instance.team_id),
                "team_name": instance.team.team_name,
                "status": instance.status,
                "forced_by": request.user.nickname,
                "forced_at": timezone.now(),
            },
            status=202,
        )


class AdminResourcesView(APIView):
    """실제 리소스 관리자가 없는 로컬 목서버라, 그럴듯한 고정 형태만 흉내낸다."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        require_admin(request)
        running = Instance.objects.filter(status="RUNNING").count()
        return success(
            {
                "accounts": [
                    {
                        "account_id": "mock-account-1",
                        "account_name": "local-mock",
                        "status": "ACTIVE",
                        "running_instances": running,
                        "instance_quota": 100,
                        "nodes": [
                            {
                                "node_id": "mock-node-1",
                                "node_name": "local-node-1",
                                "status": "ACTIVE",
                                "running_instances": running,
                                "cpu_usage_percent": 12.5,
                                "memory_usage_percent": 30.0,
                            }
                        ],
                    }
                ],
                "total_count": 1,
                "collected_at": timezone.now(),
            }
        )


class AdminEventsView(APIView):
    """실제 이벤트 로그가 없는 목서버 — 빈 목록으로 응답 형태만 맞춘다."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        require_admin(request)
        page, size = _paginate(request)
        return success({"events": [], "total_count": 0, "page": page, "size": size})


class AdminTeamMileageView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, team_id):
        require_admin(request)
        try:
            team = Team.objects.get(id=team_id)
        except Team.DoesNotExist:
            raise ApiError("TEAM_NOT_FOUND", "팀을 찾을 수 없습니다", status=404)

        amount = request.data.get("amount")
        reason = request.data.get("reason", "")
        if not isinstance(amount, int) or amount == 0:
            raise ApiError("INVALID_AMOUNT", "amount는 0이 아닌 정수여야 합니다", status=400)
        if amount < 0 and team.mileage + amount < 0:
            raise ApiError("INSUFFICIENT_MILEAGE", "마일리지가 부족합니다", status=400)

        previous = team.mileage
        team.mileage += amount
        team.save()

        MileageHistory.objects.create(
            team=team,
            type="ADMIN_GRANT" if amount > 0 else "ADMIN_DEDUCT",
            amount=amount,
            reason=reason,
        )

        return success(
            {
                "team_id": str(team.id),
                "previous_mileage": previous,
                "amount": amount,
                "current_mileage": team.mileage,
                "reason": reason,
                "adjusted_at": timezone.now(),
                "adjusted_by": request.user.nickname,
            }
        )


class AdminTeamBanView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, team_id):
        require_admin(request)
        team = self._get_team(team_id)
        if team.is_banned:
            raise ApiError("ALREADY_BANNED", "이미 밴된 팀입니다", status=409)

        team.is_banned = True
        team.ban_reason = request.data.get("ban_reason", "")
        team.save()
        return success(
            {
                "team_id": str(team.id),
                "is_banned": True,
                "ban_reason": team.ban_reason,
                "banned_at": timezone.now(),
                "banned_by": request.user.nickname,
            }
        )

    def delete(self, request, team_id):
        require_admin(request)
        team = self._get_team(team_id)
        if not team.is_banned:
            raise ApiError("NOT_BANNED", "밴 상태가 아닙니다", status=409)

        team.is_banned = False
        team.ban_reason = None
        team.save()
        return success(
            {
                "team_id": str(team.id),
                "is_banned": False,
                "unbanned_at": timezone.now(),
                "unbanned_by": request.user.nickname,
            }
        )

    @staticmethod
    def _get_team(team_id):
        try:
            return Team.objects.get(id=team_id)
        except Team.DoesNotExist:
            raise ApiError("TEAM_NOT_FOUND", "팀을 찾을 수 없습니다", status=404)


class AdminPaymentHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        require_admin(request)
        page, size = _paginate(request)
        qs = PaymentHistory.objects.select_related("team").order_by("-processed_at")
        team_id = request.query_params.get("team_id")
        if team_id:
            qs = qs.filter(team_id=team_id)
        total_count = qs.count()
        history = qs[(page - 1) * size : (page - 1) * size + size]
        return success(
            {
                "history": [
                    {
                        "history_id": str(h.id),
                        "team_id": str(h.team_id),
                        "team_name": h.team.team_name,
                        "item_name": h.item_name,
                        "amount": h.amount,
                        "is_refunded": h.is_refunded,
                        "processed_at": h.processed_at,
                        "processed_by": h.processed_by,
                    }
                    for h in history
                ],
                "total_count": total_count,
                "page": page,
                "size": size,
            }
        )


class AdminPaymentCheckoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        require_admin(request)
        token_value = request.data.get("payment_token")
        amount = request.data.get("amount")
        item_name = request.data.get("item_name", "")

        if not isinstance(amount, int) or amount <= 0:
            raise ApiError("INVALID_AMOUNT", "amount는 양의 정수여야 합니다", status=400)

        try:
            token = PaymentToken.objects.select_related("team").get(token=token_value)
        except PaymentToken.DoesNotExist:
            raise ApiError("PAYMENT_TOKEN_INVALID", "유효하지 않은 토큰입니다", status=400)

        if token.used or token.expires_at < timezone.now():
            raise ApiError("PAYMENT_TOKEN_EXPIRED", "만료되었거나 이미 사용된 토큰입니다", status=400)

        team = token.team
        if team.mileage < amount:
            raise ApiError("INSUFFICIENT_MILEAGE", "마일리지가 부족합니다", status=400)

        team.mileage -= amount
        team.save()
        token.used = True
        token.save()

        history = PaymentHistory.objects.create(
            team=team, item_name=item_name, amount=amount, processed_by=request.user.nickname
        )
        MileageHistory.objects.create(team=team, type="PURCHASE", amount=-amount, item_name=item_name)

        return success(
            {
                "history_id": str(history.id),
                "team_id": str(team.id),
                "team_name": team.team_name,
                "item_name": item_name,
                "amount": amount,
                "current_mileage": team.mileage,
                "processed_at": history.processed_at,
                "processed_by": history.processed_by,
            }
        )


class AdminPaymentRefundView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, history_id):
        require_admin(request)
        try:
            history = PaymentHistory.objects.select_related("team").get(id=history_id)
        except PaymentHistory.DoesNotExist:
            raise ApiError("PAYMENT_NOT_FOUND", "결제 내역을 찾을 수 없습니다", status=404)
        if history.is_refunded:
            raise ApiError("ALREADY_REFUNDED", "이미 환불된 결제입니다", status=409)

        history.is_refunded = True
        history.save()

        team = history.team
        team.mileage += history.amount
        team.save()

        refund = MileageHistory.objects.create(
            team=team,
            type="REFUND",
            amount=history.amount,
            item_name=history.item_name,
            ref_history_id=history.id,
        )

        return success(
            {
                "history_id": str(refund.id),
                "team_id": str(team.id),
                "team_name": team.team_name,
                "refunded_amount": history.amount,
                "current_mileage": team.mileage,
                "refunded_at": refund.created_at,
                "refunded_by": request.user.nickname,
            }
        )


class AdminChallengeDockerImageView(APIView):
    """multipart 업로드는 흉내만 낸다 — 실제 이미지 저장은 하지 않는다."""

    permission_classes = [IsAuthenticated]

    def post(self, request, challenge_id):
        require_admin(request)
        from ..models import Challenge
        import uuid

        try:
            challenge = Challenge.objects.get(id=challenge_id)
        except Challenge.DoesNotExist:
            raise ApiError("CHALLENGE_NOT_FOUND", "문제를 찾을 수 없습니다", status=404)

        uploaded = request.FILES.get("image")
        if uploaded is None:
            raise ApiError("INVALID_IMAGE_FILE", "image 파일이 필요합니다", status=400)

        return success(
            {
                "challenge_id": str(challenge.id),
                "docker_image_id": str(uuid.uuid4()),
                "github_repository_url": request.data.get("github_repository_url", ""),
                "github_commit_sha": request.data.get("github_commit_sha", ""),
                "image_name": challenge.title.lower().replace(" ", "-"),
                "image_tag": "latest",
                "status": "READY",
                "uploaded_at": timezone.now(),
            },
            status=201,
        )
