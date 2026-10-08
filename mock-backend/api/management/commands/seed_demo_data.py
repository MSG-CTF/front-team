from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from api.models import (
    BoardCell,
    ChanceCardCatalog,
    Challenge,
    ContestTimer,
    KothClub,
    MileageHistory,
    Solve,
    Team,
    User,
)

# 칸 타입 5종(QUARANTINE 삭제, 백엔드 #81~#85). 룰렛칸 2개 명세에 맞춰 옛 무인도 자리(16)를 룰렛으로 둔다.
SPECIAL_CELLS = {1: "START", 7: "CHANCE", 16: "ROULETTE", 21: "AIRPORT", 25: "ROULETTE", 30: "CHANCE"}
CATEGORIES = ["WEB", "PWN", "REV", "CRYPTO", "FORENSIC", "MISC"]
DIFFICULTIES = ["EASY", "MEDIUM", "HARD"]

CHANCE_CARDS = [
    ("card_reroll", "다시 굴리기", "주사위를 한 번 더 굴린다", "REROLL", "찬스칸 도착 시"),
    ("card_move_forward", "전진", "3칸 전진한다", "MOVE_FORWARD_3", "찬스칸 도착 시"),
    ("card_move_backward", "후퇴", "3칸 후퇴한다", "MOVE_BACKWARD_3", "찬스칸 도착 시"),
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
        self._seed_solves(teams, challenges)
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

    def _seed_solves(self, teams, challenges):
        # 마이페이지 풀이 기록·마일리지 내역·개인 순위(GET /ranking/member)가 빈 화면이 아니도록 예시 기록을 둔다.
        # 개인 점수는 문제 현재 배점 합이라 Alpha 제오파디 300점(200 + 100)과 맞춘다. 이미 있으면 다시 만들지 않는다.
        alpha = teams["alpha"]
        if alpha.solves.exists():
            return
        leader = User.objects.get(login_id="leader1")
        member = User.objects.get(login_id="member1")
        now = timezone.now()
        for minutes_ago, user, challenge, mileage in [
            (95, member, challenges[2], 100),
            (40, leader, challenges[0], 200),
        ]:
            solve = Solve.objects.create(
                team=alpha,
                user=user,
                challenge=challenge,
                source_type="JEOPARDY",
                challenge_title=challenge.title,
                earned_score=challenge.score,
                earned_mileage=mileage,
            )
            Solve.objects.filter(pk=solve.pk).update(solved_at=now - timezone.timedelta(minutes=minutes_ago))
            history = MileageHistory.objects.create(
                team=alpha, type="CHALLENGE_SOLVE", amount=mileage, reason=f"{challenge.title} 해결"
            )
            MileageHistory.objects.filter(pk=history.pk).update(created_at=now - timezone.timedelta(minutes=minutes_ago))
        purchase = MileageHistory.objects.create(team=alpha, type="PURCHASE", amount=-150, item_name="부스 간식 교환")
        MileageHistory.objects.filter(pk=purchase.pk).update(created_at=now - timezone.timedelta(minutes=10))
        bonus = MileageHistory.objects.create(team=alpha, type="START_BONUS", amount=350, reason="출발칸 통과 보너스")
        MileageHistory.objects.filter(pk=bonus.pk).update(created_at=now - timezone.timedelta(minutes=130))

    def _seed_koth(self, teams):
        # open_group을 안 주면 모델 default=1이라 6개 클럽이 전부 1번으로
        # 겹쳐서(프론트 kothVisualConfig.js는 openGroup 1~6를 6개 슬롯에
        # 1:1로 매핑) 화면에 1개만 보이는 문제가 있었다. enumerate로 1~6 배정.
        for index, (club_id, name, title, category) in enumerate(KOTH_CLUBS, start=1):
            KothClub.objects.update_or_create(
                club_id=club_id,
                defaults={
                    "name": name,
                    "title": title,
                    "category": category,
                    "status": "ACTIVE",
                    "open_group": index,
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
