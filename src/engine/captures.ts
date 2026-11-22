// ─── Dwarf Tafl — Capture Resolution ───

import type { Axial, GameState, Piece, Side } from "./types";
import {
  DIRECTIONS,
  cellKey,
  isExit,
  isOnBoard,
  isThrone,
} from "./board";

// ─── Helpers ───

/** Build a lookup from cell key → Piece for fast positional queries. */
function buildCellMap(state: GameState): Map<string, Piece> {
  const map = new Map<string, Piece>();
  for (const piece of state.pieces.values()) {
    map.set(cellKey(piece.cell), piece);
  }
  return map;
}

/**
 * An empty Throne or Exit acts as a "hostile wall" for **both** sides
 * when checking custodial capture.
 */
export function isHostileCell(
  cell: Axial,
  _attackerSide: Side,
  cellMap: Map<string, Piece>,
): boolean {
  if (!isOnBoard(cell)) return false;
  const occupant = cellMap.get(cellKey(cell));
  if (occupant) return false; // occupied cells are handled by ally/enemy logic
  // Empty special cell = hostile wall for both sides
  return isThrone(cell) || isExit(cell);
}

// ─── King Surrounding Check ───

/**
 * The King is surrounded (and captured) if **3 or more** of his 6 hex
 * faces are blocked by enemies.
 *
 * Rules:
 * - Faces occupied by Rebel warriors count.
 * - The empty Throne counts as AT MOST ONE side of surrounding.
 * - The board edge counts as AT MOST ONE side of surrounding (being in a corner
 *   does NOT instantly surround the King without rebels).
 * - There must be at least one Rebel warrior involved in the surrounding.
 */
export function checkKingSurrounded(state: GameState): boolean {
  const king = findKing(state);
  if (!king) return false;

  const cellMap = buildCellMap(state);
  let rebelCount = 0;
  let touchesEdge = false;
  let touchesEmptyThrone = false;

  for (const dir of DIRECTIONS) {
    const neighbor: Axial = { q: king.cell.q + dir.q, r: king.cell.r + dir.r };

    if (!isOnBoard(neighbor)) {
      touchesEdge = true;
      continue;
    }

    const occupant = cellMap.get(cellKey(neighbor));
    if (occupant && occupant.side === "rebels") {
      rebelCount++;
      continue;
    }

    // Empty Throne counts as hostile for surrounding
    if (!occupant && isThrone(neighbor)) {
      touchesEmptyThrone = true;
    }
  }

  // Edge counts as at most 1 face; empty Throne counts as at most 1 face
  const totalHostile =
    rebelCount + (touchesEdge ? 1 : 0) + (touchesEmptyThrone ? 1 : 0);

  // Must have 3+ hostile faces, with at least one actual Rebel warrior
  return totalHostile >= 3 && rebelCount >= 1;
}

function findKing(state: GameState): Piece | undefined {
  for (const piece of state.pieces.values()) {
    if (piece.type === "king") return piece;
  }
  return undefined;
}

// ─── Custodial Capture Resolution ───

/**
 * After a piece moves to `movedPieceCell`, check every adjacent enemy piece
 * to see if it is now custodially captured (sandwiched between the mover's
 * ally and either another ally or a hostile special cell along the same axis).
 *
 * **Rules:**
 * - Only the **active player** (the one who just moved) can capture.
 * - A piece that voluntarily moves between two enemies is NOT captured.
 * - The King cannot be custodially captured — only surrounded (3-side rule).
 * - Up to 2 captures per move are possible.
 *
 * Returns the list of captured piece IDs and the new state with those pieces
 * removed and added to the captured tally.
 */
export function resolveCaptures(
  state: GameState,
  movedPieceCell: Axial,
): { capturedPieceIds: string[]; newState: GameState } {
  const cellMap = buildCellMap(state);
  const moverPiece = cellMap.get(cellKey(movedPieceCell));
  if (!moverPiece) {
    return { capturedPieceIds: [], newState: state };
  }

  const activeSide = moverPiece.side;
  const capturedIds: string[] = [];

  // Check each of the 6 directions from the moved piece
  for (let dirIdx = 0; dirIdx < DIRECTIONS.length; dirIdx++) {
    const dir = DIRECTIONS[dirIdx];
    const adjacentCell: Axial = {
      q: movedPieceCell.q + dir.q,
      r: movedPieceCell.r + dir.r,
    };

    if (!isOnBoard(adjacentCell)) continue;

    const adjacentPiece = cellMap.get(cellKey(adjacentCell));
    if (!adjacentPiece) continue;
    // Must be an enemy
    if (adjacentPiece.side === activeSide) continue;
    // King cannot be custodially captured
    if (adjacentPiece.type === "king") continue;

    // Check the cell on the opposite side of the adjacent piece (along the same ray)
    // movedPieceCell (mover) -> adjacentCell (enemy) -> oppositeCell (ally or wall)
    const oppositeCell: Axial = {
      q: adjacentCell.q + dir.q,
      r: adjacentCell.r + dir.r,
    };

    let isCaptured = false;

    if (!isOnBoard(oppositeCell)) {
      // Off-board does NOT count as a wall for custodial capture of warriors
      // (only for King surrounding)
      continue;
    }

    const oppOccupant = cellMap.get(cellKey(oppositeCell));
    if (oppOccupant && oppOccupant.side === activeSide) {
      // Sandwiched between two allies of the active side
      isCaptured = true;
    } else if (!oppOccupant && isHostileCell(oppositeCell, activeSide, cellMap)) {
      // Sandwiched between active piece and a hostile special cell
      isCaptured = true;
    }

    if (isCaptured && !capturedIds.includes(adjacentPiece.id)) {
      capturedIds.push(adjacentPiece.id);
    }
  }

  if (capturedIds.length === 0) {
    return { capturedPieceIds: [], newState: state };
  }

  // Build new state with captured pieces removed
  const newPieces = new Map(state.pieces);
  const newCaptured: Record<Side, import("./types").PieceType[]> = {
    clan: [...state.captured.clan],
    rebels: [...state.captured.rebels],
  };

  const captureEvents: import("./types").GameEvent[] = [];

  for (const id of capturedIds) {
    const piece = newPieces.get(id)!;
    newCaptured[piece.side].push(piece.type);
    captureEvents.push({
      type: "pieceCaptured",
      pieceId: id,
      cell: piece.cell,
      capturedBy: activeSide,
    });
    newPieces.delete(id);
  }

  const newState: GameState = {
    ...state,
    pieces: newPieces,
    captured: newCaptured,
    history: [...state.history, ...captureEvents],
  };

  return { capturedPieceIds: capturedIds, newState };
}
