import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import BoardScreen from "../components/BoardScreen.jsx";
import { PREVIEW_BOARD_STATE } from "../data/previewBoardData.js";

// 문제 리스트(보드) 페이지 - README.md "2. 문제 리스트(보드) 페이지".
//
// 1차 구현은 Figma 시안(node 3:2 / 146:19) 그대로의 정적 UI + 목업 상태다.
// README.md 12-3절 권장대로 "목업으로 UI 먼저, API 나중에 연동" 순서를 따른다.
// 무인도 모달은 리뷰용으로 `?preview=quarantine`에서 열린다(MyPage의 ?preview=mypage와 동일 패턴).
//
// TODO(board): 아래 연동 필요 (src/api/board.js + 신규 GET 엔드포인트).
// - GET /board, GET /board/me, GET /board/dice/status -> board state로 어댑트
// - rollDice(): POST /board/dice/roll (Idempotency-Key, 팀장만) -> 이동 애니메이션
// - onSelectCell(): 도착 칸이면 GET /board/cell/current -> 문제 후보 3개 모달
// - 무인도(QUARANTINE) 도착 시 모달 + POST /board/quarantine/escape
// - 응답 성공 판정은 code === "SUCCESS" 기준(README.md 0-2절)
export default function BoardPage() {
  const [searchParams] = useSearchParams();
  const [board] = useState(PREVIEW_BOARD_STATE);
  const [showQuarantine, setShowQuarantine] = useState(
    searchParams.get("preview") === "quarantine",
  );

  const handleRollDice = () => {
    // TODO(board): rollDice() 연동.
    console.log("roll dice");
  };

  const handleSelectCell = (cellIndex) => {
    // TODO(board): 도착 칸 타입에 따라 분기(문제 선택 모달 / 찬스 / 룰렛 / 무인도).
    console.log("select cell", cellIndex);
  };

  const handleOpenRound = () => {
    // TODO(board): KOTH 라운드 상세(개방 일정 등) - GET /koth/clubs 확정 후.
    console.log("open round info");
  };

  return (
    <BoardScreen
      board={{ ...board, isQuarantined: showQuarantine }}
      showQuarantine={showQuarantine}
      onRollDice={handleRollDice}
      onSelectCell={handleSelectCell}
      onOpenRound={handleOpenRound}
      onCloseQuarantine={() => setShowQuarantine(false)}
    />
  );
}
