import { describe, it, expect } from 'vitest';
import {
  createInitialState,
  rollDice,
  applyDice,
  resetDice,
  canResetDice,
  selectAction,
  cancelAction,
  canCancelAction,
  executeMove,
  executeResurrection,
  checkVictory,
  checkNoMoves,
  buildActionPool,
  ACTIONS_PER_TURN,
} from '../game';
import {
  BOARD_RADIUS,
  EXITS,
  isOnBoard,
  isThrone,
  isExit,
  getInitialPieces,
  getCellsAlongDirection,
  DIRECTIONS,
  BLOCKED_CELLS,
  isInsideHex,
  axialDistance,
} from '../board';
import {
  getStraightLineMoves,
  getLegalMoves,
  getMovesForPiece,
  canStopOn,
  KING_MARCH_STEPS,
} from '../moves';
import { playAITurnStep, evaluate } from '../ai';
import { checkKingSurrounded, resolveCaptures } from '../captures';
import type { DieFace, GameState, Piece, Side } from '../types';

describe('Dwarf Tafl Engine - Board & Setup', () => {
  it('board has 88 playable cells (91 in the hexagon minus 3 rocks)', () => {
    let count = 0;
    for (let q = -BOARD_RADIUS; q <= BOARD_RADIUS; q++) {
      for (let r = -BOARD_RADIUS; r <= BOARD_RADIUS; r++) {
        if (isOnBoard({ q, r })) count++;
      }
    }
    expect(count).toBe(88);
  });

  it('correct starting pieces', () => {
    const pieces = getInitialPieces();
    expect(pieces.size).toBe(15); // 1 King + 5 Guards + 9 Attackers

    const king = pieces.get('king');
    expect(king).toBeDefined();
    expect(king?.cell).toEqual({ q: 0, r: 0 });
    expect(isThrone(king!.cell)).toBe(true);

    const guards = Array.from(pieces.values()).filter((p) => p.type === 'guard');
    expect(guards.length).toBe(5);

    const attackers = Array.from(pieces.values()).filter((p) => p.type === 'attacker');
    expect(attackers.length).toBe(9);
  });

  it('special cells stopping rules', () => {
    expect(canStopOn({ q: 0, r: 0 }, 'king')).toBe(true);
    expect(canStopOn({ q: 0, r: 0 }, 'guard')).toBe(false);
    expect(canStopOn({ q: 0, r: 0 }, 'attacker')).toBe(false);

    expect(canStopOn({ q: 0, r: -5 }, 'king')).toBe(true);
    expect(canStopOn({ q: 0, r: -5 }, 'guard')).toBe(false);
    expect(canStopOn({ q: 0, r: -5 }, 'attacker')).toBe(false);
  });
});

describe('Dwarf Tafl Engine - Gameplay Flow', () => {
  it('rebels take the first turn', () => {
    const state = createInitialState();
    expect(state.currentSide).toBe('rebels');
    expect(state.phase).toBe('startTurn');
  });

  it('rolls 2d6 and generates actions', () => {
    const state = createInitialState();
    const rolled = rollDice(state);
    expect(rolled.phase).toBe('chooseDieAction');
    expect(rolled.dice).not.toBeNull();
    expect(rolled.dice?.length).toBe(2);
    expect(rolled.remainingActions.length).toBeGreaterThanOrEqual(2);
  });

  it('computes legal moves and executes a move following phase flow', () => {
    const state = createInitialState();
    const rolled = rollDice(state);
    const action = rolled.remainingActions[0];
    const withAction = selectAction(rolled, action);

    // Moves for first attacker
    const moves = getStraightLineMoves(withAction, { q: -5, r: 0 }, 1, 'attacker');
    expect(moves.length).toBeGreaterThan(0);

    const nextState = executeMove(withAction, 'attacker-0', moves[0]);
    expect(nextState.pieces.get('attacker-0')?.cell).toEqual(moves[0]);
  });
});

