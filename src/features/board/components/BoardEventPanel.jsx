import { useEffect, useState } from "react";
import { BLOCKED_REASON_MESSAGES } from "../data/boardContent.js";
import MileageRouletteModal from "./MileageRouletteModal.jsx";
import GoldenKeyCard from "./GoldenKeyCard.jsx";
import ChallengeSelection, { ReopenBoardEvent, ReopenChallengeSelection } from "./ChallengeSelection.jsx";
import { isChallengeSelectionEmpty } from "../utils/challengeSelection.js";
import styles from "./BoardScreen.module.css";

const OFFSET_OPTIONS = [-3, -2, -1, 1, 2, 3];

// 보드 위 이벤트 창은 열린 문제 패널과 같은 종이, 제목, 닫기 그림, 명판 단추를 쓴다
function PanelShell({ title, children, onClose, inline = false }) {
  return (
    <section className={`${styles.eventPanel} ${styles.paperSheet}`} aria-label={title} data-inline={inline || undefined}>
      <div className={styles.sheetHeader}>
        <h2 className={styles.sheetTitle}>{title}</h2>
        {onClose && (
          <button type="button" onClick={onClose} className={styles.sheetClose} aria-label="팝업 닫기">
            <img src="/assets/board/icon-close-round.png" alt="" aria-hidden="true" />
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

// 고른 쪽을 바로 실행하는 단추는 나무 명판, 다른 쪽은 같은 모양의 금테 명판
function ActionButton({ children, disabled, onClick, quiet = false }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} className={styles.plaqueAction} data-tone={quiet ? "quiet" : undefined}>
      {children}
    </button>
  );
}

function OffsetSelect({ value, disabled, onChange }) {
  return (
    <select aria-label="추가 이동 칸 수" value={value} disabled={disabled} onChange={(event) => onChange(Number(event.target.value))} className={styles.sheetSelect}>
      {OFFSET_OPTIONS.map((option) => <option key={option} value={option}>{option > 0 ? `+${option}` : option}칸</option>)}
    </select>
  );
}

function PendingRollActions({
  pendingRoll,
  postRollCards,
  isMutating,
  onConfirmDice,
  onUseChanceCard,
}) {
  const [offset, setOffset] = useState(1);

  return (
    <PanelShell title="주사위 결과 확인">
      <p className={styles.sheetText}>
        {pendingRoll
          ? `${pendingRoll.diceA} + ${pendingRoll.diceB} = ${pendingRoll.rolledNumber}, ${pendingRoll.currentPosition}번 칸으로 이동합니다`
          : "보류 중인 주사위 이동 결과가 있습니다"}
      </p>
      {postRollCards.length > 0 && (
        <ul className={styles.sheetChoices}>
          {postRollCards.map((card) => (
            <li key={card.cardId} className={`${styles.eventCardRow} ${styles.sheetChoice}`}>
              <span className={styles.sheetChoiceText}><strong>{card.name || card.cardId}</strong></span>
              {card.cardId === "card_move_offset" && <OffsetSelect value={offset} disabled={isMutating} onChange={setOffset} />}
              <ActionButton quiet disabled={isMutating}
                onClick={() => onUseChanceCard(card.cardId, card.cardId === "card_move_offset" ? { offset } : undefined)}>
                카드 사용
              </ActionButton>
            </li>
          ))}
        </ul>
      )}
      <div className={styles.sheetActions}>
        <ActionButton disabled={isMutating} onClick={onConfirmDice}>일반 이동 확정</ActionButton>
      </div>
    </PanelShell>
  );
}

function ChanceChoice({ choice, isMutating, onConfirmChance }) {
  return (
    <PanelShell title="주사위 결과 선택">
      <p className={styles.sheetText}>두 결과 중 이동에 사용할 숫자를 선택해주세요</p>
      <div className={styles.sheetActions} data-columns="2">
        <ActionButton disabled={isMutating} onClick={() => onConfirmChance("FIRST")}>첫 번째 {choice.firstNumber}</ActionButton>
        <ActionButton disabled={isMutating} onClick={() => onConfirmChance("SECOND")}>두 번째 {choice.secondNumber}</ActionButton>
      </div>
    </PanelShell>
  );
}

function DiscardChanceCard({ cards, isMutating, onDiscardChance }) {
  const [cardId, setCardId] = useState(cards[0]?.cardId ?? "");

  useEffect(() => {
    setCardId(cards[0]?.cardId ?? "");
  }, [cards]);

  return (
    <PanelShell title="찬스카드 폐기">
      <p className={styles.sheetText}>보유 한도를 초과했습니다 다른 행동 전에 한 장을 선택해 폐기해주세요</p>
      <div className={styles.sheetChoices} role="radiogroup" aria-label="버릴 찬스카드">
        {cards.map((card) => (
          <label key={card.cardId} className={`${styles.eventCardRow} ${styles.sheetChoice}`} data-checked={cardId === card.cardId || undefined}>
            <input type="radio" name="discard-card" value={card.cardId} checked={cardId === card.cardId} disabled={isMutating}
              onChange={() => setCardId(card.cardId)} />
            <span className={styles.sheetChoiceText}>
              <strong>{card.name || card.cardId}</strong>
              {card.description && <span>{card.description}</span>}
            </span>
          </label>
        ))}
      </div>
      <div className={styles.sheetActions}>
        <ActionButton disabled={isMutating || !cardId} onClick={() => onDiscardChance(cardId)}>선택한 카드 폐기</ActionButton>
      </div>
    </PanelShell>
  );
}

function ChanceDrawEvent({ event, isMutating, onRetry, onClose }) {
  if (event.status === "loading") {
    return (
      <PanelShell title="황금열쇠">
        <p className={styles.sheetText} role="status">찬스카드를 뽑고 있습니다</p>
      </PanelShell>
    );
  }

  if (event.status === "error") {
    return (
      <PanelShell title="황금열쇠" onClose={onClose}>
        <p className={styles.sheetText} role="alert">{event.error.message}</p>
        <div className={styles.sheetActions}>
          <ActionButton disabled={isMutating} onClick={() => onRetry(event.token)}>다시 시도</ActionButton>
        </div>
      </PanelShell>
    );
  }

  return (
    <GoldenKeyCard card={event.result} onClose={onClose} />
  );
}

export default function BoardEventPanel({
  myBoard,
  currentCell,
  pendingRoll,
  pendingChanceChoice,
  cellEvent,
  ownedChanceCards,
  awaitingDiscard,
  blockedReason,
  isMutating,
  isAirportSelecting,
  isLoading,
  onReload,
  onConfirmDice,
  onOpenChallenge,
  onUseChanceCard,
  onConfirmChance,
  onDiscardChance,
  onSpinRoulette,
  onRetryChanceDraw,
  onCloseCellEvent,
  isRouletteOpen = true,
  onReopenRoulette,
  isChallengeSelectionOpen = true,
  onCloseChallengeSelection,
  onReopenChallengeSelection,
  errorMessage,
  rollResultUnconfirmed = false,
}) {
  if (rollResultUnconfirmed) return null;
  if (!myBoard) return null;

  if (awaitingDiscard) {
    return (
      <DiscardChanceCard
        cards={ownedChanceCards}
        isMutating={isMutating}
        onDiscardChance={onDiscardChance}
      />
    );
  }

  if (pendingChanceChoice) {
    return (
      <ChanceChoice
        choice={pendingChanceChoice}
        isMutating={isMutating}
        onConfirmChance={onConfirmChance}
      />
    );
  }

  if (pendingRoll || blockedReason === "PENDING_CONFIRM") {
    const postRollCards = ownedChanceCards.filter(
      (card) => card.usableNow && card.usageTiming === "POST_ROLL",
    );
    return (
      <PendingRollActions
        pendingRoll={pendingRoll}
        postRollCards={postRollCards}
        isMutating={isMutating}
        onConfirmDice={onConfirmDice}
        onUseChanceCard={onUseChanceCard}
      />
    );
  }

  if (cellEvent?.type === "CHANCE") {
    return (
      <ChanceDrawEvent
        event={cellEvent}
        isMutating={isMutating}
        onRetry={onRetryChanceDraw}
        onClose={onCloseCellEvent}
      />
    );
  }

  if (cellEvent?.type === "ROULETTE") {
    if (!isRouletteOpen) return <ReopenBoardEvent onClick={onReopenRoulette}>룰렛 다시 보기</ReopenBoardEvent>;
    return (
      <MileageRouletteModal
        key={cellEvent.token}
        event={cellEvent}
        isMutating={isMutating}
        onSpin={onSpinRoulette}
        onClose={onCloseCellEvent}
        errorMessage={errorMessage}
      />
    );
  }

  if (
    currentCell?.type === "CHALLENGE" &&
    currentCell.challengeCandidates?.length > 0
  ) {
    if (!isChallengeSelectionOpen) return <ReopenChallengeSelection onClick={onReopenChallengeSelection} />;
    return (
      <ChallengeSelection
        key={JSON.stringify([currentCell.cellIndex, currentCell.challengeCandidates.map((candidate) => candidate.challengeId)])}
        candidates={currentCell.challengeCandidates}
        isMutating={isMutating}
        onOpenChallenge={onOpenChallenge}
        onClose={onCloseChallengeSelection}
        errorMessage={errorMessage}
      />
    );
  }

  if (isChallengeSelectionEmpty({ myBoard, currentCell, blockedReason })) {
    return (
      <PanelShell title="선택할 수 있는 문제가 없어요">
        <p className={styles.sheetText} role="status">
          현재 이 칸에서 선택할 수 있는 공개 문제가 없어요<br />
          운영진에 문의하고 잠시 후 다시 조회해주세요
        </p>
        <div className={styles.sheetActions}>
          <ActionButton disabled={isLoading || isMutating} onClick={onReload}>
            {isLoading ? "불러오는 중" : "문제 다시 불러오기"}
          </ActionButton>
        </div>
      </PanelShell>
    );
  }

  // 기차여행 목적지 선택(Figma 555:342)은 BoardScreen의 AirportTravelOverlay가 맡는다.
  if (isAirportSelecting) return null;

  // active_challenge 존재 여부가 아니라 blockedReason(=diceStatus.timer_running
  // 기반)으로 "진행 중인 문제"를 판정한다. active_challenge는 15분 제한시간이
  // 지나도 다음 액션 전까지 서버가 비우지 않을 수 있어서, 그걸 기준으로 삼으면
  // 만료 후에도 이 안내가 계속 떠 있게 된다.
  if (myBoard.boardCompleted || blockedReason === "TIMER_RUNNING") {
    const message = myBoard.boardCompleted
      ? BLOCKED_REASON_MESSAGES.BOARD_COMPLETED
      : BLOCKED_REASON_MESSAGES.TIMER_RUNNING;
    return (
      <PanelShell title={myBoard.boardCompleted ? "보드 완료" : "진행 중인 문제"} inline>
        <p className={styles.sheetText}>{message}</p>
      </PanelShell>
    );
  }

  return null;
}
