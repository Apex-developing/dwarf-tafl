// ─── Dwarf Tafl — Game Engine Types ───

/** Axial hex coordinate (pointy-top orientation). */
export interface Axial {
  readonly q: number;
  readonly r: number;
}

/** The three piece archetypes. */
export type PieceType = "king" | "guard" | "attacker";

/** The two opposing sides. */
export type Side = "clan" | "rebels";

/** A single game piece on the board. */
export interface Piece {
  readonly id: string;
  readonly type: PieceType;
  readonly side: Side;
  readonly cell: Axial;
}

/** Die face value (1–6). 5 = Shield, 6 = Rune. */
export type DieFace = 1 | 2 | 3 | 4 | 5 | 6;

// ─── Die Actions (discriminated union) ───

/**
 * Every action carries the index of the "source" it came from this turn
 * (0 = first die, 1 = second die, 2 = the King's own march). Actions with the
 * same `group` are alternatives: choosing one discards its siblings.
 */
interface ActionBase {
  readonly group?: number;
}

export interface MarchAction extends ActionBase {
  readonly kind: "march";
  readonly maxSteps: number; // 1–4
}

export interface ShieldSingleAction extends ActionBase {
  readonly kind: "shieldSingle";
  readonly maxSteps: 5;
}

export interface ShieldDoubleAction extends ActionBase {
  readonly kind: "shieldDouble";
}

export interface RuneMoveAction extends ActionBase {
  readonly kind: "runeMove";
}

export interface RuneResurrectAction extends ActionBase {
  readonly kind: "runeResurrect";
}

/**
 * The King's own action (Clan only, not tied to any die): a straight-line
 * move of 1–3 hexes. Dice results never apply to the King.
 */
export interface KingMarchAction extends ActionBase {
  readonly kind: "kingMarch";
  readonly maxSteps: 3;
}

export type DieAction =
  | MarchAction
  | ShieldSingleAction
  | ShieldDoubleAction
  | RuneMoveAction
  | RuneResurrectAction
  | KingMarchAction;

// ─── Game Phases ───

export type GamePhase =
  | "startTurn"
  | "rollingDice"
  | "chooseDieAction"
  | "chooseActor"
  | "chooseDestination"
  | "animatingAction"
  | "resolveCaptures"
  | "checkResult"
  | "aiThinking"
  | "gameOver";

// ─── Game Events (discriminated union) ───

export interface DiceRolledEvent {
  readonly type: "diceRolled";
  readonly dice: [DieFace, DieFace];
}

export interface ActionSelectedEvent {
  readonly type: "actionSelected";
  readonly action: DieAction;
}

export interface PieceMovedEvent {
  readonly type: "pieceMoved";
  readonly pieceId: string;
  readonly from: Axial;
  readonly to: Axial;
}

export interface PieceCapturedEvent {
  readonly type: "pieceCaptured";
  readonly pieceId: string;
  readonly cell: Axial;
  readonly capturedBy: Side;
}

export interface PieceResurrectedEvent {
  readonly type: "pieceResurrected";
  readonly pieceId: string;
  readonly cell: Axial;
}

export interface TurnEndedEvent {
  readonly type: "turnEnded";
  readonly side: Side;
  readonly turnNumber: number;
}

export interface GameOverEvent {
  readonly type: "gameOver";
  readonly result: GameResult;
}

export type GameEvent =
  | DiceRolledEvent
  | ActionSelectedEvent
  | PieceMovedEvent
  | PieceCapturedEvent
  | PieceResurrectedEvent
  | TurnEndedEvent
  | GameOverEvent;

// ─── Game Result ───

export interface GameResult {
  /** `null` = draw (a side that cannot move at all). */
  readonly winner: Side | null;
  readonly reason: "escape" | "surrounded" | "noMoves";
}

// ─── Game State ───

export interface GameState {
  /** All living pieces, keyed by piece id. */
  readonly pieces: Map<string, Piece>;
  /** Whose turn it is. */
  readonly currentSide: Side;
  /** Current phase of the turn state machine. */
  readonly phase: GamePhase;
  /** Current dice roll, or null before rolling. */
  readonly dice: [DieFace, DieFace] | null;
  /** Actions still available this turn. */
  readonly remainingActions: DieAction[];
  /** Actions already consumed this turn. */
  readonly usedActions: DieAction[];
  /** Captured pieces grouped by the side that lost them. */
  readonly captured: Record<Side, PieceType[]>;
  /** 1-based turn counter. */
  readonly turnNumber: number;
  /** Full event history. */
  readonly history: GameEvent[];
  /** Final result, set when phase === "gameOver". */
  readonly result: GameResult | null;
  /**
   * Bookkeeping for Shield-Double: after the first of the two 1-hex moves
   * this records what was moved so the second move must use a *different* piece.
   */
  readonly shieldDoubleFirstMove?: {
    readonly pieceId: string;
    readonly from: Axial;
    readonly to: Axial;
  };
  /**
   * Pieces that have already received a die result this turn.
   * Each die result may be applied to a piece only once, and a single piece
   * can never receive the results of both dice — so these pieces are locked
   * for the rest of the turn.
   */
  readonly actedPieceIds?: readonly string[];
  /** Number of actions already completed this turn (a turn has two). */
  readonly actionsTaken?: number;
  /**
   * The `remainingActions` list as it was right before the current action
   * was selected. Lets the player cancel the selection (and pick another
   * action) as long as no piece has moved yet.
   */
  readonly actionSnapshot?: DieAction[];
}
