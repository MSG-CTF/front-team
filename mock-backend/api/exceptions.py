from rest_framework import exceptions as drf_exceptions


class ApiError(Exception):
    """code/message/status를 명시해 던지는 API 에러. README.md 0-11절 공통 에러 +
    각 절의 API별 추가 에러 코드를 그대로 던질 때 쓴다."""

    def __init__(self, code, message, status=400, data=None):
        self.code = code
        self.message = message
        self.status = status
        self.data = data
        super().__init__(f"{code}: {message}")


def msgctf_exception_handler(exc, context):
    # rest_framework.views를 모듈 최상단에서 import하면 DRF 초기화 중 순환 import가
    # 발생한다(우리 authentication.py -> exceptions.py -> rest_framework.views가
    # rest_framework 자기 초기화 도중 다시 불려서 걸림) — 그래서 함수 안에서 지연 import.
    from rest_framework.views import exception_handler as drf_exception_handler

    from .response import fail

    if isinstance(exc, ApiError):
        return fail(exc.code, exc.message, status=exc.status, data=exc.data)

    response = drf_exception_handler(exc, context)

    if isinstance(exc, drf_exceptions.NotAuthenticated):
        return fail("TOKEN_MISSING", "로그인이 필요합니다", status=401)
    if isinstance(exc, drf_exceptions.AuthenticationFailed):
        return fail("TOKEN_INVALID", "유효하지 않은 인증 정보입니다", status=401)
    if isinstance(exc, drf_exceptions.PermissionDenied):
        return fail("FORBIDDEN", "권한이 필요합니다", status=403)
    if isinstance(exc, drf_exceptions.NotFound):
        return fail("NOT_FOUND", "리소스를 찾을 수 없습니다", status=404)
    if isinstance(exc, drf_exceptions.ValidationError):
        return fail("INVALID_REQUEST", "요청 값이 올바르지 않습니다", status=400, data=exc.detail)

    if response is not None:
        return fail("INTERNAL_ERROR", "서버 오류가 발생했습니다", status=response.status_code)

    # 여기까지 왔으면 DRF가 처리하지 못한 예외 -> README 0-11절 공통 500
    return fail("INTERNAL_ERROR", "서버 오류가 발생했습니다", status=500)
