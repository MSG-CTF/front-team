// START를 제외한 35칸의 음식 매핑. 단호박수프는 예비 에셋으로 보존한다.
export const LANDMARK_STAGE2 = Object.freeze([
  { cellIndex: 2, food: "fruit-salad", label: "과일샐러드", size: 1.17, yaw: -0.20, shadowWidth: 0.78 },
  { cellIndex: 3, food: "bibimbap", label: "비빔밥", size: 1.17, yaw: 0.18, shadowWidth: 0.78 },
  { cellIndex: 4, food: "ramen", label: "라멘", size: 1.17, yaw: -0.16, shadowWidth: 0.78 },
  { cellIndex: 5, food: "poke", label: "포케", size: 1.17, yaw: 0.18, shadowWidth: 0.78 },
  { cellIndex: 6, food: "curry", label: "카레", size: 1.17, yaw: -0.16, shadowWidth: 0.78 },
  { cellIndex: 7, food: "tanghulu", label: "탕후루", size: 1.14, yaw: 0.18, shadowWidth: 0.56 },
  { cellIndex: 8, food: "oden-skewer", label: "어묵", size: 1.15, yaw: -0.16, shadowWidth: 0.58 },
  { cellIndex: 9, food: "chicken-skewer", label: "닭꼬치", size: 1.15, yaw: 0.18, shadowWidth: 0.56 },
  { cellIndex: 10, food: "gyeongdan-skewer", label: "경단", size: 1.2, yaw: -0.16, shadowWidth: 0.76 },
  { cellIndex: 11, food: "sausage-skewer", label: "소시지", size: 1.15, yaw: 0.18, shadowWidth: 0.56 },
  { cellIndex: 12, food: "marshmallow-skewer", label: "마시멜로", size: 1.15, yaw: -0.16, shadowWidth: 0.56 },
  { cellIndex: 13, food: "hotteok", label: "호떡", size: 1.21, yaw: 0.16, shadowWidth: 0.76 },
  { cellIndex: 14, food: "pancake", label: "팬케이크", size: 1.2, yaw: -0.16, shadowWidth: 0.76 },
  { cellIndex: 15, food: "waffle", label: "와플", size: 1.2, yaw: 0.18, shadowWidth: 0.76 },
  { cellIndex: 16, food: "dorayaki", label: "도라야키", size: 1.20, yaw: -0.16, shadowWidth: 0.76 },
  { cellIndex: 17, food: "apple-pie", label: "애플파이", size: 1.2, yaw: 0.18, shadowWidth: 0.76 },
  { cellIndex: 18, food: "cheese-tart", label: "치즈타르트", size: 1.2, yaw: -0.16, shadowWidth: 0.76 },
  { cellIndex: 19, food: "fruit-parfait", label: "과일파르페", size: 1.11, yaw: 0.22, shadowWidth: 0.55 },
  { cellIndex: 20, food: "pudding", label: "푸딩", size: 1.1, yaw: -0.16, shadowWidth: 0.55 },
  { cellIndex: 21, food: "icecream-sundae", label: "아이스크림선데", size: 1.10, yaw: -0.20, shadowWidth: 0.55 },
  { cellIndex: 22, food: "tiramisu", label: "티라미수", size: 1.1, yaw: -0.16, shadowWidth: 0.55 },
  { cellIndex: 23, food: "yogurt", label: "요거트", size: 1.1, yaw: 0.18, shadowWidth: 0.55 },
  { cellIndex: 24, food: "chocolate-mousse", label: "초콜릿무스", size: 1.1, yaw: -0.16, shadowWidth: 0.55 },
  { cellIndex: 25, food: "croissant", label: "크루아상", size: 1.20, yaw: 0.16, shadowWidth: 0.76 },
  { cellIndex: 26, food: "bagel", label: "베이글", size: 1.20, yaw: -0.14, shadowWidth: 0.76 },
  { cellIndex: 27, food: "pretzel", label: "프레첼", size: 1.2, yaw: 0.18, shadowWidth: 0.76 },
  { cellIndex: 28, food: "salt-bread", label: "소금빵", size: 1.2, yaw: -0.16, shadowWidth: 0.76 },
  { cellIndex: 29, food: "melon-bread", label: "메론빵", size: 1.2, yaw: 0.18, shadowWidth: 0.76 },
  { cellIndex: 30, food: "cinnamon-roll", label: "시나몬롤", size: 1.20, yaw: 0.18, shadowWidth: 0.76 },
  { cellIndex: 31, food: "fries", label: "감자튀김", size: 1.18, yaw: 0.18, shadowWidth: 0.62 },
  { cellIndex: 32, food: "churros", label: "츄러스", size: 1.18, yaw: -0.17, shadowWidth: 0.62 },
  { cellIndex: 33, food: "roasted-chestnuts", label: "군밤", size: 1.18, yaw: 0.18, shadowWidth: 0.62 },
  { cellIndex: 34, food: "popcorn", label: "팝콘", size: 1.18, yaw: -0.16, shadowWidth: 0.62 },
  { cellIndex: 35, food: "dakgangjeong", label: "닭강정", size: 1.18, yaw: 0.18, shadowWidth: 0.62 },
  { cellIndex: 36, food: "mini-donuts", label: "미니도넛", size: 1.18, yaw: -0.16, shadowWidth: 0.62 },
]);

const SPECIAL_TYPES = new Set(["CHANCE", "ROULETTE", "AIRPORT"]);

export function getVisibleStage2Landmarks(cells, cellStatesByIndex, consumedCellIndexes) {
  const cellsByIndex = new Map(cells.map((cell) => [cell.cellIndex, cell]));
  const consumed = new Set(consumedCellIndexes);
  return LANDMARK_STAGE2.filter((landmark) => {
    const cell = cellsByIndex.get(landmark.cellIndex);
    if (!cell || landmark.cellIndex === 1) return false;
    const status = cellStatesByIndex?.get(landmark.cellIndex)?.status;
    if (cell.type === "CHALLENGE") return status === "CLEARED";
    if (SPECIAL_TYPES.has(cell.type)) return status === "CONSUMED" || consumed.has(landmark.cellIndex);
    return false;
  });
}
