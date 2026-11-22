import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useSettingsStore } from '../store';
import { useT } from '../i18n';
import { RulesModal } from './RulesModal';

interface SeatMenuProps {
  /** The far player's menu is turned 180° so it reads right for them. */
  rotated: boolean;
  onBackToMenu: () => void;
}

/**
 * Per-player menu for the face-to-face layout. There is no shared top bar
 * (it would face only one player): each half owns a round ☰ button, and the
 * sheet it opens is oriented toward whoever pressed it.
 */
export const SeatMenu: React.FC<SeatMenuProps> = ({ rotated, onBackToMenu }) => {
  const t = useT();
  const setTableLayout = useSettingsStore((s) => s.setTableLayout);
  const [open, setOpen] = useState(false);
  const [showRules, setShowRules] = useState(false);

  const item =
    'w-full py-2.5 px-4 rounded-xl border border-stone-700 bg-stone-800 hover:bg-stone-700 text-stone-200 text-sm font-semibold text-left transition';

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={t('seat.menu')}
        title={t('seat.menu')}
        className="w-8 h-8 shrink-0 flex items-center justify-center rounded-full bg-stone-800/90 hover:bg-stone-700 text-stone-200 border border-stone-700 text-base leading-none transition"
      >
        ☰
      </button>

      {/*
        Overlays go through a portal: the far player's half is rotated, and a
        CSS transform on an ancestor turns `position: fixed` into "fixed to
        that ancestor", which would clip the sheet and rotate it twice.
      */}
      {open && !showRules && createPortal(
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm ${rotated ? 'rotate-180' : ''}`}
          onClick={() => setOpen(false)}
        >
          <div
            className="flex flex-col gap-2 w-full max-w-xs p-4 bg-stone-900 border-2 border-stone-700 rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button className={item} onClick={() => setShowRules(true)}>
              {t('sheet.rules')}
            </button>
            <button className={item} onClick={() => setTableLayout('side')}>
              {t('sheet.layoutSide')}
            </button>
            <button className={item} onClick={onBackToMenu}>
              {t('sheet.toMenu')}
            </button>
            <button
              className="w-full py-2 mt-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-sm font-bold transition"
              onClick={() => setOpen(false)}
            >
              {t('sheet.close')}
            </button>
          </div>
        </div>,
        document.body,
      )}

      {open && showRules && createPortal(
        <RulesModal
          rotated={rotated}
          onClose={() => {
            setShowRules(false);
            setOpen(false);
          }}
        />,
        document.body,
      )}
    </>
  );
};
