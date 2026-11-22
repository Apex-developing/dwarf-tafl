// ─── Dwarf Tafl — Game Controller (pure functions, immutable state) ───

import type {
  Axial,
  DieAction,
  DieFace,
  GameEvent,
  GameResult,
  GameState,
  Piece,
  PieceType,
  Side,
} from "./types";

import { axialDistance, getInitialPieces, isExit } from "./board";
import { resolveCaptures, checkKingSurrounded } from "./captures";
import {
  KING_MARCH_STEPS,
  generateDieActions,
  getLegalMoves,
  getMovesForPiece,
  getResurrectionCells,
  hasPlayableAction,
  isActionPlayable,
} from "./moves";

/** Every turn consists of exactly two actions. */
export const ACTIONS_PER_TURN = 2;

// ─── State Creation ───

/** Create a fresh game state with the initial board setup. */
export function createInitialState(): GameState {
  return {
    pieces: getInitialPieces(),
    currentSide: "rebels", // Rebels move first
    phase: "startTurn",
    dice: null,
    remainingActions: [],
    usedActions: [],
    captured: { clan: [], rebels: [] },
    turnNumber: 1,
    history: [],
    result: null,
    actedPieceIds: [],
    actionsTaken: 0,
  };
}

// ─── Dice ───

/** Tag every action with the source it came from (see `ActionBase.group`). */
function withGroup(actions: DieAction[], group: number): DieAction[] {
  return actions.map((a) => ({ ...a, group }));
}

/**
 * Build the pool of actions for a freshly rolled turn.
 *
 * - **Rebels:** one source per die (2 sources).
 * - **Clan:** the same two dice, which apply to the *Guards only*, plus a
 *   third source — the King's own march of up to 3 hexes (3 sources).
 *
 * In both cases the player completes two actions, each from a different source.
 */
export function buildActionPool(side: Side, dice: [DieFace, DieFace]): DieAction[] {
  const pool = [
    ...withGroup(generateDieActions(dice[0]), 0),
    ...withGroup(generateDieActions(dice[1]), 1),
  ];
  if (side === "clan") {
    pool.push({ kind: "kingMarch", maxSteps: KING_MARCH_STEPS, group: 2 });
  }
  return pool;
}

/** Roll two dice and transition to chooseDieAction. Uses crypto RNG. */
export function rollDice(state: GameState): GameState {
  if (state.phase !== "startTurn" && state.phase !== "rollingDice") {
    throw new Error(`Cannot roll dice in phase "${state.phase}"`);
  }

  const bytes = new Uint8Array(2);
  crypto.getRandomValues(bytes);
  const d1 = ((bytes[0] % 6) + 1) as DieFace;
  const d2 = ((bytes[1] % 6) + 1) as DieFace;
  return applyDice(state, [d1, d2]);
}

/**
 * Start the turn with the given dice and move to chooseDieAction.
 * `rollDice` feeds it random faces; the "physical dice" mode feeds it the
 * faces the players read off real dice, so both paths share every rule.
 */
export function applyDice(state: GameState, dice: [DieFace, DieFace]): GameState {
  if (state.phase !== "startTurn" && state.phase !== "rollingDice") {
    throw new Error(`Cannot set dice in phase "${state.phase}"`);
  }
  if (!dice.every((d) => Number.isInteger(d) && d >= 1 && d <= 6)) {
    throw new Error(`Invalid dice: ${dice.join(",")}`);
  }

  const event: GameEvent = { type: "diceRolled", dice };

  return {
    ...state,
    dice,
    phase: "chooseDieAction",
    remainingActions: buildActionPool(state.currentSide, dice),
    usedActions: [],
    history: [...state.history, event],
    shieldDoubleFirstMove: undefined,
    actedPieceIds: [],
    actionsTaken: 0,
    actionSnapshot: undefined,
  };
}

/**
 * Dice can be re-entered (a mistyped physical roll) only while nothing has
 * been played from them: the pool is untouched and no action is in hand.
 */
export function canResetDice(state: GameState): boolean {
  return (
    state.phase === "chooseDieAction" &&
    state.dice !== null &&
    (state.actionsTaken ?? 0) === 0 &&
    state.usedActions.length === 0
  );
}

