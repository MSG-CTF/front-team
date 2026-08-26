import random

from django.utils import timezone
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.views import APIView

from ..exceptions import ApiError
from ..models import BoardCell, ChanceCardCatalog, Challenge
from ..permissions import (
    require_empty_body,
    require_idempotency_key,
    require_not_banned,
    require_team,
    require_team_leader,
)
from ..response import success

TOTAL_CELLS = 36
SPECIAL_CELLS = {1: "START", 7: "CHANCE", 16: "QUARANTINE", 21: "AIRPORT", 25: "ROULETTE", 30: "CHANCE"}


def cell_type(index):
    return SPECIAL_CELLS.get(index, "CHALLENGE")


class BoardView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        cells = [
            {"cell_index": c.cell_index, "type": c.type, "difficulty": c.difficulty, "name": c.name}
            for c in BoardCell.objects.order_by("cell_index")
        ]
        return success({"total_cell_count": TOTAL_CELLS, "cells": cells})


class BoardMeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        team = require_team(request)
        active_challenge = None
        if team.active_challenge_id:
            # README Appendix B #9: 실제 응답에도 solve_deadline_at/remaining_seconds가
            # 없다고 문서화되어 있음 — 그 결핍을 그대로 재현한다(프론트 방어 렌더링 테스트용).
            active_challenge = {
                "challenge_id": str(team.active_challenge_id),
                "opened_at": team.active_challenge_opened_at,
            }
        return success(
            {
                "position": team.position,
                "type": cell_type(team.position),
                "is_quarantined": team.is_quarantined,
                "dice_rolls_left": team.dice_rolls_left,
                "next_dice_reset_at": team.next_dice_reset_at,
                "quarantine_attempts_left": team.quarantine_attempts_left,
                "airport_move_used": team.airport_move_used,
                "has_passed_start": team.has_passed_start,
                "board_completed": team.board_completed,
                "consumed_cell_indexes": team.consumed_cell_indexes,
                "chance_cards": team.chance_cards,
                "active_challenge": active_challenge,
            }
        )


class DiceStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        team = require_team(request)
        blocked_reason = None
        can_roll = True
        if team.board_completed:
            can_roll, blocked_reason = False, "BOARD_COMPLETED"
        elif team.is_quarantined:
            can_roll, blocked_reason = False, "QUARANTINED"
        elif team.dice_rolls_left <= 0:
            can_roll, blocked_reason = False, "NO_ROLL_LEFT"

        return success(
            {
                "can_roll": can_roll,
                "dice_rolls_left": team.dice_rolls_left,
                "is_quarantined": team.is_quarantined,
                "timer_running": False,
                "blocked_reason": blocked_reason,
                "server_time": timezone.now(),
                "next_dice_reset_at": team.next_dice_reset_at,
                "quarantine_released_at": None,
            }
        )


class DiceRollView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        team = require_team(request)
        require_not_banned(team)
        require_team_leader(request)
        require_idempotency_key(request)
        require_empty_body(request)

        if team.board_completed:
            raise ApiError("BOARD_COMPLETED", "이미 보드를 완주했습니다", status=409)
        if team.is_quarantined:
            raise ApiError("QUARANTINED", "무인도 상태입니다", status=409)
        if team.dice_rolls_left <= 0:
            raise ApiError("NO_ROLL_LEFT", "남은 주사위가 없습니다", status=409)

        dice_a, dice_b = random.randint(1, 6), random.randint(1, 6)
        rolled = dice_a + dice_b
        previous = team.position

        movement_path = []
        pos = previous
        passed_start = False
        for _ in range(rolled):
            pos = pos + 1 if pos < TOTAL_CELLS else 1
            if pos == 1:
                passed_start = True
            movement_path.append(pos)
        current = pos

        team.dice_rolls_left -= 1
        team.position = current

        start_reward = None
        if passed_start:
            team.has_passed_start = True
            mileage_gained, roll_gained = 50, 1
            team.mileage += mileage_gained
            team.dice_rolls_left += roll_gained
            start_reward = {"mileage_gained": mileage_gained, "roll_gained": roll_gained}
        team.save()

        return success(
            {
                "dice_a": dice_a,
                "dice_b": dice_b,
                "rolled_number": rolled,
                "previous_position": previous,
                "current_position": current,
                "movement_path": movement_path,
                "skipped_cells": movement_path[:-1],
                "passed_start": passed_start,
                "start_reward": start_reward,
                "board_event_code": cell_type(current),
            }
        )


