// ─── Dwarf Tafl — Computer Opponent ───
//
// Three difficulty levels share one static evaluation function and differ in
// how much of the turn they look at:
//
//  • easy   – mostly random moves; only grabs an immediate win and avoids an
//             immediate loss, and now and then (35 %) plays a sensible move.
//  • medium – evaluates every legal action/move of the current die choice and
//             plays the best one (1-ply, whole move list, small noise).
//  • hard   – additionally plans the *whole two-action turn*: the most
//             promising first moves are each followed by the best second
//             action, so combinations (capture + block, fork + cover) work.
//
// The evaluation understands the rules that matter most in this game: the
// King's exit threats (this turn and in two turns), blocking those lines,
// custodial captures (including pieces left "hanging" next to an empty
// Throne/Exit), and how close the Rebels are to closing the ring.

import type { Axial, DieAction, DieFace, GameState, Piece, PieceType, Side } from './types';
import {
  rollDice,
  selectAction,
  executeMove,
  executeResurrection,
  endTurn,
  buildActionPool,
  ACTIONS_PER_TURN,
} from './game';
import {
  KING_MARCH_STEPS,
  getLegalMoves,
  getResurrectionCells,
  getStraightLineMoves,
  hasPlayableAction,
  isActionPlayable,
} from './moves';
import {
  DIRECTIONS,
  EXITS,
  axialDistance,
  cellKey,
  isExit,
  isOnBoard,
  isThrone,
} from './board';

export type AIDifficulty = 'easy' | 'medium' | 'hard';

const WIN = 1_000_000;

// ─── Public entry point ───

/**
 * Advance the AI side by one visible step (roll / one complete action /
 * second half of a Shield-Double / pass). Returns the same `state` object if
 * there is nothing to do.
 */
export function playAITurnStep(
  state: GameState,
  aiSide: Side,
  difficulty: AIDifficulty = 'medium',
): GameState {
  if (state.currentSide !== aiSide || state.phase === 'gameOver') {
    return state;
  }

  // 1. Roll the dice when the turn starts
  if (state.phase === 'startTurn') {
    return rollDice(state);
  }

  // 2. Choose and carry out one complete action
  if (state.phase === 'chooseDieAction') {
    if (!hasPlayableAction(state)) return endTurn(state);

    const cands = enumerateCandidates(state);
    if (cands.length === 0) return endTurn(state);

    const pick = chooseCandidate(state, cands, aiSide, difficulty);
    return applyCandidate(state, pick);
  }

  // 3. Second half of a Shield-Double (or any action left waiting for a piece)
  if (state.phase === 'chooseActor' || state.phase === 'chooseDestination') {
    const action = state.usedActions[state.usedActions.length - 1];
    if (!action) return state;

    const cands = enumerateMoves(state, action);
    if (cands.length === 0) return endTurn(state);

    const pick = chooseCandidate(state, cands, aiSide, difficulty);
    return applyCandidate(state, pick);
  }

  return state;
}

// ─── Candidates ───

interface Candidate {
  action: DieAction;
  /** Board move … */
  pieceId?: string;
  dest?: Axial;
  /** … or resurrection. */
  resurrectType?: PieceType;
}

function enumerateMoves(state: GameState, action: DieAction): Candidate[] {
  const out: Candidate[] = [];

  if (action.kind === 'runeResurrect') {
    const side = state.currentSide;
    const type = state.captured[side].find((t) => t !== 'king');
    if (!type) return out;
    for (const cell of getResurrectionCells(state, side)) {
      out.push({ action, dest: cell, resurrectType: type });
    }
    return out;
  }

  for (const [pieceId, dests] of getLegalMoves(state, action)) {
    for (const dest of dests) out.push({ action, pieceId, dest });
  }
  return out;
}

/** Every (action, move) the side to move could play right now. */
function enumerateCandidates(state: GameState): Candidate[] {
  const out: Candidate[] = [];
  for (const action of state.remainingActions) {
    if (!isActionPlayable(state, action)) continue;
    out.push(...enumerateMoves(state, action));
  }
  return out;
}

/** Play a candidate. In the "choose action" phase it also selects the action. */
function applyCandidate(state: GameState, c: Candidate): GameState {
  const ready = state.phase === 'chooseDieAction' ? selectAction(state, c.action) : state;
  if (c.action.kind === 'runeResurrect') {
    return executeResurrection(ready, c.resurrectType!, c.dest!);
  }
  return executeMove(ready, c.pieceId!, c.dest!);
}

