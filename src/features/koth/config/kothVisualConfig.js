export const KOTH_CHALLENGE_VISUALS = [
  {
    visualKey: "maple-pass",
    title: "MAPLE PASS",
    imageSrc: "/assets/koth/challenge-maple-pass.png",
    position: { left: "5.8333%", top: "62.8704%", width: "11.8229%", height: "26.2037%" },
  },
  {
    visualKey: "river-crossing",
    title: "RIVER CROSSING",
    imageSrc: "/assets/koth/challenge-river-crossing.png",
    position: { left: "20.5729%", top: "62.8704%", width: "11.7188%", height: "26.2037%" },
  },
  {
    visualKey: "pine-ridge",
    title: "PINE RIDGE",
    imageSrc: "/assets/koth/challenge-pine-ridge.png",
    position: { left: "38.6979%", top: "62.8704%", width: "11.3021%", height: "26.2037%" },
  },
  {
    visualKey: "lantern-camp",
    title: "LANTERN CAMP",
    imageSrc: "/assets/koth/challenge-lantern-camp.png",
    position: { left: "52.6563%", top: "62.8704%", width: "11.3021%", height: "26.2037%" },
  },
  {
    visualKey: "stone-ascent",
    title: "STONE ASCENT",
    imageSrc: "/assets/koth/challenge-stone-ascent.png",
    position: { left: "68.5938%", top: "62.8704%", width: "11.25%", height: "26.2037%" },
  },
  {
    visualKey: "crown-summit",
    title: "CROWN SUMMIT",
    imageSrc: "/assets/koth/challenge-crown-summit.png",
    position: { left: "82.2917%", top: "62.8704%", width: "11.3542%", height: "26.2037%" },
  },
];

// Figma의 도장 위치만 표현한다. 어느 koth_challenge_id의 solved 상태와 연결되는지는
// 명세에 근거가 없으므로 이 설정에서 임의로 매핑하지 않는다.
export const KOTH_COMPLETION_STAMPS = [
  {
    stampKey: "round-three-stamp",
    imageSrc: "/assets/koth/completion-stamp-round-3.png",
    position: { left: "5.1042%", top: "64.1667%", width: "13.3333%", height: "23.7037%" },
  },
  {
    stampKey: "round-two-stamp",
    imageSrc: "/assets/koth/completion-stamp-round-2.png",
    position: { left: "37.5521%", top: "63.8889%", width: "13.4896%", height: "23.9815%" },
  },
  {
    stampKey: "round-one-stamp",
    imageSrc: "/assets/koth/completion-stamp-round-1.png",
    position: { left: "67.4479%", top: "63.8889%", width: "13.4896%", height: "23.9815%" },
  },
];

export const EMPTY_KOTH_DATA = {
  clubs: [],
  teamChallenges: [],
};
