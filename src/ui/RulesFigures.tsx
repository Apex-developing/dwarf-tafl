import React from 'react';
import { useT, type TKey } from '../i18n';
import { HexDiagram, type DiagramArrow, type DiagramCell } from './HexDiagram';

/**
 * The position diagrams of the rules screen. Cells are axial offsets around
 * the figure's centre (see HexDiagram); neighbours of (0,0) are
 * (1,0) right, (1,-1) upper-right, (0,-1) upper-left, (-1,0) left,
 * (-1,1) lower-left and (0,1) lower-right.
 */

interface FigureDef {
  /** Caption key; also the accessible label of the picture. */
  caption: TKey;
  cells: DiagramCell[];
  arrow?: DiagramArrow;
  badge?: { text: string; tone: 'lose' | 'safe' | 'win' };
}

const KING: DiagramCell = { q: 0, r: 0, piece: 'king' };
const rebel = (q: number, r: number): DiagramCell => ({ q, r, piece: 'rebel', hostile: true });

/** A centre cell plus its six neighbours as plain floor, for figures to override. */
const ring = (overrides: DiagramCell[], centre: DiagramCell = KING): DiagramCell[] => {
  const dirs: Array<[number, number]> = [
    [1, 0],
    [1, -1],
    [0, -1],
    [-1, 0],
    [-1, 1],
    [0, 1],
  ];
  const ringCells = dirs.map(([q, r]) => overrides.find((o) => o.q === q && o.r === r) ?? { q, r });
  return [centre, ...ringCells];
};

export const FIG = {
  escape: {
    caption: 'fig.escape',
    // Row of three with the gate at the end, plus the hexes around the middle one
    cells: ring([{ q: -1, r: 0, piece: 'king' }, { q: 1, r: 0, tile: 'gate' }], { q: 0, r: 0 }),
    arrow: { from: [-1, 0], to: [1, 0] },
    badge: { text: '★', tone: 'win' },
  },
  sandwich: {
    caption: 'fig.sandwich',
    cells: ring([{ q: -1, r: 0, piece: 'rebel' }, { q: 1, r: 0, piece: 'rebel' }], {
      q: 0,
      r: 0,
      piece: 'guard',
      dead: true,
    }),
  },
  wall: {
    caption: 'fig.wall',
    cells: ring([{ q: -1, r: 0, tile: 'throne' }, { q: 1, r: 0, piece: 'rebel' }], {
      q: 0,
      r: 0,
      piece: 'guard',
      dead: true,
    }),
  },
  kingThree: {
    caption: 'fig.king.three',
    // Alternate sides: the three need not touch each other
    cells: ring([rebel(1, 0), rebel(0, -1), rebel(-1, 1)]),
    badge: { text: '3/6', tone: 'lose' },
  },
  kingThrone: {
    caption: 'fig.king.throne',
    cells: ring([{ q: -1, r: 0, tile: 'throne', hostile: true }, rebel(1, -1), rebel(0, 1)]),
    badge: { text: '3/6', tone: 'lose' },
  },
  kingEdge: {
    caption: 'fig.king.edge',
    // King on the top edge: the two hexes above him lie outside the board
    cells: ring([
      { q: 0, r: -1, tile: 'void', hostile: true },
      { q: 1, r: -1, tile: 'void', hostile: true, uncounted: true },
      rebel(-1, 0),
      rebel(1, 0),
    ]),
    badge: { text: '3/6', tone: 'lose' },
  },
  kingRock: {
    caption: 'fig.king.rock',
    cells: ring([{ q: 0, r: -1, tile: 'rock', hostile: true }, rebel(1, 0), rebel(-1, 1)]),
    badge: { text: '3/6', tone: 'lose' },
  },
  kingSafe: {
    caption: 'fig.king.safe',
    cells: ring([rebel(1, 0), rebel(0, -1), { q: -1, r: 1, piece: 'guard', friend: true }]),
    badge: { text: '2/6', tone: 'safe' },
  },
} satisfies Record<string, FigureDef>;

export type FigureId = keyof typeof FIG;

const Figure: React.FC<{ id: FigureId }> = ({ id }) => {
  const t = useT();
  const def: FigureDef = FIG[id];
  return (
    <figure className="flex flex-col gap-1.5 m-0">
      <HexDiagram cells={def.cells} arrow={def.arrow} badge={def.badge} label={t(def.caption)} />
      <figcaption className="text-xs leading-snug text-stone-400">{t(def.caption)}</figcaption>
    </figure>
  );
};

/** A row of figures: two per line on a phone, up to three on wider screens. */
export const FigureGrid: React.FC<{ ids: FigureId[]; className?: string }> = ({
  ids,
  className = '',
}) => (
  <div className={`grid grid-cols-2 sm:grid-cols-3 gap-3 my-3 ${className}`}>
    {ids.map((id) => (
      <Figure key={id} id={id} />
    ))}
  </div>
);