describe('Dwarf Tafl Engine - Captures & Victory', () => {
  it('custodial capture of enemy piece', () => {
    const pieces = new Map<string, Piece>();
    pieces.set('guard-1', { id: 'guard-1', type: 'guard', side: 'clan', cell: { q: 0, r: 0 } });
    pieces.set('target', { id: 'target', type: 'attacker', side: 'rebels', cell: { q: 1, r: 0 } });
    pieces.set('guard-2', { id: 'guard-2', type: 'guard', side: 'clan', cell: { q: 2, r: 0 } });

    const state: GameState = {
      pieces,
      currentSide: 'clan',
      phase: 'resolveCaptures',
      dice: [1, 1],
      remainingActions: [],
      usedActions: [],
      captured: { clan: [], rebels: [] },
      turnNumber: 2,
      history: [],
      result: null,
    };

    const { capturedPieceIds, newState } = resolveCaptures(state, { q: 2, r: 0 });
    expect(capturedPieceIds).toContain('target');
    expect(newState.pieces.has('target')).toBe(false);
    expect(newState.captured.rebels).toContain('attacker');
  });

  it('moving next to an enemy WITHOUT a second ally does NOT capture', () => {
    // Only guard-2 moves to (2, 0). Enemy at (1, 0). (0, 0) is empty (or not an ally).
    const pieces = new Map<string, Piece>();
    pieces.set('target', { id: 'target', type: 'attacker', side: 'rebels', cell: { q: 1, r: 0 } });
    pieces.set('guard-2', { id: 'guard-2', type: 'guard', side: 'clan', cell: { q: 2, r: 0 } });

    const state: GameState = {
      pieces,
      currentSide: 'clan',
      phase: 'resolveCaptures',
      dice: [1, 1],
      remainingActions: [],
      usedActions: [],
      captured: { clan: [], rebels: [] },
      turnNumber: 2,
      history: [],
      result: null,
    };

    // Note: (0, 0) is Throne! An empty Throne counts as hostile, so enemy between mover and Throne WOULD be captured!
    // To test open field: use coordinates far from Throne/Exits, e.g. (2, 1) and (2, 2)
    const openPieces = new Map<string, Piece>();
    openPieces.set('target', { id: 'target', type: 'attacker', side: 'rebels', cell: { q: 2, r: 1 } });
    openPieces.set('guard-1', { id: 'guard-1', type: 'guard', side: 'clan', cell: { q: 2, r: 2 } });

    const openState: GameState = {
      ...state,
      pieces: openPieces,
    };

    // Opposite cell from (2,2) through (2,1) is (2,0), which is NOT Throne (Throne is (0,0)).
    // (2,0) is empty regular floor.
    const { capturedPieceIds } = resolveCaptures(openState, { q: 2, r: 2 });
    expect(capturedPieceIds).toEqual([]);
    expect(openState.pieces.has('target')).toBe(true);
  });

  it('captures enemy sandwiched between mover and empty Throne', () => {
    // Enemy at (0, 1), empty Throne at (0, 0). Mover arrives at (0, 2).
    const pieces = new Map<string, Piece>();
    pieces.set('target', { id: 'target', type: 'attacker', side: 'rebels', cell: { q: 0, r: 1 } });
    pieces.set('guard-1', { id: 'guard-1', type: 'guard', side: 'clan', cell: { q: 0, r: 2 } });

    const state: GameState = {
      pieces,
      currentSide: 'clan',
      phase: 'resolveCaptures',
      dice: [1, 1],
      remainingActions: [],
      usedActions: [],
      captured: { clan: [], rebels: [] },
      turnNumber: 2,
      history: [],
      result: null,
    };

    const { capturedPieceIds, newState } = resolveCaptures(state, { q: 0, r: 2 });
    expect(capturedPieceIds).toContain('target');
    expect(newState.pieces.has('target')).toBe(false);
  });

  it('King escape victory condition', () => {
    const pieces = new Map<string, Piece>();
    pieces.set('king', { id: 'king', type: 'king', side: 'clan', cell: { q: 0, r: -5 } });

    const state: GameState = {
      pieces,
      currentSide: 'clan',
      phase: 'chooseDestination',
      dice: [4, 4],
      remainingActions: [],
      usedActions: [],
      captured: { clan: [], rebels: [] },
      turnNumber: 5,
      history: [],
      result: null,
    };

    const victory = checkVictory(state);
    expect(victory).not.toBeNull();
    expect(victory?.winner).toBe('clan');
    expect(victory?.reason).toBe('escape');
  });

  it('King surrounded by 3 sides triggers rebel victory', () => {
    const pieces = new Map<string, Piece>();
    pieces.set('king', { id: 'king', type: 'king', side: 'clan', cell: { q: 0, r: 0 } });
    pieces.set('atk-1', { id: 'atk-1', type: 'attacker', side: 'rebels', cell: { q: 1, r: 0 } });
    pieces.set('atk-2', { id: 'atk-2', type: 'attacker', side: 'rebels', cell: { q: 0, r: 1 } });
    pieces.set('atk-3', { id: 'atk-3', type: 'attacker', side: 'rebels', cell: { q: -1, r: 1 } });

    const state: GameState = {
      pieces,
      currentSide: 'rebels',
      phase: 'resolveCaptures',
      dice: [1, 1],
      remainingActions: [],
      usedActions: [],
      captured: { clan: [], rebels: [] },
      turnNumber: 4,
      history: [],
      result: null,
    };

    expect(checkKingSurrounded(state)).toBe(true);
    const victory = checkVictory(state);
    expect(victory?.winner).toBe('rebels');
    expect(victory?.reason).toBe('surrounded');
  });

  it('King alone in a non-exit corner does NOT win and is NOT surrounded', () => {
    const pieces = new Map<string, Piece>();
    // Non-exit corner (5, -5)
    pieces.set('king', { id: 'king', type: 'king', side: 'clan', cell: { q: 5, r: -5 } });

    const state: GameState = {
      pieces,
      currentSide: 'clan',
      phase: 'chooseDestination',
      dice: [1, 1],
      remainingActions: [],
      usedActions: [],
      captured: { clan: [], rebels: [] },
      turnNumber: 5,
      history: [],
      result: null,
    };

    expect(checkVictory(state)).toBeNull();
    expect(checkKingSurrounded(state)).toBe(false);
  });

  it('King against board edge needs 2 rebels to be captured', () => {
    const pieces = new Map<string, Piece>();
    // King at edge (5, -5). 2 rebels adjacent: (5, -4) and (4, -5)
    pieces.set('king', { id: 'king', type: 'king', side: 'clan', cell: { q: 5, r: -5 } });
    pieces.set('atk-1', { id: 'atk-1', type: 'attacker', side: 'rebels', cell: { q: 5, r: -4 } });
    pieces.set('atk-2', { id: 'atk-2', type: 'attacker', side: 'rebels', cell: { q: 4, r: -5 } });

    const state: GameState = {
      pieces,
      currentSide: 'rebels',
      phase: 'resolveCaptures',
      dice: [1, 1],
      remainingActions: [],
      usedActions: [],
      captured: { clan: [], rebels: [] },
      turnNumber: 4,
      history: [],
      result: null,
    };

    // Edge counts as 1 + 2 rebels = 3 faces -> captured!
    expect(checkKingSurrounded(state)).toBe(true);
  });
});

