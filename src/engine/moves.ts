// ─── Dwarf Tafl — Move Generation ───

import type { Axial, DieAction, DieFace, GameState, PieceType, Side } from "./types";
import {
  DIRECTIONS,
  BOARD_RADIUS,
  cellKey,
  isExit,
  isOnBoard,
  isThrone,
  getStartingZoneCells,
} from "./board";

/** How far the King may move with his own action (Clan only). */
export const KING_MARCH_STEPS = 3;

// ─── Die Face → Actions ───

/**
 * Convert a raw die face into the available action choices.
 * - 1–4 → single March action with maxSteps = face value
 * - 5 (Shield) → ShieldSingle (1 piece up to 5) OR ShieldDouble (2 different pieces 1 each)
 * - 6 (Rune) → RuneMove (unlimited straight) OR RuneResurrect (return lost warrior)
 */
export function generateDieActions(face: DieFace): DieAction[] {
  switch (face) {
    case 1:
    case 2:
    case 3:
    case 4:
      return [{ kind: "march", maxSteps: face }];
    case 5:
      return [
        { kind: "shieldSingle", maxSteps: 5 },
        { kind: "shieldDouble" },
      ];
    case 6:
      return [
        { kind: "runeMove" },
        { kind: "runeResurrect" },
      ];
  }
}

// ─── Stopping / Transit Rules ───

/**
 * Whether a piece of the given type may **stop** on `cell`.
 * Guards and attackers cannot stop on Throne or Exits; King can.
 */
export function canStopOn(cell: Axial, pieceType: PieceType): boolean {
  if (pieceType === "king") return true;
  // Guards/attackers may not rest on special cells
  return !isThrone(cell) && !isExit(cell);
}

/**
 * Whether a piece may **pass through** `cell` during movement.
 * A cell is passable if it is on the board, and either empty or
 * a special cell with no piece currently on it.
 * Caller must also supply occupancy info (the state's piece map).
 */
export function canPassThrough(state: GameState, cell: Axial): boolean {
  if (!isOnBoard(cell)) return false;
  // Check if any piece sits on this cell
  return !getPieceAtCell(state, cell);
}

// ─── Helpers ───

/** Find a piece occupying the given cell, or undefined. */
function getPieceAtCell(state: GameState, cell: Axial): string | undefined {
  const key = cellKey(cell);
  for (const [id, piece] of state.pieces) {
    if (cellKey(piece.cell) === key) return id;
  }
  return undefined;
}

/** Build a Set of occupied cell keys for fast lookups. */
function buildOccupied(state: GameState): Set<string> {
  const occ = new Set<string>();
  for (const piece of state.pieces.values()) {
    occ.add(cellKey(piece.cell));
  }
  return occ;
}

// ─── Straight-Line Move Generation ───

/**
 * Returns all legal destination cells for a piece moving in straight lines
 * along the 6 hex directions, up to `maxSteps` per direction.
 * Pieces cannot jump over others and must respect stop rules.
 */
export function getStraightLineMoves(
  state: GameState,
  from: Axial,
  maxSteps: number,
  pieceType: PieceType,
): Axial[] {
  const occupied = buildOccupied(state);
  const destinations: Axial[] = [];

  for (const dir of DIRECTIONS) {
    let cur = from;
    for (let step = 0; step < maxSteps; step++) {
      const next: Axial = { q: cur.q + dir.q, r: cur.r + dir.r };
      if (!isOnBoard(next)) break;
      if (occupied.has(cellKey(next))) break; // blocked by another piece
      // Cell is empty — can we stop here?
      if (canStopOn(next, pieceType)) {
        destinations.push(next);
      }
      // Even if we can't stop, we can transit through (keep walking)
      cur = next;
    }
  }

  return destinations;
}

// ─── Per-Action Move Maps ───

/**
 * For the given action, return all legal destinations for a specific piece.
 * Returns an empty array if the piece cannot act under this action.
 */
