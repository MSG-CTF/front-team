from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import TokenError

from .exceptions import ApiError


class MsgCTFJWTAuthentication(JWTAuthentication):
    """README.md 0-4절: 인증 실패는 TOKEN_MISSING / TOKEN_EXPIRED / TOKEN_INVALID
    3종으로 구분해서 내려준다.

    TOKEN_MISSING(헤더 자체가 없음)은 DRF의 NotAuthenticated로 자연히 떨어지므로
    api/exceptions.py에서 처리한다. 여기서는 헤더는 있는데 토큰 자체가
    잘못됐거나(TOKEN_INVALID) 만료됐는지(TOKEN_EXPIRED)만 구분한다.

    ⚠️ 만료/위조를 구분하는 기준은 simplejwt 예외 메시지에 "expired"가 포함되는지
    보는 단순 휴리스틱이다. 완전히 정확하지는 않을 수 있음 — 로컬 통합테스트용
    목 서버라 이 정도로 충분하다고 판단했다.
    """

    def get_validated_token(self, raw_token):
        try:
            return super().get_validated_token(raw_token)
        except TokenError as exc:
            if "expired" in str(exc).lower():
                raise ApiError("TOKEN_EXPIRED", "세션이 만료되었습니다", status=401)
            raise ApiError("TOKEN_INVALID", "유효하지 않은 인증 정보입니다", status=401)