// ─── Decision ───

function chooseCandidate(
  state: GameState,
  cands: Candidate[],
  side: Side,
  difficulty: AIDifficulty,
): Candidate {
  // Score every candidate one ply deep
  const scored = cands.map((c) => {
    const after = applyCandidate(state, c);
    return { c, after, score: evaluate(after, side) };
  });

  // Everyone takes a move that wins on the spot
  const winning = scored.find((s) => s.score >= WIN);
  if (winning) return winning.c;

  if (difficulty === 'easy') {
    const safe = scored.filter((s) => s.score > -WIN);
    const pool = safe.length > 0 ? safe : scored;
    if (Math.random() < 0.35) return best(pool, (s) => s.score + Math.random() * 6).c;
    return pool[Math.floor(Math.random() * pool.length)].c;
  }

  if (difficulty === 'medium') {
    return best(scored, (s) => s.score + Math.random() * 4).c;
  }

  // hard: (1) plan the second action of the turn for the most promising first
  // moves, then (2) test the best few finished turns against the opponent's
  // reply on sampled dice and keep the one that holds up best.
  const top = [...scored].sort((a, b) => b.score - a.score).slice(0, 8);
  const finals: { c: Candidate; final: GameState; value: number }[] = [];
  for (const s of top) {
    let final = s.after;
    let value = s.score;
    const stillMyTurn =
      s.after.currentSide === side &&
      s.after.phase !== 'gameOver' &&
      (s.after.phase === 'chooseActor' ||
        (s.after.phase === 'chooseDieAction' &&
          (s.after.actionsTaken ?? 0) < ACTIONS_PER_TURN));

    if (stillMyTurn) {
      const follow =
        s.after.phase === 'chooseDieAction'
          ? enumerateCandidates(s.after)
          : enumerateMoves(s.after, s.after.usedActions[s.after.usedActions.length - 1]);
      let bestFollow = -Infinity;
      for (const f of follow) {
        const next = applyCandidate(s.after, f);
        const v = evaluate(next, side);
        if (v > bestFollow) {
          bestFollow = v;
          final = next;
        }
      }
      if (bestFollow > -Infinity) value = bestFollow;
    }
    finals.push({ c: s.c, final, value });
  }

  // Test the best few finished turns against the SAME set of dice rolls. Using
  // common rolls for every candidate matters: with fresh random dice per
  // candidate the comparison is mostly noise and the AI picks odd moves.
  const rolls = sampleRolls(REPLY_SAMPLES);
  finals.sort((a, b) => b.value - a.value);
  let bestPick = finals[0];
  let bestValue = -Infinity;
  for (const f of finals.slice(0, 5)) {
    const v = replyValue(f.final, side, rolls) + Math.random() * 0.3;
    if (v > bestValue) {
      bestValue = v;
      bestPick = f;
    }
  }
  return bestPick.c;
}

/** Number of dice rolls the opponent's reply is averaged over (hard level). */
const REPLY_SAMPLES = 4;

/** A spread of dice rolls: different mixes of marches, shields and runes. */
function sampleRolls(n: number): [DieFace, DieFace][] {
  const out: [DieFace, DieFace][] = [];
  for (let i = 0; i < n; i++) {
    out.push([
      (1 + Math.floor(Math.random() * 6)) as DieFace,
      (1 + Math.floor(Math.random() * 6)) as DieFace,
    ]);
  }
  return out;
}

/**
 * Average position value after the opponent plays its best (1-ply, two
 * actions) reply to each of the given dice rolls.
 */
