import {
  Application,
  BlurFilter,
  Container,
  Sprite,
  Graphics,
  MeshSimple,
  Assets,
} from 'pixi.js';
import type { Axial, Piece } from '../engine/types';
import {
  BOARD_RADIUS,
  DIRECTIONS,
  EXITS,
  axialToPixel,
  cellKey,
  isOnBoard,
  isInsideHex,
  isBlockedCell,
  isThrone,
  isExit,
} from '../engine/board';
import { ASSETS } from '../assets';

export interface BoardRendererCallbacks {
  onHexClick?: (cell: Axial) => void;
  onTokenClick?: (pieceId: string) => void;
}

// ─── Layout constants (in units of the hex radius R) ───

/**
 * Side of the background sprite (board.png) in hex radii. Chosen so the whole
 * hex field, its stone rim and the rim's shadow sit fully INSIDE the inner
 * copper frame of board.png with a visible margin (the tightest fit needs
 * ≈22.4R — see the geometry of the 91-cell board).
 */
const BG_SIZE_R = 24;
/** Visible outer frame of board.png as a fraction of the sprite size (after the 90° turn). */
const BG_FRAME_HALF_W = 612 / 1254;
const BG_FRAME_HALF_H = 543 / 1254;

/** Stone rim thickness, in hex radii. */
const WALL_THICKNESS_R = 0.26;

/** Slab region of border-sprite.png that holds the lit top bevel + dark front face. */
const WALL_UV = { x0: 215, x1: 1055, y0: 608, y1: 664, tex: 1254 };

/** Exit glow: light green, thin, fades to transparent at the outer edge. */
const GLOW_COLOR = 0xa6f7b4;
const GLOW_LAYERS = 8;
const GLOW_PERIOD_MS = 4600;
/** Pause before the board turns, then how long the half-turn takes. */
const BOARD_TURN_DELAY_MS = 450;
const BOARD_TURN_MS = 700;

interface PerimeterEdge {
  /** Edge end points (cell vertices), clockwise around the board. */
  a: { x: number; y: number };
  b: { x: number; y: number };
  /** Outward unit normal. */
  n: { x: number; y: number };
  /** Exit cells keep their own stone archways — no rim there. */
  isGate: boolean;
  /** Edge facing a rock rather than the outside of the board. */
  isHole: boolean;
}

export class BoardRenderer {
  private app: Application | null = null;
  private containerEl: HTMLElement | null = null;

  // Layers
  private rootContainer: Container = new Container();
  private bgLayer: Container = new Container();
  private tileLayer: Container = new Container();
  private borderLayer: Container = new Container();
  private highlightLayer: Container = new Container();
  private tokenLayer: Container = new Container();

  // Metrics
  private radiusPx: number = 46;
  private originX: number = 0;
  private originY: number = 0;

  // Exit glows (pulsed in the ticker)
  private exitGlows: Graphics[] = [];

  // Sprites cache
  private tokenSprites: Map<string, { sprite: Sprite; currentCell: Axial }> = new Map();
  private selectedPieceCell: Axial | null = null;
  private highlightedCells: Axial[] = [];

  // Animation ticker
  private animatingTokens: Array<{
    sprite: Sprite;
    fromX: number;
    fromY: number;
    toX: number;
    toY: number;
    startTime: number;
    duration: number;
  }> = [];

  // Callbacks
  private callbacks: BoardRendererCallbacks = {};
  private currentPieces: Map<string, Piece> = new Map();

  private resizeObserver: ResizeObserver | null = null;
  // Board spin for face-to-face play (radians; grows by π per handover)
  private boardRotated = false;
  private boardAngle = 0;
  private boardTarget = 0;
  private boardFrom = 0;
  private boardAnimStart: number | null = null;

  private isDestroyed: boolean = false;
  private isInitialized: boolean = false;

  constructor(callbacks?: BoardRendererCallbacks) {
    if (callbacks) {
      this.callbacks = callbacks;
    }
  }

  public setCallbacks(callbacks: BoardRendererCallbacks) {
    this.callbacks = callbacks;
  }

