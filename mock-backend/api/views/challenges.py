import random

from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from ..exceptions import ApiError
from ..models import Challenge, Instance, MileageHistory, Solve, SolveAttempt
from ..permissions import require_team
from ..response import success

WRONG_ATTEMPT_LIMIT = 3
WRONG_ATTEMPT_LOCK_SECONDS = 30


class ChallengeDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, challenge_id):
        team = require_team(request)
        try:
            challenge = Challenge.objects.get(id=challenge_id)
        except Challenge.DoesNotExist:
            raise ApiError("CHALLENGE_NOT_FOUND", "문제를 찾을 수 없습니다", status=404)

        is_solved = Solve.objects.filter(team=team, challenge=challenge).exists()
        instance = (
            Instance.objects.filter(
                user=request.user, challenge=challenge, status__in=["REQUESTED", "SCHEDULING", "PROVISIONING", "RUNNING", "RESTARTING", "RESETTING"]
            )
            .order_by("-created_at")
            .first()
        )
        instance_data = None
        if instance:
            instance_data = {
                "instance_id": str(instance.id),
                "challenge_id": str(challenge.id),
                "host": instance.host,
                "ports": instance.ports,
                "status": instance.status,
                "expires_at": instance.expires_at,
            }

        return success(
            {
                "challenge_id": str(challenge.id),
                "title": challenge.title,
                "category": challenge.category,
                "difficulty": challenge.difficulty,
                "score": challenge.score,
                "description": challenge.description,
                "files": [
                    {
                        "file_id": str(f.id),
                        "file_name": f.file_name,
                        "download_url": f.download_url,
                        "file_size": f.file_size,
                    }
                    for f in challenge.files.all()
                ],
                "solved_team_count": Solve.objects.filter(challenge=challenge).values("team_id").distinct().count(),
                "is_solved": is_solved,
                "instance": instance_data,
            }
        )


