import React from 'react';
import { useGameStore } from '../store';
import type { Side } from '../engine/types';
import { useT } from '../i18n';
import { useBoard } from './useBoard';
import { TurnIndicator } from './TurnIndicator';
import { CapturedPieces } from './CapturedPieces';
import { DicePanel, COMPACT_PANEL_HEIGHT_PX } from './DicePanel';
import { GameOverPanel } from './GameOverDialog';
import { SeatMenu } from './SeatMenu';

/** Header row (32) + compact panel + gap and padding. Fixed, so the board never rescales. */
const SEAT_HEIGHT_PX = 32 + COMPACT_PANEL_HEIGHT_PX + 4 + 12;

interface SeatProps {
  side: Side;
  /** The Rebels sit across the table: their whole half is turned 180°. */
  rotated: boolean;
  onBackToMenu: () => void;
}

/** One player's half of the screen: menu, turn status and the dice panel. */
const Seat: React.FC<SeatProps> = ({ side, rotated, onBackToMenu }) => {
  const gameOver = useGameStore((s) => s.gameState.phase === 'gameOver');

  return (
    <section
      className={`shrink-0 flex flex-col gap-1 px-2 py-1.5 bg-stone-950 border-stone-800 ${
        rotated ? 'rotate-180 border-b' : 'border-t'
      }`}
      style={{ height: SEAT_HEIGHT_PX }}
    >
      <div className="flex items-center gap-2 h-8 shrink-0">
        <SeatMenu rotated={rotated} onBackToMenu={onBackToMenu} />
        <TurnIndicator seat={side} />
      </div>
      {gameOver ? (
        <GameOverPanel compact onBackToMenu={onBackToMenu} />
      ) : (
        <DicePanel forSide={side} compact />
      )}
    </section>
  );
};

/**
 * Two players, one device lying between them. The screen is two mirrored
 * halves around the board: the Rebels (top) are turned 180°, and so are their
 * tokens on the board, casualty strip and menu.
 */
export const FacingScreen: React.FC<{ onBackToMenu: () => void }> = ({ onBackToMenu }) => {
  const t = useT();
  const { containerRef, isLoading } = useBoard(true);

  return (
    <div className="relative flex flex-col w-full h-[100dvh] bg-stone-950 text-stone-100 overflow-hidden select-none">
      <Seat side="rebels" rotated onBackToMenu={onBackToMenu} />

      <main className="relative flex-1 w-full min-h-0 min-w-0 overflow-hidden flex flex-col">
        <div className="h-8 shrink-0 rotate-180 bg-stone-950/40">
          <CapturedPieces side="rebels" />
        </div>

        <div className="relative flex-1 min-h-0">
          {isLoading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-stone-950/80 backdrop-blur-sm">
              <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-semibold text-amber-300 tracking-wide uppercase">
                {t('game.loading')}
              </p>
            </div>
          )}
          <div ref={containerRef} className="absolute inset-0 min-h-0 min-w-0" />
        </div>

        <div className="h-8 shrink-0 bg-stone-950/40">
          <CapturedPieces side="clan" />
        </div>
      </main>

      <Seat side="clan" rotated={false} onBackToMenu={onBackToMenu} />
    </div>
  );
};
