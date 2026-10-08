const venueName = "교원챌린지홀";
const venueAddress = "서울시 종로구 우정국로 6";

export const eventConfig = Object.freeze({
  event: { date: "2026-11-08", startsAt: "2026-11-08T10:00:00+09:00" },
  registrationPeriod: "10월 12일 ~ 10월 25일",
  registrationUrl: "https://forms.gle/mZQoNZkUM5mSj7XE6",
  contactEmail: "msgctf@gmail.com",
  venue: `${venueName} 2층`,
  venueAddress,
  venueMapUrl:
    "https://www.google.com/maps/search/?api=1&query=" +
    encodeURIComponent(`${venueName} ${venueAddress}`),
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