export function getMovesForPiece(
  state: GameState,
  pieceId: string,
  action: DieAction,
): Axial[] {
  const piece = state.pieces.get(pieceId);
  if (!piece) return [];

  // Only current side's pieces can move
  if (piece.side !== state.currentSide) return [];

  // A piece that already received the result of one die this turn is locked:
  // the results of both dice can never be applied to the same piece.
  if (state.actedPieceIds?.includes(pieceId)) return [];

  // The King moves only with his own action; dice results never apply to him.
  // (And the King's action never applies to anyone else.)
  if (action.kind === "kingMarch") {
    if (piece.type !== "king") return [];
    return getStraightLineMoves(state, piece.cell, action.maxSteps, "king");
  }
  if (piece.type === "king") return [];

  switch (action.kind) {
    case "march":
      return getStraightLineMoves(state, piece.cell, action.maxSteps, piece.type);

    case "shieldSingle":
      return getStraightLineMoves(state, piece.cell, action.maxSteps, piece.type);

    case "shieldDouble": {
      // If this is the second move of a shield-double, only *different* pieces are eligible
      if (state.shieldDoubleFirstMove && state.shieldDoubleFirstMove.pieceId === pieceId) {
        return [];
      }
      return getStraightLineMoves(state, piece.cell, 1, piece.type);
    }

    case "runeMove":
      // Unlimited straight-line movement
      return getStraightLineMoves(state, piece.cell, BOARD_RADIUS * 2, piece.type);

    case "runeResurrect":
      // Resurrect does not move existing pieces on the board
      return [];
  }
}

/**
 * For the given action, compute a map of pieceId → legal destinations
 * for every piece of the current side that has at least one legal move.
 */
export function getLegalMoves(
  state: GameState,
  action: DieAction,
): Map<string, Axial[]> {
  const moveMap = new Map<string, Axial[]>();

  if (action.kind === "runeResurrect") {
    // No board movement — this action resurrects a captured piece instead.
    // The caller (game.ts) handles resurrection cell selection separately.
    return moveMap;
  }

  for (const [id, piece] of state.pieces) {
    if (piece.side !== state.currentSide) continue;
    const moves = getMovesForPiece(state, id, action);
    if (moves.length > 0) {
      moveMap.set(id, moves);
    }
  }

  return moveMap;
}

// ─── Playability ───

/**
 * True if the current side can actually carry out `action` right now
 * (some eligible piece can move, or a captured warrior can be resurrected).
 */
export function isActionPlayable(state: GameState, action: DieAction): boolean {
  if (action.kind === "runeResurrect") {
    const resurrectable = state.captured[state.currentSide].filter((t) => t !== "king");
    return resurrectable.length > 0 && getResurrectionCells(state, state.currentSide).length > 0;
  }
  return getLegalMoves(state, action).size > 0;
}

/** True if at least one of the remaining actions can be carried out. */
export function hasPlayableAction(state: GameState): boolean {
  return state.remainingActions.some((a) => isActionPlayable(state, a));
}

// ─── Resurrection ───

/**
 * Returns free cells in the side's starting zone where a resurrected piece
 * can be placed.  Guards use guard start positions; attackers use rebel start cells.
 * Only cells not currently occupied are returned.
 * Note: guards can't stop on Throne, so Throne is excluded from guard resurrection.
 */
export function getResurrectionCells(state: GameState, side: Side): Axial[] {
  const zone = getStartingZoneCells(side);
  const occupied = buildOccupied(state);

  return zone.filter((cell) => {
    if (occupied.has(cellKey(cell))) return false;
    // Respect stopping rules: guards/attackers can't stop on Throne/Exits
    // (The starting zone cells shouldn't include such, but guard against edge cases)
    // For clan side the resurrection type is guard (not king), for rebels it's attacker
    const type: PieceType = side === "clan" ? "guard" : "attacker";
    return canStopOn(cell, type);
  });
}


