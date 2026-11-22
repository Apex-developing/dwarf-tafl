import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../store';
import { BoardRenderer } from '../renderer';
import type { Axial } from '../engine/types';

/**
 * Owns the PixiJS board for a game screen: creates the renderer inside the
 * returned container, wires clicks to the store, and keeps pieces and
 * highlights in sync with the game state. With `facing` (face-to-face play)
 * the whole board turns toward the player whose turn it is: the Rebels sit on
 * the top half of the screen, the Clan on the bottom.
 */
export function useBoard(facing: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<BoardRenderer | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const { gameState, selectedPieceId, highlightedCells, selectPiece, movePiece } = useGameStore();
  const rotated = facing && gameState.currentSide === 'rebels';

  // 1. Initialize PixiJS renderer
  useEffect(() => {
    if (!containerRef.current) return;

    let isMounted = true;
    const renderer = new BoardRenderer();
    rendererRef.current = renderer;

    renderer
      .init(containerRef.current)
      .then(() => {
        if (!isMounted) return;
        setIsLoading(false);
        renderer.setBoardRotated(rotated, false);
        renderer.updatePieces(gameState.pieces);
      })
      .catch((err) => {
        console.error('BoardRenderer init error:', err);
      });

    return () => {
      isMounted = false;
      renderer.destroy();
      if (rendererRef.current === renderer) {
        rendererRef.current = null;
      }
    };
  }, []);

  // 2. Wire callbacks (using latest store actions)
  useEffect(() => {
    rendererRef.current?.setCallbacks({
      onTokenClick: (pieceId: string) => selectPiece(pieceId),
      onHexClick: (cell: Axial) => movePiece(cell),
    });
  }, [selectPiece, movePiece]);

  // 3. Turn the board toward whoever is to move (face-to-face play only)
  useEffect(() => {
    rendererRef.current?.setBoardRotated(rotated);
  }, [rotated]);

  // 4. Sync piece positions
  useEffect(() => {
    rendererRef.current?.updatePieces(gameState.pieces);
  }, [gameState.pieces]);

  // 5. Sync highlights
  useEffect(() => {
    if (!rendererRef.current) return;

    let selectedCell: Axial | null = null;
    if (selectedPieceId) {
      const piece = gameState.pieces.get(selectedPieceId);
      if (piece) selectedCell = piece.cell;
    }

    rendererRef.current.setHighlights(highlightedCells, selectedCell);
  }, [highlightedCells, selectedPieceId, gameState.pieces]);

  return { containerRef, isLoading };
}
