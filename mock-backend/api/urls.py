from django.urls import path

from .views import admin, auth, board, challenges, koth, leaderboard, mypage, ranking, timer

urlpatterns = [
    # 1. 인증
    path("auth/login", auth.LoginView.as_view()),
    path("auth/refresh", auth.RefreshView.as_view()),
    path("auth/logout", auth.LogoutView.as_view()),
    path("auth/me", auth.MeView.as_view()),
    # 2. 보드
    path("board", board.BoardView.as_view()),
    path("board/me", board.BoardMeView.as_view()),
    path("board/dice/status", board.DiceStatusView.as_view()),
    path("board/dice/roll", board.DiceRollView.as_view()),
    path("board/cell/current", board.CellCurrentView.as_view()),
    path("board/cell/open", board.CellOpenView.as_view()),
    path("board/airport/move", board.AirportMoveView.as_view()),
    path("board/quarantine/escape", board.QuarantineEscapeView.as_view()),
    path("board/chance/catalog", board.ChanceCatalogView.as_view()),
    path("board/chance/now", board.ChanceNowView.as_view()),
    path("board/chance/use", board.ChanceUseView.as_view()),
    path("board/chance/confirm", board.ChanceConfirmView.as_view()),
    path("board/roulette/spin", board.RouletteSpinView.as_view()),
    # 3. 문제 상세 / 인스턴스
    path("challenges/<uuid:challenge_id>", challenges.ChallengeDetailView.as_view()),
    path("challenges/<uuid:challenge_id>/submit", challenges.ChallengeSubmitView.as_view()),
    path("instances", challenges.InstanceCreateView.as_view()),
    path("teams/me/instance", challenges.MyInstanceView.as_view()),
    path("instances/<uuid:instance_id>/reset", challenges.InstanceResetView.as_view()),
    path("instances/<uuid:instance_id>/extend", challenges.InstanceExtendView.as_view()),
    path("instances/<uuid:instance_id>", challenges.InstanceDeleteView.as_view()),
    # 4. 리더보드
    path("leaderboard", leaderboard.LeaderboardView.as_view()),
    # 5. 랭킹
    path("ranking", ranking.RankingView.as_view()),
    path("ranking/me", ranking.RankingMeView.as_view()),
    path("ranking/member", ranking.RankingMemberView.as_view()),
    # 6. 마이페이지
    path("teams/me", mypage.TeamMeView.as_view()),
    path("teams/me/solves", mypage.TeamSolvesView.as_view()),
    path("teams/me/mileage_history", mypage.TeamMileageHistoryView.as_view()),
    path("teams/me/qr_token", mypage.QrTokenView.as_view()),
    # 7. 타이머
    path("timer", timer.TimerView.as_view()),
    # 8. 관리자
    path("admin/teams", admin.AdminTeamsView.as_view()),
    path("admin/instances", admin.AdminInstancesView.as_view()),
    path("admin/instances/<uuid:instance_id>/reset", admin.AdminInstanceResetView.as_view()),
    path("admin/instances/<uuid:instance_id>", admin.AdminInstanceDeleteView.as_view()),
    path("admin/resources", admin.AdminResourcesView.as_view()),
    path("admin/events", admin.AdminEventsView.as_view()),
    path("admin/teams/<uuid:team_id>/mileage", admin.AdminTeamMileageView.as_view()),
    path("admin/teams/<uuid:team_id>/ban", admin.AdminTeamBanView.as_view()),
    path("admin/payment/history", admin.AdminPaymentHistoryView.as_view()),
    path("admin/payment/checkout", admin.AdminPaymentCheckoutView.as_view()),
    path("admin/payment/<uuid:history_id>/refund", admin.AdminPaymentRefundView.as_view()),
    path(
        "admin/challenges/<uuid:challenge_id>/docker_image",
        admin.AdminChallengeDockerImageView.as_view(),
    ),
    # 9. KOTH
    path("koth/clubs", koth.KothClubsView.as_view()),
    path("koth/clubs/<str:club_id>", koth.KothClubDetailView.as_view()),
    path("koth/me", koth.KothMeView.as_view()),
    path("koth/leaderboard", koth.KothLeaderboardView.as_view()),
    path("koth/team_token", koth.KothTeamTokenView.as_view()),
]