  /**
   * Face-to-face play: the whole board (tiles, tokens, highlights) is turned
   * 180° toward the player whose turn it is, so every token reads upright for
   * them. Each handover spins it half a turn the same way round, after a short
   * pause that lets the last move and its captures be seen first.
   */
  public setBoardRotated(on: boolean, animate = true) {
    if (this.boardRotated === on) return;
    this.boardRotated = on;
    this.boardTarget += Math.PI;
    if (animate && this.isInitialized) {
      this.boardFrom = this.boardAngle;
      this.boardAnimStart = performance.now() + BOARD_TURN_DELAY_MS;
    } else {
      this.boardAngle = this.boardTarget;
      this.boardAnimStart = null;
      this.applyBoardTransform();
    }
  }

  /** Spin the root container about the board centre (also after a resize). */
  private applyBoardTransform() {
    this.rootContainer.pivot.set(this.originX, this.originY);
    this.rootContainer.position.set(this.originX, this.originY);
    this.rootContainer.rotation = this.boardAngle;
  }

  public async init(container: HTMLElement): Promise<void> {
    this.isDestroyed = false;
    this.isInitialized = false;
    this.containerEl = container;

    // Clean any existing canvas from container
    container.innerHTML = '';

    // 1. Create PixiJS Application v8
    const app = new Application();
    this.app = app;

    await app.init({
      resizeTo: container,
      backgroundAlpha: 0,
      antialias: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
    });

    if (this.isDestroyed) {
      try {
        app.destroy(true, { children: true, texture: false });
      } catch {
        // ignore
      }
      return;
    }

    container.appendChild(app.canvas);

    // 2. Set up layer hierarchy
    app.stage.addChild(this.rootContainer);
    this.rootContainer.addChild(this.bgLayer);
    this.rootContainer.addChild(this.tileLayer);
    this.rootContainer.addChild(this.borderLayer);
    this.rootContainer.addChild(this.highlightLayer);
    this.rootContainer.addChild(this.tokenLayer);

    // 3. Preload all textures
    await Assets.load([
      ASSETS.board.background,
      ASSETS.board.floor,
      ASSETS.board.gate,
      ASSETS.board.throne,
      ASSETS.board.border,
      ASSETS.tokens.king,
      ASSETS.tokens.guard,
      ASSETS.tokens.attacker,
    ]);

    if (this.isDestroyed) {
      try {
        app.destroy(true, { children: true, texture: false });
      } catch {
        // ignore
      }
      return;
    }

    this.isInitialized = true;

    // 4. Calculate dimensions & layout
    this.updateMetrics();
    this.buildBoard();

    // 5. Setup interaction
    this.setupInteraction();

    // 6. Setup animation loop
    if (app.ticker) {
      app.ticker.add(this.onTick, this);
    }

    // 7. Re-fit whenever the container changes size. Window resizes are not
    //    enough: the dice panel below the board grows and shrinks during a
    //    turn, which resizes the container without any window event.
    this.resizeObserver = new ResizeObserver(() => {
      this.app?.resize();
      this.onResize();
    });
    this.resizeObserver.observe(container);

    // 8. Render any pieces and highlights that were set before init completed
    if (this.currentPieces.size > 0) {
      this.updatePieces(this.currentPieces);
    }
    this.drawHighlights();
  }

  private updateMetrics() {
    if (!this.containerEl) return;
    const width = this.containerEl.clientWidth || 800;
    const height = this.containerEl.clientHeight || 800;

    this.originX = width / 2;
    this.originY = height / 2;

    // The board lives inside the board.png frame (rotated 90°); fit the
    // frame's visible outline into the container with a little padding.
    const pad = 16;
    const byWidth = (width - pad * 2) / (2 * BG_FRAME_HALF_W * BG_SIZE_R);
    const byHeight = (height - pad * 2) / (2 * BG_FRAME_HALF_H * BG_SIZE_R);
    this.radiusPx = Math.max(9, Math.min(56, byWidth, byHeight));
    this.applyBoardTransform();
  }

  private onResize = () => {
    if (!this.isInitialized) return;

    // Skip no-op resizes: rebuilding the board for nothing is wasted work and
    // used to interrupt token animations.
    const before = { r: this.radiusPx, x: this.originX, y: this.originY };
    this.updateMetrics();
    if (
      Math.abs(before.r - this.radiusPx) < 0.01 &&
      Math.abs(before.x - this.originX) < 0.5 &&
      Math.abs(before.y - this.originY) < 0.5
    ) {
      return;
    }

    // Geometry changed: running animations hold OLD pixel coordinates and
    // would drag tokens to stale positions — drop them, tokens snap below.
    this.animatingTokens.length = 0;
    this.rebuildBoard();
    this.updatePieces(this.currentPieces);
    this.drawHighlights();
  };

