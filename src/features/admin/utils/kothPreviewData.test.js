import test from "node:test";
import assert from "node:assert/strict";
import { kothPreviewModels } from "./kothPreviewData.js";

const visuals = [{ id: "card", clubLabel: "CodeCure" }];
const challenge = { koth_challenge_id: "card", club_id: "club", club_name: "CodeCure", title: "Arena", status: "SCHEDULED", open_group: 1,
  challenge_url: "https://game.example", description: "관리자 지문", current_owner_team_id: "old", current_owner_team_name: "old team", current_score: 0 };
function live(score = 120) {
  return [{ club_id: "club", name: "CodeCure", challenges: [{ ...challenge, challenge_url: null, description: "공개 전 지문", current_owner_team_id: "team", current_owner_team_name: "QA", current_score: score }] }];
}
function progress(status, score) {
  return { challenges: [{ koth_challenge_id: "card", collection_status: status, earned_score: score, rank: 1,
    last_collected_at: "2026-10-27T06:30:00Z", is_stale: status === "FAILED" }] };
}

test("preview distinguishes an unfinished progress request from a collected zero", () => {
  const pending = kothPreviewModels(visuals, [challenge], [], null)[0];
  const zero = kothPreviewModels(visuals, [challenge], [], progress("COLLECTED", 0))[0];
  assert.equal(pending.collection, "pending");
  assert.equal(zero.collection, "ready");
  assert.equal(zero.earnedScore, 0);
});

test("preview carries failed collection metadata and the previously stored team points", () => {
  const model = kothPreviewModels(visuals, [challenge], live(40), progress("FAILED", 40))[0];
  assert.equal(model.collection, "failed");
  assert.equal(model.earnedScore, 40);
  assert.equal(model.rank, 1);
  assert.equal(model.lastCollectedAt, "2026-10-27T06:30:00Z");
});

test("recovered progress and live ownership replace the old admin snapshot", () => {
  const model = kothPreviewModels(visuals, [challenge], live(), progress("COLLECTED", 120))[0];
  assert.equal(model.collection, "ready");
  assert.equal(model.earnedScore, 120);
  assert.equal(model.currentScore, 120);
  assert.equal(model.currentOwnerTeamId, "team");
  assert.equal(model.currentOwnerTeamName, "QA");
  assert.equal(model.challengeUrl, "https://game.example");
  assert.equal(model.description, "관리자 지문");
  assert.equal(model.status, "SCHEDULED");
});

test("a cleared owner is not replaced with stale admin ownership", () => {
  const clubs = live();
  Object.assign(clubs[0].challenges[0], { current_owner_team_id: null, current_owner_team_name: null, current_score: 0 });
  const model = kothPreviewModels(visuals, [challenge], clubs, progress("COLLECTED", 0))[0];
  assert.equal(model.currentOwnerTeamId, null);
  assert.equal(model.currentOwnerTeamName, null);
  assert.equal(model.currentScore, 0);
  assert.equal(challenge.current_owner_team_id, "old");
});
