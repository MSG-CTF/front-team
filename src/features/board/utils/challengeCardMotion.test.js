import test from "node:test";
import assert from "node:assert/strict";
import { CARD_PICK_DURATION, CARD_PICK_SPARKS, CARD_CRUMBLE_FRAGMENTS, animateChallengeCardPick, fitCardTitleSize, getChallengeCardTilt } from "./challengeCardMotion.js";

const bounds = { left: 100, top: 50, width: 200, height: 300 };

test("바스라지는 조각은 카드 전체를 빈틈없이 삼각형으로 덮고 이동량을 제한한다", () => {
  assert.equal(CARD_CRUMBLE_FRAGMENTS.length, 12);
  let area = 0;
  let paintedArea = 0;
  for (const fragment of CARD_CRUMBLE_FRAGMENTS) {
    const width = parseFloat(fragment.width);
    const height = parseFloat(fragment.height);
    const points = [...fragment.clipPath.matchAll(/([\d.]+)% ([\d.]+)%/g)].map(match => [
      parseFloat(fragment.left) + Number(match[1]) * width / 100,
      parseFloat(fragment.top) + Number(match[2]) * height / 100,
    ]);
    paintedArea += width * height;
    assert.equal(points.length, 3);
    for (const point of points) for (const axis of point) assert.ok(axis >= -1e-8 && axis <= 100 + 1e-8);
    const [a,b,c] = points;
    area += Math.abs(a[0]*(b[1]-c[1]) + b[0]*(c[1]-a[1]) + c[0]*(a[1]-b[1])) / 2;
    assert.ok(Math.abs(parseFloat(fragment["--shard-x"])) * width / 100 < 50);
    assert.ok(Math.abs(parseFloat(fragment["--shard-y"])) * height / 100 < 65);
    assert.ok(parseFloat(fragment["--shard-delay"]) <= 55);
    assert.ok(width < 70 && height < 50);
    assert.doesNotMatch(JSON.stringify(fragment), /NaN|Infinity/);
  }
  assert.ok(Math.abs(area - 10000) < .001);
  // 기존에는 카드 한 장의 70배 면적을 레이어로 복제했다
  assert.ok(paintedArea < 25000);
});

test("카드 제목이 길어도 글자 크기 측정은 최대 8번이고 최소 가독성을 지킨다", () => {
  for (const [maximum, threshold] of [[40, 20], [30, 13], [32, 100], [14, 2]]) {
    let reads = 0;
    const size = fitCardTitleSize(maximum, value => { reads += 1; return value <= threshold; });
    assert.ok(reads <= 8);
    assert.ok(size >= Math.min(maximum, 12) && size <= maximum);
    if (threshold >= 12) assert.ok(size <= threshold && size > Math.min(maximum, threshold) - .5);
    else assert.equal(size, 12);
  }
});

test("카드 중앙은 기울이지 않고 모서리에서도 기울기를 제한한다", () => {
  const center = getChallengeCardTilt(200, 200, bounds);
  assert.equal(Math.abs(center.x), 0);
  assert.equal(center.y, 0);
  assert.deepEqual(getChallengeCardTilt(100, 50, bounds), { x: 4, y: -5 });
  assert.deepEqual(getChallengeCardTilt(9999, 9999, bounds), { x: -4, y: 5 });
  for (const rect of [null, { ...bounds, width: 0 }, { ...bounds, left: NaN }]) {
    assert.deepEqual(getChallengeCardTilt(200, 200, rect), { x: 0, y: 0 });
  }
});

test("모션 축소 설정과 애니메이션 미지원 환경에서는 선택을 지연하지 않는다", () => {
  assert.equal(animateChallengeCardPick(null), null);
  assert.equal(animateChallengeCardPick({}), null);
  assert.equal(animateChallengeCardPick({ animate: () => assert.fail("애니메이션을 실행하면 안 됨") }, true), null);
});

test("선택 모션은 취소 가능한 애니메이션을 반환하고 마지막 위치는 CSS와 일치한다", () => {
  const animation = { finished: Promise.resolve(), cancel() {} };
  let frames;
  let options;
  const result = animateChallengeCardPick({ animate: (input, config) => { frames = input; options = config; return animation; } });
  assert.equal(result, animation);
  assert.equal(options.duration, CARD_PICK_DURATION);
  assert.equal(options.duration, 420);
  assert.equal(frames.at(-1).transform, "translate3d(0, -20px, 0) rotateZ(0deg) scale(1.065)");
  assert.equal(frames[0].offset, 0);
  assert.equal(frames.at(-1).offset, 1);
});

test("금빛 입자는 카드 테두리 부근에서 시작하며 범위와 개수를 제한한다", () => {
  assert.equal(CARD_PICK_SPARKS.length, 14);
  for (const spark of CARD_PICK_SPARKS) {
    assert.ok(parseFloat(spark["--spark-left"]) >= 3 && parseFloat(spark["--spark-left"]) <= 97);
    assert.ok(parseFloat(spark["--spark-top"]) >= 3 && parseFloat(spark["--spark-top"]) <= 97);
    assert.ok(Math.abs(parseFloat(spark["--spark-x"])) <= 30);
    assert.ok(Math.abs(parseFloat(spark["--spark-y"])) <= 38);
  }
});

test("브라우저가 모션 재생에 실패해도 장식 오류를 요청 오류로 전파하지 않는다", () => {
  assert.equal(animateChallengeCardPick({ animate() { throw new Error("animation unavailable"); } }), null);
});