describe('Dwarf Tafl Engine - Radius 5 board & start position', () => {
  it('exits and rebel zones sit on the radius-5 corners', () => {
    for (const e of EXITS) {
      expect(Math.max(Math.abs(e.q), Math.abs(e.r), Math.abs(-e.q - e.r))).toBe(5);
      expect(isExit(e)).toBe(true);
    }
    const attackers = Array.from(getInitialPieces().values()).filter((p) => p.type === 'attacker');
    for (const a of attackers) {
      expect(isOnBoard(a.cell)).toBe(true);
      expect(Math.max(Math.abs(a.cell.q), Math.abs(a.cell.r), Math.abs(-a.cell.q - a.cell.r))).toBeGreaterThanOrEqual(4);
    }
  });

  it('the King has exactly one open direction and it leads to a non-exit corner', () => {
    const pieces = getInitialPieces();
    const occupied = new Set(Array.from(pieces.values()).map((p) => `${p.cell.q},${p.cell.r}`));
    const open = DIRECTIONS.filter((d) => !occupied.has(`${d.q},${d.r}`));
    expect(open.length).toBe(1);

    // Walk the free line: it must end on a corner that is NOT an exit
    const line = getCellsAlongDirection({ q: 0, r: 0 }, open[0]);
    const end = line[line.length - 1];
    expect(Math.max(Math.abs(end.q), Math.abs(end.r), Math.abs(-end.q - end.r))).toBe(5);
    expect(isExit(end)).toBe(false);

    // And no straight line from the Throne reaches an exit through a free path
    for (const d of DIRECTIONS) {
      const ray = getCellsAlongDirection({ q: 0, r: 0 }, d);
      const first = ray[0];
      const blocked = occupied.has(`${first.q},${first.r}`);
      const reachesExit = isExit(ray[ray.length - 1]);
      expect(!blocked && reachesExit).toBe(false);
    }
  });
});

