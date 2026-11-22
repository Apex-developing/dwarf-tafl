import { create } from 'zustand';
import type {
  Axial,
  DieAction,
  DieFace,
  GameState,
  PieceType,
} from '../engine/types';
import {
  createInitialState,
  rollDice as engineRollDice,
  applyDice as engineApplyDice,
  resetDice as engineResetDice,
  canResetDice,
  selectAction as engineSelectAction,
  cancelAction as engineCancelAction,
  executeMove as engineExecuteMove,
  executeResurrection as engineExecuteResurrection,
  endTurn as engineEndTurn,
} from '../engine/game';
import { getLegalMoves, getResurrectionCells } from '../engine/moves';
import { cellKey } from '../engine/board';

/**
 * Where a human player's dice come from: the app rolls them, or the players
 * roll real dice and type the faces in. The computer always rolls its own.
 */
export type DiceSource = 'app' | 'physical';

export interface GameStore {
  // ─── State ───
  gameState: GameState;
  gameMode: 'local' | 'vsAI';
  aiDifficulty: 'easy' | 'medium' | 'hard';
  diceSource: DiceSource;
  selectedAction: DieAction | null;
  selectedPieceId: string | null;
  highlightedCells: Axial[];
  legalMovesMap: Map<string, Axial[]>; // pieceId -> destinations
  resurrectionCells: Axial[];
  resurrectType: PieceType | null;
  isAnimating: boolean;

  // ─── Actions ───
  newGame: (mode?: 'local' | 'vsAI') => void;
  setAiDifficulty: (difficulty: 'easy' | 'medium' | 'hard') => void;
  setDiceSource: (source: DiceSource) => void;
  rollDice: () => void;
  /** Physical dice: start the turn with the faces read off real dice. */
  enterDice: (d1: DieFace, d2: DieFace) => void;
  /** Physical dice: take the entered faces back (typo) before playing them. */
  resetEnteredDice: () => void;
  selectDieAction: (action: DieAction) => void;
  cancelDieAction: () => void;
  selectPiece: (pieceId: string) => void;
  deselectPiece: () => void;
  movePiece: (destination: Axial) => void;
  chooseResurrectPiece: (type: PieceType) => void;
  setAnimating: (val: boolean) => void;
  endCurrentTurn: () => void;
}

function readSavedDifficulty(): 'easy' | 'medium' | 'hard' {
  try {
    const v = localStorage.getItem('dwarf_tafl_ai_level');
    if (v === 'easy' || v === 'medium' || v === 'hard') return v;
  } catch {
    // ignore
  }
  return 'medium';
}

function readSavedDiceSource(): DiceSource {
  try {
    if (localStorage.getItem('dwarf_tafl_dice_source') === 'physical') return 'physical';
  } catch {
    // ignore
  }
  return 'app';
}

