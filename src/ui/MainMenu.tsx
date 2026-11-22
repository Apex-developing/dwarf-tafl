import React, { useState } from 'react';
import { useGameStore } from '../store';
import { RulesModal } from './RulesModal';
import { ASSETS } from '../assets';
import { useT } from '../i18n';
import { LanguageSwitcher } from './LanguageSwitcher';

interface MainMenuProps {
  onStartGame: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({ onStartGame }) => {
  const { newGame, aiDifficulty, setAiDifficulty, diceSource, setDiceSource } = useGameStore();
  const [showRules, setShowRules] = useState(false);
  const t = useT();

  const handleStart = (mode: 'local' | 'vsAI') => {
    newGame(mode);
    onStartGame();
  };

  return (
    // The page itself scrolls (body is overflow:hidden for the game screen), so
    // a tall menu on a short phone screen never hides its bottom part.
    <div className="relative h-[100dvh] w-full overflow-y-auto overflow-x-hidden bg-gradient-to-b from-stone-950 via-stone-900 to-black text-stone-100 select-none">
    <div className="relative flex flex-col items-center justify-center min-h-full w-full px-4 py-6">
      {/* Background ambient glow */}
      <div className="absolute w-[500px] h-[500px] bg-amber-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Main card */}
      <div className="relative z-10 flex flex-col items-center max-w-md w-full p-6 sm:p-8 text-center bg-stone-900/80 border border-stone-800 rounded-3xl shadow-2xl backdrop-blur-xl">
        {/* Token medallion preview */}
        <div className="relative mb-6">
          <img
            src={ASSETS.tokens.king}
            alt="Dwarf King"
            className="w-28 h-28 rounded-full border-4 border-amber-500/80 shadow-[0_0_32px_rgba(245,158,11,0.4)] animate-bounce-subtle"
          />
        </div>

        {/* Title */}
        <h1 className="text-4xl md:text-5xl font-black tracking-wider uppercase text-amber-400 drop-shadow-[0_2px_12px_rgba(245,158,11,0.5)] mb-1">
          Dwarf Tafl
        </h1>
        <p className="text-xs uppercase tracking-[0.25em] text-stone-400 font-semibold mb-8">
          {t('menu.subtitle')}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3.5 w-full">
          <button
            onClick={() => handleStart('local')}
            className="w-full py-4 px-6 text-base font-bold text-stone-950 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:brightness-110 active:scale-[0.98] rounded-xl shadow-lg border border-amber-200 transition-all duration-150 flex items-center justify-center gap-2"
          >
            <span>⚔️</span>
            <span>{t('menu.local')}</span>
          </button>

          <button
            onClick={() => handleStart('vsAI')}
            className="w-full py-3.5 px-6 text-base font-bold text-stone-200 bg-stone-800/90 hover:bg-stone-750 hover:border-stone-600 active:scale-[0.98] border border-stone-700 rounded-xl transition flex items-center justify-center gap-2"
          >
            <span>🤖</span>
            <span>{t('menu.vsAI')}</span>
          </button>

          {/* Dice source: the app rolls, or the players roll real dice */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] uppercase tracking-wider text-stone-500 font-semibold">
              {t('menu.dice')}
            </span>
            <div className="grid grid-cols-2 gap-2" role="group" aria-label={t('menu.dice')}>
              {(
                [
                  ['app', '🎲', t('menu.dice.app')],
                  ['physical', '✋', t('menu.dice.physical')],
                ] as const
              ).map(([source, icon, label]) => (
                <button
                  key={source}
                  onClick={() => setDiceSource(source)}
                  aria-pressed={diceSource === source}
                  className={`py-2 rounded-lg border text-sm font-semibold transition flex items-center justify-center gap-1.5 ${
                    diceSource === source
                      ? 'border-amber-400 bg-amber-500/15 text-amber-300'
                      : 'border-stone-700 bg-stone-800/70 text-stone-400 hover:text-stone-200'
                  }`}
                >
                  <span aria-hidden="true">{icon}</span>
                  {label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-stone-500 leading-snug">
              {t(diceSource === 'physical' ? 'menu.dice.physical.hint' : 'menu.dice.app.hint')}
            </p>
          </div>

          {/* Computer difficulty */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] uppercase tracking-wider text-stone-500 font-semibold">
              {t('menu.difficulty')}
            </span>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  ['easy', t('diff.easy')],
                  ['medium', t('diff.medium')],
                  ['hard', t('diff.hard')],
                ] as const
              ).map(([level, label]) => (
                <button
                  key={level}
                  onClick={() => setAiDifficulty(level)}
                  className={`py-2 rounded-lg border text-sm font-semibold transition ${
                    aiDifficulty === level
                      ? 'border-amber-400 bg-amber-500/15 text-amber-300'
                      : 'border-stone-700 bg-stone-800/70 text-stone-400 hover:text-stone-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => setShowRules(true)}
            className="w-full py-3 px-6 text-sm font-semibold text-stone-400 hover:text-stone-200 hover:bg-stone-800/50 rounded-xl transition"
          >
            📖 {t('menu.rules')}
          </button>
        </div>

        {/* Language: round flag buttons at the bottom of the menu */}
        <div className="mt-6 pt-5 w-full border-t border-stone-800">
          <LanguageSwitcher />
        </div>

        <div className="mt-5 text-[11px] text-stone-500">{t('menu.version', { v: '0.1.0' })}</div>
      </div>

      {showRules && <RulesModal onClose={() => setShowRules(false)} />}
    </div>
    </div>
  );
};