/** Build a state with the dice already rolled to the given faces (RNG-free). */
function stateWithDice(dice: [DieFace, DieFace], side: Side = 'rebels'): GameState {
  return {
    ...rollDice({ ...createInitialState(), currentSide: side }),
    dice,
    remainingActions: buildActionPool(side, dice),
    usedActions: [],
    actedPieceIds: [],
    actionsTaken: 0,
  };
}

describe('Dwarf Tafl Engine - One die result per piece', () => {
  it('a piece that took the first die cannot take the second one', () => {
    let st = stateWithDice([2, 3]);
    st = selectAction(st, { kind: 'march', maxSteps: 2 });
    const dest = getMovesForPiece(st, 'attacker-0', { kind: 'march', maxSteps: 2 })[0];
    st = executeMove(st, 'attacker-0', dest);

    expect(st.phase).toBe('chooseDieAction');
    expect(st.actedPieceIds).toContain('attacker-0');

    const second = { kind: 'march' as const, maxSteps: 3 };
    expect(getMovesForPiece(st, 'attacker-0', second)).toEqual([]);
    const legal = getLegalMoves(st, second);
    expect(legal.has('attacker-0')).toBe(false);
    expect(legal.size).toBeGreaterThan(0);
  });

  it('picking the smaller march keeps the larger die for later', () => {
    let st = stateWithDice([3, 2]);
    st = selectAction(st, { kind: 'march', maxSteps: 2, group: 1 });
    expect(st.remainingActions).toEqual([{ kind: 'march', maxSteps: 3, group: 0 }]);
  });

  it('shield-double marks both pieces as acted', () => {
    let st = stateWithDice([5, 1]);
    st = selectAction(st, { kind: 'shieldDouble' });
    const m1 = getMovesForPiece(st, 'attacker-0', { kind: 'shieldDouble' })[0];
    st = executeMove(st, 'attacker-0', m1);
    expect(st.shieldDoubleFirstMove?.pieceId).toBe('attacker-0');
    const m2 = getMovesForPiece(st, 'attacker-3', { kind: 'shieldDouble' })[0];
    st = executeMove(st, 'attacker-3', m2);
    expect(st.actedPieceIds).toEqual(expect.arrayContaining(['attacker-0', 'attacker-3']));
  });

  it('acted pieces are unlocked again on the next turn', () => {
    let st = stateWithDice([1, 1]);
    st = selectAction(st, { kind: 'march', maxSteps: 1 });
    st = executeMove(st, 'attacker-0', getMovesForPiece(st, 'attacker-0', { kind: 'march', maxSteps: 1 })[0]);
    st = selectAction(st, { kind: 'march', maxSteps: 1 });
    st = executeMove(st, 'attacker-1', getMovesForPiece(st, 'attacker-1', { kind: 'march', maxSteps: 1 })[0]);
    expect(st.currentSide).toBe('clan');
    expect(st.actedPieceIds).toEqual([]);
  });
});

