import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { GameState, Side } from './types';

interface DwarfTaflDB extends DBSchema {
  games: {
    key: string;
    value: {
      gameId: string;
      createdAt: number;
      updatedAt: number;
      mode: 'local' | 'vsAI';
      snapshot: {
        currentSide: Side;
        turnNumber: number;
        pieces: Array<{ id: string; type: string; side: string; cell: { q: number; r: number } }>;
        captured: { clan: string[]; rebels: string[] };
      };
    };
  };
  settings: {
    key: string;
    value: {
      key: string;
      value: unknown;
    };
  };
}

const DB_NAME = 'dwarf-tafl-db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<DwarfTaflDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<DwarfTaflDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('games')) {
          db.createObjectStore('games', { keyPath: 'gameId' });
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      },
    });
  }
  return dbPromise;
}

/** Save an active game snapshot into IndexedDB */
export async function saveGameSnapshot(gameId: string, state: GameState, mode: 'local' | 'vsAI') {
  try {
    const db = await getDB();
    const serializedPieces = Array.from(state.pieces.values()).map((p) => ({
      id: p.id,
      type: p.type,
      side: p.side,
      cell: { ...p.cell },
    }));

    await db.put('games', {
      gameId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      mode,
      snapshot: {
        currentSide: state.currentSide,
        turnNumber: state.turnNumber,
        pieces: serializedPieces,
        captured: {
          clan: [...state.captured.clan],
          rebels: [...state.captured.rebels],
        },
      },
    });
  } catch (err) {
    console.warn('Failed to save game snapshot to IndexedDB:', err);
  }
}

/** Load the most recent game snapshot */
export async function loadLatestGame() {
  try {
    const db = await getDB();
    const allGames = await db.getAll('games');
    if (allGames.length === 0) return null;
    allGames.sort((a, b) => b.updatedAt - a.updatedAt);
    return allGames[0];
  } catch (err) {
    console.warn('Failed to load game from IndexedDB:', err);
    return null;
  }
}
