import { useNavigate } from "react-router-dom";
import RulesScreen from "../components/RulesScreen.jsx";
import { ROUTES } from "../../../routes/routePaths.js";

const RULES = [
  {
    icon: "🎲",
    title: "주사위 굴리기",
    description:
      "주사위는 최대 3회까지 보유하며, 남은 횟수가 있으면 대기 없이 연속으로 굴릴 수 있습니다. 문제 칸에서는 도전할 문제를 먼저 선택해 주세요. 사용한 주사위는 15분마다 1회씩 충전됩니다.",
  },
  {
    icon: "🏁",
    title: "START와 보드 완료",
    description:
      "START는 팀별로 한 번만 도착할 수 있으며, 이때 주사위 +1을 받습니다(최대 3회). 통과 마일리지 100은 매번 지급됩니다. 이후 START는 건너뛰며, 나머지 35칸을 모두 소모하면 완료됩니다.",
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
  const navigate = useNavigate();
  const handleNavigateMain = () => navigate(ROUTES.board);

  return <RulesScreen rules={RULES} onNavigateMain={handleNavigateMain} />;
}
