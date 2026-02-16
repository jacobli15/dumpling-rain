/**
 * Shared types for the game engine
 */

export type GameStateType = 'idle' | 'playing' | 'gameover';

export type DumplingType = 'charSiuBao' | 'siuMai' | 'haGao';

export interface GameState {
  gameState: GameStateType;
  score: number;
  timeElapsed: number; // seconds
  clouds: Cloud[];
  player: Player;
  dumplings: Dumpling[];
  lastSpawnTime: number; // seconds - time when last dumpling was spawned
  dumplingsEaten: number;
  misses: number;
  effects: Effect[];
  eatingTimer: number; // seconds - remaining time for eating animation
}

export interface Effect {
  id: number;
  type: 'score';
  x: number;
  y: number;
  value: number;
  timeElapsed: number; // seconds since effect was created
  duration: number; // seconds - how long effect lasts
}

export interface Cloud {
  x: number;
  y: number;
  speed: number; // pixels per second
}

export interface Player {
  x: number; // center x position
  width: number; // mouth catch area width
  fatness: number; // scalar starting at 1.0
}

export interface Dumpling {
  id: number;
  type: DumplingType;
  x: number;
  y: number;
  radius: number;
  vy: number; // vertical velocity in pixels per second
  value: number;
  isCaught?: boolean; // true when caught, animating into mouth
  catchTimeElapsed?: number; // seconds since caught, for animation
  catchStartX?: number; // original x position when caught
  catchStartY?: number; // original y position when caught
}
