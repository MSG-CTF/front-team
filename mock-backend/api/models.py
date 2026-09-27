import uuid

from django.contrib.auth.hashers import make_password
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager
from django.db import models

ROLE_CHOICES = [("PARTICIPANT", "PARTICIPANT"), ("ADMIN", "ADMIN")]
CATEGORY_CHOICES = [(c, c) for c in ["WEB", "PWN", "REV", "CRYPTO", "FORENSIC", "MISC"]]
DIFFICULTY_CHOICES = [(d, d) for d in ["EASY", "MEDIUM", "HARD"]]
INSTANCE_STATUS_CHOICES = [
    (s, s)
    for s in [
        "REQUESTED", "SCHEDULING", "PROVISIONING", "RUNNING", "RESTARTING",
        "RESETTING", "STOPPING", "STOPPED", "FAILED", "EXPIRED",
        "CLEANUP_PENDING", "CLEANED",
    ]
]
MILEAGE_TYPE_CHOICES = [
    (t, t)
    for t in [
        "CHALLENGE_SOLVE", "START_BONUS", "ROULETTE", "KOTH_REWARD",
        "ADMIN_GRANT", "REFUND", "PURCHASE", "ADMIN_DEDUCT",
    ]
]


class Team(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    team_name = models.CharField(max_length=100, unique=True)
    mileage = models.IntegerField(default=0)
    jeopardy_score = models.IntegerField(default=0)
    koth_score = models.IntegerField(default=0)
    is_banned = models.BooleanField(default=False)
    ban_reason = models.CharField(max_length=255, null=True, blank=True)
    # GET /admin/teams/{id}(README 8절)에서 조회할 수 있게 밴 처리 시점에 남긴다.
    banned_at = models.DateTimeField(null=True, blank=True)
    banned_by = models.CharField(max_length=100, null=True, blank=True)

    # README.md 2절 GET /board/me 기준 보드 상태
    position = models.IntegerField(default=1)
    dice_rolls_left = models.IntegerField(default=1)
    next_dice_reset_at = models.DateTimeField(null=True, blank=True)
    is_quarantined = models.BooleanField(default=False)
    quarantine_attempts_left = models.IntegerField(default=3)
    airport_move_used = models.BooleanField(default=False)
    has_passed_start = models.BooleanField(default=False)
    board_completed = models.BooleanField(default=False)
    consumed_cell_indexes = models.JSONField(default=list, blank=True)
    # GET /board/opened_challenges(README 2절) 재구성용 로그.
    # [{cell_index, challenge_id, opened_at(iso)}]. CellOpenView.post에서 추가.
    opened_challenge_log = models.JSONField(default=list, blank=True)
    chance_cards = models.JSONField(default=list, blank=True)  # [{card_id, used}]
    active_challenge = models.ForeignKey(
        "Challenge", null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    active_challenge_opened_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return self.team_name

    @property
    def team_score(self):
        return self.jeopardy_score + self.koth_score


class UserManager(BaseUserManager):
    def create_user(self, login_id, password, **extra):
        user = self.model(login_id=login_id, **extra)
        user.password = make_password(password)
        user.save(using=self._db)
        return user


class User(AbstractBaseUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    login_id = models.CharField(max_length=100, unique=True)
    nickname = models.CharField(max_length=100)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="PARTICIPANT")
    is_leader = models.BooleanField(default=False)
    team = models.ForeignKey(
        Team, null=True, blank=True, on_delete=models.SET_NULL, related_name="members"
    )

    USERNAME_FIELD = "login_id"
    REQUIRED_FIELDS = []
    objects = UserManager()

    def __str__(self):
        return self.login_id


class BoardCell(models.Model):
    cell_index = models.IntegerField(primary_key=True)
    type = models.CharField(max_length=20)
    difficulty = models.CharField(max_length=20, null=True, blank=True)
    name = models.CharField(max_length=100, null=True, blank=True)


class Challenge(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=200)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    difficulty = models.CharField(max_length=20, choices=DIFFICULTY_CHOICES)
    score = models.IntegerField(default=100)
    description = models.TextField(blank=True, default="")
    # GET/PATCH /admin/challenges(README 8절, 백엔드: 논의).
    is_published = models.BooleanField(default=True)

    def __str__(self):
        return self.title


class ChallengeFile(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    challenge = models.ForeignKey(Challenge, related_name="files", on_delete=models.CASCADE)
    file_name = models.CharField(max_length=200)
    download_url = models.URLField()
    file_size = models.IntegerField(default=0)


class Solve(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    team = models.ForeignKey(Team, related_name="solves", on_delete=models.CASCADE)
    user = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)
    challenge = models.ForeignKey(Challenge, null=True, blank=True, on_delete=models.SET_NULL)
    source_type = models.CharField(max_length=20, default="JEOPARDY")  # JEOPARDY / KOTH
    challenge_title = models.CharField(max_length=200, blank=True, default="")
    earned_score = models.IntegerField(default=0)
    earned_mileage = models.IntegerField(default=0)
    is_extra_dice_granted = models.BooleanField(default=False)
    solved_at = models.DateTimeField(auto_now_add=True)


class SolveAttempt(models.Model):
    """플래그 3회 연속 오답 락(README 3절)을 흉내내기 위한 카운터."""

    team = models.ForeignKey(Team, on_delete=models.CASCADE)
    challenge = models.ForeignKey(Challenge, on_delete=models.CASCADE)
    wrong_count = models.IntegerField(default=0)
    locked_until = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ("team", "challenge")


class Instance(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, related_name="instances", on_delete=models.CASCADE)
    team = models.ForeignKey(Team, related_name="instances", on_delete=models.CASCADE)
    challenge = models.ForeignKey(Challenge, on_delete=models.CASCADE)
    status = models.CharField(max_length=20, choices=INSTANCE_STATUS_CHOICES, default="RUNNING")
    host = models.CharField(max_length=100, default="chal.msgctf.kr")
    ports = models.JSONField(default=list, blank=True)  # [{port, label}]
    expires_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


class MileageHistory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    team = models.ForeignKey(Team, related_name="mileage_history", on_delete=models.CASCADE)
    type = models.CharField(max_length=20, choices=MILEAGE_TYPE_CHOICES)
    amount = models.IntegerField()
    reason = models.CharField(max_length=200, blank=True, default="")
    item_name = models.CharField(max_length=200, null=True, blank=True)
    is_refunded = models.BooleanField(default=False)
    ref_history_id = models.UUIDField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


class ChanceCardCatalog(models.Model):
    card_id = models.CharField(max_length=50, primary_key=True)
    name = models.CharField(max_length=100)
    description = models.CharField(max_length=255, blank=True, default="")
    effect = models.CharField(max_length=100, blank=True, default="")
    usage_timing = models.CharField(max_length=100, blank=True, default="")


class PaymentToken(models.Model):
    token = models.CharField(max_length=64, primary_key=True)
    team = models.ForeignKey(Team, on_delete=models.CASCADE)
    expires_at = models.DateTimeField()
    used = models.BooleanField(default=False)


class PaymentHistory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    team = models.ForeignKey(Team, related_name="payments", on_delete=models.CASCADE)
    item_name = models.CharField(max_length=200)
    amount = models.IntegerField()
    is_refunded = models.BooleanField(default=False)
    ref_history_id = models.UUIDField(null=True, blank=True)
    processed_at = models.DateTimeField(auto_now_add=True)
    processed_by = models.CharField(max_length=100, blank=True, default="")


class KothClub(models.Model):
    club_id = models.CharField(max_length=50, primary_key=True)
    name = models.CharField(max_length=100)
    koth_challenge_id = models.UUIDField(default=uuid.uuid4)
    title = models.CharField(max_length=200)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default="MISC")
    status = models.CharField(max_length=20, default="SCHEDULED")  # SCHEDULED/ACTIVE/CLOSED
    open_group = models.IntegerField(default=1)
    current_owner_team = models.ForeignKey(
        Team, null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    current_score = models.IntegerField(default=0)
    opened_at = models.DateTimeField(null=True, blank=True)
    closed_at = models.DateTimeField(null=True, blank=True)


class KothScore(models.Model):
    club = models.ForeignKey(KothClub, related_name="scores", on_delete=models.CASCADE)
    team = models.ForeignKey(Team, related_name="koth_scores", on_delete=models.CASCADE)
    earned_score = models.IntegerField(default=0)
    solved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ("club", "team")


class ContestTimer(models.Model):
    name = models.CharField(max_length=100, default="MSG CTF")
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()


class AdminSetting(models.Model):
    """GET/PATCH /admin/settings(README 8절). 대회당 1행만 쓰는 싱글턴.

    README는 일반 키-값 테이블을 제안하지만, 이 목서버 범위에서는 필드로
    고정해두는 쪽이 검증(범위 체크)이 더 명확해서 이렇게 뒀다.
    """

    dice_rolls_per_reset = models.IntegerField(default=1)
    dice_reset_interval_minutes = models.IntegerField(default=15)
    solve_deadline_minutes = models.IntegerField(default=15)
    max_attempts = models.IntegerField(default=3)
    lock_seconds = models.IntegerField(default=30)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.CharField(max_length=100, blank=True, default="")


class AdminEvent(models.Model):
    """관리자 조작 이벤트 로그(README 8절 GET /admin/events, GET /admin/dashboard
    "최근 이벤트 로그" - Figma node 384:396). 실제 이벤트 버스가 없는 목서버라
    각 관리자 액션 처리 시점에 직접 한 행씩 남긴다.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    type = models.CharField(max_length=50)
    severity = models.CharField(max_length=20, default="INFO")
    message = models.CharField(max_length=255)
    team_name = models.CharField(max_length=100, blank=True, default="")
    challenge_title = models.CharField(max_length=200, blank=True, default="")
    actor = models.CharField(max_length=100, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class TeamSnapshot(models.Model):
    """롤백 지점(README 8절 GET .../snapshots, POST .../rollback).
    보드 상태에 영향을 주는 관리자 조작(밴, clear 칸, 위치 이동, 주사위 지급) 직전에
    자동으로 한 장씩 남긴다. 팀당 최근 20개만 보관한다.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    team = models.ForeignKey(Team, related_name="snapshots", on_delete=models.CASCADE)
    label = models.CharField(max_length=200)
    position = models.IntegerField()
    dice_rolls_left = models.IntegerField()
    is_quarantined = models.BooleanField()
    consumed_cell_indexes = models.JSONField()
    opened_challenge_log = models.JSONField()
    chance_cards = models.JSONField()
    jeopardy_score = models.IntegerField()
    koth_score = models.IntegerField()
    mileage = models.IntegerField()
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.CharField(max_length=100, blank=True, default="")

    class Meta:
        ordering = ["-created_at"]
