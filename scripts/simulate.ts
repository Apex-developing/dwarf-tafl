/**
 * Dwarf Tafl — balance simulator.
 *
 * Plays whole games between computer players using the real engine and prints
 * win rates, game length and captures. Use it to see what a rule change does.
 *
 *   npm run sim                         # matrix of all levels, 30 games per cell
 *   npm run sim -- 100 medium hard      # 100 games: clan=medium vs rebels=hard
 *   npm run sim -- 200 random random    # 200 games with random legal moves
 *
 * Levels: random | easy | medium | hard   (the in-game AI levels + a random baseline)
 */
import type { GameState, Side } from '../src/engine/types';
import {
  createInitialState,
  rollDice,
  selectAction,
  executeMove,
  executeResurrection,
  endTurn,
} from '../src/engine/game';
import { getLegalMoves, getResurrectionCells, isActionPlayable } from '../src/engine/moves';
import { playAITurnStep, type AIDifficulty } from '../src/engine/ai';

type Level = 'random' | AIDifficulty;
const LEVELS: Level[] = ['random', 'easy', 'medium', 'hard'];
const MAX_ROUNDS = 150;

const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)];

/** Uniformly random legal play — the weakest possible opponent. */
function randomStep(s: GameState): GameState {
  if (s.phase === 'startTurn') return rollDice(s);
  if (s.phase === 'chooseDieAction') {
    const ok = s.remainingActions.filter((a) => isActionPlayable(s, a));
    if (ok.length === 0) return endTurn(s);
    return selectAction(s, pick(ok));
  }
  const act = s.usedActions[s.usedActions.length - 1];
  if (act.kind === 'runeResurrect') {
    const type = s.captured[s.currentSide].find((t) => t !== 'king')!;
    return executeResurrection(s, type, pick(getResurrectionCells(s, s.currentSide)));
  }
  const moves = Array.from(getLegalMoves(s, act).entries()).flatMap(([id, ds]) =>
    ds.map((d) => ({ id, d })),
  );
  const m = pick(moves);
  return executeMove(s, m.id, m.d);
}

function step(level: Level, side: Side, s: GameState): GameState {
  return level === 'random' ? randomStep(s) : playAITurnStep(s, side, level);
}

interface Outcome {
  winner: Side | 'draw' | 'unfinished';
  reason: string;
  rounds: number;
  lost: { clan: number; rebels: number };
}

function playGame(clan: Level, rebels: Level): Outcome {
  let s = createInitialState();
  const levels = { clan, rebels };
  let guard = 0;
  while (s.phase !== 'gameOver' && s.turnNumber <= MAX_ROUNDS && guard++ < 50_000) {
    s = step(levels[s.currentSide], s.currentSide, s);
  }
  return {
    winner: s.result ? (s.result.winner ?? 'draw') : 'unfinished',
    reason: s.result?.reason ?? 'round limit',
    rounds: s.turnNumber,
    lost: { clan: s.captured.clan.length, rebels: s.captured.rebels.length },
  };
}

function run(clan: Level, rebels: Level, n: number): void {
  const t0 = Date.now();
  const res: Outcome[] = [];
  for (let i = 0; i < n; i++) res.push(playGame(clan, rebels));

  const pct = (f: (o: Outcome) => boolean) =>
    `${Math.round((100 * res.filter(f).length) / n)}%`.padStart(4);
  const rounds = res.map((r) => r.rounds).sort((a, b) => a - b);
  const avg = (f: (o: Outcome) => number) => (res.reduce((a, r) => a + f(r), 0) / n).toFixed(1);

  console.log(
    `clan ${clan.padEnd(6)} vs rebels ${rebels.padEnd(6)} | ` +
      `clan wins ${pct((o) => o.winner === 'clan')}  rebels wins ${pct((o) => o.winner === 'rebels')}  ` +
      `draw/unfinished ${pct((o) => o.winner === 'draw' || o.winner === 'unfinished')} | ` +
      `escape ${pct((o) => o.reason === 'escape')}  surround ${pct((o) => o.reason === 'surrounded')} | ` +
      `rounds median ${String(rounds[Math.floor(n / 2)]).padStart(3)} | ` +
      `lost clan ${avg((o) => o.lost.clan)} rebels ${avg((o) => o.lost.rebels)} | ` +
      `${((Date.now() - t0) / 1000).toFixed(0)}s`,
  );
}

const [a0, a1, a2] = process.argv.slice(2);
if (a1 && a2) {
  run(a1 as Level, a2 as Level, Number(a0) || 50);
} else {
  const n = Number(a0) || 30;
  console.log(`Matrix, ${n} games per pairing (max ${MAX_ROUNDS} rounds)\n`);
  for (const c of LEVELS) for (const r of LEVELS) run(c, r, n);
}
