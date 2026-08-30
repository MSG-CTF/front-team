from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from api.models import (
    BoardCell,
    ChanceCardCatalog,
    Challenge,
    ContestTimer,
    KothClub,
    Team,
    User,
)

SPECIAL_CELLS = {1: "START", 7: "CHANCE", 16: "QUARANTINE", 21: "AIRPORT", 25: "ROULETTE", 30: "CHANCE"}
CATEGORIES = ["WEB", "PWN", "REV", "CRYPTO", "FORENSIC", "MISC"]
DIFFICULTIES = ["EASY", "MEDIUM", "HARD"]

CHANCE_CARDS = [
    ("card_reroll", "다시 굴리기", "주사위를 한 번 더 굴린다", "REROLL", "찬스칸 도착 시"),
    ("card_move_forward", "전진", "3칸 전진한다", "MOVE_FORWARD_3", "찬스칸 도착 시"),
    ("card_move_backward", "후퇴", "3칸 후퇴한다", "MOVE_BACKWARD_3", "찬스칸 도착 시"),
    ("card_skip_quarantine", "무인도 면제권", "무인도 도착을 1회 무시한다", "SKIP_QUARANTINE", "무인도 도착 시"),
    ("card_extra_roll", "추가 주사위", "주사위 굴릴 기회를 1회 더 얻는다", "EXTRA_ROLL", "언제든"),
    ("card_mileage_bonus", "마일리지 보너스", "마일리지를 추가로 얻는다", "MILEAGE_BONUS", "즉시"),
    ("card_roll_twice_choose", "두 번 굴려 선택", "두 번 굴려 유리한 결과를 선택한다", "ROLL_TWICE_CHOOSE", "찬스칸 도착 시"),
]

KOTH_CLUBS = [
    ("club_crown_summit", "왕관봉", "Crown Summit", "PWN"),
    ("club_lantern_camp", "등불야영지", "Lantern Camp", "WEB"),
    ("club_maple_pass", "단풍고개", "Maple Pass", "REV"),
    ("club_pine_ridge", "소나무능선", "Pine Ridge", "CRYPTO"),
    ("club_river_crossing", "강나루", "River Crossing", "FORENSIC"),
    ("club_stone_ascent", "돌길", "Stone Ascent", "MISC"),
]


class Command(BaseCommand):
    help = "로컬 통합테스트용 목데이터(보드/문제/팀/계정/KOTH/대회 타이머)를 생성한다."

    @transaction.atomic
    def handle(self, *args, **options):
        self._seed_board_cells()
        self._seed_chance_catalog()
        challenges = self._seed_challenges()
        teams = self._seed_teams_and_users()
        self._seed_koth(teams)
        self._seed_timer()

        self.stdout.write(self.style.SUCCESS("목데이터 생성 완료."))
        self.stdout.write("데모 계정 (login_id / password):")
        self.stdout.write("  admin1 / admin1234   (role=ADMIN)")
        self.stdout.write("  leader1 / password1  (Alpha팀 팀장)")
        self.stdout.write("  member1 / password1  (Alpha팀 팀원)")
        self.stdout.write("  leader2 / password2  (Bravo팀 팀장, is_banned=True)")

    def _seed_board_cells(self):
        for index in range(1, 37):
            cell_type = SPECIAL_CELLS.get(index, "CHALLENGE")
            difficulty = DIFFICULTIES[index % 3] if cell_type == "CHALLENGE" else None
            BoardCell.objects.update_or_create(
                cell_index=index,
                defaults={
                    "type": cell_type,
                    "difficulty": difficulty,
                    "name": cell_type.title(),
                },
            )

    def _seed_chance_catalog(self):
        for card_id, name, description, effect, timing in CHANCE_CARDS:
            ChanceCardCatalog.objects.update_or_create(
                card_id=card_id,
                defaults={"name": name, "description": description, "effect": effect, "usage_timing": timing},
            )

    def _seed_challenges(self):
        challenges = []
        for i in range(1, 31):
            category = CATEGORIES[i % len(CATEGORIES)]
            difficulty = DIFFICULTIES[i % len(DIFFICULTIES)]
            score = {"EASY": 100, "MEDIUM": 200, "HARD": 300}[difficulty]
            challenge, _ = Challenge.objects.update_or_create(
                title=f"{category.title()} Challenge {i:02d}",
                defaults={
                    "category": category,
                    "difficulty": difficulty,
                    "score": score,
                    "description": f"목데이터 문제 #{i}. 정답 플래그: MSGCTF{{<challenge_id 앞 8자>}}",
                },
            )
            challenges.append(challenge)
        return challenges

    def _seed_teams_and_users(self):
        alpha, _ = Team.objects.update_or_create(
            team_name="Alpha", defaults={"mileage": 500, "jeopardy_score": 300}
        )
        bravo, _ = Team.objects.update_or_create(
            team_name="Bravo", defaults={"mileage": 200, "is_banned": True, "ban_reason": "데모용 밴 상태"}
        )

        def upsert_user(login_id, password, nickname, role, is_leader, team):
            user, created = User.objects.get_or_create(login_id=login_id, defaults={"team": team})
            user.nickname = nickname
            user.role = role
            user.is_leader = is_leader
            user.team = team
            user.set_password(password)
            user.save()
            return user

        upsert_user("admin1", "admin1234", "관리자", "ADMIN", False, None)
        upsert_user("leader1", "password1", "알파대장", "PARTICIPANT", True, alpha)
        upsert_user("member1", "password1", "알파팀원", "PARTICIPANT", False, alpha)
        upsert_user("leader2", "password2", "브라보대장", "PARTICIPANT", True, bravo)

        return {"alpha": alpha, "bravo": bravo}

    def _seed_koth(self, teams):
        for club_id, name, title, category in KOTH_CLUBS:
            KothClub.objects.update_or_create(
                club_id=club_id,
                defaults={
                    "name": name,
                    "title": title,
                    "category": category,
                    "status": "ACTIVE",
                    "current_owner_team": teams["alpha"],
                    "current_score": 50,
                    "opened_at": timezone.now(),
                },
            )

    def _seed_timer(self):
        now = timezone.now()
        ContestTimer.objects.update_or_create(
            name="MSG CTF 2026",
            defaults={"start_time": now - timezone.timedelta(hours=1), "end_time": now + timezone.timedelta(hours=23)},
        )
