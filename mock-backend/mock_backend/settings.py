"""
MSG CTF 로컬 통합테스트용 목(mock) 백엔드 설정.

실제 프로덕션 백엔드가 아니다 — README.md의 API 명세(0장 공통 규약 포함)를
프론트가 로컬에서 붙여볼 수 있도록 최소한으로 흉내낸 것. 자세한 배경은
mock-backend/README.md 참고.
"""

import os
from datetime import timedelta
from pathlib import Path

try:
    from dotenv import load_dotenv

    load_dotenv()
except ImportError:
    pass

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ.get(
    "DJANGO_SECRET_KEY", "mock-backend-local-only-do-not-use-in-prod"
)
DEBUG = os.environ.get("DJANGO_DEBUG", "true").lower() == "true"
ALLOWED_HOSTS = [h.strip() for h in os.environ.get("DJANGO_ALLOWED_HOSTS", "*").split(",")]

INSTALLED_APPS = [
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "rest_framework",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "api",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
]

ROOT_URLCONF = "mock_backend.urls"
WSGI_APPLICATION = "mock_backend.wsgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

AUTH_USER_MODEL = "api.User"
AUTH_PASSWORD_VALIDATORS = []  # 로컬 목데이터 계정이라 정책 강제 안 함

# README.md 0-8절: 모든 시간 필드는 ISO-8601 UTC로 응답, KST 변환은 프론트 책임
LANGUAGE_CODE = "ko-kr"
TIME_ZONE = "UTC"
USE_TZ = True

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "api.authentication.MsgCTFJWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.AllowAny",),
    "EXCEPTION_HANDLER": "api.exceptions.msgctf_exception_handler",
    "DEFAULT_PAGINATION_CLASS": None,
}

# README.md 0-4절: access_token 1시간 / refresh_token 12시간, claim sub=user_id
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=1),
    "REFRESH_TOKEN_LIFETIME": timedelta(hours=12),
    "ROTATE_REFRESH_TOKENS": False,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "USER_ID_CLAIM": "sub",
    "USER_ID_FIELD": "id",
}

# 로컬 통합테스트 전용 — 프론트 dev 서버(5173) 등에서 바로 호출할 수 있게 전체 허용.
# 운영 백엔드에서는 이렇게 열어두면 안 됨.
CORS_ALLOW_ALL_ORIGINS = True
