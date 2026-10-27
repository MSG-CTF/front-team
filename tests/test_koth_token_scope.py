"""Run the frontend token contract regression through the required pytest gate."""
from pathlib import Path
import subprocess


def test_koth_challenge_scoped_token_contract():
    root = Path(__file__).resolve().parents[1]
    result = subprocess.run(
        ["node", "--test", "src/features/koth/kothTeamTokenScope.test.js"],
        cwd=root, capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=30,
    )
    assert result.returncode == 0, result.stdout + result.stderr