describe('Dwarf Tafl Engine - Cancel selected action', () => {
  it('cancelling restores the full action list (incl. the sibling option)', () => {
    const st = stateWithDice([5, 2]);
    const before = st.remainingActions;
    const picked = selectAction(st, { kind: 'shieldSingle', maxSteps: 5 });
    expect(picked.phase).toBe('chooseActor');
    expect(canCancelAction(picked)).toBe(true);

    const back = cancelAction(picked);
    expect(back.phase).toBe('chooseDieAction');
    expect(back.remainingActions).toEqual(before);
    expect(back.usedActions).toEqual([]);

    // ...and a different action can be chosen instead
    const other = selectAction(back, { kind: 'shieldDouble' });
    expect(other.usedActions[0].kind).toBe('shieldDouble');
  });

  it('cannot cancel after a piece has moved or without a pending action', () => {
    const st = stateWithDice([1, 2]);
    expect(canCancelAction(st)).toBe(false);
    expect(() => cancelAction(st)).toThrow();

    // after the first half of a shield-double the die is spent
    let sd = stateWithDice([5, 1]);
    sd = selectAction(sd, { kind: 'shieldDouble' });
    const m = getMovesForPiece(sd, 'attacker-0', { kind: 'shieldDouble' })[0];
    sd = executeMove(sd, 'attacker-0', m);
    expect(canCancelAction(sd)).toBe(false);
  });

  it('refuses to select an action nobody can play', () => {
    let st = stateWithDice([1, 1]);
    // lock every piece
    st = { ...st, actedPieceIds: Array.from(st.pieces.keys()) };
    expect(() => selectAction(st, { kind: 'march', maxSteps: 1 })).toThrow();
  });
});

describe('Dwarf Tafl Engine - Clan turn: two actions out of three', () => {
  it('the clan pool holds both dice plus the king march (3 sources)', () => {
    const st = stateWithDice([2, 5], 'clan');
    expect(st.remainingActions.map((a) => a.group)).toEqual([0, 1, 1, 2]);
    const km = st.remainingActions.find((a) => a.kind === 'kingMarch');
    expect(km).toEqual({ kind: 'kingMarch', maxSteps: 3, group: 2 });
    // rebels never get the king action
    expect(buildActionPool('rebels', [2, 5]).some((a) => a.kind === 'kingMarch')).toBe(false);
  });

  it('dice results only move guards, the king action only moves the king', () => {
    const st = stateWithDice([4, 6], 'clan');
    const dieActions = st.remainingActions.filter((a) => a.kind !== 'kingMarch');
    for (const a of dieActions) {
      expect(getMovesForPiece(st, 'king', a)).toEqual([]);
    }
    const km = { kind: 'kingMarch' as const, maxSteps: 3 as const };
    expect(getMovesForPiece(st, 'guard-0', km)).toEqual([]);
    const kingMoves = getMovesForPiece(st, 'king', km);
    expect(kingMoves.length).toBeGreaterThan(0);
    for (const m of kingMoves) {
      expect(Math.max(Math.abs(m.q), Math.abs(m.r), Math.abs(-m.q - m.r))).toBeLessThanOrEqual(KING_MARCH_STEPS);
    }
  });

  it('after two actions the turn ends even though a third source is left', () => {
    let st = stateWithDice([1, 1], 'clan');
    // action 1: king march
    st = selectAction(st, { kind: 'kingMarch', maxSteps: 3, group: 2 });
    st = executeMove(st, 'king', getMovesForPiece(st, 'king', { kind: 'kingMarch', maxSteps: 3 })[0]);
    expect(st.phase).toBe('chooseDieAction');
    expect(st.actionsTaken).toBe(1);
    expect(st.remainingActions.length).toBe(2);

    // action 2: a guard with die 1
    const march1 = { kind: 'march' as const, maxSteps: 1, group: 0 };
    st = selectAction(st, march1);
    const g = Array.from(getLegalMoves(st, march1).entries())[0];
    st = executeMove(st, g[0], g[1][0]);

    expect(ACTIONS_PER_TURN).toBe(2);
    expect(st.currentSide).toBe('rebels');
    expect(st.phase).toBe('startTurn');
  });

  it('cannot use both dice and the king: only two sources count', () => {
    let st = stateWithDice([1, 2], 'clan');
    for (const group of [0, 1]) {
      const a = st.remainingActions.find((x) => x.group === group)!;
      st = selectAction(st, a);
      const [id, dests] = Array.from(getLegalMoves(st, a).entries()).find(([pid]) => pid !== 'king')!;
      st = executeMove(st, id, dests[0]);
    }
    expect(st.currentSide).toBe('rebels'); // the king action was never offered a second time
  });
});

