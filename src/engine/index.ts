// ─── Dwarf Tafl — Engine Public API ───

// Types
export type {
  Axial,
  PieceType,
  Side,
  Piece,
  DieFace,
  DieAction,
  MarchAction,
  ShieldSingleAction,
  ShieldDoubleAction,
  RuneMoveAction,
  RuneResurrectAction,
  KingMarchAction,
  GamePhase,
  GameEvent,
  DiceRolledEvent,
  ActionSelectedEvent,
  PieceMovedEvent,
  PieceCapturedEvent,
  PieceResurrectedEvent,
  TurnEndedEvent,
  GameOverEvent,
  GameResult,
  GameState,
} from "./types";

// Board model
export {
  BOARD_RADIUS,
  DIRECTIONS,
  THRONE,
  EXITS,
  REBEL_CORNERS,
  REBEL_START_ZONES,
  GUARD_START_POSITIONS,
  CLAN_START_ZONE,
  BLOCKED_CELLS,
  isInsideHex,
  isBlockedCell,
  isOnBoard,
  getNeighbors,
  axialDistance,
  axialToPixel,
  cellKey,
  isThrone,
  isExit,
  isSpecialCell,
  getCellsAlongDirection,
  getOppositeDirection,
  getInitialPieces,
  getStartingZoneCells,
} from "./board";

// Move generation
export {
  generateDieActions,
  canStopOn,
  canPassThrough,
  getStraightLineMoves,
  getMovesForPiece,
  getLegalMoves,
  getResurrectionCells,
  isActionPlayable,
  hasPlayableAction,
  KING_MARCH_STEPS,
} from "./moves";

// Capture resolution
export {
  isHostileCell,
  checkKingSurrounded,
  resolveCaptures,
} from "./captures";

// Game controller
export {
  createInitialState,
  rollDice,
  applyDice,
  resetDice,
  canResetDice,
  selectAction,
  cancelAction,
  canCancelAction,
  ACTIONS_PER_TURN,
  selectPiece,
  executeMove,
  applyShieldDoubleFirstMove,
  executeResurrection,
  checkVictory,
  checkNoMoves,
  endTurn,
  getSelectablePieces,
} from "./game";

// Storage
export {
  saveGameSnapshot,
  loadLatestGame,
} from "./storage";