function replyValue(state: GameState, side: Side, rolls: [DieFace, DieFace][]): number {
  if (state.phase === 'gameOver' || state.currentSide === side) {
    return evaluate(state, side);
  }
  let total = 0;
  for (const dice of rolls) {
    let s: GameState =
      state.phase === 'startTurn'
        ? {
            ...state,
            dice,
            phase: 'chooseDieAction',
            remainingActions: buildActionPool(state.currentSide, dice),
            usedActions: [],
            actedPieceIds: [],
            actionsTaken: 0,
            actionSnapshot: undefined,
            shieldDoubleFirstMove: undefined,
          }
        : state;
    let guard = 0;
    while (s.phase !== 'gameOver' && s.currentSide !== side && guard++ < 8) {
      let cands: Candidate[];
      if (s.phase === 'chooseDieAction') {
        cands = hasPlayableAction(s) ? enumerateCandidates(s) : [];
      } else if (s.phase === 'chooseActor' || s.phase === 'chooseDestination') {
        cands = enumerateMoves(s, s.usedActions[s.usedActions.length - 1]);
      } else {
        break;
      }
      if (cands.length === 0) {
        s = endTurn(s);
        continue;
      }
      // The opponent picks what is worst for us
      let worst = Infinity;
      let next = s;
      for (const c of cands) {
        const after = applyCandidate(s, c);
        const v = evaluate(after, side);
        if (v < worst) {
          worst = v;
          next = after;
        }
      }
      s = next;
    }
    total += evaluate(s, side);
  }
  return total / rolls.length;
}

function best<T>(items: T[], key: (t: T) => number): T {
  let bi = items[0];
  let bk = -Infinity;
  for (const it of items) {
    const k = key(it);
    if (k > bk) {
      bk = k;
      bi = it;
    }
  }
  return bi;
}

// ─── Static evaluation ───

const PIECE_VALUE: Record<PieceType, number> = { guard: 140, attacker: 100, king: 0 };

/**
 * Position value from `side`'s point of view (zero-sum: the same number with
 * the opposite sign for the other side).
 */
export function evaluate(state: GameState, side: Side): number {
  if (state.result) {
    if (state.result.winner === null) return 0;
    return state.result.winner === side ? WIN : -WIN;
  }
  const v = evaluateForClan(state);
  return side === 'clan' ? v : -v;
}

function evaluateForClan(state: GameState): number {
  const pieces = Array.from(state.pieces.values());
  const king = pieces.find((p) => p.type === 'king');
  if (!king) return -WIN;

  const occupied = new Set<string>();
  for (const p of pieces) occupied.add(cellKey(p.cell));

  let score = 0;

  // Material
  for (const p of pieces) {
    score += (p.side === 'clan' ? 1 : -1) * PIECE_VALUE[p.type];
  }

  // ── King: how many of his own actions each gate is away ──
  // Breadth-first search over the King's 3-hex marches with the pieces where
  // they stand now. Every gate is scored by how soon he could get there, so the
  // Rebels are rewarded for pushing the gates away (blocking lines early) and
  // the Clan for pulling them closer / opening several routes at once.
  const gateTurns = kingTurnsToExits(occupied, king.cell);
  const kingMoves = lineMoves(occupied, king.cell, KING_MARCH_STEPS, true, king.cell);
  const exitsNow = gateTurns.filter((d) => d === 1).length;
  for (const d of gateTurns) score += GATE_WEIGHT[d] ?? 0;
  if (gateTurns.every((d) => d === Infinity)) score -= 250; // the King is sealed in
  score += 1.5 * kingMoves.length; // a free king is a dangerous king

  // If the Clan is about to move and still owns the King's action, an open
  // line to a gate is not a threat but a certain win (the King action is
  // always among the three sources and the Rebels cannot interfere any more).
  const clanToMove = state.currentSide === 'clan' && state.phase !== 'gameOver';
  const inProgress = state.phase === 'chooseActor' || state.phase === 'chooseDestination' ? 1 : 0;
  const actionsLeft = ACTIONS_PER_TURN - (state.actionsTaken ?? 0) - inProgress;
  const kingActionLeft =
    actionsLeft > 0 &&
    (state.phase === 'startTurn' || state.remainingActions.some((a) => a.kind === 'kingMarch'));
  if (exitsNow > 0 && clanToMove && kingActionLeft) score += 300_000;

  // ── Unstoppable escapes (the Rebels' 2-action turn cannot close every line) ──
  // Rebels to move: can they still plug every straight line the King has to a
  // gate with the actions they have left? Clan to move: is there a King march
  // after which they can't?
  const rebelReach = new Map<string, Set<string>>();
  for (const p of pieces) {
    if (p.side !== 'rebels') continue;
    rebelReach.set(
      p.id,
      new Set(getStraightLineMoves(state, p.cell, 10, p.type).map(cellKey)),
    );
  }
  if (clanToMove && kingActionLeft && exitsNow === 0) {
    for (const c of kingMoves) {
      const segs = exitSegments(occupied, c, king.cell);
      if (segs.length > 0 && !canPlug(segs, rebelReach, ACTIONS_PER_TURN)) {
        score += 250_000;
        break;
      }
    }
  } else if (!clanToMove && exitsNow > 0) {
    const budget = Math.max(0, ACTIONS_PER_TURN - (state.actionsTaken ?? 0) - inProgress);
    const segs = exitSegments(occupied, king.cell, king.cell);
    if (!canPlug(segs, rebelReach, budget)) score += 250_000;
  }

  // ── King: danger of being surrounded ──
  const rebelLanding = reachOf(state, 'rebels');
  const clanLanding = reachOf(state, 'clan');

  let rebelAdj = 0;
  let edge = false;
  let emptyThrone = false;
  const freeFaces: Axial[] = [];
  for (const d of DIRECTIONS) {
    const n: Axial = { q: king.cell.q + d.q, r: king.cell.r + d.r };
    if (!isOnBoard(n)) {
      edge = true;
      continue;
    }
    const k = cellKey(n);
    const occ = pieces.find((p) => cellKey(p.cell) === k);
    if (occ) {
      if (occ.side === 'rebels') rebelAdj++;
    } else if (isThrone(n)) {
      emptyThrone = true;
    } else {
      freeFaces.push(n);
    }
  }
  const hostileFaces = rebelAdj + (edge ? 1 : 0) + (emptyThrone ? 1 : 0);
  score -= 40 * rebelAdj;
  if (hostileFaces >= 2 && rebelAdj >= 1) {
    // One more Rebel next to the King ends the game
    if (freeFaces.some((f) => rebelLanding.has(cellKey(f)))) score -= 700;
    else score -= 120;
  }

  // ── Custodial captures: pieces left hanging ──
  for (const p of pieces) {
    if (p.type === 'king') continue;
    if (isHanging(p, pieces, occupied, p.side === 'clan' ? rebelLanding : clanLanding)) {
      const risk = PIECE_VALUE[p.type] * 0.65;
      score += p.side === 'clan' ? -risk : risk * 0.5;
    }
  }

  // ── Positional shaping (breaks ties between otherwise equal moves) ──
  for (const p of pieces) {
    if (p.type === 'guard') score -= 1.2 * Math.min(axialDistance(p.cell, king.cell), 5);
    // Rebels close in on the King, but a piece far out on the rim is worth little
    else if (p.type === 'attacker') score += 0.9 * Math.min(axialDistance(p.cell, king.cell), 7);
  }

  return score;
}