describe('Dwarf Tafl Engine - King is captured only by a Rebel move', () => {
  const pocket = () => {
    const pieces = new Map<string, Piece>();
    pieces.set('king', { id: 'king', type: 'king', side: 'clan', cell: { q: 4, r: -4 } });
    pieces.set('a1', { id: 'a1', type: 'attacker', side: 'rebels', cell: { q: 5, r: -5 } });
    pieces.set('a2', { id: 'a2', type: 'attacker', side: 'rebels', cell: { q: 5, r: -4 } });
    pieces.set('a3', { id: 'a3', type: 'attacker', side: 'rebels', cell: { q: 4, r: -5 } });
    const state: GameState = {
      ...createInitialState(),
      pieces,
      currentSide: 'clan',
      phase: 'resolveCaptures',
    };
    return state;
  };

  it('the King may step into a pocket without losing', () => {
    const st = pocket();
    const king = st.pieces.get('king')!;
    expect(checkVictory(st)).toEqual({ winner: 'rebels', reason: 'surrounded' }); // static view
    expect(checkVictory(st, king)).toBeNull(); // his own move: safe
  });

  it('a Rebel moving next to the King completes the capture', () => {
    const st = pocket();
    expect(checkVictory(st, st.pieces.get('a2')!)?.winner).toBe('rebels');
  });

  it('a Rebel move elsewhere does not trigger the capture', () => {
    const st = pocket();
    const far: Piece = { id: 'far', type: 'attacker', side: 'rebels', cell: { q: -3, r: 2 } };
    expect(checkVictory(st, far)).toBeNull();
  });
});

describe('Dwarf Tafl Engine - Resurrection captures', () => {
  it('a resurrected guard captures by landing next to an enemy', () => {
    const pieces = new Map<string, Piece>();
    pieces.set('king', { id: 'king', type: 'king', side: 'clan', cell: { q: 0, r: 0 } });
    pieces.set('anvil', { id: 'anvil', type: 'guard', side: 'clan', cell: { q: 0, r: 3 } });
    pieces.set('target', { id: 'target', type: 'attacker', side: 'rebels', cell: { q: 0, r: 2 } });
    const st: GameState = {
      ...createInitialState(),
      pieces,
      currentSide: 'clan',
      phase: 'chooseDestination',
      captured: { clan: ['guard'], rebels: [] },
      usedActions: [{ kind: 'runeResurrect', group: 0 }],
      remainingActions: [],
    };

    const after = executeResurrection(st, 'guard', { q: 0, r: 1 });
    expect(after.pieces.has('target')).toBe(false);
    expect(after.captured.rebels).toContain('attacker');
  });

  it('a resurrected rebel can close the ring around the King', () => {
    const pieces = new Map<string, Piece>();
    pieces.set('king', { id: 'king', type: 'king', side: 'clan', cell: { q: -4, r: 0 } });
    pieces.set('r1', { id: 'r1', type: 'attacker', side: 'rebels', cell: { q: -5, r: 0 } });
    pieces.set('r2', { id: 'r2', type: 'attacker', side: 'rebels', cell: { q: -4, r: -1 } });
    const st: GameState = {
      ...createInitialState(),
      pieces,
      currentSide: 'rebels',
      phase: 'chooseDestination',
      captured: { clan: [], rebels: ['attacker'] },
      usedActions: [{ kind: 'runeResurrect', group: 0 }],
      remainingActions: [],
    };

    const after = executeResurrection(st, 'attacker', { q: -5, r: 1 });
    expect(after.result).toEqual({ winner: 'rebels', reason: 'surrounded' });
  });
});

