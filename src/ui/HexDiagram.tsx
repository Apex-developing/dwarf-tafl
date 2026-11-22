import React from 'react';
import { ASSETS } from '../assets';

/**
 * A tiny, language-free picture of a board position for the rules screen.
 * It draws real board tiles and tokens (same artwork as the game) on a patch
 * of hexes given in axial coordinates relative to the figure's centre, so the
 * explanation can be shown exactly as it looks on the board.
 */

export type DiagramTile = 'floor' | 'throne' | 'gate' | 'rock' | 'void';
export type DiagramPiece = 'king' | 'guard' | 'rebel';

export interface DiagramCell {
  q: number;
  r: number;
  /** Defaults to an ordinary floor hex. */
  tile?: DiagramTile;
  piece?: DiagramPiece;
  /** A side that counts against the King: gets a red mark and a number. */
  hostile?: boolean;
  /** Red like the others but not numbered: it shares one count with a neighbour (edge + rocks). */
  uncounted?: boolean;
  /** The piece is being captured: drawn faded with a red cross. */
  dead?: boolean;
  /** The piece is outlined in green (the Clan's own guard). */
  friend?: boolean;
}

export interface DiagramArrow {
  from: [number, number];
  to: [number, number];
}

interface HexDiagramProps {
  cells: DiagramCell[];
  arrow?: DiagramArrow;
  /** Small corner badge, e.g. "3/6". `lose` is red, `safe` green. */
  badge?: { text: string; tone: 'lose' | 'safe' | 'win' };
  /** Accessible description of the picture. */
  label: string;
}

const R = 22; // hex radius in figure units
const VIEW_W = 150;
const VIEW_H = 128;
const SQRT3 = Math.sqrt(3);

const toXY = (q: number, r: number) => ({ x: SQRT3 * R * (q + r / 2), y: 1.5 * R * r });

const hexPoints = (cx: number, cy: number, radius: number) =>
  Array.from({ length: 6 }, (_, i) => {
    const a = ((30 + i * 60) * Math.PI) / 180;
    return `${(cx + Math.cos(a) * radius).toFixed(2)},${(cy + Math.sin(a) * radius).toFixed(2)}`;
  }).join(' ');

const TOKEN_IMG: Record<DiagramPiece, string> = {
  king: ASSETS.tokens.king,
  guard: ASSETS.tokens.guard,
  rebel: ASSETS.tokens.attacker,
};

const BADGE_COLOURS = {
  lose: { fill: '#7f1d1d', stroke: '#ef4444', text: '#fecaca' },
  safe: { fill: '#14532d', stroke: '#22c55e', text: '#bbf7d0' },
  win: { fill: '#78350f', stroke: '#f59e0b', text: '#fde68a' },
} as const;