/** Take the entered dice back and return to the start of the turn. */
export function resetDice(state: GameState): GameState {
  if (!canResetDice(state)) return state;
  const last = state.history[state.history.length - 1];
  return {
    ...state,
    phase: "startTurn",
    dice: null,
    remainingActions: [],
    usedActions: [],
    history: last?.type === "diceRolled" ? state.history.slice(0, -1) : state.history,
    shieldDoubleFirstMove: undefined,
    actedPieceIds: [],
    actionsTaken: 0,
    actionSnapshot: undefined,
  };
}

// ─── Action Selection ───

/**
 * Player selects one of the available actions.
 * Transitions to "chooseActor" (or "chooseDestination" for resurrect).
 *
 * Choosing an action uses up its whole source: the other option of the same
 * die (e.g. Shield → Single *or* Double) is discarded as well.
 */
export function selectAction(state: GameState, action: DieAction): GameState {
  if (state.phase !== "chooseDieAction") {
    throw new Error(`Cannot select action in phase "${state.phase}"`);
  }

  // Validate that this action is among remaining actions
  const idx = findActionIndex(state.remainingActions, action);
  if (idx === -1) {
    throw new Error(`Action "${action.kind}" not available`);
  }
  const chosen = state.remainingActions[idx];

  // An action nobody can carry out would leave the player stuck in the
  // "choose a piece" phase — refuse it up front.
  if (chosen.kind !== "runeResurrect" && !isActionPlayable(state, chosen)) {
    throw new Error(`No legal moves for action "${chosen.kind}"`);
  }

  // For runeResurrect, check if there are captured pieces to resurrect
  if (chosen.kind === "runeResurrect") {
    const resurrectable = state.captured[state.currentSide].filter((t) => t !== "king");
    if (resurrectable.length === 0) {
      throw new Error("No captured pieces available for resurrection");
    }
    if (getResurrectionCells(state, state.currentSide).length === 0) {
      throw new Error("No free cells in starting zone for resurrection");
    }
  }

  const event: GameEvent = { type: "actionSelected", action: chosen };

  return {
    ...state,
    phase: chosen.kind === "runeResurrect" ? "chooseDestination" : "chooseActor",
    // Drop every alternative that came from the same source
    remainingActions: state.remainingActions.filter((a) => a.group !== chosen.group),
    usedActions: [...state.usedActions, chosen],
    history: [...state.history, event],
    actionSnapshot: state.remainingActions,
  };
}

/**
 * Find the index of a matching action. Prefers an exact source (`group`)
 * match; actions without a group are matched by kind (and step limit).
 */
function findActionIndex(actions: DieAction[], target: DieAction): number {
  return actions.findIndex(
    (a) =>
      a.kind === target.kind &&
      (target.group === undefined || a.group === target.group) &&
      (a.kind !== "march" ||
        target.kind !== "march" ||
        a.maxSteps === target.maxSteps),
  );
}

// ─── Cancel Action ───

/** True if the action selected most recently can still be taken back. */
export function canCancelAction(state: GameState): boolean {
  return (
    (state.phase === "chooseActor" || state.phase === "chooseDestination") &&
    state.actionSnapshot !== undefined &&
    // Once the first half of a Shield-Double has been played the die is spent.
    state.shieldDoubleFirstMove === undefined
  );
}

/**
 * Take back the current action selection (before any piece has moved) so the
 * player can pick a different action. The dice stay rolled and every action
 * from the snapshot — including the sibling option of the same die — is
 * available again.
 */
export function cancelAction(state: GameState): GameState {
  if (!canCancelAction(state)) {
    throw new Error("Nothing to cancel: no action is waiting for a piece");
  }

  // Drop the "actionSelected" event that is being undone
  const lastEvent = state.history[state.history.length - 1];
  const history =
    lastEvent?.type === "actionSelected"
      ? state.history.slice(0, -1)
      : state.history;

  return {
    ...state,
    phase: "chooseDieAction",
    remainingActions: state.actionSnapshot!,
    usedActions: state.usedActions.slice(0, -1),
    history,
    actionSnapshot: undefined,
  };
}

// ─── Piece Selection ───

/** Mark a piece as selected (for UI highlighting). Pure state transition. */
export function selectPiece(state: GameState, pieceId: string): GameState {
  if (state.phase !== "chooseActor" && state.phase !== "chooseDestination") {
    throw new Error(`Cannot select piece in phase "${state.phase}"`);
  }

  const piece = state.pieces.get(pieceId);
  if (!piece) throw new Error(`Piece "${pieceId}" not found`);
  if (piece.side !== state.currentSide) {
    throw new Error(`Piece "${pieceId}" belongs to the wrong side`);
  }

  return {
    ...state,
    phase: "chooseDestination",
  };
}

