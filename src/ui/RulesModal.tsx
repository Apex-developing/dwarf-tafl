import React from 'react';
import { Rich, useT, type TKey } from '../i18n';
import { FigureGrid } from './RulesFigures';

interface RulesModalProps {
  onClose: () => void;
  /** Turned 180° for the player sitting on the far side of the device. */
  rotated?: boolean;
}

const UL = 'list-disc list-inside space-y-1 text-stone-300';

/** A bullet list whose items are translation keys. */
const Bullets: React.FC<{ keys: TKey[]; className?: string }> = ({ keys, className = UL }) => {
  const t = useT();
  return (
    <ul className={className}>
      {keys.map((key) => (
        <li key={key}>
          <Rich text={t(key)} />
        </li>
      ))}
    </ul>
  );
};

const Heading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="font-bold text-amber-300 text-base mb-1">{children}</h3>
);

export const RulesModal: React.FC<RulesModalProps> = ({ onClose, rotated = false }) => {
  const t = useT();

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md ${rotated ? 'rotate-180' : ''}`}>
      <div className="flex flex-col max-w-2xl w-full max-h-[85vh] bg-stone-900 border-2 border-stone-700 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-stone-950/50">
          <h2 className="text-xl font-bold text-amber-400 uppercase tracking-wider">
            {t('rules.title')}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-sm text-stone-200 leading-relaxed">
          <section>
            <Heading>{t('rules.s1.title')}</Heading>
            <Bullets keys={['rules.s1.clan', 'rules.s1.rebels', 'rules.s1.first']} />
            <FigureGrid ids={['escape']} />
          </section>

          <section>
            <Heading>{t('rules.s2.title')}</Heading>
            <p>
              <Rich text={t('rules.s2.intro')} />
            </p>
            <Bullets
              keys={['rules.s2.rebels', 'rules.s2.clan']}
              className={`${UL} mt-2`}
            />
            <p className="mt-2">{t('rules.s2.dice')}</p>
            <Bullets
              keys={[
                'rules.s2.march',
                'rules.s2.shield',
                'rules.s2.rune',
                'rules.s2.onePerPiece',
                'rules.s2.cancel',
              ]}
              className={`${UL} mt-1`}
            />
          </section>

          <section>
            <Heading>{t('rules.s3.title')}</Heading>
            <Bullets keys={['rules.s3.throne', 'rules.s3.king', 'rules.s3.rocks']} />
          </section>

          <section>
            <Heading>{t('rules.s4.title')}</Heading>
            <Bullets keys={['rules.s4.custodial', 'rules.s4.hostile']} />
            <FigureGrid ids={['sandwich', 'wall']} />
            <Bullets keys={['rules.s4.self', 'rules.s4.resurrect', 'rules.s4.kingSides']} />

            <h4 className="mt-4 font-bold text-amber-200 text-sm">{t('fig.king.title')}</h4>
            <p className="text-xs text-stone-400">{t('fig.king.legend')}</p>
            <FigureGrid ids={['kingThree', 'kingThrone', 'kingEdge', 'kingRock', 'kingSafe']} />

            <Bullets keys={['rules.s4.king', 'rules.s4.draw']} />
          </section>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-stone-800 bg-stone-950/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl transition"
          >
            {t('rules.close')}
          </button>
        </div>
      </div>
    </div>
  );
};