class CellCurrentView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        team = require_team(request)
        if cell_type(team.position) != "CHALLENGE":
            raise ApiError("CELL_NOT_FOUND", "문제 칸이 아닙니다", status=404)

        candidates = list(
            Challenge.objects.exclude(
                id__in=team.solves.values_list("challenge_id", flat=True)
            ).order_by("?")[:3]
        )
        return success(
            {
                "cell_index": team.position,
                "type": "CHALLENGE",
                "challenge_candidates": [
                    {
                        "challenge_id": str(c.id),
                        "challenge_title": c.title,  # README 0-15절 명명 규칙 교정 반영
                        "category": c.category,
                        "score": c.score,
                    }
                    for c in candidates
                ],
            }
        )


class CellOpenView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        team = require_team(request)
        require_not_banned(team)
        require_idempotency_key(request)

        challenge_id = request.data.get("challenge_id")
        if not challenge_id:
            raise ApiError("CHALLENGE_ID_REQUIRED", "challenge_id가 필요합니다", status=400)
        if cell_type(team.position) != "CHALLENGE":
            raise ApiError("NOT_CHALLENGE_CELL", "문제 칸이 아닙니다", status=409)

        try:
            challenge = Challenge.objects.get(id=challenge_id)
        except Challenge.DoesNotExist:
            raise ApiError("CHALLENGE_NOT_CANDIDATE", "후보 문제가 아닙니다", status=409)

        now = timezone.now()
        team.active_challenge = challenge
        team.active_challenge_opened_at = now
        if team.position not in team.consumed_cell_indexes:
            team.consumed_cell_indexes = [*team.consumed_cell_indexes, team.position]
        team.save()

        return success(
            {
                "cell_index": team.position,
                "challenge_id": str(challenge.id),
                "opened_at": now,
                "solve_deadline_at": None,
                "remaining_seconds": None,
            }
        )


class AirportMoveView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        team = require_team(request)
        require_not_banned(team)
        require_team_leader(request)
        require_idempotency_key(request)

        destination = request.data.get("destination_index")
        if not isinstance(destination, int) or not (1 <= destination <= TOTAL_CELLS):
            raise ApiError("INVALID_DESTINATION_INDEX", "목적지 칸 번호가 올바르지 않습니다", status=400)
        if cell_type(team.position) != "AIRPORT":
            raise ApiError("NOT_AIRPORT_CELL", "Airport 칸이 아닙니다", status=409)
        if team.airport_move_used:
            raise ApiError("AIRPORT_MOVE_ALREADY_USED", "이미 Airport 이동을 사용했습니다", status=409)

        previous = team.position
        passed_start = destination < previous or destination == 1
        team.position = destination
        team.airport_move_used = True
        start_reward = None
        if passed_start:
            team.has_passed_start = True
            start_reward = {"mileage_gained": 50, "roll_gained": 1}
            team.mileage += 50
            team.dice_rolls_left += 1
        team.save()

        return success(
            {
                "previous_position": previous,
                "current_position": destination,
                "movement_path": [destination],
                "board_event_code": cell_type(destination),
                "passed_start": passed_start,
                "start_reward": start_reward,
            }
        )


class QuarantineEscapeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        team = require_team(request)
        require_not_banned(team)
        require_idempotency_key(request)
        require_empty_body(request)

        if not team.is_quarantined:
            raise ApiError("NOT_QUARANTINED", "무인도 상태가 아닙니다", status=409)

        escaped = random.random() < 0.5
        if escaped:
            team.is_quarantined = False
            team.save()
            return success({"position": team.position})

        team.quarantine_attempts_left = max(0, team.quarantine_attempts_left - 1)
        team.save()
        # README 2절: 실패해도 HTTP 200 + code: "ESCAPE_FAILED" (success()는 항상
        # code: "SUCCESS"를 박아버리므로 여기만 Response를 직접 만든다)
        from rest_framework.response import Response

        return Response(
            {
                "code": "ESCAPE_FAILED",
                "message": "탈출 실패",
                "data": {
                    "position": team.position,
                    "quarantine_attempts_left": team.quarantine_attempts_left,
                },
            },
            status=200,
        )


