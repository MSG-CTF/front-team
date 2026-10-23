export const BOARD_MOVEMENT_STEP_MS = 215;
export const BOARD_PIECE_TRANSITION_MS = 180;
export const START_CROSSING_SPEED = 1.75;

export function crossesBoardStart(previousPosition, movementPath) {
  if (!Array.isArray(movementPath) || movementPath.some(index => !Number.isInteger(index) || index < 1 || index > 36)) return false;
  const route = [previousPosition, ...movementPath];
  return route.some((index, step) => step > 0 && route[step - 1] === 36 && index === 1);
}

export function getBoardMovementTiming(previousPosition, movementPath, accelerateStart = false) {
  const speed = accelerateStart && crossesBoardStart(previousPosition, movementPath) ? START_CROSSING_SPEED : 1;
  return { stepMs: BOARD_MOVEMENT_STEP_MS / speed, transitionMs: BOARD_PIECE_TRANSITION_MS / speed };
}