  private buildBoard() {
    // 1. Large background hex (board.png)
    const bgTexture = Assets.get(ASSETS.board.background);
    if (bgTexture) {
      const bgSprite = new Sprite(bgTexture);
      bgSprite.anchor.set(0.5);
      bgSprite.x = this.originX;
      bgSprite.y = this.originY;
      // Rotated 90° as per spec
      bgSprite.rotation = Math.PI / 2;
      // Big enough to hold the whole radius-5 field + rim inside its frame
      const bgSize = this.radiusPx * BG_SIZE_R;
      bgSprite.width = bgSize;
      bgSprite.height = bgSize;
      this.bgLayer.addChild(bgSprite);
    }

    // 2. Generate all cells
    const floorTexture = Assets.get(ASSETS.board.floor);
    const throneTexture = Assets.get(ASSETS.board.throne);
    const gateTexture = Assets.get(ASSETS.board.gate);

    // Isotropic hex scale to prevent distortion on rotation
    const hexScale = (2 * this.radiusPx) / 1254;

    // Iterate through the bounding box of the board
    for (let q = -BOARD_RADIUS; q <= BOARD_RADIUS; q++) {
      for (let r = -BOARD_RADIUS; r <= BOARD_RADIUS; r++) {
        const cell: Axial = { q, r };
        if (!isInsideHex(cell)) continue;

        const pos = axialToPixel(cell, this.radiusPx, this.originX, this.originY);

        if (isBlockedCell(cell)) {
          // Rock in front of a gate: impassable, drawn as a raised stone block
          this.tileLayer.addChild(this.buildRock(pos.x, pos.y, floorTexture, hexScale));
          continue;
        }

        if (isExit(cell)) {
          // A. Exit Gates
          if (gateTexture) {
            const gate = new Sprite(gateTexture);
            gate.anchor.set(0.5);
            gate.x = pos.x;
            gate.y = pos.y;
            gate.scale.set(hexScale);

            // Gate art is turned 0° / 120° / 240° so its archways face the corner
            const exitIdx = EXITS.findIndex((e) => e.q === cell.q && e.r === cell.r);
            gate.rotation = (exitIdx * 120 * Math.PI) / 180;

            this.tileLayer.addChild(gate);

            this.tileLayer.addChild(this.buildExitGlow(pos.x, pos.y));
          }
        } else {
          // B. Base floor tile for non-exit cells
          if (floorTexture) {
            const tile = new Sprite(floorTexture);
            tile.anchor.set(0.5);
            tile.x = pos.x;
            tile.y = pos.y;
            tile.scale.set(hexScale);
            this.tileLayer.addChild(tile);
          }
        }

        // C. Throne at (0, 0)
        if (isThrone(cell) && throneTexture) {
          const throne = new Sprite(throneTexture);
          throne.anchor.set(0.5);
          throne.x = pos.x;
          throne.y = pos.y;
          throne.scale.set(hexScale);
          this.tileLayer.addChild(throne);
        }

      }
    }

    // 3. Stone rim around the whole board (exit gates stay open)
    this.buildRim();
  }

  // ─── Rock ───

  /** A raised block of stone filling one hex: darkened floor + lit top face. */
  private buildRock(
    cx: number,
    cy: number,
    floorTexture: ReturnType<typeof Assets.get>,
    hexScale: number,
  ): Container {
    const rock = new Container();
    const R = this.radiusPx;

    if (floorTexture) {
      const base = new Sprite(floorTexture);
      base.anchor.set(0.5);
      base.x = cx;
      base.y = cy;
      base.scale.set(hexScale);
      base.tint = 0x4a4540;
      rock.addChild(base);
    }

    const hexPts = (radius: number) => {
      const pts: number[] = [];
      for (let k = 0; k < 6; k++) {
        const ang = ((30 + k * 60) * Math.PI) / 180;
        pts.push(cx + Math.cos(ang) * radius, cy + Math.sin(ang) * radius);
      }
      return pts;
    };

    const g = new Graphics();
    // lit top face
    g.poly(hexPts(R * 0.66)).fill({ color: 0x8a7f74, alpha: 0.42 });
    g.poly(hexPts(R * 0.66)).stroke({ color: 0xe8d4b0, width: 1, alpha: 0.35 });
    // soft shading towards the lower edge for volume
    g.poly(hexPts(R * 0.42)).fill({ color: 0xb3a597, alpha: 0.18 });
    rock.addChild(g);
    return rock;
  }

