import type { GameState } from './types';

/**
 * Factory function to create initial game state
 * Cloud positions will be initialized based on canvas width in Game component
 */
export function initialGameState(): GameState {
  return {
    gameState: 'idle',
    score: 0,
    timeElapsed: 0,
    clouds: [
      { x: 100, y: 80, speed: 10 },
      { x: 400, y: 100, speed: 15 }, // Will be repositioned based on canvas width
      { x: 700, y: 90, speed: 12 }, // Will be repositioned based on canvas width
    ],
    player: {
      x: 400, // Will be repositioned based on canvas width
      width: 80,
      fatness: 1.0,
    },
    dumplings: [],
    lastSpawnTime: 0,
    dumplingsEaten: 0,
    misses: 0,
    effects: [],
    eatingTimer: 0, // seconds - remaining time for eating animation
  };
}