class ChanceCatalogView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        cards = list(ChanceCardCatalog.objects.all())
        return success(
            {
                "cards": [
                    {
                        "card_id": c.card_id,
                        "name": c.name,
                        "description": c.description,
                        "effect": c.effect,
                        "usage_timing": c.usage_timing,
                    }
                    for c in cards
                ],
                "total_count": len(cards),
            }
        )


class ChanceNowView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        team = require_team(request)
        require_not_banned(team)
        require_team_leader(request)
        require_idempotency_key(request)
        require_empty_body(request)

        if cell_type(team.position) != "CHANCE":
            raise ApiError("NOT_CHANCE_CELL", "찬스 칸이 아닙니다", status=409)

        card = ChanceCardCatalog.objects.order_by("?").first()
        if card is None:
            raise ApiError("INTERNAL_ERROR", "카드 카탈로그가 비어 있습니다", status=500)

        team.chance_cards = [*team.chance_cards, {"card_id": card.card_id, "used": False}]
        team.save()

        return success(
            {
                "card_id": card.card_id,
                "name": card.name,
                "description": card.description,
                "effect": card.effect,
                "used": False,
            }
        )


class ChanceUseView(APIView):
    """README 자체가 "카드별 Req/Res 형태 다름(전부 초안)"이라고 명시한 API라
    이 목서버에서도 카드 종류별 개별 효과는 구현하지 않는다. 카드를 사용 처리하고
    범용적인 응답만 내려준다 — 실제 카드별 동작은 백엔드 스펙이 확정된 뒤에 채운다.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        team = require_team(request)
        require_not_banned(team)
        require_team_leader(request)
        require_idempotency_key(request)

        card_id = request.data.get("card_id")
        if not card_id:
            raise ApiError("CARD_ID_REQUIRED", "card_id가 필요합니다", status=400)

        card_state = next((c for c in team.chance_cards if c["card_id"] == card_id), None)
        if card_state is None:
            raise ApiError("CHANCE_CARD_NOT_FOUND", "보유하지 않은 카드입니다", status=404)
        if card_state["used"]:
            raise ApiError("CHANCE_CARD_ALREADY_USED", "이미 사용한 카드입니다", status=409)

        card_state["used"] = True
        team.save()

        return success({"card_id": card_id, "used": True})


class ChanceConfirmView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        team = require_team(request)
        require_not_banned(team)
        require_team_leader(request)
        require_idempotency_key(request)

        choice = request.data.get("choice")
        if choice not in ("FIRST", "SECOND"):
            raise ApiError("INVALID_REQUEST", "choice는 FIRST 또는 SECOND여야 합니다", status=400)

        card_state = next(
            (c for c in team.chance_cards if c["card_id"] == "card_roll_twice_choose"), None
        )
        if card_state is None:
            raise ApiError("CHANCE_CONFIRM_NOT_FOUND", "확정할 카드가 없습니다", status=404)
        if card_state["used"]:
            raise ApiError("CHANCE_CARD_ALREADY_USED", "이미 사용한 카드입니다", status=409)

        first_roll, second_roll = random.randint(2, 12), random.randint(2, 12)
        chosen_number = first_roll if choice == "FIRST" else second_roll
        from_index = team.position
        to_index = min(TOTAL_CELLS, from_index + chosen_number)
        team.position = to_index
        card_state["used"] = True
        team.save()

        return success(
            {
                "card_id": "card_roll_twice_choose",
                "effect": "ROLL_TWICE_CHOOSE",
                "choice": choice,
                "chosen_number": chosen_number,
                "from_index": from_index,
                "to_index": to_index,
                "used": True,
            }
        )


class RouletteSpinView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        team = require_team(request)
        require_not_banned(team)
        require_team_leader(request)
        require_idempotency_key(request)
        require_empty_body(request)

        if cell_type(team.position) != "ROULETTE":
            raise ApiError("NOT_ROULETTE_CELL", "룰렛 칸이 아닙니다", status=409)

        # README: "수치 미정" — 목서버에서는 임의 구간으로 흉내낸다.
        gained = random.choice([0, 10, 20, 30, 50, 100])
        team.mileage += gained
        team.save()

        return success(
            {
                "roulette_result": {"label": f"+{gained} 마일리지"},
                "mileage_gained": gained,
                "total_mileage": team.mileage,
            }
        )
