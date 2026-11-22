import React from 'react';
import { useGameStore } from '../store';
import { useT } from '../i18n';
import type { Side } from '../engine/types';

interface TurnIndicatorProps {
  /**
   * Face-to-face layout: one slim row for a player's own half. It shows that
   * player's side, lit on their turn and dimmed while the opponent plays.
   */
  seat?: Side;
}

export const TurnIndicator: React.FC<TurnIndicatorProps> = ({ seat }) => {
  const { gameState, gameMode } = useGameStore();
  const t = useT();
  const isClan = (seat ?? gameState.currentSide) === 'clan';
  const computerTurn = gameMode === 'vsAI' && gameState.currentSide === 'rebels';

  const phaseLabel = () => {
    if (computerTurn && gameState.phase !== 'gameOver') return t('phase.computer');
    switch (gameState.phase) {
      case 'startTurn':
        return t('phase.startTurn');
      case 'rollingDice':
        return t('phase.rolling');
      case 'chooseDieAction':
        return t('phase.chooseAction', { n: Math.min((gameState.actionsTaken ?? 0) + 1, 2) });
      case 'chooseActor':
        return t('phase.chooseActor');
      case 'chooseDestination':
        return t('phase.chooseDestination');
      case 'resolveCaptures':
        return t('phase.resolving');
      case 'gameOver':
        return t('phase.gameOver');
      case 'animatingAction':
        return '';
      default:
        return '';
    }
  };

  if (seat) {
    const active = gameState.currentSide === seat && gameState.phase !== 'gameOver';
    return (
      <div className={`flex items-center gap-2 min-w-0 ${active ? '' : 'opacity-50'}`}>
        <div
          className={`w-3 h-3 shrink-0 rounded-full ${active ? 'animate-pulse' : ''} ${
            isClan ? 'bg-amber-400' : 'bg-emerald-500'
          }`}
        />
        <span
          className={`text-sm font-bold uppercase tracking-wide whitespace-nowrap shrink-0 ${
            isClan ? 'text-amber-300' : 'text-emerald-400'
          }`}
        >
          {isClan ? t('turn.clan') : t('turn.rebels')}
        </span>
        {active && (
          <span className="text-[11px] text-stone-400 truncate min-w-0">
            · {t('turn.roundShort', { n: gameState.turnNumber })} · {phaseLabel()}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-0.5 sm:gap-1 px-3 sm:px-4 py-1.5 sm:py-2 bg-stone-900/90 border border-stone-700/60 rounded-xl shadow-lg backdrop-blur-md">
      <div className="flex items-center gap-2 sm:gap-3 whitespace-nowrap">
        <div
          className={`w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full ring-2 ring-offset-2 ring-offset-stone-900 animate-pulse ${
            isClan ? 'bg-amber-400 ring-amber-300' : 'bg-emerald-500 ring-emerald-400'
          }`}
        />
        <h2
          className={`text-sm sm:text-lg font-bold tracking-wide uppercase whitespace-nowrap ${
            isClan ? 'text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]' : 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]'
          }`}
        >
          {isClan ? t('turn.clan') : t('turn.rebels')}
        </h2>
        <span className="hidden sm:inline text-xs px-2 py-0.5 rounded bg-stone-800 text-stone-400 border border-stone-700">
          {t('turn.round', { n: gameState.turnNumber })}
        </span>
      </div>
      <p className="text-[11px] sm:text-xs text-stone-300 font-medium whitespace-nowrap">
        <span className="sm:hidden text-stone-500">{t('turn.roundShort', { n: gameState.turnNumber })} · </span>
        {phaseLabel()}
      </p>
    </div>
  );
};
