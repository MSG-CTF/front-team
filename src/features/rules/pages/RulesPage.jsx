import { useNavigate } from "react-router-dom";
import { ROUTES } from "../../../routes/routePaths.js";
import RulesScreen from "../components/RulesScreen.jsx";

const RULES = [
  {
    icon: "🎲",
    title: "주사위 굴리기",
    description:
      "주사위는 처음에 3개가 주어집니다. 사용한 주사위는 15분마다 1개씩 충전되며, 최대 3개까지 보유할 수 있습니다. 문제 선택이나 결과 확정이 남아 있거나 문제 제한 시간이 진행 중이면 먼저 해당 단계를 완료해주세요.",
  },
  {
    icon: "🎁",
    title: "찬스 칸",
    description:
      "7번과 30번 찬스 칸에서 5종의 카드 중 한 장을 뽑고 주사위 1개를 받습니다. 카드가 2장이 되면 한 장을 폐기해야 합니다. 카드마다 사용할 수 있는 시점이 다릅니다.",
  },
  {
    icon: "🎡",
    title: "룰렛 칸",
    description:
      "16번과 25번 룰렛 칸에서 각각 팀당 한 번 룰렛을 돌릴 수 있습니다. 50·100·150·200 마일리지 중 하나를 같은 확률로 받습니다.",
  },
  {
    icon: "🚂",
    title: "세계여행 칸",
    description:
      "21번 세계여행 칸에서는 아직 소모하지 않은 칸을 선택해 즉시 이동할 수 있습니다. 이 이동은 팀당 한 번만 사용할 수 있습니다.",
  },
];

export default function RulesPage() {
  const navigate = useNavigate();
  const handleNavigateMain = () => {
    navigate(ROUTES.board);
  };

  return <RulesScreen rules={RULES} onNavigateMain={handleNavigateMain} />;
}
