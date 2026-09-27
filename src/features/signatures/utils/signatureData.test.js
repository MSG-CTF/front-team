import test from "node:test";
import assert from "node:assert/strict";
import {
  getClubLogo,
  getSignatureError,
  getSignatureLockUntil,
  getSignatureRetrySeconds,
  parseSignatureDetail,
  parseSignatureList,
  signatureSubmitFeedback,
} from "./signatureData.js";

const row = {
  signature_id: "signature-1",
  club_id: "club-1",
  club_name: "seKUrity",
  title: "부스 문제",
  score: 300.25,
  is_solved: false,
  solved_at: null,
  solved_team_count: 0,
  description: "설명",
};

test("부스 문제는 공개된 목록만 사용하고 소수 배점과 해결 여부를 보존한다", () => {
  const rows = parseSignatureList({ signatures: [row], total_count: 1 });
  assert.equal(rows[0].score, 300.25);
  assert.equal(rows[0].is_solved, false);
  assert.deepEqual(parseSignatureList({ signatures: [], total_count: 0 }), []);
  assert.equal(parseSignatureDetail(row, "signature-1"), row);
});

test("다른 문제 응답, 중복 식별자와 잘못된 형식은 빈 목록이나 정상 상세로 표시하지 않는다", () => {
  assert.throws(() => parseSignatureDetail(row, "signature-2"));
  assert.throws(() =>
    parseSignatureDetail({ ...row, description: null }, "signature-1"),
  );
  for (const change of [
    { signature_id: 1 },
    { score: "300" },
    { is_solved: "false" },
    { solved_at: "invalid" },
    { solved_team_count: -1 },
  ]) {
    assert.throws(() =>
      parseSignatureList({
        signatures: [{ ...row, ...change }],
        total_count: 1,
      }),
    );
  }
  assert.throws(() =>
    parseSignatureList({ signatures: [row, row], total_count: 2 }),
  );
  assert.throws(() =>
    parseSignatureList({ signatures: [row], total_count: 6 }),
  );
});

test("정답 응답은 현재 문제와 동아리의 점수만 읽으며 주사위나 마일리지 보상을 만들지 않는다", () => {
  const result = signatureSubmitFeedback(
    {
      code: "SUCCESS",
      data: {
        signature_id: "signature-1",
        club_id: "club-1",
        earned_score: 300.25,
        team_score: 825.25,
        solved_at: "2026-09-20T00:00:00Z",
        earned_mileage: 100,
        is_extra_dice_granted: true,
      },
    },
    "signature-1",
    "club-1",
  );
  assert.equal(result.type, "success");
  assert.deepEqual(result.data, {
    earned_score: 300.25,
    team_score: 825.25,
    solved_at: "2026-09-20T00:00:00Z",
  });
  assert.equal(
    signatureSubmitFeedback(
      { code: "SUCCESS", data: { signature_id: "other" } },
      "signature-1",
      "club-1",
    ).code,
    "UNKNOWN_RESULT",
  );
  assert.equal(
    signatureSubmitFeedback(undefined, "signature-1", "club-1").type,
    "error",
  );
});

test("HTTP 200 오답과 이미 해결한 결과를 구분한다", () => {
  assert.equal(
    signatureSubmitFeedback({ code: "INCORRECT_FLAG", data: null }).type,
    "error",
  );
  assert.equal(
    signatureSubmitFeedback({ code: "ALREADY_SOLVED", data: null }).code,
    "ALREADY_SOLVED",
  );
  assert.equal(
    signatureSubmitFeedback({ code: "ALREADY_SOLVED", data: null }).data,
    undefined,
  );
  assert.equal(
    signatureSubmitFeedback({
      code: "INTERNAL_ERROR",
      message: "private trace",
    }).message.includes("private trace"),
    false,
  );
  assert.match(getSignatureError("SIGNATURE_NOT_FOUND"), /공개/);
});

test("잠금은 서버가 돌려준 남은 시간을 사용하고 탭이 멈춰도 현재 시각으로 계산한다", () => {
  const lockedUntil = getSignatureLockUntil(
    { code: "TOO_MANY_ATTEMPTS", data: { retry_after_seconds: 17 } },
    1000,
  );
  assert.equal(lockedUntil, 18000);
  assert.equal(getSignatureRetrySeconds(lockedUntil, 17999), 1);
  assert.equal(getSignatureRetrySeconds(lockedUntil, 25000), 0);
  assert.equal(
    getSignatureLockUntil(
      { code: "TOO_MANY_ATTEMPTS", data: { retry_after_seconds: "bad" } },
      1000,
    ),
    31000,
  );
  assert.equal(getSignatureLockUntil({ code: "INCORRECT_FLAG" }, 1000), 0);
});

test("알려진 동아리 로고만 사용하고 이름에 따라 파일 경로를 조합하지 않는다", () => {
  assert.equal(getClubLogo("seKUrity"), "/assets/intro/club-sekurity.svg");
  assert.equal(getClubLogo("Y-CERT"), "/assets/intro/club-ycert.svg");
  assert.equal(getClubLogo("other"), null);
  assert.equal(getClubLogo("constructor"), null);
  assert.equal(typeof getSignatureError("constructor"), "string");
});
