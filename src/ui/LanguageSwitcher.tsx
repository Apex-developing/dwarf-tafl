import React from 'react';
import { useSettingsStore, LANGUAGES, type Language } from '../store/settingsStore';
import { useT } from '../i18n';

/**
 * Flags are inline SVG (not emoji): Windows renders flag emoji as plain
 * letters. Each is drawn in a wide viewBox and cropped to a circle with
 * `slice`, so the middle of the flag fills the round button.
 */
const FLAG_ART: Record<Language, React.ReactNode> = {
  uk: (
    <>
      <rect width="60" height="15" fill="#0057B7" />
      <rect y="15" width="60" height="15" fill="#FFD700" />
    </>
  ),
  de: (
    <>
      <rect width="60" height="10" fill="#000000" />
      <rect y="10" width="60" height="10" fill="#DD0000" />
      <rect y="20" width="60" height="10" fill="#FFCE00" />
    </>
  ),
  en: (
    <>
      <defs>
        <clipPath id="flag-en-corners">
          <path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" />
        </clipPath>
      </defs>
      <rect width="60" height="30" fill="#012169" />
      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#FFFFFF" strokeWidth="6" />
      <path
        d="M0,0 L60,30 M60,0 L0,30"
        clipPath="url(#flag-en-corners)"
        stroke="#C8102E"
        strokeWidth="4"
      />
      <path d="M30,0 v30 M0,15 h60" stroke="#FFFFFF" strokeWidth="10" />
      <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6" />
    </>
  ),
};

const LABELS: Record<Language, { short: string; name: string }> = {
  en: { short: 'En', name: 'English' },
  de: { short: 'De', name: 'Deutsch' },
  uk: { short: 'Ua', name: 'Українська' },
};

export const LanguageSwitcher: React.FC = () => {
  const language = useSettingsStore((s) => s.language);
  const setLanguage = useSettingsStore((s) => s.setLanguage);
  const t = useT();

  return (
    <div role="group" aria-label={t('menu.language')} className="flex items-start justify-center gap-4">
      {LANGUAGES.map((code) => {
        const active = code === language;
        return (
          <button
            key={code}
            type="button"
            onClick={() => setLanguage(code)}
            aria-pressed={active}
            aria-label={LABELS[code].name}
            title={LABELS[code].name}
            className="group flex flex-col items-center gap-1 focus:outline-none"
          >
            <span
              className={`block w-11 h-11 rounded-full overflow-hidden border-2 transition duration-150 group-active:scale-90 group-focus-visible:ring-2 group-focus-visible:ring-amber-300 ${
                active
                  ? 'border-amber-400 shadow-[0_0_14px_rgba(245,158,11,0.55)] scale-105'
                  : 'border-stone-600 opacity-60 group-hover:opacity-100 group-hover:border-stone-400'
              }`}
            >
              <svg
                viewBox="0 0 60 30"
                preserveAspectRatio="xMidYMid slice"
                className="block w-full h-full"
                aria-hidden="true"
              >
                {FLAG_ART[code]}
              </svg>
            </span>
            <span
              className={`text-[11px] font-bold tracking-wide ${
                active ? 'text-amber-300' : 'text-stone-500 group-hover:text-stone-300'
              }`}
            >
              {LABELS[code].short}
            </span>
          </button>
        );
      })}
    </div>
  );
};
