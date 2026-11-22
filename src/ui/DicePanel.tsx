import React, { useState } from 'react';
import { useGameStore } from '../store';
import type { DieAction, DieFace, Side } from '../engine/types';
import { ACTIONS_PER_TURN, canCancelAction, canResetDice } from '../engine/game';
import { hasPlayableAction, isActionPlayable } from '../engine/moves';
import { Rich, useT, type TFn } from '../i18n';

/**
 * Fixed-height block under the board. Its size never changes between turn
 * phases, so the board above it is never resized while playing.
 */
export const DICE_PANEL_HEIGHT_PX = 236;

/**
 * Shorter panel for the face-to-face layout, where two panels share the
 * screen height with the board. Same contents, tighter rows.
 */
export const COMPACT_PANEL_HEIGHT_PX = 156;

const getSourceLabel = (action: DieAction, t: TFn): string => {
  switch (action.group) {
    case 0:
      return t('source.die1');
    case 1:
      return t('source.die2');
    case 2:
      return t('source.king');
    default:
      return '';
  }
};

const getActionTitle = (action: DieAction, t: TFn): string => {
  switch (action.kind) {
    case 'march':
      return t('action.march', { n: action.maxSteps });
    case 'shieldSingle':
      return t('action.shieldSingle');
    case 'shieldDouble':
      return t('action.shieldDouble');
    case 'runeMove':
      return t('action.runeMove');
    case 'runeResurrect':
      return t('action.runeResurrect');
    case 'kingMarch':
      return t('action.kingMarch', { n: action.maxSteps });
  }
};

const getActionDesc = (action: DieAction, side: Side, t: TFn): string => {
  switch (action.kind) {
    case 'march':
      return t(`desc.march.${side}`, { n: action.maxSteps });
    case 'shieldSingle':
      return t(`desc.shieldSingle.${side}`);
    case 'shieldDouble':
      return t('desc.shieldDouble');
    case 'runeMove':
      return t(`desc.runeMove.${side}`);
    case 'runeResurrect':
      return t('desc.runeResurrect');
    case 'kingMarch':
      return t('desc.kingMarch', { n: action.maxSteps });
  }
};

const FACES: readonly DieFace[] = [1, 2, 3, 4, 5, 6];

/** Colour per face, shared by the entry buttons (5 = Shield, 6 = Rune). */
const faceClass = (face: DieFace, selected: boolean): string => {
  if (selected) return 'border-amber-200 bg-amber-400 text-stone-950 scale-105 shadow-lg';
  if (face === 5) return 'border-amber-500/70 bg-amber-950/50 text-amber-300 hover:bg-amber-900/60';
  if (face === 6) return 'border-cyan-500/70 bg-cyan-950/50 text-cyan-300 hover:bg-cyan-900/60';
  return 'border-stone-600 bg-stone-800 text-stone-100 hover:bg-stone-700';
};

/**
 * Physical dice: the players roll real dice and tap the faces here. Two
 * taps and Confirm; the result then enters the engine exactly like a
 * virtual roll, so every rule (two actions, one die per piece, King action)
 * works unchanged. Local state is dropped when the panel unmounts.
 */
const DiceEntry: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const t = useT();
  const { enterDice, setDiceSource } = useGameStore();
  const [picked, setPicked] = useState<[DieFace | null, DieFace | null]>([null, null]);
  const ready = picked[0] !== null && picked[1] !== null;

  const pick = (die: 0 | 1, face: DieFace) =>
    setPicked((prev) => (die === 0 ? [face, prev[1]] : [prev[0], face]));

  return (
    <div className={`flex flex-col justify-center h-full ${compact ? 'gap-1.5' : 'gap-2'}`}>
      {!compact && <p className="text-xs text-stone-400 text-center">{t('dice.entry.title')}</p>}

      {([0, 1] as const).map((die) => (
        <div key={die} className="flex items-center gap-2">
          <span className="w-14 shrink-0 text-[10px] uppercase tracking-wider text-stone-500 font-semibold">
            {t('dice.entry.die', { n: die + 1 })}
          </span>
          <div className="flex flex-1 gap-1.5 justify-center">
            {FACES.map((face) => (
              <button
                key={face}
                onClick={() => pick(die, face)}
                aria-pressed={picked[die] === face}
                aria-label={`${t('dice.entry.die', { n: die + 1 })}: ${face}`}
                className={`flex-1 max-w-[46px] ${compact ? 'h-9' : 'h-10'} rounded-lg border-2 font-bold text-lg leading-none flex items-center justify-center transition active:scale-90 ${faceClass(face, picked[die] === face)}`}
              >
                {face === 5 ? '🛡️' : face === 6 ? 'ᚱ' : face}
              </button>
            ))}
          </div>
        </div>
      ))}

      <div className="flex items-center gap-3">
        <button
          onClick={() => ready && enterDice(picked[0]!, picked[1]!)}
          disabled={!ready}
          className={`flex-1 ${compact ? 'py-1.5' : 'py-2'} text-sm font-bold rounded-xl border transition disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 text-stone-900 border-amber-200 hover:brightness-110 active:scale-[0.98] disabled:from-stone-700 disabled:via-stone-700 disabled:to-stone-700 disabled:text-stone-400 disabled:border-stone-600`}
        >
          {ready ? `${t('dice.entry.confirm')} (${picked[0]} + ${picked[1]})` : t('dice.entry.pick')}
        </button>
        <button
          onClick={() => setDiceSource('app')}
          className="shrink-0 text-[11px] text-stone-500 hover:text-stone-300 underline underline-offset-2"
        >
          {t('dice.entry.toApp')}
        </button>
      </div>
    </div>
  );
};

