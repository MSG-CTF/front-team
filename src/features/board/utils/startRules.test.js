import assert from "node:assert/strict";
import test from "node:test";
import { adaptDiceStatus, adaptMovementResult, adaptMyBoard } from "./boardData.js";

test("START consumption remains available to board and travel destination filters", () => {
  const board = adaptMyBoard({
    consumed_cell_indexes: [1, 7],
    cell_states: [{ cell_index: 1, status: "CONSUMED", category: null }],
  });
  assert.deepEqual(board.consumedCellIndexes, [1, 7]);
  assert.equal(board.cellStates[0].cellIndex, 1);
});

test("START pass preserves the server mileage-only reward and skipped animation path", () => {
  const result = adaptMovementResult({
    current_position: 2, movement_path: [36, 1, 2], skipped_cells: [1],
    passed_start: true, start_reward: { mileage_gained: 100, roll_gained: 0 },
  });
  assert.deepEqual(result.movementPath, [36, 1, 2]);
  assert.deepEqual(result.skippedCells, [1]);
  assert.deepEqual(result.startReward, { mileage_gained: 100, roll_gained: 0 });
});

test("35 non-START cells are complete even when START is unconsumed", () => {
  const board = adaptMyBoard({
    consumed_cell_indexes: Array.from({ length: 35 }, (_, i) => i + 2),
    board_completed: true,
  });
  const dice = adaptDiceStatus({
    can_roll: false, blocked_reason: "BOARD_COMPLETED", dice_rolls_left: 1, next_dice_reset_at: null,
  });
  assert.equal(board.boardCompleted, true);
  assert.equal(board.consumedCellIndexes.includes(1), false);
  assert.equal(dice.canRoll, false);
  assert.equal(dice.blockedReason, "BOARD_COMPLETED");
  assert.equal(dice.nextDiceResetAt, null);
});