// ─── Move Execution ───

/**
 * Execute a move: place piece at destination, resolve captures, check victory.
 * This handles March, ShieldSingle, RuneMove, KingMarch and both halves of
 * ShieldDouble.
 */
export function executeMove(
  state: GameState,
  pieceId: string,
  destination: Axial,
): GameState {
  if (
    state.phase !== "chooseDestination" &&
    state.phase !== "chooseActor"
  ) {
    throw new Error(`Cannot execute move in phase "${state.phase}"`);
  }

  const piece = state.pieces.get(pieceId);
  if (!piece) throw new Error(`Piece "${pieceId}" not found`);

  const from = piece.cell;

  // Apply the move
  const movedPiece: Piece = { ...piece, cell: destination };
  const newPieces = new Map(state.pieces);
  newPieces.set(pieceId, movedPiece);

  const moveEvent: GameEvent = {
    type: "pieceMoved",
    pieceId,
    from,
    to: destination,
  };

  let newState: GameState = {
    ...state,
    pieces: newPieces,
    history: [...state.history, moveEvent],
    phase: "resolveCaptures",
    // This piece has now received a die result — it is locked for the turn.
    actedPieceIds: [...(state.actedPieceIds ?? []), pieceId],
    actionSnapshot: undefined,
  };

  // Resolve custodial captures
  const captureResult = resolveCaptures(newState, destination);
  newState = captureResult.newState;

  // Check victory conditions
  const result = checkVictory(newState, movedPiece);
  if (result) {
    return finishGame(newState, result);
  }

  // Determine next phase
  const currentAction = state.usedActions[state.usedActions.length - 1];

  // Handle ShieldDouble: after first move, need second move with a different piece
  if (currentAction?.kind === "shieldDouble" && !state.shieldDoubleFirstMove) {
    const midState: GameState = {
      ...newState,
      phase: "chooseActor",
      shieldDoubleFirstMove: { pieceId, from, to: destination },
    };
    // Only wait for the second piece if one can actually move; otherwise the
    // die is spent and the turn carries on.
    if (getLegalMoves(midState, { kind: "shieldDouble" }).size > 0) {
      return midState;
    }
  }

  return continueTurn({ ...newState, shieldDoubleFirstMove: undefined });
}

/**
 * An action has been fully carried out. If the turn's second action is still
 * to come (and can be played), offer the remaining sources; otherwise end
 * the turn.
 */
function continueTurn(state: GameState): GameState {
  const taken = (state.actionsTaken ?? 0) + 1;
  const next: GameState = { ...state, actionsTaken: taken };

  if (
    taken < ACTIONS_PER_TURN &&
    next.remainingActions.length > 0 &&
    hasPlayableAction(next)
  ) {
    return {
      ...next,
      phase: "chooseDieAction",
      shieldDoubleFirstMove: undefined,
    };
  }
  return endTurn(next);
}

function finishGame(state: GameState, result: GameResult): GameState {
  const gameOverEvent: GameEvent = { type: "gameOver", result };
  return {
    ...state,
    phase: "gameOver",
    result,
    history: [...state.history, gameOverEvent],
  };
}

// ─── Shield Double First Move ───

/**
 * Handle the first of two 1-hex moves in a Shield Double action.
 * This is a convenience wrapper — internally calls executeMove and
 * ensures the state tracks the first move.
 */
export function applyShieldDoubleFirstMove(
  state: GameState,
  pieceId: string,
  dest: Axial,
): GameState {
  return executeMove(state, pieceId, dest);
}

// ─── Resurrection ───

/**
 * Execute a Rune Resurrect action: return a captured warrior to a starting-zone cell.
 * The returned warrior counts as having moved: it can capture enemies it lands
 * next to (and a returned Rebel can complete the surrounding of the King).
 */
