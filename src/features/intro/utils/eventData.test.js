import test from "node:test";
import assert from "node:assert/strict";
import { eventConfig } from "../config/eventConfig.js";
import {
  formatWon,
  getCountdown,
  getEventLabels,
  getPrizes,
} from "./eventData.js";

const start = Date.parse("2026-11-08T10:00:00+09:00");
const sampleAward = {
  label: "특별상",
  amountKrw: 500000,
  description: "상장 수여",
  selectionNote: "수상 기준 별도 안내",
};
test("화면의 날짜와 시작 시각은 카운트다운과 같은 설정을 사용한다", () => {
  assert.deepEqual(getEventLabels(eventConfig.event), {
    fullDate: "2026년 11월 8일 일요일",
    shortDate: "11월 8일 일요일",
    startTime: "오전 10시 시작",
  });
  assert.equal(
    getEventLabels({
      date: "2026-11-08",
      startsAt: "2026-11-08T10:30:00+09:00",
    }).startTime,
    "오전 10시 30분 시작",
  );
  assert.equal(getEventLabels({ date: "2026-02-30" }).fullDate, "추후 안내");
});
test("한국 시간 오전 10시까지 일, 시, 분, 초를 계산한다", () => {
  assert.deepEqual(
    getCountdown(eventConfig.event, start - (86400 + 7200 + 180 + 4) * 1000),
    { mode: "exact", days: 1, hours: 2, minutes: 3, seconds: 4 },
  );
});
test("시작 1ms 전까지 1초를 표시하고 시작 이후 음수가 나오지 않는다", () => {
  assert.equal(getCountdown(eventConfig.event, start - 1).seconds, 1);
  assert.deepEqual(getCountdown(eventConfig.event, start), {
    mode: "message",
    text: "대회가 시작됐습니다",
  });
  assert.deepEqual(getCountdown(eventConfig.event, start + 86400000), {
    mode: "message",
    text: "대회가 시작됐습니다",
  });
});
test("잠든 탭이 돌아오면 이전 숫자를 차감하지 않고 현재 시각으로 다시 계산한다", () => {
  assert.equal(getCountdown(eventConfig.event, start - 3600000).hours, 1);
  assert.equal(getCountdown(eventConfig.event, start - 5000).seconds, 5);
});
test("시작 시간이 없으면 UTC가 아닌 한국 날짜로 날짜 경계를 계산한다", () => {
  const event = { date: "2026-11-08" };
  assert.deepEqual(getCountdown(event, Date.parse("2026-11-07T14:59:59Z")), {
    mode: "days",
    days: 1,
  });
  assert.equal(
    getCountdown(event, Date.parse("2026-11-07T15:00:00Z")).text,
    "오늘 대회가 열립니다",
  );
  assert.equal(
    getCountdown(event, Date.parse("2026-11-08T15:00:00Z")).text,
    "대회 날짜가 지났습니다",
  );
});
test("잘못된 날짜와 시계 값은 카운트다운으로 표시하지 않는다", () => {
  for (const date of [null, "", "2026-02-30", "2026-2-2", "unknown"])
    assert.equal(getCountdown({ date }, start), null);
  for (const now of [NaN, Infinity, null, 8640000000000000])
    assert.equal(getCountdown(eventConfig.event, now), null);
});
test("시간대가 없거나 날짜와 맞지 않는 시작 시간은 초 단위로 단정하지 않는다", () => {
  for (const startsAt of [
    "2026-11-08T10:00:00",
    "2026-11-09T10:00:00+09:00",
    "invalid",
  ]) {
    assert.equal(
      getCountdown({ date: "2026-11-08", startsAt }, start - 86400000).mode,
      "days",
    );
  }
});
test("대회 상금 150만원과 별도 안랩 대표상 50만원을 구분한다", () => {
  const result = getPrizes(eventConfig.prizes);
  assert.equal(result.total, 2000000);
  assert.equal(result.trackTotal, 1500000);
  assert.deepEqual(
    result.tracks.map((row) => row.amounts),
    [
      [500000, 300000, 100000],
      [300000, 200000, 100000],
    ],
  );
  assert.deepEqual(result.specialAwards, [{
    label: "안랩 대표상",
    amount: 500000,
    description: "안랩 대표 명의 상장 수여",
    selectionNote: "수상 기준은 추후 안내합니다",
  }]);
  assert.equal(
    result.tracks
      .flatMap((track) => track.amounts)
      .reduce((sum, amount) => sum + amount, 0),
    1500000,
  );
});
test("별도 시상이 없는 기존 설정도 트랙 상금만으로 계산한다", () => {
  const result = getPrizes({
    confirmed: true,
    totalKrw: 1500000,
    tracks: eventConfig.prizes.tracks,
  });
  assert.equal(result.total, 1500000);
  assert.equal(result.trackTotal, 1500000);
  assert.deepEqual(result.specialAwards, []);
});
test("미확정 상금과 합계 오류는 공개하지 않는다", () => {
  assert.equal(getPrizes({ ...eventConfig.prizes, confirmed: false }), null);
  assert.equal(getPrizes({ ...eventConfig.prizes, totalKrw: 1600000 }), null);
  assert.equal(getPrizes({ ...eventConfig.prizes, totalKrw: 1500000 }), null);
  assert.equal(getPrizes({ ...eventConfig.prizes, specialAwards: [] }), null);
  assert.equal(getPrizes({ ...eventConfig.prizes, tracks: [] }), null);
});
test("음수, 소수, 문자열 금액과 중복 트랙은 공개하지 않는다", () => {
  for (const amount of [-1, 1.5, "300000", NaN]) {
    assert.equal(
      getPrizes({
        confirmed: true,
        totalKrw: 600000,
        tracks: [{ label: "내부", amounts: [amount, 200000, 100000] }],
      }),
      null,
    );
  }
  assert.equal(
    getPrizes({
      confirmed: true,
      totalKrw: 2600000,
      tracks: [eventConfig.prizes.tracks[0], eventConfig.prizes.tracks[0]],
    }),
    null,
  );
});
test("별도 시상의 잘못된 금액, 이름, 설명과 중복 항목은 공개하지 않는다", () => {
  const award = sampleAward;
  for (const amountKrw of [0, -1, 1.5, "500000", NaN, Infinity]) {
    assert.equal(
      getPrizes({ ...eventConfig.prizes, totalKrw: 2000000, specialAwards: [{ ...award, amountKrw }] }),
      null,
    );
  }
  for (const specialAwards of [
    null,
    {},
    [null],
    [{ ...award, label: " " }],
    [{ ...award, label: 1 }],
    [{ ...award, description: false }],
    [{ ...award, selectionNote: {} }],
    [award, { ...award, label: " 특별상 " }],
  ]) {
    assert.equal(getPrizes({
      ...eventConfig.prizes,
      totalKrw: 1500000 + (Array.isArray(specialAwards) ? specialAwards.length : 1) * 500000,
      specialAwards,
    }), null);
  }
});
test("상금 계산 결과를 바꿔도 원본 설정은 유지된다", () => {
  const source = {
    ...eventConfig.prizes,
    totalKrw: 2000000,
    specialAwards: [{ ...sampleAward }],
  };
  const result = getPrizes(source);
  result.tracks[0].amounts[0] = 1;
  result.specialAwards[0].amount = 1;
  result.specialAwards[0].label = "변경";
  assert.equal(eventConfig.prizes.tracks[0].amounts[0], 500000);
  assert.equal(source.specialAwards[0].amountKrw, 500000);
  assert.equal(source.specialAwards[0].label, "특별상");
});
test("금액 표시와 무료 참가비, 공개 링크를 확인한다", () => {
  assert.equal(formatWon(1500000), "150만원");
  assert.equal(formatWon(12345), "12,345원");
  assert.equal(eventConfig.participationFee, "무료");
  assert.equal(
    eventConfig.registrationUrl,
    "https://hspace.io/u/2026-msgctf",
  );
  assert.equal(eventConfig.contactEmail, "msgctf@gmail.com");
});