  // ─── Exit glow ───

  /**
   * Thin light-green outline of a gate hex. Built from stacked 1-px outlines
   * whose alpha falls off towards the outer edge (a cheap linear gradient).
   * The whole ring breathes very slowly in the ticker.
   */
  private buildExitGlow(cx: number, cy: number): Graphics {
    const g = new Graphics();
    const R = this.radiusPx;
    const band = Math.max(2, R * 0.06); // total glow thickness
    const outer = R * 0.97;
    const inner = outer - band;
    const step = band / GLOW_LAYERS;

    for (let i = 0; i < GLOW_LAYERS; i++) {
      const rad = inner + (i + 0.5) * step;
      const alpha = 0.9 * Math.pow(1 - i / GLOW_LAYERS, 1.1);
      const pts: number[] = [];
      for (let k = 0; k < 6; k++) {
        const ang = ((30 + k * 60) * Math.PI) / 180;
        pts.push(cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad);
      }
      g.poly(pts).stroke({ color: GLOW_COLOR, width: step * 1.25, alpha });
    }

    this.exitGlows.push(g);
    return g;
  }

  // ─── Stone rim ───

  /**
   * All exposed cell edges, ordered clockwise around the board. Consecutive
   * edges share an end point, so rim pieces can be joined with mitres.
   */
  private collectPerimeter(): PerimeterEdge[] {
    const R = this.radiusPx;
    const edges: PerimeterEdge[] = [];

    for (let q = -BOARD_RADIUS; q <= BOARD_RADIUS; q++) {
      for (let r = -BOARD_RADIUS; r <= BOARD_RADIUS; r++) {
        const cell: Axial = { q, r };
        if (!isOnBoard(cell)) continue;
        const c = axialToPixel(cell, R, this.originX, this.originY);

        for (let d = 0; d < DIRECTIONS.length; d++) {
          const nb: Axial = { q: q + DIRECTIONS[d].q, r: r + DIRECTIONS[d].r };
          if (isOnBoard(nb)) continue;

          // Pointy-top: the edge facing direction d spans vertices at 60d±30°
          const a0 = ((60 * d - 30) * Math.PI) / 180;
          const a1 = ((60 * d + 30) * Math.PI) / 180;
          const nAng = (60 * d * Math.PI) / 180;
          edges.push({
            a: { x: c.x + Math.cos(a0) * R, y: c.y + Math.sin(a0) * R },
            b: { x: c.x + Math.cos(a1) * R, y: c.y + Math.sin(a1) * R },
            n: { x: Math.cos(nAng), y: Math.sin(nAng) },
            isGate: isExit(cell),
            isHole: isInsideHex(nb),
          });
        }
      }
    }
    return edges;
  }

