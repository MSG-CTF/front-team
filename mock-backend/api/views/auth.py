from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from ..exceptions import ApiError
from ..models import User
from ..response import success


def issue_tokens(user):
    refresh = RefreshToken.for_user(user)
    refresh["team_id"] = str(user.team_id) if user.team_id else None
    refresh["role"] = user.role
    refresh["is_leader"] = user.is_leader
    return str(refresh.access_token), str(refresh)


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        login_id = request.data.get("login_id")
        password = request.data.get("password")
        if not login_id or not password:
            raise ApiError("INVALID_REQUEST", "요청 값이 올바르지 않습니다", status=400)

        user = User.objects.filter(login_id=login_id).select_related("team").first()
        if user is None or not user.check_password(password):
            raise ApiError(
                "INVALID_CREDENTIALS", "아이디 또는 비밀번호가 올바르지 않습니다", status=401
            )

        access, refresh = issue_tokens(user)
        return success(
            {
                "access_token": access,
                "refresh_token": refresh,
                "role": user.role,
                "is_leader": user.is_leader,
                "nickname": user.nickname,
                "team_id": str(user.team_id) if user.team_id else None,
                "team_name": user.team.team_name if user.team else None,
                "user_id": str(user.id),
            }
        )


class RefreshView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        raw = request.data.get("refresh_token")
        if not raw:
            raise ApiError("INVALID_REQUEST", "요청 값이 올바르지 않습니다", status=400)

        try:
            refresh = RefreshToken(raw)
        except TokenError as exc:
            if "expired" in str(exc).lower():
                raise ApiError("REFRESH_TOKEN_EXPIRED", "세션이 만료되었습니다", status=401)
            raise ApiError("REFRESH_TOKEN_INVALID", "유효하지 않은 인증 정보입니다", status=401)

        user_id = refresh.get("sub")
        if not User.objects.filter(id=user_id).exists():
            raise ApiError("REFRESH_TOKEN_NOT_FOUND", "토큰을 찾을 수 없습니다", status=401)

        # refresh_token은 재발급하지 않고 기존 것을 그대로 재사용한다(README 1절)
        return success({"access_token": str(refresh.access_token)})


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        raw = request.data.get("refresh_token")
        if raw:
            try:
                RefreshToken(raw).blacklist()
            except Exception:
                # 목서버 특성상 이미 만료/무효한 토큰으로 로그아웃을 시도해도
                # 500을 내지 않고 조용히 넘어간다.
                pass
        return success(None)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        return success(
            {
                "user_id": str(user.id),
                "nickname": user.nickname,
                "is_leader": user.is_leader,
                "team_id": str(user.team_id) if user.team_id else None,
                "team_name": user.team.team_name if user.team else None,
                "role": user.role,
            }
        )
