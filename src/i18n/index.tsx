import React, { useCallback } from 'react';
import { useSettingsStore, type Language } from '../store/settingsStore';
import { uk, type TKey } from './uk';
import { en } from './en';
import { de } from './de';

export type { TKey };

const DICTS: Record<Language, Record<TKey, string>> = { uk, en, de };

export type TParams = Record<string, string | number>;
export type TFn = (key: TKey, params?: TParams) => string;

/** Look a key up and substitute {placeholders}. */
export const translate = (lang: Language, key: TKey, params?: TParams): string => {
  const template = DICTS[lang][key] ?? uk[key];
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (m, name: string) =>
    name in params ? String(params[name]) : m,
  );
};

/**
 * Translator bound to the current language. Components that call it
 * re-render when the language changes.
 */
export const useT = (): TFn => {
  const language = useSettingsStore((s) => s.language);
  return useCallback((key, params) => translate(language, key, params), [language]);
};

const TOKEN = /(\*\*[^*]+\*\*|__[^_]+__|\{[cr]\|[^}]+\})/g;

interface RichProps {
  text: string;
  /** Extra classes for **bold** spans (default: plain bold). */
  strongClassName?: string;
}

/**
 * Minimal inline markup for translated sentences:
 * **bold**, __italic__, {c|clan colour}, {r|rebels colour}.
 */
export const Rich: React.FC<RichProps> = ({ text, strongClassName }) => (
  <>
    {text.split(TOKEN).map((part, i) => {
      if (part.startsWith('**')) {
        return (
          <strong key={i} className={strongClassName}>
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('__')) return <em key={i}>{part.slice(2, -2)}</em>;
      if (part.startsWith('{c|')) {
        return (
          <strong key={i} className="text-amber-400">
            {part.slice(3, -1)}
          </strong>
        );
      }
      if (part.startsWith('{r|')) {
        return (
          <strong key={i} className="text-emerald-400">
            {part.slice(3, -1)}
          </strong>
        );
      }
      return <React.Fragment key={i}>{part}</React.Fragment>;
    })}
  </>
);