export const useGameStore = create<GameStore>((set, get) => ({
  gameState: createInitialState(),
  gameMode: 'local',
  aiDifficulty: readSavedDifficulty(),
  diceSource: readSavedDiceSource(),
  selectedAction: null,
  selectedPieceId: null,
  highlightedCells: [],
  legalMovesMap: new Map(),
  resurrectionCells: [],
  resurrectType: null,
  isAnimating: false,

  newGame: (mode = 'local') => {
    set({
      gameState: createInitialState(),
      gameMode: mode,
      selectedAction: null,
      selectedPieceId: null,
      highlightedCells: [],
      legalMovesMap: new Map(),
      resurrectionCells: [],
      resurrectType: null,
      isAnimating: false,
    });
  },

  setAiDifficulty: (difficulty) => {
    try {
      localStorage.setItem('dwarf_tafl_ai_level', difficulty);
    } catch {
      // storage may be unavailable (private mode) — the choice just won't persist
    }
    set({ aiDifficulty: difficulty });
  },

  setDiceSource: (source) => {
    try {
      localStorage.setItem('dwarf_tafl_dice_source', source);
    } catch {
      // not persisted in private mode
    }
    set({ diceSource: source });
  },

  enterDice: (d1, d2) => {
    const { gameState } = get();
    if (gameState.phase !== 'startTurn') return;

    try {
      set({
        gameState: engineApplyDice(gameState, [d1, d2]),
        selectedAction: null,
        selectedPieceId: null,
        highlightedCells: [],
        legalMovesMap: new Map(),
        resurrectionCells: [],
        resurrectType: null,
      });
    } catch (e) {
      console.error('Failed to enter dice:', e);
    }
  },

  resetEnteredDice: () => {
    const { gameState } = get();
    if (!canResetDice(gameState)) return;
    set({
      gameState: engineResetDice(gameState),
      selectedAction: null,
      selectedPieceId: null,
      highlightedCells: [],
      legalMovesMap: new Map(),
      resurrectionCells: [],
      resurrectType: null,
    });
  },

  rollDice: () => {
    const { gameState } = get();
    if (gameState.phase !== 'startTurn' && gameState.phase !== 'rollingDice') return;

    try {
      const nextState = engineRollDice(gameState);
      set({
        gameState: nextState,
        selectedAction: null,
        selectedPieceId: null,
        highlightedCells: [],
        legalMovesMap: new Map(),
        resurrectionCells: [],
        resurrectType: null,
      });
    } catch (e) {
      console.error('Failed to roll dice:', e);
    }
  },

  selectDieAction: (action: DieAction) => {
    const { gameState } = get();
    if (gameState.phase !== 'chooseDieAction') return;

    try {
      const nextState = engineSelectAction(gameState, action);

      if (action.kind === 'runeResurrect') {
        const side = nextState.currentSide;
        const freeCells = getResurrectionCells(nextState, side);
        const captured = nextState.captured[side].filter((t) => t !== 'king');
        const defaultType = captured[0] || (side === 'clan' ? 'guard' : 'attacker');

        set({
          gameState: nextState,
          selectedAction: action,
          selectedPieceId: null,
          legalMovesMap: new Map(),
          resurrectType: defaultType,
          resurrectionCells: freeCells,
          highlightedCells: freeCells,
        });
        return;
      }

      // Compute legal moves for this action
      const legalMoves = getLegalMoves(nextState, action);

      set({
        gameState: nextState,
        selectedAction: action,
        selectedPieceId: null,
        legalMovesMap: legalMoves,
        resurrectionCells: [],
        resurrectType: null,
        highlightedCells: [],
      });
    } catch (e) {
      console.error('Failed to select action:', e);
    }
  },

  /** Take back the chosen action (before any piece moved) to pick another. */
  cancelDieAction: () => {
    const { gameState } = get();
    try {
      const nextState = engineCancelAction(gameState);
      set({
        gameState: nextState,
        selectedAction: null,
        selectedPieceId: null,
        highlightedCells: [],
        legalMovesMap: new Map(),
        resurrectionCells: [],
        resurrectType: null,
      });
    } catch (e) {
      console.error('Failed to cancel action:', e);
    }
  },

  chooseResurrectPiece: (type: PieceType) => {
    set({ resurrectType: type });
  },

  selectPiece: (pieceId: string) => {
    const { selectedAction, legalMovesMap } = get();

    // If in resurrection mode, clicks on pieces don't select pieces
    if (selectedAction?.kind === 'runeResurrect') return;

    // Check if clicked piece is allowed to move
    const moves = legalMovesMap.get(pieceId);
    if (!moves || moves.length === 0) {
      // Piece has no legal moves or isn't selectable
      return;
    }

    set({
      selectedPieceId: pieceId,
      highlightedCells: moves,
    });
  },

  deselectPiece: () => {
    set({
      selectedPieceId: null,
      highlightedCells: [],
    });
  },

  movePiece: (destination: Axial) => {
    const {
      gameState,
      selectedAction,
      selectedPieceId,
      highlightedCells,
      resurrectType,
    } = get();

    // Verify destination is highlighted
    const destKey = cellKey(destination);
    const isDestLegal = highlightedCells.some((c) => cellKey(c) === destKey);
    if (!isDestLegal) return;

    try {
      // 1. Resurrection
      if (selectedAction?.kind === 'runeResurrect' && resurrectType) {
        const nextState = engineExecuteResurrection(gameState, resurrectType, destination);
        set({
          gameState: nextState,
          selectedAction: null,
          selectedPieceId: null,
          highlightedCells: [],
          legalMovesMap: new Map(),
          resurrectionCells: [],
          resurrectType: null,
        });
        return;
      }

      // 2. Normal move
      if (!selectedPieceId) return;

      const nextState = engineExecuteMove(gameState, selectedPieceId, destination);

      // Check if this was the first move of ShieldDouble
      if (nextState.phase === 'chooseActor' && nextState.shieldDoubleFirstMove) {
        // Compute legal moves for the second piece
        const secondAction: DieAction = { kind: 'shieldDouble' };
        const secondMoves = getLegalMoves(nextState, secondAction);

        set({
          gameState: nextState,
          selectedPieceId: null,
          highlightedCells: [],
          legalMovesMap: secondMoves,
        });
        return;
      }

      // Reset selection for next action or next turn
      set({
        gameState: nextState,
        selectedAction: null,
        selectedPieceId: null,
        highlightedCells: [],
        legalMovesMap: new Map(),
      });
    } catch (e) {
      console.error('Failed to execute move:', e);
    }
  },

  setAnimating: (val: boolean) => set({ isAnimating: val }),

  endCurrentTurn: () => {
    const { gameState } = get();
    try {
      const nextState = engineEndTurn(gameState);
      set({
        gameState: nextState,
        selectedAction: null,
        selectedPieceId: null,
        highlightedCells: [],
        legalMovesMap: new Map(),
      });
    } catch (e) {
      console.error('Failed to end turn:', e);
    }
  },
}));
