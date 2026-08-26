"""README.md 0-2절: 모든 응답은 { code, message, data } 3개 키 고정."""

from rest_framework.response import Response


def success(data=None, message="성공", status=200):
    return Response({"code": "SUCCESS", "message": message, "data": data}, status=status)


def fail(code, message, status=400, data=None):
    return Response({"code": code, "message": message, "data": data}, status=status)
