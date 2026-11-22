// ─── Dwarf Tafl — Board Model ───

import type { Axial, Piece, Side } from "./types";

// ─── Constants ───

/** Radius of the hex board (number of rings around the centre). */
export const BOARD_RADIUS = 5;

/**
 * Six axial directions for a **pointy-top** hex grid.
 * Index 0 = E, then clockwise: SE, SW, W, NW, NE.
 */
export const DIRECTIONS: readonly Axial[] = [
  { q: 1, r: 0 },   // 0 — East
  { q: 0, r: 1 },   // 1 — South-East
  { q: -1, r: 1 },  // 2 — South-West
  { q: -1, r: 0 },  // 3 — West
  { q: 0, r: -1 },  // 4 — North-West
  { q: 1, r: -1 },  // 5 — North-East
] as const;

/** Centre cell — the Throne. */
export const THRONE: Axial = { q: 0, r: 0 };

/** Three exit cells. */
export const EXITS: readonly Axial[] = [
  { q: 0, r: -5 },
  { q: 5, r: 0 },
  { q: -5, r: 5 },
] as const;

/** Rebel corner anchor cells (for starting-zone computation). */
export const REBEL_CORNERS: readonly Axial[] = [
  { q: -5, r: 0 },
  { q: 0, r: 5 },
  { q: 5, r: -5 },
] as const;

/** Exact starting cells for the nine rebels, three per corner. */
export const REBEL_START_ZONES: readonly Axial[][] = [
  [{ q: -5, r: 0 }, { q: -5, r: 1 }, { q: -4, r: -1 }],
  [{ q: 0, r: 5 }, { q: -1, r: 5 }, { q: 1, r: 4 }],
  [{ q: 5, r: -5 }, { q: 5, r: -4 }, { q: 4, r: -5 }],
] as const;

/** Flat list of all rebel starting cells. */
const ALL_REBEL_START_CELLS: Axial[] = REBEL_START_ZONES.flat();

/**
 * Guard starting positions (not including the Throne itself).
 *
 * The one free neighbour of the Throne is (1, -1): the King's straight line
 * NE leads to the rebel corner (5, -5), which is NOT an Exit. The King can
 * therefore step out immediately, but cannot reach a gate in one move.
 * (The straight lines towards the Exits are E → (5,0), NW → (0,-5)
 * and SW → (-5,5); all three are blocked by guards.)
 */