describe('Dwarf Tafl Engine - Stalemate is a draw', () => {
  it('a side that cannot move at all draws the game', () => {
    const pieces = new Map<string, Piece>();
    pieces.set('king', { id: 'king', type: 'king', side: 'clan', cell: { q: 5, r: -5 } });
    pieces.set('a1', { id: 'a1', type: 'attacker', side: 'rebels', cell: { q: 5, r: -4 } });
    pieces.set('a2', { id: 'a2', type: 'attacker', side: 'rebels', cell: { q: 4, r: -5 } });
    pieces.set('a3', { id: 'a3', type: 'attacker', side: 'rebels', cell: { q: 4, r: -4 } });
    const st: GameState = { ...createInitialState(), pieces, currentSide: 'clan' };
    expect(checkNoMoves(st)).toEqual({ winner: null, reason: 'noMoves' });
  });
});

describe('Dwarf Tafl Engine - Computer opponent', () => {
  // "hard" searches deeper, so it plays a shorter sample game
  const plan = { easy: [3, 60], medium: [3, 60], hard: [1, 12] } as const;

  for (const level of ['easy', 'medium', 'hard'] as const) {
    it(`plays complete legal games on "${level}" without stalling`, () => {
      const [games, maxRounds] = plan[level];
      for (let g = 0; g < games; g++) {
        let st = createInitialState();
        let guard = 0;
        while (st.phase !== 'gameOver' && st.turnNumber <= maxRounds && guard++ < 4000) {
          const next = playAITurnStep(st, st.currentSide, level);
          expect(next).not.toBe(st); // every call must make progress
          st = next;
        }
      }
    }, 60_000);
  }
});

describe('Dwarf Tafl Engine - Rocks in front of the gates', () => {
  it('a rock sits on the Throne→gate line, two steps before each Exit', () => {
    expect(BLOCKED_CELLS.length).toBe(EXITS.length);
    for (const exit of EXITS) {
      const rock = BLOCKED_CELLS.find((b) => axialDistance(b, exit) === 2 && axialDistance(b, { q: 0, r: 0 }) === 3)!;
      expect(rock).toBeDefined();
      // same straight line as Throne → Exit
      const dir = { q: Math.sign(exit.q), r: Math.sign(exit.r) };
      expect({ q: rock.q, r: rock.r }).toEqual({ q: dir.q * 3, r: dir.r * 3 });
      expect(isInsideHex(rock)).toBe(true);
      expect(isOnBoard(rock)).toBe(false);
    }
  });

  it('nothing can pass or stand on a rock — the direct lane to a gate is cut', () => {
    const st = createInitialState();
    // From the guard at (0,-1) the lane towards the Exit (0,-5) ends at (0,-2)
    const lane = getStraightLineMoves(st, { q: 0, r: -1 }, 10, 'guard').filter((c) => c.q === 0 && c.r < -1);
    expect(lane).toEqual([{ q: 0, r: -2 }]);
    // The King cannot slide to the gate along it either
    const kingLane = getStraightLineMoves(
      { ...st, pieces: new Map([['king', { id: 'king', type: 'king', side: 'clan', cell: { q: 0, r: -2 } } as Piece]]) },
      { q: 0, r: -2 },
      10,
      'king',
    ).filter((c) => c.q === 0 && c.r < -2);
    expect(kingLane).toEqual([]);
  });

  it('the gate stays reachable from the sides', () => {
    const st: GameState = {
      ...createInitialState(),
      pieces: new Map([['king', { id: 'king', type: 'king', side: 'clan', cell: { q: 2, r: -5 } } as Piece]]),
    };
    const moves = getStraightLineMoves(st, { q: 2, r: -5 }, 3, 'king');
    expect(moves.some((m) => m.q === 0 && m.r === -5)).toBe(true);
  });
});