interface DicePanelProps {
  /** Face-to-face layout: the side this panel belongs to (idle on the other's turn). */
  forSide?: Side;
  compact?: boolean;
}

export const DicePanel: React.FC<DicePanelProps> = ({ forSide, compact = false }) => {
  const {
    gameState,
    gameMode,
    diceSource,
    setDiceSource,
    resetEnteredDice,
    selectedAction,
    rollDice,
    selectDieAction,
    cancelDieAction,
    deselectPiece,
    endCurrentTurn,
    selectedPieceId,
  } = useGameStore();
  const t = useT();

  const side = gameState.currentSide;
  const isStartTurn = gameState.phase === 'startTurn';
  const hasDice = gameState.dice !== null;
  const isChoosingAction = gameState.phase === 'chooseDieAction';
  const isGameOver = gameState.phase === 'gameOver';
  // An action is "in hand": chosen, but its piece has not moved yet
  const canCancel = canCancelAction(gameState);
  const isSecondShieldMove =
    selectedAction?.kind === 'shieldDouble' && !!gameState.shieldDoubleFirstMove;
  const nothingPlayable = isChoosingAction && !hasPlayableAction(gameState);
  const taken = gameState.actionsTaken ?? 0;
  // The computer always rolls for itself; physical entry is for human turns
  const computerTurn = gameMode === 'vsAI' && side === 'rebels';
  const enterByHand = diceSource === 'physical' && !computerTurn;
  const canChangeDice = enterByHand && canResetDice(gameState);
  const panelHeight = compact ? COMPACT_PANEL_HEIGHT_PX : DICE_PANEL_HEIGHT_PX - 24;
  const statusH = compact ? 'h-8' : 'h-9';

  const renderDieFaceBadge = (face: DieFace, index: number) => {
    let label = `${face}`;
    let sub = '';
    let colorClass = 'border-stone-600 bg-stone-800 text-stone-100';
    const sizeClass = compact ? 'w-10 h-10 text-base' : 'w-12 h-12 text-lg';

    if (face === 5) {
      label = '🛡️';
      sub = t('face.shield');
      colorClass = 'border-amber-500 bg-amber-950/60 text-amber-300';
    } else if (face === 6) {
      label = 'ᚱ';
      sub = t('face.rune');
      colorClass = 'border-cyan-500 bg-cyan-950/60 text-cyan-300';
    }

    return (
      <div
        key={index}
        className={`flex flex-col items-center justify-center ${sizeClass} rounded-xl border-2 shadow-inner font-bold leading-none select-none ${colorClass}`}
      >
        <span>{label}</span>
        {sub && <span className="text-[9px] uppercase tracking-wider font-semibold opacity-90">{sub}</span>}
      </div>
    );
  };

  /** One-line status shown between the dice and the action cards. */
  const renderStatusLine = () => {
    if (selectedAction && !isChoosingAction) {
      return (
        <div className={`flex flex-wrap items-center justify-center gap-2 w-full px-3 ${statusH} rounded-lg border border-cyan-500/60 bg-cyan-950/50`}>
          <span className="text-xs text-cyan-200 truncate">
            <Rich
              strongClassName="text-amber-300"
              text={t('dice.selected', {
                title: getActionTitle(selectedAction, t),
                hint: isSecondShieldMove ? t('dice.hintSecond') : t('dice.hintPiece'),
              })}
            />
          </span>
          {canCancel && (
            <button
              onClick={cancelDieAction}
              className="px-2.5 py-0.5 rounded bg-stone-800 hover:bg-stone-700 text-stone-100 border border-stone-600 text-xs font-semibold transition"
            >
              {t('dice.cancel')}
            </button>
          )}
        </div>
      );
    }

    if (nothingPlayable) {
      return (
        <div className={`flex items-center justify-center gap-2 w-full ${statusH}`}>
          <span className="text-xs text-stone-400">{t('dice.nothing')}</span>
          <button
            onClick={endCurrentTurn}
            className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold rounded text-xs transition"
          >
            {t('dice.endTurn')}
          </button>
        </div>
      );
    }

    if (isChoosingAction) {
      // Compact (face-to-face): the half's header already says "choose an action"
      if (compact) return null;
      const left = ACTIONS_PER_TURN - taken;
      return (
        <div className={`flex items-center justify-center w-full ${statusH} text-xs text-stone-300 text-center ${compact ? 'leading-tight text-[11px]' : ''}`}>
          {t(`dice.choose.${side}${left === 2 ? 2 : 1}`)}
        </div>
      );
    }

    return <div className={statusH} />;
  };

  // Face-to-face: the other player's half just waits, at the same height
  if (forSide && forSide !== side && !isGameOver) {
    return (
      <div
        className="flex items-center justify-center w-full max-w-3xl mx-auto px-3 rounded-2xl border border-stone-800/70 bg-stone-900/40 text-xs text-stone-500 text-center"
        style={{ height: panelHeight }}
      >
        {t('seat.waiting')}
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col w-full max-w-3xl mx-auto px-3 ${compact ? 'py-1.5' : 'py-2.5'} bg-stone-900/90 border border-stone-800 rounded-2xl shadow-2xl backdrop-blur-md overflow-hidden`}
      style={{ height: panelHeight }}
    >
      {/* Roll button (start of turn) */}
      {isStartTurn && !isGameOver && enterByHand && <DiceEntry compact={compact} />}

      {isStartTurn && !isGameOver && !enterByHand && (
        <div className="flex flex-col items-center justify-center gap-2 h-full">
          <button
            onClick={rollDice}
            className="group relative inline-flex items-center justify-center px-8 py-3.5 text-base font-bold text-stone-900 transition-all duration-200 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 rounded-xl shadow-lg hover:brightness-110 active:scale-95 border border-amber-200"
          >
            <span className="mr-2 text-xl">🎲</span>
            {t('dice.roll')}
          </button>
          <p className="text-[11px] text-stone-500">{t(`dice.hint.${side}`)}</p>
          {!computerTurn && (
            <button
              onClick={() => setDiceSource('physical')}
              className="text-[11px] text-stone-500 hover:text-stone-300 underline underline-offset-2"
            >
              {t('dice.toPhysical')}
            </button>
          )}
        </div>
      )}

      {/* Dice, status and action cards */}
      {hasDice && !isStartTurn && (
        <div className={`flex flex-col ${compact ? 'gap-1' : 'gap-2'} h-full min-h-0`}>
          {/* Dice faces row */}
          <div className={`flex items-center justify-center gap-3 ${compact ? 'h-10' : 'h-12'} shrink-0`}>
            <span className="text-xs uppercase tracking-wider text-stone-400 font-semibold">{t('dice.label')}</span>
            <div className="flex gap-2">
              {gameState.dice && gameState.dice.map((face, i) => renderDieFaceBadge(face, i))}
            </div>
            <span className="text-xs px-2 py-0.5 rounded bg-stone-800 text-stone-300 border border-stone-700">
              {t('dice.step', { n: Math.min(taken + 1, ACTIONS_PER_TURN), m: ACTIONS_PER_TURN })}
            </span>
            {canChangeDice && (
              <button
                onClick={resetEnteredDice}
                aria-label={t('dice.change')}
                title={t('dice.change')}
                className="text-xs px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700 transition"
              >
                ✎<span className="hidden sm:inline"> {t('dice.change')}</span>
              </button>
            )}
            {selectedPieceId && (
              <button
                onClick={deselectPiece}
                className="text-xs px-2.5 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700 transition"
              >
                {t('dice.deselect')}
              </button>
            )}
          </div>

          <div className="shrink-0">{renderStatusLine()}</div>

          {/* Action cards: fixed row, scrolls sideways on narrow screens */}
          <div className="flex-1 min-h-0 flex gap-2 justify-center overflow-x-auto overflow-y-hidden pb-1">
            {gameState.remainingActions.map((action, idx) => {
              const disabled = !(isChoosingAction && isActionPlayable(gameState, action));
              const isKing = action.kind === 'kingMarch';

              return (
                <button
                  key={`${action.kind}-${action.group}-${idx}`}
                  onClick={() => selectDieAction(action)}
                  disabled={disabled}
                  className={`shrink-0 w-[150px] h-full ${compact ? 'max-h-[88px] p-1.5' : 'max-h-[92px] p-2'} rounded-xl border text-left transition-all duration-150 overflow-hidden ${
                    disabled
                      ? 'border-stone-800 bg-stone-900/60 text-stone-500 opacity-50 cursor-not-allowed'
                      : isKing
                        ? 'border-amber-500/70 bg-amber-950/40 hover:bg-amber-950/70 text-stone-200'
                        : 'border-stone-700 bg-stone-800/80 hover:bg-stone-700/80 hover:border-stone-500 text-stone-200'
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-1">
                    <span className="font-bold text-[13px] leading-tight text-amber-300 truncate">
                      {getActionTitle(action, t)}
                    </span>
                  </div>
                  <div className="text-[9px] uppercase tracking-wider text-stone-500 mb-0.5">
                    {getSourceLabel(action, t)}
                  </div>
                  <div className={`text-stone-300 leading-snug ${compact ? 'line-clamp-2 text-[10px]' : 'line-clamp-3 text-[10.5px]'}`}>
                    {getActionDesc(action, side, t)}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