export const GUARD_START_POSITIONS: readonly Axial[] = [
  { q: 1, r: 0 },
  { q: 0, r: -1 },
  { q: 0, r: 1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
] as const;

/** Clan starting zone = Throne + guard ring. */
export const CLAN_START_ZONE: readonly Axial[] = [
  THRONE,
  ...GUARD_START_POSITIONS,
] as const;

// ─── Board Geometry ───

/**
 * Rocks: impassable cells two steps in front of each Exit, on the straight
 * line from the Throne to the gate. They cut the long "direct" lane to the
 * gate, so the King has to approach it from the sides.
 *
 * A rock is not a playable cell: nothing can stand on it or move through it,
 * and for the King's encirclement it counts like the board edge.
 */
export const BLOCKED_CELLS: readonly Axial[] = [
  { q: 0, r: -3 }, // in front of the Exit (0, -5)
  { q: 3, r: 0 }, //  in front of the Exit (5, 0)
  { q: -3, r: 3 }, // in front of the Exit (-5, 5)
] as const;

/** True if the cell lies within the radius-5 hexagon (rocks included). */
export function isInsideHex(cell: Axial): boolean {
  const s = -cell.q - cell.r;
  return (
    Math.abs(cell.q) <= BOARD_RADIUS &&
    Math.abs(cell.r) <= BOARD_RADIUS &&
    Math.abs(s) <= BOARD_RADIUS
  );
}

/** True if the cell is a rock. */
export function isBlockedCell(cell: Axial): boolean {
  return BLOCKED_CELLS.some((b) => b.q === cell.q && b.r === cell.r);
}

/** True if the cell is a playable cell of the board (inside the hexagon, not a rock). */
export function isOnBoard(cell: Axial): boolean {
  return isInsideHex(cell) && !isBlockedCell(cell);
}

/** Returns up to 6 on-board neighbours. */
export function getNeighbors(cell: Axial): Axial[] {
  const result: Axial[] = [];
  for (const d of DIRECTIONS) {
    const n: Axial = { q: cell.q + d.q, r: cell.r + d.r };
    if (isOnBoard(n)) result.push(n);
  }
  return result;
}

/** Hex distance between two axial cells. */
export function axialDistance(a: Axial, b: Axial): number {
  const dq = a.q - b.q;
  const dr = a.r - b.r;
  const ds = -(dq + dr);
  return Math.max(Math.abs(dq), Math.abs(dr), Math.abs(ds));
}

/**
 * Convert axial coords to pixel position (pointy-top).
 * @param originX pixel X of the board centre
 * @param originY pixel Y of the board centre
 */
export function axialToPixel(
  cell: Axial,
  radiusPx: number,
  originX = 0,
  originY = 0,
): { x: number; y: number } {
  const x = originX + Math.sqrt(3) * radiusPx * (cell.q + cell.r / 2);
  const y = originY + 1.5 * radiusPx * cell.r;
  return { x, y };
}

/** Canonical string key for a cell. */
export function cellKey(cell: Axial): string {
  return `${cell.q},${cell.r}`;
}

// ─── Cell Queries ───

export function isThrone(cell: Axial): boolean {
  return cell.q === THRONE.q && cell.r === THRONE.r;
}

export function isExit(cell: Axial): boolean {
  return EXITS.some((e) => e.q === cell.q && e.r === cell.r);
}

/** Throne or any Exit. */
export function isSpecialCell(cell: Axial): boolean {
  return isThrone(cell) || isExit(cell);
}

// ─── Direction Helpers ───

/**
 * Walk from `from` along `dir` up to `maxSteps` cells (default: unlimited = BOARD_RADIUS * 2).
 * Returns all cells along the ray that are on the board (stops at board edge).
 * Does NOT filter for occupancy — that is the caller's job.
 */
export function getCellsAlongDirection(
  from: Axial,
  dir: Axial,
  maxSteps: number = BOARD_RADIUS * 2,
): Axial[] {
  const cells: Axial[] = [];
  let cur = from;
  for (let i = 0; i < maxSteps; i++) {
    cur = { q: cur.q + dir.q, r: cur.r + dir.r };
    if (!isOnBoard(cur)) break;
    cells.push(cur);
  }
  return cells;
}

/** Given a direction index (0-5), return the index of the opposite direction. */
export function getOppositeDirection(dirIndex: number): number {
  return (dirIndex + 3) % 6;
}

// ─── Initial Pieces ───

/** Build the starting piece map. */
export function getInitialPieces(): Map<string, Piece> {
  const pieces = new Map<string, Piece>();

  // King
  pieces.set("king", {
    id: "king",
    type: "king",
    side: "clan",
    cell: { ...THRONE },
  });

  // Guards
  GUARD_START_POSITIONS.forEach((cell, i) => {
    const id = `guard-${i}`;
    pieces.set(id, { id, type: "guard", side: "clan", cell: { ...cell } });
  });

  // Attackers (rebels)
  let atkIdx = 0;
  for (const zone of REBEL_START_ZONES) {
    for (const cell of zone) {
      const id = `attacker-${atkIdx++}`;
      pieces.set(id, {
        id,
        type: "attacker",
        side: "rebels",
        cell: { ...cell },
      });
    }
  }

  return pieces;
}

/**
 * Returns the starting-zone cells for the given side.
 * Used by Rune Resurrect to find valid reintroduction cells.
 */
export function getStartingZoneCells(side: Side): Axial[] {
  if (side === "clan") {
    // Guards can resurrect onto guard start positions (not throne — guards can't stop there)
    return [...GUARD_START_POSITIONS];
  }
  return [...ALL_REBEL_START_CELLS];
}