describe('Dwarf Tafl Engine - AI defends the gates', () => {
  const kingNearGate = (extra: Piece[]): GameState => {
    const pieces = new Map<string, Piece>();
    pieces.set('king', { id: 'king', type: 'king', side: 'clan', cell: { q: -2, r: -3 } });
    for (const p of extra) pieces.set(p.id, p);
    return { ...createInitialState(), pieces, currentSide: 'rebels', phase: 'startTurn' };
  };
  const far: Piece = { id: 'far', type: 'attacker', side: 'rebels', cell: { q: 4, r: 1 } };
  const near: Piece = { id: 'near', type: 'attacker', side: 'rebels', cell: { q: -1, r: -3 } };

  it('sees that an escape line nobody can plug is already lost for the Rebels', () => {
    // King (-2,-3) reaches the gate (0,-5) through (-1,-4); no Rebel can land there
    const hopeless = evaluate(kingNearGate([far]), 'rebels');
    // …but with a Rebel next to that cell the line can still be cut
    const defendable = evaluate(kingNearGate([far, near]), 'rebels');
    expect(hopeless).toBeLessThan(-200_000);
    expect(defendable).toBeGreaterThan(-200_000);
  });

  for (const level of ['medium', 'hard'] as const) {
    it(`"${level}" plugs the line to the gate instead of doing something else`, () => {
      let st = kingNearGate([far, near]);
      let guard = 0;
      while (st.currentSide === 'rebels' && st.phase !== 'gameOver' && guard++ < 20) {
        st = playAITurnStep(st, 'rebels', level);
      }
      expect(st.phase).not.toBe('gameOver');
      const kingMoves = getStraightLineMoves(
        { ...st, currentSide: 'clan' },
        st.pieces.get('king')!.cell,
        KING_MARCH_STEPS,
        'king',
      );
      expect(kingMoves.some((m) => EXITS.some((e) => e.q === m.q && e.r === m.r))).toBe(false);
    }, 60_000);
  }
});

describe('Physical dice entry', () => {
  it('applyDice builds the same pool a random roll would for those faces', () => {
    const state = createInitialState();
    const entered = applyDice(state, [5, 6]);
    expect(entered.phase).toBe('chooseDieAction');
    expect(entered.dice).toEqual([5, 6]);
    expect(entered.remainingActions).toEqual(buildActionPool('rebels', [5, 6]));
    expect(entered.history[entered.history.length - 1]).toEqual({ type: 'diceRolled', dice: [5, 6] });
  });

  it('clan entering dice also gets the king action', () => {
    const clan = { ...createInitialState(), currentSide: 'clan' as const };
    const entered = applyDice(clan, [1, 2]);
    expect(entered.remainingActions.some((a) => a.kind === 'kingMarch')).toBe(true);
  });

  it('rejects faces outside 1-6 and the wrong phase', () => {
    const state = createInitialState();
    expect(() => applyDice(state, [0, 3] as any)).toThrow();
    expect(() => applyDice(state, [3, 7] as any)).toThrow();
    expect(() => applyDice(state, [2.5, 3] as any)).toThrow();
    expect(() => applyDice(applyDice(state, [1, 1]), [2, 2])).toThrow();
  });

  it('entered dice can be taken back until an action is chosen', () => {
    const start = createInitialState();
    const entered = applyDice(start, [3, 4]);
    expect(canResetDice(entered)).toBe(true);

    const back = resetDice(entered);
    expect(back.phase).toBe('startTurn');
    expect(back.dice).toBeNull();
    expect(back.remainingActions).toEqual([]);
    expect(back.history).toEqual(start.history);

    // entering again works and replaces the faces
    expect(applyDice(back, [6, 6]).dice).toEqual([6, 6]);

    // once an action is in hand, the dice are locked in
    const picked = selectAction(entered, entered.remainingActions[0]);
    expect(canResetDice(picked)).toBe(false);
    expect(resetDice(picked)).toBe(picked);
  });

  it('cannot reset when the turn has not started or after an action is played', () => {
    expect(canResetDice(createInitialState())).toBe(false);
    const rolled = rollDice(createInitialState());
    expect(canResetDice(rolled)).toBe(true);
  });
});
