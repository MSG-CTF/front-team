import test from "node:test";
import assert from "node:assert/strict";
import {
  buildKothPatch, groupKothFiles, kothAwards, repositoryFreshness, kothEditForm, kothListFromClubs, kothSummary, numberTicks, periodRange, periodRows, retryablePeriod,
  kothFileWarnings, statusGoesBack, suggestRepository, tickLabel, tickNumber, validateKothEdit,
  NEW_KOTH_CLUB, applyKothFolder, buildKothCreate, freeKothClubs, kothCreateForm, kothFolderTwin, validateKothCreate,
} from "./adminKoth.js";

const row = (team, rank, extra = {}) => ({ team_id: team, team_name: team, period_rank: rank, metric_score: 100 - rank, ...extra });

test("구간 배점은 1위부터 40, 25, 15, 12, 8이고 6위 아래는 0점이다", () => {
  const awards = kothAwards([row("a", 1), row("b", 2), row("c", 3), row("d", 4), row("e", 5), row("f", 6)]);
  assert.deepEqual([...awards.values()], [40, 25, 15, 12, 8, 0]);
});

test("공동 순위는 차지한 연속 순위 배점을 합쳐 나누고 내림한다", () => {
  const tiedFirst = kothAwards([row("a", 1), row("b", 1), row("c", 3)]);
  assert.equal(tiedFirst.get("a"), 32);
  assert.equal(tiedFirst.get("b"), 32);
  assert.equal(tiedFirst.get("c"), 15);
  const tiedThird = kothAwards([row("a", 1), row("b", 2), row("c", 3), row("d", 3), row("e", 3)]);
  assert.equal(tiedThird.get("c"), Math.floor((15 + 12 + 8) / 3));
  const tiedFifth = kothAwards([row("a", 5), row("b", 5)]);
  assert.equal(tiedFifth.get("a"), 4);
});

test("구간 결과 줄은 순위 순서로 서고 서버가 준 환산 점수를 먼저 쓴다", () => {
  const rows = periodRows({ results: [row("b", 2), row("a", 1, { awarded_score: 40 }), row("c", 2)] });
  assert.deepEqual(rows.map((item) => item.team_id), ["a", "b", "c"]);
  assert.equal(rows[0].awarded, 40);
  assert.equal(rows[1].tied, true);
  assert.equal(rows[1].awarded, Math.floor((25 + 15) / 2));
  assert.deepEqual(periodRows({ results: null }), []);
});

test("구간 이름은 한국 시각 시작과 끝으로 보인다", () => {
  assert.equal(periodRange("2026-10-21T05:15:00Z"), "10-21 14:15 ~ 14:30");
  assert.equal(periodRange("없음"), "-");
});

test("참가자 API 목록은 동아리 아래 문제를 펼쳐 공개 순번으로 세운다", () => {
  const list = kothListFromClubs({ clubs: [
    { club_id: "c2", name: "SWING", challenges: [{ koth_challenge_id: "k2", title: "B", status: "ACTIVE", open_group: 2, current_score: 10 }] },
    { club_id: "c1", name: "MJSEC", challenges: [{ koth_challenge_id: "k1", title: "A", status: "CLOSED", open_group: 1 }] },
  ] });
  assert.deepEqual(list.map((item) => [item.koth_challenge_id, item.club_name, item.limited]), [["k1", "MJSEC", true], ["k2", "SWING", true]]);
  assert.deepEqual(kothListFromClubs(null), []);
  const summary = kothSummary([...list, { status: "SCHEDULED", failed_period_count: 2, repository: null }]);
  assert.deepEqual(summary, { all: 3, ACTIVE: 1, SCHEDULED: 1, CLOSED: 1, failing: 1, unlinked: 1 });
});

test("편집은 바뀐 칸만 보내고 비운 접속 주소는 null로 지운다", () => {
  const challenge = { title: "JENGA", description: "old", challenge_url: "http://a.example:8080/", open_group: 3, status: "ACTIVE" };
  const form = kothEditForm(challenge);
  assert.deepEqual(buildKothPatch(challenge, form), {});
  assert.deepEqual(buildKothPatch(challenge, { ...form, title: " STACK ", challenge_url: "", status: "CLOSED" }),
    { title: "STACK", challenge_url: null, status: "CLOSED" });
  assert.equal(validateKothEdit({ ...form, reason: "오타 수정" }), "");
  assert.equal(validateKothEdit({ ...form, reason: "" }), "사유는 1~500자로 입력하세요");
  assert.equal(validateKothEdit({ ...form, reason: "x", challenge_url: "ftp://a" }), "접속 주소는 http 또는 https로 시작하는 전체 주소여야 합니다");
  assert.equal(validateKothEdit({ ...form, reason: "x", open_group: "0" }), "공개 순번은 1~12 사이 정수로 입력하세요");
  assert.equal(validateKothEdit({ ...form, reason: "x", title: "" }), "제목은 1~100자로 입력하세요");
});

