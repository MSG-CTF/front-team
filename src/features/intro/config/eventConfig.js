const venueName = "교원챌린지홀";
const venueAddress = "서울시 종로구 우정국로 6";
const venueMapQuery = encodeURIComponent(venueAddress);

export const eventConfig = Object.freeze({
  event: { date: "2026-11-08", startsAt: "2026-11-08T10:00:00+09:00" },
  registrationPeriod: "10월 12일 ~ 10월 25일",
  registrationUrl: "https://forms.gle/mZQoNZkUM5mSj7XE6",
  contactEmail: "msgctf@gmail.com",
  venue: `${venueName} 2층`,
  venueAddress,
  venueAccess: {
    station: "1호선 종각역",
    walkLabel: "도보 2분",
    sourceUrl: "https://www.kyowonspace.co.kr/Info/InfoRental?gbn=1",
  },
  venueMapLinks: [
    {
      label: "카카오맵",
      url: `https://map.kakao.com/link/search/${venueMapQuery}`,
    },
    {
      label: "네이버지도",
      url: `https://map.naver.com/p/search/${venueMapQuery}`,
    },
  ],
  venueMapUrl:
    "https://www.google.com/maps/search/?api=1&query=" +
    encodeURIComponent(`${venueName} ${venueAddress}`),
  // 확정 도로명 주소를 검색한 Google 지도 '지도 퍼가기'에서 받은 URL
  venueMapEmbedUrl:
    "https://www.google.com/maps/embed?pb=!1m5!3m3!1m2!1s0x357ca2e92c46b501%3A0x43cb14ac16d93154!2z7ISc7Jq47Yq567OE7IucIOyiheuhnOq1rCDsmrDsoJXqta3roZwgNg!5e0!3m2!1sko!2skr!4v1791647822961!5m2!1sko!2skr",
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
