import { useNavigate } from "react-router-dom";
import RulesScreen from "../components/RulesScreen.jsx";
import { ROUTES } from "../../../routes/routePaths.js";

// 기능 명세(2026-09-28) 기준. 칸 타입 5종과 찬스카드 5종을 반영한다.
const RULES = [
  {
    title: "주사위 굴리기",
    description: [
      "굴리기 기회는 팀이 함께 쓰며 최대 3회까지 보유합니다",
      "사용한 기회는 15분마다 1회씩 충전되고, 문제를 연 뒤 15분 안에 처음 풀면 1회를 추가로 받습니다",
      "굴리기와 이동 확정은 팀장만 할 수 있습니다",
    ],
  },
  {
    title: "출발 칸",
    description: [
      "출발 칸을 지나가면 100 마일리지를 받고, 출발 칸에 도착하면 주사위 기회 1회를 받습니다",
      "어떤 보상으로도 보유 기회는 3회를 넘지 않습니다",
    ],
  },
  {
    title: "찬스 칸",
    description: [
      "찬스 칸에 도착하면 팀장이 5가지 찬스카드 중 하나를 뽑고 주사위 기회 1회를 받습니다",
      "카드는 1장만 보유할 수 있어 2장이 되면 1장을 버려야 합니다",
    ],
  },
  {
    title: "룰렛 칸",
    description: [
      "룰렛 칸에 도착하면 팀장이 룰렛을 돌려 50, 100, 150, 200 마일리지 중 하나를 받습니다",
    ],
  },
  {
    title: "기차 칸",
    description: [
      "기차 칸에 도착하면 팀장이 아직 소모하지 않은 원하는 칸을 골라 바로 이동할 수 있습니다",
      "팀마다 한 번만 사용할 수 있습니다",
    ],
  },
  // 스케줄러 제한(사용자당 1개, 팀 최대 2개)과 참가 안내의 문제 서버 항목을 같은 말로 옮긴다
  {
    title: "문제 서버",
    description: [
      "문제 서버(인스턴스)는 팀장·팀원 각자 1개씩, 팀 전체 최대 2개까지 켤 수 있습니다",
      "다른 문제에서 새로 생성하면 켜 둔 인스턴스는 종료되고 작업 내용은 남지 않습니다",
      "팀원이 켠 인스턴스는 문제 상세에서 접속 주소를 같이 보고 쓸 수 있습니다",
      "본인 인스턴스만 재시작하거나 종료할 수 있고, KoTH 문제 서버는 이 제한과 따로 운영합니다",
    ],
  },
];

export default function RulesPage() {
  const navigate = useNavigate();
  const handleNavigateMain = () => navigate(ROUTES.board);

  return <RulesScreen rules={RULES} onNavigateMain={handleNavigateMain} />;
}
