import { useCallback, useState } from "react";
import usePageResources from "../../../routes/usePageResources.js";
import { SignatureFestivalScreen } from "../pages/SignaturesPage.jsx";
import BoothMenuModal from "../components/BoothMenuModal.jsx";
import { FESTIVAL_CLUBS } from "../utils/festivalBooths.js";
import styles from "./BoothMenuPreviewPage.module.css";

// 개발 전용 fixture. 운영 공개 상태/서버/팀 데이터와 연결하지 않는다.
const titles = ["등불 아래의 초대장", "바람이 전하는 암호", "가을 우체국의 편지", "오래된 시장의 비밀 지도", "낙엽이 남긴 흔적을 따라 찾아가는 가을 축제의 마지막 약속", "호숫가의 마지막 불빛"];
const descriptions = [
  "첫 번째 등불 아래에 작은 초대장이 놓여 있습니다.\n종이에 남겨진 단서를 따라 축제의 숨겨진 이야기를 찾아보세요.",
  "천막 사이를 지나가는 바람이 짧은 노래를 들려줍니다.\n서로 다른 음표에 담긴 메시지를 살펴보세요.",
  "가을 우체국에 주인을 잃은 편지가 도착했습니다.\n봉투에 남은 흔적에서 편지의 목적지를 찾아보세요.",
  "오래된 상인이 건넨 지도에는 축제장의 작은 골목이 그려져 있습니다.\n지도 속 표식들이 가리키는 장소를 확인해 보세요.",
  Array.from({ length: 18 }, (_, i) => `${i + 1}. 낙엽 사이의 기록\n가을 시장에 남겨진 발자국과 작은 표식들을 살펴보세요. 이야기는 오래된 약속으로 이어집니다.`).join("\n\n"),
  "호숫가에 남은 마지막 등불을 찾아보세요.\n잔잔한 수면에 비친 풍경이 다음 단서가 될지도 모릅니다.",
];
const problems = FESTIVAL_CLUBS.map((club, index) => ({
  signature_id: `preview-${club.key}`, club_id: `preview-${club.key}`, club_name: club.name,
  title: titles[index], description: descriptions[index], score: 150 + index * 75,
  solved_team_count: 0, is_solved: false, solved_at: null,
}));

export default function BoothMenuPreviewPage() {
  usePageResources();
  const [selected, setSelected] = useState(null);
  const close = useCallback(() => setSelected(null), []);
  const show = useCallback(club => setSelected(club), []);
  return <div onClickCapture={event => {
    if (event.target.closest("a")) { event.preventDefault(); event.stopPropagation(); }
  }}>
    <SignatureFestivalScreen state={{ status: "success", data: problems, retry() {} }} onPreviewClub={show} />
    {!selected && <p className={styles.notice}>개발용 샘플 · 실제 API 요청 없음 · 여섯 부스를 클릭해 메뉴판을 확인하세요.</p>}
    {selected && <BoothMenuModal key={selected.clubId} club={selected}
      challenge={selected.problems[0]} status="success" onClose={close} />}
  </div>;
}