/**
 * The straight lines (≤3 hexes, free of pieces) along which a King standing on
 * `from` could step onto an Exit. Each entry lists the cells strictly between
 * him and the gate — the cells a Rebel would have to occupy to cut that line.
 */
function exitSegments(occupied: Set<string>, from: Axial, kingCell: Axial): string[][] {
  const out: string[][] = [];
  const kingKey = cellKey(kingCell);
  for (const d of DIRECTIONS) {
    const between: string[] = [];
    for (let i = 1; i <= KING_MARCH_STEPS; i++) {
      const n: Axial = { q: from.q + d.q * i, r: from.r + d.r * i };
      if (!isOnBoard(n)) break;
      const k = cellKey(n);
      if (occupied.has(k) && k !== kingKey) break;
      if (isExit(n)) {
        out.push(between);
        break;
      }
      between.push(k);
    }
  }
  return out;
}

/**
 * Can the Rebels cut EVERY segment using at most `budget` landings by
 * different pieces? (Optimistic for them: dice are ignored, any piece may use
 * an unlimited straight move.)
 */
function canPlug(
  segments: string[][],
  reach: Map<string, Set<string>>,
  budget: number,
): boolean {
  if (segments.some((seg) => seg.length === 0)) return false; // gate is right next to the King
  if (budget <= 0) return false;

  // pieces able to land on each relevant cell
  const landers = new Map<string, string[]>();
  for (const seg of segments) {
    for (const cell of seg) {
      if (landers.has(cell)) continue;
      const who: string[] = [];
      for (const [id, cells] of reach) if (cells.has(cell)) who.push(id);
      landers.set(cell, who);
    }
  }
  const hits = (cells: string[]) =>
    segments.every((seg) => seg.some((c) => cells.includes(c)));
  const cands = Array.from(landers.keys()).filter((c) => landers.get(c)!.length > 0);

  for (const x of cands) if (hits([x])) return true;
  if (budget >= 2) {
    for (let i = 0; i < cands.length; i++) {
      for (let j = i + 1; j < cands.length; j++) {
        if (!hits([cands[i], cands[j]])) continue;
        const a = landers.get(cands[i])!;
        const b = landers.get(cands[j])!;
        // two different pieces must be able to do it
        if (a.some((pa) => b.some((pb) => pb !== pa))) return true;
      }
    }
  }
  return false;
}