  private buildRim() {
    const R = this.radiusPx;
    const edges = this.collectPerimeter();
    if (edges.length === 0) return;

    const key = (p: { x: number; y: number }) =>
      `${Math.round(p.x * 10)},${Math.round(p.y * 10)}`;
    const byStart = new Map<string, PerimeterEdge>();
    const byEnd = new Map<string, PerimeterEdge>();
    for (const e of edges) {
      byStart.set(key(e.a), e);
      byEnd.set(key(e.b), e);
    }

    /**
     * Mitre offset at a shared vertex: pushes the vertex outward by `t`
     * measured perpendicular to BOTH neighbouring edges, so the two pieces
     * meet along one clean diagonal (works for convex and concave corners).
     */
    const mitre = (n1: PerimeterEdge['n'], n2: PerimeterEdge['n'], t: number) => {
      const k = t / (1 + n1.x * n2.x + n1.y * n2.y);
      return { x: (n1.x + n2.x) * k, y: (n1.y + n2.y) * k };
    };
    const offsets = (e: PerimeterEdge, t: number) => {
      const prev = byEnd.get(key(e.a));
      const next = byStart.get(key(e.b));
      const ma = mitre(prev ? prev.n : e.n, e.n, t);
      const mb = mitre(e.n, next ? next.n : e.n, t);
      return {
        ao: { x: e.a.x + ma.x, y: e.a.y + ma.y },
        bo: { x: e.b.x + mb.x, y: e.b.y + mb.y },
        ma,
        mb,
      };
    };

    const t = R * WALL_THICKNESS_R;
    const walls = edges.filter((e) => !e.isGate);

    // 1. Soft drop shadow cast outward onto board.png
    const shadow = new Graphics();
    for (const e of walls) {
      if (e.isHole) continue; // rocks are raised: no pit shadow
      const o = offsets(e, t + R * 0.16);
      shadow.poly([e.a.x, e.a.y, e.b.x, e.b.y, o.bo.x, o.bo.y, o.ao.x, o.ao.y]);
    }
    shadow.fill({ color: 0x000000, alpha: 0.5 });
    shadow.filters = [new BlurFilter({ strength: Math.max(2, R * 0.1), quality: 3 })];
    this.borderLayer.addChild(shadow);

    // 2. Ambient occlusion: the rim darkens the floor right next to it
    const ao = new Graphics();
    for (const e of walls) {
      for (let i = 0; i < 3; i++) {
        const depth = R * (0.07 + i * 0.06);
        const inA = { x: e.a.x - e.n.x * depth, y: e.a.y - e.n.y * depth };
        const inB = { x: e.b.x - e.n.x * depth, y: e.b.y - e.n.y * depth };
        ao.poly([e.a.x, e.a.y, e.b.x, e.b.y, inB.x, inB.y, inA.x, inA.y]).fill({
          color: 0x000000,
          alpha: 0.13,
        });
      }
    }
    this.borderLayer.addChild(ao);

    // 3. The rim pieces: stone texture mapped onto mitred quads.
    //    Lit top bevel sits on the inner edge, dark front face on the outer edge.
    const tex = Assets.get(ASSETS.board.border);
    const lines = new Graphics();
    walls.forEach((e, i) => {
      const o = offsets(e, t);

      if (tex) {
        // Pick a different stretch of the stone slab for each piece
        const span = (WALL_UV.x1 - WALL_UV.x0) * 0.36;
        const jitter = ((i * 2654435761) % 1000) / 1000;
        const ux0 = WALL_UV.x0 + jitter * (WALL_UV.x1 - WALL_UV.x0 - span);
        const u0 = ux0 / WALL_UV.tex;
        const u1 = (ux0 + span) / WALL_UV.tex;
        const v0 = WALL_UV.y0 / WALL_UV.tex;
        const v1 = WALL_UV.y1 / WALL_UV.tex;

        const mesh = new MeshSimple({
          texture: tex,
          vertices: new Float32Array([
            e.a.x, e.a.y,
            e.b.x, e.b.y,
            o.bo.x, o.bo.y,
            o.ao.x, o.ao.y,
          ]),
          uvs: new Float32Array([u0, v0, u1, v0, u1, v1, u0, v1]),
          indices: new Uint32Array([0, 1, 2, 0, 2, 3]),
        });
        this.borderLayer.addChild(mesh);
      }

      // Bevel highlight (inner edge), dark outer edge, mitre seams
      lines.moveTo(e.a.x, e.a.y).lineTo(e.b.x, e.b.y).stroke({ color: 0xe8d4b0, width: 1, alpha: 0.4 });
      lines.moveTo(o.ao.x, o.ao.y).lineTo(o.bo.x, o.bo.y).stroke({ color: 0x000000, width: 1.2, alpha: 0.6 });
      lines.moveTo(e.a.x, e.a.y).lineTo(o.ao.x, o.ao.y).stroke({ color: 0x000000, width: 1, alpha: 0.35 });
      lines.moveTo(e.b.x, e.b.y).lineTo(o.bo.x, o.bo.y).stroke({ color: 0x000000, width: 1, alpha: 0.35 });
    });
    this.borderLayer.addChild(lines);
  }

  private rebuildBoard() {
    if (!this.isInitialized || !this.app) return;
    this.bgLayer.removeChildren();
    this.tileLayer.removeChildren();
    this.borderLayer.removeChildren().forEach((c) => c.destroy({ children: true }));
    this.exitGlows = [];
    this.buildBoard();
  }

