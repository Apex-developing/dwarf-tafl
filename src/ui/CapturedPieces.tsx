import React from 'react';
import { useGameStore } from '../store';
import { ASSETS } from '../assets';
import type { Side } from '../engine/types';
import { useT } from '../i18n';

interface CapturedPiecesProps {
  /** Whose casualties to show. */
  side: Side;
}

const CONFIG = {
  clan: {
    token: ASSETS.tokens.guard,
    total: 5,
    type: 'guard',
    accent: 'text-amber-400',
    ring: 'border-amber-500/70',
  },
  rebels: {
    token: ASSETS.tokens.attacker,
    total: 9,
    type: 'attacker',
    accent: 'text-emerald-400',
    ring: 'border-emerald-500/70',
  },
} as const;

/**
 * One side's casualties as a slim strip: a slot per piece, lit when lost.
 * Two of these frame the board (one above, one below).
 */
export const CapturedPieces: React.FC<CapturedPiecesProps> = ({ side }) => {
  const { gameState } = useGameStore();
  const t = useT();
  const cfg = CONFIG[side];
  const lost = gameState.captured[side].filter((t) => t === cfg.type).length;

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3 h-full px-3 text-[11px] sm:text-xs text-stone-300">
      <span className="font-semibold whitespace-nowrap">
        <span className="hidden sm:inline">{t(`captured.${side}.title`)}</span>
        <span className="sm:hidden">{t(`captured.${side}.short`)}</span>
        : <strong className={cfg.accent}>{lost}</strong>/{cfg.total}
      </span>
      <div className="flex items-center gap-1">
        {Array.from({ length: cfg.total }, (_, i) => (
          <img
            key={i}
            src={cfg.token}
            alt=""
            className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full object-cover border transition ${
              i < lost ? `${cfg.ring} opacity-100` : 'border-stone-700 opacity-15 grayscale'
            }`}
          />
        ))}
      </div>
    </div>
  );
};