export function executeResurrection(
  state: GameState,
  pieceType: PieceType,
  cell: Axial,
): GameState {
  if (pieceType === "king") {
    throw new Error("Cannot resurrect the King");
  }

  const side = state.currentSide;

  // Remove one instance of this type from captured list
  const newCaptured: Record<Side, PieceType[]> = {
    clan: [...state.captured.clan],
    rebels: [...state.captured.rebels],
  };

  const capturedList = newCaptured[side];
  const capturedIdx = capturedList.indexOf(pieceType);
  if (capturedIdx === -1) {
    throw new Error(`No captured ${pieceType} available to resurrect`);
  }
  capturedList.splice(capturedIdx, 1);

  // Create the resurrected piece
  const newId = `${pieceType}-resurrected-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const newPiece: Piece = {
    id: newId,
    type: pieceType,
    side,
    cell,
  };

  const newPieces = new Map(state.pieces);
  newPieces.set(newId, newPiece);

  const event: GameEvent = {
    type: "pieceResurrected",
    pieceId: newId,
    cell,
  };

  let newState: GameState = {
    ...state,
    pieces: newPieces,
    captured: newCaptured,
    history: [...state.history, event],
    // The returned warrior consumed this die's result — it cannot also take
    // the other action this turn.
    actedPieceIds: [...(state.actedPieceIds ?? []), newId],
    actionSnapshot: undefined,
  };

  // Landing next to enemies can capture them, just like a normal move
  newState = resolveCaptures(newState, cell).newState;

  const result = checkVictory(newState, newPiece);
  if (result) {
    return finishGame(newState, result);
  }

  return continueTurn(newState);
}

// ─── Victory Check ───

/**
 * Check if the game has ended.
 * - King on an Exit → Clan wins (escape).
 * - King surrounded by 3+ hostile neighbours → Rebels win (surrounded).
 *
 * The King is only ever captured **by a Rebel move**, never by his own side's
 * move: just like an ordinary piece that walks between two enemies is safe,
 * the King may step into a pocket. So when `mover` is given, the surround
 * check runs only if that mover is a Rebel standing next to the King (i.e. the
 * move that completes the encirclement). Without a `mover` the position is
 * judged statically (used by tests and analysis tools).
 */
export function checkVictory(state: GameState, mover?: Piece): GameResult | null {
  // 1. King escape
  const king = findKing(state);
  if (king && isExit(king.cell)) {
    return { winner: "clan", reason: "escape" };
  }

  // 2. King surrounded
  if (king && checkKingSurrounded(state)) {
    const completedByRebelMove =
      mover === undefined ||
      (mover.side === "rebels" && axialDistance(mover.cell, king.cell) === 1);
    if (completedByRebelMove) {
      return { winner: "rebels", reason: "surrounded" };
    }
  }

  return null;
}

/**
 * Check for a stalemate. Called at the start of a turn: if the side to move
 * cannot move a single piece, the game is a **draw**.
 */
export function checkNoMoves(state: GameState): GameResult | null {
  for (const piece of state.pieces.values()) {
    if (piece.side !== state.currentSide) continue;
    // Any piece that can step at least one hex (the King uses his own action)
    const probe: DieAction =
      piece.type === "king"
        ? { kind: "kingMarch", maxSteps: KING_MARCH_STEPS }
        : { kind: "march", maxSteps: 1 };
    if (getMovesForPiece(state, piece.id, probe).length > 0) return null;
  }

  return { winner: null, reason: "noMoves" };
}

// ─── Turn Management ───

/** End the current turn and switch to the other side. */
export function endTurn(state: GameState): GameState {
  const nextSide: Side = state.currentSide === "clan" ? "rebels" : "clan";
  const nextTurn = state.currentSide === "rebels" ? state.turnNumber + 1 : state.turnNumber;

  const event: GameEvent = {
    type: "turnEnded",
    side: state.currentSide,
    turnNumber: state.turnNumber,
  };

  const newState: GameState = {
    ...state,
    currentSide: nextSide,
    phase: "startTurn",
    dice: null,
    remainingActions: [],
    usedActions: [],
    turnNumber: nextTurn,
    history: [...state.history, event],
    shieldDoubleFirstMove: undefined,
    actedPieceIds: [],
    actionsTaken: 0,
    actionSnapshot: undefined,
  };

  // Check if the new current side has any legal moves
  const noMovesResult = checkNoMoves(newState);
  if (noMovesResult) {
    return finishGame(newState, noMovesResult);
  }

  return newState;
}

// ─── Selectable Pieces ───

/**
 * Returns IDs of pieces belonging to the current side that have at least
 * one legal move for the given action.
 */
export function getSelectablePieces(
  state: GameState,
  action: DieAction,
): string[] {
  if (action.kind === "runeResurrect") {
    // For resurrection, there are no "selectable pieces" on the board
    return [];
  }

  const moveMap = getLegalMoves(state, action);
  return Array.from(moveMap.keys());
}

// ─── Helpers ───

function findKing(state: GameState): Piece | undefined {
  for (const piece of state.pieces.values()) {
    if (piece.type === "king") return piece;
  }
  return undefined;
}
