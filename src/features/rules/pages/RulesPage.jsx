import RulesScreen from "../components/RulesScreen.jsx";

const RULES = [
  {
    icon: "🎲",
    title: "주사위 굴리기",
    description:
      "주사위를 한 번 굴리면 5분 후에 다시 주사위를 굴릴 수 있습니다. 대기 시간이 끝나면 다시 게임을 진행할 수 있습니다.",
  },
  {
    icon: "🏝️",
    title: "무인도",
    description:
      "무인도 칸에 도착하면 5분 동안 주사위를 굴릴 수 없습니다. 5분이 지나면 자동으로 무인도에서 탈출하여 다시 이동할 수 있습니다.",
  },
  {
    icon: "🎁",
    title: "찬스 칸",
    description:
      "찬스 칸에 도착하면 6가지 찬스 중 하나를 랜덤으로 획득합니다. 획득한 찬스를 활용해 게임을 더욱 유리하게 진행해 보세요!",
  },
  {
    icon: "🎡",
    title: "룰렛 칸",
    description:
      "룰렛 칸에 도착하면 룰렛을 돌려 랜덤한 양의 마일리지를 획득합니다. 어떤 만큼의 마일리지를 받을지는 룰렛 결과에 따라 결정됩니다.",
  },
  {
    icon: "🚂",
    title: "기차 칸",
    description:
      "기차 칸에 도착하면 원하는 칸을 직접 선택해 즉시 이동할 수 있습니다. 원하는 위치로 이동하여 자신에게 유리한 전략을 만들어 보세요.",
  },
];

export default function RulesPage() {
  const handleNavigateMain = () => {
    // TODO(rules): Main Page 구현 및 route 확정 후 ROUTES helper로 연결한다.
  };

  return <RulesScreen rules={RULES} onNavigateMain={handleNavigateMain} />;
}
