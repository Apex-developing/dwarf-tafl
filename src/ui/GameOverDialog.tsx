import React from 'react';
import { useGameStore } from '../store';
import { ASSETS } from '../assets';
import { DICE_PANEL_HEIGHT_PX, COMPACT_PANEL_HEIGHT_PX } from './DicePanel';
import { useT } from '../i18n';

interface GameOverPanelProps {
  onBackToMenu: () => void;
  /** Shorter version for the face-to-face layout (one per player's half). */
  compact?: boolean;
}

/**
 * Result of the game. It takes the place of the dice panel in the fixed
 * bottom block instead of covering the screen, so the final position stays
 * fully visible on the board (you can see exactly how the King was surrounded
 * or which line he escaped along).
 */
export const GameOverPanel: React.FC<GameOverPanelProps> = ({ onBackToMenu, compact = false }) => {
  const { gameState, newGame, gameMode } = useGameStore();
  const t = useT();

  if (gameState.phase !== 'gameOver' || !gameState.result) {
    return null;
  }

  const { winner, reason } = gameState.result;
  const isDraw = winner === null;
  const isClanWin = winner === 'clan';

  const reasonText = () => {
    switch (reason) {
      case 'escape':
        return t('over.escape');
      case 'surrounded':
        return t('over.surrounded');
      case 'noMoves':
        return t('over.noMoves');
      default:
        return '';
    }
  };

  const title = isDraw ? t('over.draw') : isClanWin ? t('over.clan') : t('over.rebels');

  const accent = isDraw
    ? 'text-stone-300'
    : isClanWin
      ? 'text-amber-400'
      : 'text-emerald-400';

  return (
    <div
      className={`flex flex-col items-center justify-center ${compact ? 'gap-2' : 'gap-3'} w-full max-w-3xl mx-auto px-4 bg-stone-900/95 border border-stone-700 rounded-2xl shadow-2xl backdrop-blur-md animate-fade-in`}
      style={{ height: compact ? COMPACT_PANEL_HEIGHT_PX : DICE_PANEL_HEIGHT_PX - 24 }}
      role="status"
    >
      <div className="flex items-center gap-4 text-left">
        <img
          src={isDraw || isClanWin ? ASSETS.tokens.king : ASSETS.tokens.attacker}
          alt={t('over.alt')}
          className={`${compact ? 'w-12 h-12' : 'w-16 h-16'} shrink-0 rounded-full border-4 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.5)]`}
        />
        <div>
          <h2 className={`${compact ? 'text-base' : 'text-xl'} font-extrabold uppercase tracking-wide ${accent}`}>{title}</h2>
          <p className={`${compact ? 'text-xs' : 'text-sm'} text-stone-300 leading-snug`}>{reasonText()}</p>
          {!compact && <p className="text-xs text-stone-500 mt-1">{t('over.note')}</p>}
        </div>
      </div>

      <div className="flex gap-3 w-full max-w-md">
        <button
          onClick={() => newGame(gameMode)}
          className={`flex-1 ${compact ? 'py-1.5' : 'py-2.5'} px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-110 active:scale-95 text-stone-950 font-bold rounded-xl shadow-lg transition`}
        >
          {t('over.again')}
        </button>
        <button
          onClick={onBackToMenu}
          className={`flex-1 ${compact ? 'py-1.5' : 'py-2.5'} px-4 bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-600 font-bold rounded-xl transition`}
        >
          {t('over.menu')}
        </button>
      </div>
    </div>
  );
};
