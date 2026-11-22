import React, { useEffect, useState } from 'react';
import { useGameStore, useSettingsStore } from '../store';
import { playAITurnStep } from '../engine/ai';
import { TurnIndicator } from './TurnIndicator';
import { CapturedPieces } from './CapturedPieces';
import { DicePanel, DICE_PANEL_HEIGHT_PX } from './DicePanel';
import { GameOverPanel } from './GameOverDialog';
import { RulesModal } from './RulesModal';
import { useT } from '../i18n';
import { useBoard } from './useBoard';
import { FacingScreen } from './FacingScreen';

interface GameScreenProps {
  onBackToMenu: () => void;
}

/**
 * Two players on one device get the face-to-face layout (two mirrored halves);
 * everything else, and anyone who prefers it, gets the one-sided screen.
 */
export const GameScreen: React.FC<GameScreenProps> = ({ onBackToMenu }) => {
  const gameMode = useGameStore((s) => s.gameMode);
  const tableLayout = useSettingsStore((s) => s.tableLayout);

  return gameMode === 'local' && tableLayout === 'facing' ? (
    <FacingScreen onBackToMenu={onBackToMenu} />
  ) : (
    <SideScreen onBackToMenu={onBackToMenu} />
  );
};

const SideScreen: React.FC<GameScreenProps> = ({ onBackToMenu }) => {
  const [showRules, setShowRules] = useState(false);
  const t = useT();
  const { containerRef, isLoading } = useBoard(false);
  const setTableLayout = useSettingsStore((s) => s.setTableLayout);

  const { gameState, gameMode, aiDifficulty } = useGameStore();

  // AI automated moves
  useEffect(() => {
    if (gameMode !== 'vsAI' || gameState.phase === 'gameOver') return;

    // In vsAI mode: Human is Clan (King), Computer is Rebels (Attackers)
    const aiSide = 'rebels';
    if (gameState.currentSide !== aiSide) return;

    const timer = setTimeout(() => {
      const nextState = playAITurnStep(gameState, aiSide, aiDifficulty);
      if (nextState !== gameState) {
        useGameStore.setState({ gameState: nextState });
      }
    }, 700);

    return () => clearTimeout(timer);
  }, [gameMode, gameState, aiDifficulty]);

  return (
    <div className="relative flex flex-col w-full h-[100dvh] bg-stone-950 text-stone-100 overflow-hidden select-none">
      {/* Top Header Bar: menu buttons left, turn indicator exactly centred */}
      <header className="relative z-20 grid grid-cols-[auto_1fr] sm:grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 sm:px-4 py-2 [@media(max-height:560px)_and_(orientation:landscape)]:py-1 bg-stone-950/80 border-b border-stone-800/80 backdrop-blur-md">
        <div className="flex items-center gap-2 justify-self-start">
          <button
            onClick={onBackToMenu}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-800/80 hover:bg-stone-700 text-stone-300 text-xs font-semibold border border-stone-700 transition"
          >
            <span>◀</span>
            <span className="hidden sm:inline">{t('game.menu')}</span>
          </button>
          <button
            onClick={() => setShowRules(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-stone-800/80 hover:bg-stone-700 text-stone-300 text-xs font-semibold border border-stone-700 transition"
          >
            <span>📖</span>
            <span className="hidden sm:inline">{t('game.rules')}</span>
          </button>
          {gameMode === 'local' && (
            <button
              onClick={() => setTableLayout('facing')}
              title={t('sheet.layoutFacing')}
              aria-label={t('sheet.layoutFacing')}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-stone-800/80 hover:bg-stone-700 text-stone-300 text-xs font-semibold border border-stone-700 transition"
            >
              <span>⇅</span>
            </button>
          )}
        </div>

        <div className="justify-self-center min-w-0">
          <TurnIndicator />
        </div>

        {/* Empty right column keeps the indicator centred on wide screens */}
        <div className="hidden sm:block" />
      </header>

      {/* Body: board above, controls below — side by side on a landscape phone */}
      <div className="flex flex-col [@media(max-height:560px)_and_(orientation:landscape)]:flex-row flex-1 min-h-0">
      {/* Board area: casualties above and below the board */}
      <main className="relative flex-1 w-full min-h-0 min-w-0 overflow-hidden flex flex-col">
        <div className="h-9 [@media(max-height:560px)_and_(orientation:landscape)]:h-7 shrink-0 border-b border-stone-900/80 bg-stone-950/40">
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

        <div className="h-9 [@media(max-height:560px)_and_(orientation:landscape)]:h-7 shrink-0 border-t border-stone-900/80 bg-stone-950/40">
          <CapturedPieces side="clan" />
        </div>
      </main>

      {/* Bottom block (dice + actions): fixed height so the board never rescales */}
      <footer
        className="relative z-20 shrink-0 px-3 py-3 flex items-center [@media(max-height:560px)_and_(orientation:landscape)]:w-[360px] [@media(max-height:560px)_and_(orientation:landscape)]:!h-full bg-gradient-to-t from-stone-950 via-stone-950/90 to-stone-950/60"
        style={{ height: DICE_PANEL_HEIGHT_PX }}
      >
        {gameState.phase === 'gameOver' ? (
          <GameOverPanel onBackToMenu={onBackToMenu} />
        ) : (
          <DicePanel />
        )}
      </footer>
      </div>

      {/* Modals */}
      {showRules && <RulesModal onClose={() => setShowRules(false)} />}
    </div>
  );
};