test("상태를 되돌리는지 알 수 있고 저장소 폴더를 제목으로 추천한다", () => {
  assert.equal(statusGoesBack("CLOSED", "ACTIVE"), true);
  assert.equal(statusGoesBack("SCHEDULED", "ACTIVE"), false);
  const folders = [{ slug: "koth-jenga", title: "STACK STACK STACK" }, { slug: "koth-pixel-smuggler", title: "PIXEL SMUGGLER" }, { slug: "koth-empty", title: "" }];
  assert.equal(suggestRepository({ title: "Pixel Smuggler" }, folders).slug, "koth-pixel-smuggler");
  assert.equal(suggestRepository({ title: "Jenga" }, folders).slug, "koth-jenga");
  assert.equal(suggestRepository({ title: "없는 문제" }, folders), null);
});

test("틱 번호는 연 시각부터 15분마다 하나씩 세고 모르면 최신순 개수로 센다", () => {
  assert.equal(tickNumber("2026-10-21T01:00:00Z", "2026-10-21T01:00:00Z"), 1);
  assert.equal(tickNumber("2026-10-21T01:45:00Z", "2026-10-21T01:00:00Z"), 4);
  // 연 시각이 칸 중간이면 그 칸이 1틱이고, 몇 초 어긋난 값은 가까운 칸으로 센다
  assert.equal(tickNumber("2026-10-21T01:00:00Z", "2026-10-21T01:07:00Z"), 1);
  assert.equal(tickNumber("2026-10-21T01:15:00Z", "2026-10-21T01:07:00Z"), 2);
  assert.equal(tickNumber("2026-10-21T01:14:58Z", "2026-10-21T01:00:03Z"), 2);
  assert.equal(tickNumber("2026-10-21T00:59:58Z", "2026-10-21T01:00:03Z"), 1);
  assert.equal(tickNumber("2026-10-21T00:45:00Z", "2026-10-21T01:00:00Z"), null);
  assert.equal(tickNumber("2026-10-21T01:45:00Z", null), null);
  const ticks = numberTicks([{ period_id: "b" }, { period_id: "a" }], { totalCount: 7 });
  assert.deepEqual(ticks.map((tick) => tick.tick), [7, 6]);
  assert.equal(tickLabel(12), "12틱");
});

test("실패한 틱과 끝났는데 반영 전인 틱만 다시 불러온다", () => {
  const now = Date.parse("2026-10-21T02:00:00Z");
  assert.equal(retryablePeriod({ status: "FAILED", period_id: "2026-10-21T01:30:00Z" }, now), true);
  assert.equal(retryablePeriod({ status: "PENDING", period_id: "2026-10-21T01:30:00Z" }, now), true);
  assert.equal(retryablePeriod({ status: "PENDING", period_id: "2026-10-21T01:50:00Z" }, now), false);
  assert.equal(retryablePeriod({ status: "APPLIED", period_id: "2026-10-21T01:30:00Z" }, now), false);
});

test("여는 시각, 닫는 시각, 채점 주소도 바뀐 것만 보내고 순서를 검사한다", () => {
  const challenge = { title: "A", description: "", challenge_url: "", open_group: 1, status: "SCHEDULED",
    opened_at: "2026-10-21T05:00:00Z", closed_at: null, score_api_url: "http://koth-a:9090/internal/koth/scores", score_api_token_env: "KOTH_A_TOKEN" };
  const form = kothEditForm(challenge);
  assert.equal(form.opened_at, "2026-10-21T14:00");
  assert.deepEqual(buildKothPatch(challenge, form), {});
  assert.deepEqual(buildKothPatch(challenge, { ...form, closed_at: "2026-10-21T18:00", score_api_token_env: "KOTH_A_TOKEN_V2" }),
    { closed_at: "2026-10-21T09:00:00Z", score_api_token_env: "KOTH_A_TOKEN_V2" });
  const base = { ...form, reason: "일정 조정" };
  assert.equal(validateKothEdit({ ...base, closed_at: "2026-10-21T13:00" }), "닫는 시각은 여는 시각보다 늦어야 합니다");
  assert.equal(validateKothEdit({ ...base, score_api_url: "http://user:pw@host/scores" }), "채점 주소는 http 또는 https 주소여야 하고 계정 정보나 # 을 넣을 수 없습니다");
  assert.equal(validateKothEdit({ ...base, score_api_token_env: "koth-token" }), "토큰 환경 변수 이름은 영어 대문자, 숫자, _ 로 씁니다");
  assert.equal(validateKothEdit(base), "");
});

