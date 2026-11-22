import { create } from 'zustand';

export type Language = 'uk' | 'en' | 'de';
export const LANGUAGES: readonly Language[] = ['en', 'de', 'uk'];

/**
 * How two players share one device: `facing` splits the screen into two
 * halves, each turned toward its player; `side` is the ordinary one-sided UI.
 */
export type TableLayout = 'facing' | 'side';

const readSavedLayout = (): TableLayout => {
  try {
    if (localStorage.getItem('dwarf_tafl_layout') === 'side') return 'side';
  } catch {
    /* storage blocked */
  }
  return 'facing';
};

/** English until the player picks a language; the saved choice always wins. */
export const DEFAULT_LANGUAGE: Language = 'en';

const readSavedLanguage = (): Language => {
  try {
    const saved = localStorage.getItem('dwarf_tafl_lang');
    if (saved && (LANGUAGES as readonly string[]).includes(saved)) return saved as Language;
  } catch {
    /* storage blocked */
  }
  return DEFAULT_LANGUAGE;
};

export interface SettingsStore {
  audio: boolean;
  vibration: boolean;
  qualityMode: 'high' | 'low';
  language: Language;
  tableLayout: TableLayout;
  setTableLayout: (val: TableLayout) => void;
  setAudio: (val: boolean) => void;
  setVibration: (val: boolean) => void;
  setQualityMode: (val: 'high' | 'low') => void;
  setLanguage: (val: Language) => void;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  audio: localStorage.getItem('dwarf_tafl_audio') !== 'false',
  vibration: localStorage.getItem('dwarf_tafl_vibration') !== 'false',
  qualityMode: (localStorage.getItem('dwarf_tafl_quality') as 'high' | 'low') || 'high',
  language: readSavedLanguage(),
  tableLayout: readSavedLayout(),
  setTableLayout: (val) => {
    try {
      localStorage.setItem('dwarf_tafl_layout', val);
    } catch {
      /* storage blocked: still switch for this session */
    }
    set({ tableLayout: val });
  },

  setAudio: (val) => {
    localStorage.setItem('dwarf_tafl_audio', String(val));
    set({ audio: val });
  },
  setVibration: (val) => {
    localStorage.setItem('dwarf_tafl_vibration', String(val));
    set({ vibration: val });
  },
  setQualityMode: (val) => {
    localStorage.setItem('dwarf_tafl_quality', val);
    set({ qualityMode: val });
  },
  setLanguage: (val) => {
    try {
      localStorage.setItem('dwarf_tafl_lang', val);
    } catch {
      /* storage blocked: still switch for this session */
    }
    set({ language: val });
  },
}));