  // ─── Interaction ───

  private setupInteraction() {
    if (!this.app) return;

    this.app.stage.eventMode = 'static';
    this.app.stage.hitArea = this.app.screen;

    this.app.stage.on('pointerdown', (e) => {
      // The board may be turned toward the far player: undo that spin first
      const boardPos = this.rootContainer.toLocal(e.global);
      const clickedCell = this.pixelToAxial(boardPos.x, boardPos.y);

      if (!clickedCell || !isOnBoard(clickedCell)) {
        return;
      }

      // Check if a piece occupies this cell
      const clickedKey = cellKey(clickedCell);
      let pieceOnCell: Piece | undefined;

      for (const piece of this.currentPieces.values()) {
        if (cellKey(piece.cell) === clickedKey) {
          pieceOnCell = piece;
          break;
        }
      }

      if (pieceOnCell && this.callbacks.onTokenClick) {
        this.callbacks.onTokenClick(pieceOnCell.id);
      }

      if (this.callbacks.onHexClick) {
        this.callbacks.onHexClick(clickedCell);
      }
    });
  }

  /** Inverse of axialToPixel with hex rounding */
  public pixelToAxial(px: number, py: number): Axial | null {
    const relX = px - this.originX;
    const relY = py - this.originY;

    const r = relY / (1.5 * this.radiusPx);
    const q = relX / (Math.sqrt(3) * this.radiusPx) - r / 2;

    // Convert to cube coords (x, y, z)
    const x = q;
    const z = r;
    const y = -x - z;

    let rx = Math.round(x);
    let ry = Math.round(y);
    let rz = Math.round(z);

    const xDiff = Math.abs(rx - x);
    const yDiff = Math.abs(ry - y);
    const zDiff = Math.abs(rz - z);

    if (xDiff > yDiff && xDiff > zDiff) {
      rx = -ry - rz;
    } else if (yDiff > zDiff) {
      ry = -rx - rz;
    } else {
      rz = -rx - ry;
    }

    const cell: Axial = { q: rx, r: rz };
    return isOnBoard(cell) ? cell : null;
  }

  // ─── Pieces & Tokens ───

  public updatePieces(pieces: Map<string, Piece>) {
    this.currentPieces = pieces;
    if (!this.isInitialized || !this.app) return;

    const tokenRadius = this.radiusPx * 0.76;
    const tokenDiameter = tokenRadius * 2;

    const presentIds = new Set<string>();

    for (const [id, piece] of pieces) {
      presentIds.add(id);
      const targetPos = axialToPixel(piece.cell, this.radiusPx, this.originX, this.originY);

      let record = this.tokenSprites.get(id);

      if (!record) {
        // Create new sprite
        const textureKey =
          piece.type === 'king'
            ? ASSETS.tokens.king
            : piece.type === 'guard'
              ? ASSETS.tokens.guard
              : ASSETS.tokens.attacker;

        const texture = Assets.get(textureKey);
        if (!texture) continue;

        const sprite = new Sprite(texture);
        sprite.anchor.set(0.5);
        sprite.width = tokenDiameter;
        sprite.height = tokenDiameter;
        sprite.x = targetPos.x;
        sprite.y = targetPos.y;

        this.tokenLayer.addChild(sprite);

        record = { sprite, currentCell: piece.cell };
        this.tokenSprites.set(id, record);
      } else {
        // Update size in case of resize
        record.sprite.width = tokenDiameter;
        record.sprite.height = tokenDiameter;

        // Check if piece moved
        const oldKey = cellKey(record.currentCell);
        const newKey = cellKey(piece.cell);

        if (oldKey !== newKey) {
          // Animate transition (a newer move replaces any unfinished one)
          this.animatingTokens = this.animatingTokens.filter((a) => a.sprite !== record!.sprite);
          this.animatingTokens.push({
            sprite: record.sprite,
            fromX: record.sprite.x,
            fromY: record.sprite.y,
            toX: targetPos.x,
            toY: targetPos.y,
            startTime: performance.now(),
            duration: 220,
          });
          record.currentCell = piece.cell;
        } else {
          // Same position (e.g. after resize)
          record.sprite.x = targetPos.x;
          record.sprite.y = targetPos.y;
        }
      }
    }

    // Remove captured pieces with a shrink/fade animation
    for (const [id, record] of this.tokenSprites) {
      if (!presentIds.has(id)) {
        // Fade out & remove
        this.tokenLayer.removeChild(record.sprite);
        record.sprite.destroy();
        this.tokenSprites.delete(id);
      }
    }
  }