test("참가자 파일에 섞인 캐시와 비밀값 의심 파일을 골라낸다", () => {
  const files = [
    { path: "API_SPEC.md", size_bytes: 1036 }, { path: "l0/app.py", size_bytes: 541 }, { path: "l0/__pycache__/app.cpython-314.pyc", size_bytes: 1369 },
    { path: "common/ancestry.pyc", size_bytes: 10 }, { path: ".env", size_bytes: 20 }, { path: "deploy/.env.example", size_bytes: 20 }, { path: "flag.txt", size_bytes: 30 },
  ];
  const warnings = kothFileWarnings(files);
  assert.deepEqual(warnings.map((warning) => [warning.key, warning.paths.length]), [["cache", 2], ["env", 1], ["flag", 1]]);
  assert.deepEqual(kothFileWarnings([{ path: "README.md" }]), []);
});

test("참가자 파일은 맨 위 파일 다음에 폴더별로 묶는다", () => {
  const groups = groupKothFiles([{ path: "l1/app.py", size_bytes: 5 }, { path: "README.md", size_bytes: 3 }, { path: "l1/Dockerfile", size_bytes: 2 }, { path: "a.json", size_bytes: 1 }]);
  assert.deepEqual(groups.map((group) => [group.name, group.files.length, group.size]), [["a.json", 1, 1], ["README.md", 1, 3], ["l1/", 2, 7]]);
  assert.deepEqual(groups[2].files.map((file) => file.name), ["app.py", "Dockerfile"]);
});

test("저장소 최신화는 반영한 커밋과 main 최신 커밋이 다를 때만 새 커밋으로 본다", () => {
  assert.deepEqual(repositoryFreshness(null), { linked: false, behind: false });
  assert.equal(repositoryFreshness({ source_revision: "1a82c92", latest_revision: "9d4f3e1" }).behind, true);
  assert.equal(repositoryFreshness({ source_revision: "1a82c92", latest_revision: "1a82c92f00" }).behind, false);
  assert.equal(repositoryFreshness({ source_revision: "1a82c92" }).behind, false);
});

test("등록은 문제가 없는 동아리만 고르고 새 동아리는 이름으로 보낸다", () => {
  const clubs = [{ club_id: "c1", name: "MJSEC", challenges: [{ koth_challenge_id: "k1" }] }, { club_id: "c2", name: "NULLPTR", challenges: [] }];
  assert.deepEqual(freeKothClubs(clubs).map((club) => club.club_id), ["c2"]);
  const base = { ...kothCreateForm(), title: "STACK", open_group: "3", reason: "새 KoTH 문제 등록" };
  assert.equal(validateKothCreate(base), "동아리를 고르세요");
  assert.equal(validateKothCreate({ ...base, club_id: NEW_KOTH_CLUB }), "새 동아리 이름은 1~100자로 입력하세요");
  assert.equal(validateKothCreate({ ...base, club_id: "c2" }), "");
  const created = buildKothCreate({ ...base, club_id: NEW_KOTH_CLUB, club_name: " Sec:Zero " });
  assert.equal(created.club_name, "Sec:Zero");
  assert.equal(created.club_id, undefined);
  const body = buildKothCreate({ ...base, club_id: "c2", opened_at: "2026-11-08T14:00" });
  assert.equal(body.club_id, "c2");
  assert.equal(body.open_group, 3);
  assert.equal(body.opened_at, "2026-11-08T05:00:00Z");
  assert.equal(body.closed_at, null);
  assert.equal(body.challenge_url, null);
  assert.equal(body.repository_slug, null);
});

test("저장소 폴더를 고르면 info.yaml 이름과 지문, 토큰 이름 제안을 채운다", () => {
  const folder = { slug: "koth-pixel-smuggler", title: "PIXEL SMUGGLER", description: "지문" };
  const filled = applyKothFolder(kothCreateForm(), folder);
  assert.equal(filled.repository_slug, "koth-pixel-smuggler");
  assert.equal(filled.title, "PIXEL SMUGGLER");
  assert.equal(filled.description, "지문");
  assert.equal(filled.score_api_token_env, "KOTH_PIXEL_SMUGGLER_TOKEN");
  assert.equal(applyKothFolder({ ...kothCreateForm(), score_api_token_env: "MY_TOKEN" }, folder).score_api_token_env, "MY_TOKEN");
  assert.equal(applyKothFolder(filled, null).repository_slug, "");
});

test("저장소 미연결로 이미 있는 같은 문제를 고르면 그 문제를 알려준다", () => {
  const challenges = [
    { koth_challenge_id: "k6", title: "Dependency Hell", repository: null },
    { koth_challenge_id: "k4", title: "PIXEL SMUGGLER", repository: { slug: "koth-pixel-smuggler" } },
  ];
  assert.equal(kothFolderTwin({ slug: "koth-dependency-hell", title: "DEPENDENCY HELL" }, challenges).koth_challenge_id, "k6");
  assert.equal(kothFolderTwin({ slug: "koth-pixel-smuggler", title: "PIXEL SMUGGLER" }, challenges), null);
  assert.equal(kothFolderTwin({ slug: "koth-jenga", title: "JENGA" }, challenges), null);
  assert.equal(kothFolderTwin(null, challenges), null);
});
