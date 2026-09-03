from django.utils import timezone
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView

from ..models import ContestTimer
from ..response import success


class TimerView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        contest = ContestTimer.objects.order_by("-id").first()
        if contest is None:
            # README 0-2절: 활성 대회 없음 -> 200 + data: null (404 아님)
            return success(None)

        now = timezone.now()
        if now < contest.start_time:
            status_value = "BEFORE"
        elif now < contest.end_time:
            status_value = "RUNNING"
        else:
            status_value = "ENDED"

        remaining = max(0, int((contest.end_time - now).total_seconds())) if status_value == "RUNNING" else 0
        until_start = max(0, int((contest.start_time - now).total_seconds())) if status_value == "BEFORE" else 0

        hours, rem = divmod(remaining, 3600)
        minutes, seconds = divmod(rem, 60)

        return success(
            {
                "name": contest.name,
                "status": status_value,
                "start_time": contest.start_time,
                "end_time": contest.end_time,
                "time_until_start": until_start,
                "remaining_seconds": remaining,
                "remaining_display": f"{hours:02d}:{minutes:02d}:{seconds:02d}",
            }
        )