class ChallengeSubmitView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, challenge_id):
        team = require_team(request)
        try:
            challenge = Challenge.objects.get(id=challenge_id)
        except Challenge.DoesNotExist:
            raise ApiError("CHALLENGE_NOT_FOUND", "문제를 찾을 수 없습니다", status=404)

        if Solve.objects.filter(team=team, challenge=challenge).exists():
            raise ApiError("ALREADY_SOLVED", "이미 해결한 문제입니다", status=409)

        attempt, _ = SolveAttempt.objects.get_or_create(team=team, challenge=challenge)
        now = timezone.now()
        if attempt.locked_until and attempt.locked_until > now:
            retry_after = int((attempt.locked_until - now).total_seconds())
            from ..response import fail

            return fail(
                "TOO_MANY_ATTEMPTS",
                "연속 오답 횟수를 초과했습니다",
                status=429,
                data={"retry_after_seconds": max(retry_after, 1)},
            )

        flag = request.data.get("flag", "")
        # 목서버의 정답 규칙: "MSGCTF{<challenge_id 앞 8자>}" — 실제 문제와 무관한 데모용 플래그.
        correct_flag = f"MSGCTF{{{str(challenge.id)[:8]}}}"

        if flag != correct_flag:
            attempt.wrong_count += 1
            if attempt.wrong_count >= WRONG_ATTEMPT_LIMIT:
                attempt.locked_until = now + timezone.timedelta(seconds=WRONG_ATTEMPT_LOCK_SECONDS)
                attempt.wrong_count = 0
            attempt.save()
            from ..response import fail

            return fail("INCORRECT_FLAG", "정답이 아닙니다", status=200)

        attempt.wrong_count = 0
        attempt.locked_until = None
        attempt.save()

        earned_score = challenge.score
        earned_mileage = max(10, challenge.score // 10)
        team.jeopardy_score += earned_score
        team.mileage += earned_mileage
        is_extra_dice = random.random() < 0.2
        if is_extra_dice:
            team.dice_rolls_left += 1
        team.active_challenge = None
        team.active_challenge_opened_at = None
        team.save()

        Solve.objects.create(
            team=team,
            user=request.user,
            challenge=challenge,
            source_type="JEOPARDY",
            challenge_title=challenge.title,
            earned_score=earned_score,
            earned_mileage=earned_mileage,
            is_extra_dice_granted=is_extra_dice,
        )
        MileageHistory.objects.create(
            team=team, type="CHALLENGE_SOLVE", amount=earned_mileage, reason=f"{challenge.title} 해결"
        )

        return success(
            {
                "challenge_id": str(challenge.id),
                "earned_score": earned_score,
                "earned_mileage": earned_mileage,
                "is_extra_dice_granted": is_extra_dice,
                "team_score": team.team_score,
                "mileage": team.mileage,
                "solved_at": timezone.now(),
            }
        )


def _instance_ports():
    return [{"port": 9000 + random.randint(0, 999), "label": "web"}]


class InstanceCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        team = require_team(request)
        challenge_id = request.data.get("challenge_id")
        try:
            challenge = Challenge.objects.get(id=challenge_id)
        except Challenge.DoesNotExist:
            raise ApiError("CHALLENGE_NOT_FOUND", "문제를 찾을 수 없습니다", status=404)

        active_qs = Instance.objects.filter(
            user=request.user,
            status__in=["REQUESTED", "SCHEDULING", "PROVISIONING", "RUNNING", "RESTARTING", "RESETTING"],
        )
        replaced_instance_id = None
        existing = active_qs.first()
        if existing:
            existing.status = "STOPPING"
            existing.save()
            replaced_instance_id = str(existing.id)

        instance = Instance.objects.create(
            user=request.user,
            team=team,
            challenge=challenge,
            status="REQUESTED",
            host="chal.msgctf.kr",
            ports=_instance_ports(),
            expires_at=timezone.now() + timezone.timedelta(minutes=60),
        )

        return success(
            {
                "instance_id": str(instance.id),
                "challenge_id": str(challenge.id),
                "host": instance.host,
                "ports": instance.ports,
                "status": instance.status,
                "expires_at": instance.expires_at,
                "replaced_instance_id": replaced_instance_id,
            },
            status=202,
        )


class MyInstanceView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # README Appendix B #16: 이름과 달리 "팀"이 아니라 "본인(user_id)" 기준
        instance = (
            Instance.objects.filter(
                user=request.user,
                status__in=["REQUESTED", "SCHEDULING", "PROVISIONING", "RUNNING", "RESTARTING", "RESETTING"],
            )
            .order_by("-created_at")
            .first()
        )
        if instance is None:
            return success(None)

        return success(
            {
                "instance_id": str(instance.id),
                "challenge_id": str(instance.challenge_id),
                "challenge_title": instance.challenge.title,
                "host": instance.host,
                "ports": instance.ports,
                "status": instance.status,
                "expires_at": instance.expires_at,
            }
        )


def _get_owned_instance(request, instance_id):
    try:
        instance = Instance.objects.get(id=instance_id)
    except Instance.DoesNotExist:
        raise ApiError("INSTANCE_NOT_FOUND", "인스턴스를 찾을 수 없습니다", status=404)
    if instance.user_id != request.user.id:
        raise ApiError("FORBIDDEN", "권한이 필요합니다", status=403)
    return instance


class InstanceResetView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, instance_id):
        instance = _get_owned_instance(request, instance_id)
        if instance.status not in ("RUNNING", "FAILED"):
            raise ApiError("INVALID_STATE_TRANSITION", "지금 상태에서는 재시작할 수 없습니다", status=400)

        instance.status = "RESETTING"
        instance.save()
        return success(
            {
                "instance_id": str(instance.id),
                "challenge_id": str(instance.challenge_id),
                "status": instance.status,
                "host": instance.host,
                "ports": instance.ports,
                "expires_at": instance.expires_at,
            },
            status=202,
        )


class InstanceExtendView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, instance_id):
        instance = _get_owned_instance(request, instance_id)
        extend_minutes = request.data.get("extend_minutes")
        if not isinstance(extend_minutes, int) or extend_minutes <= 0:
            raise ApiError("INVALID_REQUEST", "extend_minutes가 올바르지 않습니다", status=400)
        if extend_minutes > 60:
            raise ApiError("TTL_EXTENSION_LIMIT_EXCEEDED", "연장 가능한 시간을 초과했습니다", status=400)

        instance.expires_at = (instance.expires_at or timezone.now()) + timezone.timedelta(minutes=extend_minutes)
        instance.save()
        # README 0-12절: extend 응답엔 host/ports가 없음 — 그대로 재현
        return success(
            {
                "instance_id": str(instance.id),
                "challenge_id": str(instance.challenge_id),
                "status": instance.status,
                "expires_at": instance.expires_at,
            },
            status=202,
        )


class InstanceDeleteView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, instance_id):
        instance = _get_owned_instance(request, instance_id)
        if instance.status in ("STOPPED", "CLEANED"):
            raise ApiError("INVALID_STATE_TRANSITION", "이미 종료된 인스턴스입니다", status=400)

        instance.status = "STOPPING"
        instance.save()
        # README 0-12절: delete 응답엔 host/ports/expires_at이 없음 — 그대로 재현
        return success(
            {"instance_id": str(instance.id), "challenge_id": str(instance.challenge_id), "status": instance.status},
            status=202,
        )