  // ─── Highlights ───

  public setHighlights(cells: Axial[], selectedPieceCell: Axial | null = null) {
    this.highlightedCells = cells;
    this.selectedPieceCell = selectedPieceCell;
    this.drawHighlights();
  }

  private drawHighlights() {
    if (!this.isInitialized || !this.app) return;
    this.highlightLayer.removeChildren();

    const g = new Graphics();

    // 1. Highlight legal destination cells (cyan/emerald glow)
    for (const cell of this.highlightedCells) {
      const pos = axialToPixel(cell, this.radiusPx, this.originX, this.originY);

      // Draw hex polygon outline & soft fill
      const hexRadius = this.radiusPx * 0.88;
      const points: number[] = [];
      for (let i = 0; i < 6; i++) {
        // Pointy-top vertices at 30°, 90°, 150°, 210°, 270°, 330°
        const angle = ((30 + i * 60) * Math.PI) / 180;
        points.push(pos.x + Math.cos(angle) * hexRadius, pos.y + Math.sin(angle) * hexRadius);
      }

      g.poly(points)
        .fill({ color: 0x22d3ee, alpha: 0.35 })
        .stroke({ color: 0x38bdf8, width: 2.5, alpha: 0.85 });

      // Small pulsing center dot
      g.circle(pos.x, pos.y, 4).fill({ color: 0xffffff, alpha: 0.9 });
    }

    // 2. Highlight selected piece (golden ring)
    if (this.selectedPieceCell) {
      const pos = axialToPixel(
        this.selectedPieceCell,
        this.radiusPx,
        this.originX,
        this.originY,
      );

      g.circle(pos.x, pos.y, this.radiusPx * 0.84).stroke({
        color: 0xf59e0b,
        width: 3.5,
        alpha: 0.95,
      });
    }

    this.highlightLayer.addChild(g);
  }

  // ─── Animation Loop ───

  private onTick = () => {
    const now = performance.now();

    // Very slow, barely noticeable breathing of the exit glow
    if (this.exitGlows.length > 0) {
      const pulse = 0.82 + 0.18 * Math.sin((now / GLOW_PERIOD_MS) * Math.PI * 2);
      for (const g of this.exitGlows) g.alpha = pulse;
    }

    // Half-turn of the whole board toward the next player
    if (this.boardAnimStart !== null && now >= this.boardAnimStart) {
      const p = Math.min(1, (now - this.boardAnimStart) / BOARD_TURN_MS);
      const ease = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      this.boardAngle = this.boardFrom + (this.boardTarget - this.boardFrom) * ease;
      if (p >= 1) {
        this.boardAngle = this.boardTarget;
        this.boardAnimStart = null;
      }
      this.applyBoardTransform();
    }

    for (let i = this.animatingTokens.length - 1; i >= 0; i--) {
      const anim = this.animatingTokens[i];
      const elapsed = now - anim.startTime;
      const progress = Math.min(1, elapsed / anim.duration);

      // Smooth easeInOutCubic
      const ease =
        progress < 0.5
          ? 4 * progress * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      anim.sprite.x = anim.fromX + (anim.toX - anim.fromX) * ease;
      anim.sprite.y = anim.fromY + (anim.toY - anim.fromY) * ease;

      if (progress >= 1) {
        anim.sprite.x = anim.toX;
        anim.sprite.y = anim.toY;
        this.animatingTokens.splice(i, 1);
      }
    }
  };

  // ─── Cleanup ───

  public destroy() {
    this.isDestroyed = true;
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;

    if (this.app) {
      try {
        if (this.app.ticker) {
          this.app.ticker.remove(this.onTick, this);
        }
        if (this.app.canvas && this.app.canvas.parentElement) {
          this.app.canvas.parentElement.removeChild(this.app.canvas);
        }
        this.app.destroy(true, { children: true, texture: false });
      } catch (err) {
        console.warn('Error during BoardRenderer destroy:', err);
      }
      this.app = null;
    }
    this.isInitialized = false;
  }
}
