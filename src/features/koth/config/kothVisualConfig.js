export const KOTH_CHALLENGE_VISUALS = [
  {
    visualKey: "maple-pass",
    slot: 1,
    visualTitle: "MAPLE PASS",
    imageSrc: "/assets/koth/challenge-maple-pass.webp",
    completionStampImageSrc: "/assets/koth/completion-stamp-round-1.webp",
    position: { left: "5.8333%", top: "62.8704%", width: "11.8229%", height: "26.2037%" },
  },
  {
    visualKey: "river-crossing",
    slot: 2,
    visualTitle: "RIVER CROSSING",
    imageSrc: "/assets/koth/challenge-river-crossing.webp",
    completionStampImageSrc: "/assets/koth/completion-stamp-round-1.webp",
    position: { left: "20.5729%", top: "62.8704%", width: "11.7188%", height: "26.2037%" },
  },
  {
    visualKey: "pine-ridge",
    slot: 3,
    visualTitle: "PINE RIDGE",
    imageSrc: "/assets/koth/challenge-pine-ridge.webp",
    completionStampImageSrc: "/assets/koth/completion-stamp-round-2.webp",
    position: { left: "38.6979%", top: "62.8704%", width: "11.3021%", height: "26.2037%" },
  },
  {
    visualKey: "lantern-camp",
    slot: 4,
    visualTitle: "LANTERN CAMP",
    imageSrc: "/assets/koth/challenge-lantern-camp.webp",
    completionStampImageSrc: "/assets/koth/completion-stamp-round-2.webp",
    position: { left: "52.6563%", top: "62.8704%", width: "11.3021%", height: "26.2037%" },
  },
  {
    visualKey: "stone-ascent",
    slot: 5,
    visualTitle: "STONE ASCENT",
    imageSrc: "/assets/koth/challenge-stone-ascent.webp",
    completionStampImageSrc: "/assets/koth/completion-stamp-round-3.webp",
    position: { left: "68.5938%", top: "62.8704%", width: "11.25%", height: "26.2037%" },
  },
  {
    visualKey: "crown-summit",
    slot: 6,
    visualTitle: "CROWN SUMMIT",
    imageSrc: "/assets/koth/challenge-crown-summit.webp",
    completionStampImageSrc: "/assets/koth/completion-stamp-round-3.webp",
    position: { left: "82.2917%", top: "62.8704%", width: "11.3542%", height: "26.2037%" },
  },
];

// Figma의 도장 위치만 표현한다. 어느 koth_challenge_id의 solved 상태와 연결되는지는
// 명세에 근거가 없으므로 이 설정에서 임의로 매핑하지 않는다.
export const KOTH_COMPLETION_STAMPS = [
  {
    stampKey: "round-three-stamp",
    imageSrc: "/assets/koth/completion-stamp-round-1.webp",
    position: { left: "5.1042%", top: "64.1667%", width: "13.3333%", height: "23.7037%" },
  },
  {
    stampKey: "round-two-stamp",
    imageSrc: "/assets/koth/completion-stamp-round-2.webp",
    position: { left: "37.5521%", top: "63.8889%", width: "13.4896%", height: "23.9815%" },
  },
  {
    stampKey: "round-one-stamp",
    imageSrc: "/assets/koth/completion-stamp-round-3.webp",
    position: { left: "67.4479%", top: "63.8889%", width: "13.4896%", height: "23.9815%" },
  },
];
