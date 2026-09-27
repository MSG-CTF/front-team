export const eventConfig = Object.freeze({
  event: { date: "2026-11-08", startsAt: "2026-11-08T10:00:00+09:00" },
  registrationPeriod: "10월 12일 ~ 10월 25일",
  registrationUrl: "https://forms.gle/mZQoNZkUM5mSj7XE6",
  contactEmail: "msgctf@gmail.com",
  venue: "추후 안내",
  participationFee: "무료",
  prizes: {
    confirmed: true,
    totalKrw: 1500000,
    tracks: [
      { label: "내부 트랙", amounts: [300000, 200000, 100000] },
      { label: "외부 트랙", amounts: [500000, 300000, 100000] },
    ],
  },
});