export const HexDiagram: React.FC<HexDiagramProps> = ({ cells, arrow, badge, label }) => {
  // Centre the patch in a fixed frame so every figure has the same size
  const pts = cells.map((c) => toXY(c.q, c.r));
  const minX = Math.min(...pts.map((p) => p.x));
  const maxX = Math.max(...pts.map((p) => p.x));
  const minY = Math.min(...pts.map((p) => p.y));
  const maxY = Math.max(...pts.map((p) => p.y));
  const shiftX = VIEW_W / 2 - (minX + maxX) / 2;
  const shiftY = VIEW_H / 2 - (minY + maxY) / 2;

  let hostileNo = 0;

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      role="img"
      aria-label={label}
      className="block w-full h-auto rounded-xl bg-stone-950 border border-stone-700"
    >
      <g transform={`translate(${shiftX.toFixed(2)} ${shiftY.toFixed(2)})`}>
        {/* 1. Tiles */}
        {cells.map((c) => {
          const { x, y } = toXY(c.q, c.r);
          const tile = c.tile ?? 'floor';
          const key = `t${c.q},${c.r}`;

          if (tile === 'void') {
            return (
              <polygon
                key={key}
                points={hexPoints(x, y, R * 0.92)}
                fill="#0c0a09"
                stroke="#57534e"
                strokeWidth={1.2}
                strokeDasharray="3 3"
              />
            );
          }

          // The throne is drawn as an overlay on an ordinary floor tile
          const img = tile === 'gate' ? ASSETS.board.gate : ASSETS.board.floor;
          return (
            <g key={key}>
              <image href={img} x={x - R} y={y - R} width={2 * R} height={2 * R} />
              {tile === 'throne' && (
                <image
                  href={ASSETS.board.throne}
                  x={x - R}
                  y={y - R}
                  width={2 * R}
                  height={2 * R}
                />
              )}
              {tile === 'rock' && (
                <>
                  <polygon points={hexPoints(x, y, R * 0.98)} fill="#1c1917" opacity={0.7} />
                  <polygon
                    points={hexPoints(x, y - 2, R * 0.78)}
                    fill="#78716c"
                    stroke="#a8a29e"
                    strokeWidth={1}
                  />
                </>
              )}
            </g>
          );
        })}

        {/* 2. Hostile sides: red wash + number */}
        {cells
          .filter((c) => c.hostile)
          .map((c) => {
            const { x, y } = toXY(c.q, c.r);
            return (
              <polygon
                key={`h${c.q},${c.r}`}
                points={hexPoints(x, y, R * 0.9)}
                fill="rgba(239,68,68,0.28)"
                stroke="#ef4444"
                strokeWidth={1.8}
              />
            );
          })}

        {/* 3. Arrow (escape route) */}
        {arrow &&
          (() => {
            const a = toXY(arrow.from[0], arrow.from[1]);
            const b = toXY(arrow.to[0], arrow.to[1]);
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const len = Math.hypot(dx, dy) || 1;
            const ux = dx / len;
            const uy = dy / len;
            const sx = a.x + ux * R * 0.9;
            const sy = a.y + uy * R * 0.9;
            const ex = b.x - ux * R * 0.55;
            const ey = b.y - uy * R * 0.55;
            const head = 7;
            const px = -uy;
            const py = ux;
            return (
              <g stroke="#fbbf24" fill="#fbbf24">
                <line x1={sx} y1={sy} x2={ex} y2={ey} strokeWidth={2.4} strokeDasharray="5 4" />
                <polygon
                  points={`${ex + ux * 3},${ey + uy * 3} ${ex - ux * head + px * head * 0.7},${
                    ey - uy * head + py * head * 0.7
                  } ${ex - ux * head - px * head * 0.7},${ey - uy * head - py * head * 0.7}`}
                  strokeWidth={1}
                />
              </g>
            );
          })()}

        {/* 4. Tokens */}
        {cells
          .filter((c) => c.piece)
          .map((c) => {
            const { x, y } = toXY(c.q, c.r);
            const d = R * 1.52;
            return (
              <g key={`p${c.q},${c.r}`} opacity={c.dead ? 0.55 : 1}>
                <image
                  href={TOKEN_IMG[c.piece!]}
                  x={x - d / 2}
                  y={y - d / 2}
                  width={d}
                  height={d}
                />
                {c.friend && (
                  <circle cx={x} cy={y} r={d / 2} fill="none" stroke="#22c55e" strokeWidth={2.2} />
                )}
              </g>
            );
          })}

        {/* 5. Capture crosses */}
        {cells
          .filter((c) => c.dead)
          .map((c) => {
            const { x, y } = toXY(c.q, c.r);
            const k = R * 0.5;
            return (
              <g key={`x${c.q},${c.r}`} stroke="#ef4444" strokeWidth={4} strokeLinecap="round">
                <line x1={x - k} y1={y - k} x2={x + k} y2={y + k} />
                <line x1={x - k} y1={y + k} x2={x + k} y2={y - k} />
              </g>
            );
          })}

        {/* 6. Numbers on the hostile sides: the count toward "3 of 6" */}
        {cells
          .filter((c) => c.hostile && !c.uncounted)
          .map((c) => {
            hostileNo += 1;
            const { x, y } = toXY(c.q, c.r);
            return (
              <g key={`n${c.q},${c.r}`}>
                <circle
                  cx={x + R * 0.5}
                  cy={y - R * 0.55}
                  r={7.5}
                  fill="#7f1d1d"
                  stroke="#fecaca"
                  strokeWidth={1.2}
                />
                <text
                  x={x + R * 0.5}
                  y={y - R * 0.55 + 3.6}
                  textAnchor="middle"
                  fontSize={10}
                  fontWeight={700}
                  fill="#fff"
                >
                  {hostileNo}
                </text>
              </g>
            );
          })}
      </g>

      {badge && (
        <g>
          <rect
            x={VIEW_W - 38}
            y={5}
            width={33}
            height={17}
            rx={8.5}
            fill={BADGE_COLOURS[badge.tone].fill}
            stroke={BADGE_COLOURS[badge.tone].stroke}
            strokeWidth={1.2}
          />
          <text
            x={VIEW_W - 21.5}
            y={17}
            textAnchor="middle"
            fontSize={10.5}
            fontWeight={700}
            fill={BADGE_COLOURS[badge.tone].text}
          >
            {badge.text}
          </text>
        </g>
      )}
    </svg>
  );
};
