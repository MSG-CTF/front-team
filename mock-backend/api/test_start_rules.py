from unittest.mock import patch

from django.test import TestCase
from rest_framework.test import APIRequestFactory, force_authenticate

from .models import Team, User
from .views.board import AirportMoveView, DiceRollView


class StartRulesTests(TestCase):
    def setUp(self):
        self.team = Team.objects.create(team_name="start-rules", position=35, dice_rolls_left=2)
        self.user = User.objects.create(login_id="start-rules", nickname="leader", team=self.team)

    def post(self, view, data=None):
        request = APIRequestFactory().post("/board", data or {}, format="json", HTTP_IDEMPOTENCY_KEY="test")
        force_authenticate(request, user=self.user, token={"is_leader": True})
        response = view.as_view()(request)
        self.team.refresh_from_db()
        return response

    @patch("api.views.board.random.randint", return_value=1)
    def test_first_landing_then_skip_start_with_mileage_only(self, _random):
        first = self.post(DiceRollView)
        self.assertEqual(first.data["data"]["start_reward"], {"mileage_gained": 100, "roll_gained": 1})
        self.assertIn(1, self.team.consumed_cell_indexes)
        self.team.position = 35
        self.team.save()
        second = self.post(DiceRollView)
        self.assertEqual(second.data["data"]["movement_path"], [36, 1, 2])
        self.assertEqual(second.data["data"]["skipped_cells"], [1])
        self.assertEqual(second.data["data"]["start_reward"], {"mileage_gained": 100, "roll_gained": 0})
        self.assertEqual((self.team.mileage, self.team.dice_rolls_left), (200, 1))

    @patch("api.views.board.random.randint", return_value=1)
    def test_completion_does_not_require_start_landing(self, _random):
        self.team.position = 36
        self.team.consumed_cell_indexes = list(range(3, 37))
        self.team.save()
        response = self.post(DiceRollView)
        self.assertEqual(response.data["data"]["start_reward"], {"mileage_gained": 100, "roll_gained": 0})
        self.assertTrue(self.team.board_completed)
        self.assertIsNone(self.team.next_dice_reset_at)
        self.assertNotIn(1, self.team.consumed_cell_indexes)
        self.assertEqual(self.post(DiceRollView).data["code"], "BOARD_COMPLETED")

    def test_airport_rejects_consumed_start(self):
        self.team.position = 21
        self.team.consumed_cell_indexes = [1]
        self.team.save()
        response = self.post(AirportMoveView, {"destination_index": 1})
        self.assertEqual(response.data["code"], "INVALID_DESTINATION_INDEX")
        self.assertEqual(self.team.position, 21)
        self.assertFalse(self.team.airport_move_used)

    def test_airport_lower_index_does_not_cross_start(self):
        self.team.position = 21
        self.team.save()
        response = self.post(AirportMoveView, {"destination_index": 2})
        self.assertEqual(response.data["data"]["start_reward"], {"mileage_gained": 0, "roll_gained": 0})
        self.assertFalse(response.data["data"]["passed_start"])

    def test_airport_start_reward_respects_dice_cap(self):
        self.team.position = 21
        self.team.dice_rolls_left = 3
        self.team.save()
        response = self.post(AirportMoveView, {"destination_index": 1})
        self.assertEqual(response.data["data"]["start_reward"], {"mileage_gained": 100, "roll_gained": 0})
        self.assertIn(1, self.team.consumed_cell_indexes)