/** Score for a gate that is `d` King actions away (index = d). */
const GATE_WEIGHT: Record<number, number> = { 1: 420, 2: 150, 3: 50, 4: 15 };

/**
 * For every Exit: the smallest number of King marches (≤3 hexes in a straight
 * line each) that gets him there, or Infinity. Other pieces are treated as
 * fixed obstacles.
 */
function kingTurnsToExits(occupied: Set<string>, start: Axial): number[] {
  const dist = new Map<string, number>();
  dist.set(cellKey(start), 0);
  let frontier: Axial[] = [start];

  for (let depth = 1; depth <= 5 && frontier.length > 0; depth++) {
    const next: Axial[] = [];
    for (const from of frontier) {
      for (const to of lineMoves(occupied, from, KING_MARCH_STEPS, true, start)) {
        const k = cellKey(to);
        if (dist.has(k)) continue;
        dist.set(k, depth);
        if (!isExit(to)) next.push(to); // the game ends on a gate
      }
    }
    frontier = next;
  }
  return EXITS.map((e) => dist.get(cellKey(e)) ?? Infinity);
}

/** All cells reachable in a straight line (no jumping), honouring stop rules. */
function lineMoves(
  occupied: Set<string>,
  from: Axial,
  maxSteps: number,
  isKing: boolean,
  ignore?: Axial,
): Axial[] {
  const out: Axial[] = [];
  const ignoreKey = ignore ? cellKey(ignore) : null;
  for (const d of DIRECTIONS) {
    let cur = from;
    for (let i = 0; i < maxSteps; i++) {
      const next: Axial = { q: cur.q + d.q, r: cur.r + d.r };
      if (!isOnBoard(next)) break;
      const k = cellKey(next);
      if (occupied.has(k) && k !== ignoreKey) break;
      if (isKing || (!isThrone(next) && !isExit(next))) out.push(next);
      cur = next;
    }
  }
  return out;
}

/** Union of cells a side could reach next turn (dice ignored: optimistic). */
function reachOf(state: GameState, side: Side): Set<string> {
  const reach = new Set<string>();
  for (const p of state.pieces.values()) {
    if (p.side !== side) continue;
    const steps = p.type === 'king' ? KING_MARCH_STEPS : 10;
    for (const m of getStraightLineMoves(state, p.cell, steps, p.type)) reach.add(cellKey(m));
  }
  return reach;
}

/**
 * True if an enemy could capture `p` next turn: along some axis one neighbour
 * is already hostile (an enemy piece, or an empty Throne/Exit) and the
 * opposite neighbour is an empty cell the enemy can reach.
 */
function isHanging(
  p: Piece,
  pieces: Piece[],
  occupied: Set<string>,
  enemyReach: Set<string>,
): boolean {
  const enemySide: Side = p.side === 'clan' ? 'rebels' : 'clan';

  const hostileAt = (c: Axial): boolean => {
    const k = cellKey(c);
    if (!occupied.has(k)) return isThrone(c) || isExit(c);
    return pieces.some((q) => q.side === enemySide && cellKey(q.cell) === k);
  };

  for (let axis = 0; axis < 3; axis++) {
    const d = DIRECTIONS[axis];
    const a: Axial = { q: p.cell.q + d.q, r: p.cell.r + d.r };
    const b: Axial = { q: p.cell.q - d.q, r: p.cell.r - d.r };
    if (!isOnBoard(a) || !isOnBoard(b)) continue;

    for (const [anvil, landing] of [[a, b], [b, a]] as const) {
      if (hostileAt(anvil) && !occupied.has(cellKey(landing)) && enemyReach.has(cellKey(landing))) {
        return true;
      }
    }
  }
  return false;
}
