import type { Cloud, Dumpling, DumplingType } from './types';

export const BASE_VY = 100; // Base vertical velocity in pixels per second
const BASE_SPAWN_INTERVAL = 1.2; // seconds
const MIN_SPAWN_INTERVAL = 0.6; // seconds
const DUMPLING_RADIUS = 20;
const SPAWN_Y_OFFSET = 120; // Spawn slightly below clouds

// Dumpling type probabilities and values
const DUMPLING_TYPES: { type: DumplingType; value: number; weight: number }[] = [
  { type: 'charSiuBao', value: 10, weight: 1 }, // Rare, high value
  { type: 'siuMai', value: 5, weight: 3 }, // Medium
  { type: 'haGao', value: 1, weight: 6 }, // Common, low value
];

/**
 * Calculate spawn interval based on time elapsed (gets faster over time)
 */
export function getSpawnInterval(timeElapsed: number): number {
  // Tighten spawn rate from BASE_SPAWN_INTERVAL down to MIN_SPAWN_INTERVAL over 60 seconds
  const progress = Math.min(timeElapsed / 60, 1);
  return BASE_SPAWN_INTERVAL - (BASE_SPAWN_INTERVAL - MIN_SPAWN_INTERVAL) * progress;
}

/**
 * Calculate speed multiplier based on time elapsed (gets faster over time)
 */
export function getSpeedMultiplier(timeElapsed: number): number {
  // speedMultiplier = 1 + (timeElapsed / 30) * 0.35, max ~2.2
  return Math.min(1 + (timeElapsed / 30) * 0.35, 2.2);
}

/**
 * Check if we should spawn a new dumpling
 */
export function shouldSpawn(
  lastSpawnTime: number,
  currentTime: number,
  timeElapsed: number
): boolean {
  const interval = getSpawnInterval(timeElapsed);
  return currentTime - lastSpawnTime >= interval;
}

/**
 * Select random dumpling type based on weights
 */
function selectDumplingType(): DumplingType {
  const totalWeight = DUMPLING_TYPES.reduce((sum, d) => sum + d.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const dumplingType of DUMPLING_TYPES) {
    random -= dumplingType.weight;
    if (random <= 0) {
      return dumplingType.type;
    }
  }
  
  return DUMPLING_TYPES[DUMPLING_TYPES.length - 1].type; // Fallback
}

/**
 * Helper to wrap cloud X position
 */
function wrapCloudX(x: number, cloudWidth: number, canvasWidth: number): number {
  if (x < -cloudWidth) {
    return x + canvasWidth + cloudWidth;
  }
  if (x > canvasWidth) {
    return x - canvasWidth - cloudWidth;
  }
  return x;
}

/**
 * Check if cloud is visible on screen
 */
function isCloudVisible(cloud: Cloud, canvasWidth: number): boolean {
  const cloudWidth = 500; // Updated to match draw.ts
  const wrappedX = wrapCloudX(cloud.x, cloudWidth, canvasWidth);
  return wrappedX >= -cloudWidth && wrappedX <= canvasWidth + cloudWidth;
}

// Minimum vertical gap when dumplings are in the same "column" so they never stack
const SAME_COLUMN_H_THRESHOLD = 120; // same column = horizontal distance less than this (player catch width ~80)
const MIN_VERTICAL_GAP_SAME_COLUMN = 220; // when in same column, Y gap must be at least this

/**
 * Check if spawning at (spawnX, spawnY) would put a dumpling on top of another (same column, too close in Y)
 */
function wouldStackVertically(
  spawnX: number,
  spawnY: number,
  existingDumplings: Dumpling[]
): boolean {
  return existingDumplings.some((d) => {
    const horizontalDist = Math.abs(d.x - spawnX);
    const verticalDist = Math.abs(d.y - spawnY);
    if (horizontalDist >= SAME_COLUMN_H_THRESHOLD) return false; // different column, no stack
    return verticalDist < MIN_VERTICAL_GAP_SAME_COLUMN; // same column and too close in Y
  });
}

/**
 * Check if Y level is occupied by existing dumplings
 */
function isYLevelOccupied(y: number, existingDumplings: Dumpling[], minSpacing: number = 120): boolean {
  return existingDumplings.some(d => Math.abs(d.y - y) < minSpacing);
}

/**
 * Check if spawn position is reachable by player and not overlapping with existing dumplings
 */
function isSpawnPositionReachable(
  spawnX: number,
  spawnY: number,
  playerX: number,
  existingDumplings: Dumpling[],
  maxDistance: number = 400
): boolean {
  const distanceToPlayer = Math.abs(spawnX - playerX);
  if (distanceToPlayer > maxDistance) {
    return false;
  }
  return !existingDumplings.some(d => {
    const horizontalDistance = Math.abs(d.x - spawnX);
    const verticalDistance = Math.abs(d.y - spawnY);
    return horizontalDistance < 120 && verticalDistance < 200;
  });
}

/**
 * Check if X position is too close to existing dumplings (prevent same position)
 */
function isXPositionOccupied(spawnX: number, existingDumplings: Dumpling[], minSpacing: number = 130): boolean {
  return existingDumplings.some(d => Math.abs(d.x - spawnX) < minSpacing);
}

/**
 * Spawn a new dumpling from a random cloud.
 * Returns null if no position is valid (would stack or overlap).
 */
export function spawnDumpling(
  clouds: Cloud[],
  nextId: number,
  canvasWidth: number,
  speedMultiplier: number,
  existingDumplings: Dumpling[],
  playerX: number
): Dumpling | null {
  const dumplingType = selectDumplingType();
  const typeData = DUMPLING_TYPES.find(d => d.type === dumplingType)!;
  
  // Filter visible clouds
  const visibleClouds = clouds.filter(c => isCloudVisible(c, canvasWidth));
  
  if (visibleClouds.length === 0) {
    const cloud = clouds[0];
    const spawnX = Math.max(40 + DUMPLING_RADIUS, Math.min(canvasWidth - 40 - DUMPLING_RADIUS, cloud.x + Math.random() * 100 - 50));
    const spawnY = cloud.y + SPAWN_Y_OFFSET;
    if (
      wouldStackVertically(spawnX, spawnY, existingDumplings) ||
      isYLevelOccupied(spawnY, existingDumplings) ||
      isXPositionOccupied(spawnX, existingDumplings)
    ) {
      return null;
    }
    return {
      id: nextId,
      type: dumplingType,
      x: spawnX,
      y: spawnY,
      radius: DUMPLING_RADIUS,
      vy: BASE_VY * speedMultiplier,
      value: typeData.value,
    };
  }
  
  // Try to find a good spawn position (no stacking)
  let attempts = 0;
  const maxAttempts = 50;
  
  while (attempts < maxAttempts) {
    const cloud = visibleClouds[Math.floor(Math.random() * visibleClouds.length)];
    const cloudWidth = 500; // Updated to match draw.ts
    const wrappedX = wrapCloudX(cloud.x, cloudWidth, canvasWidth);
    
    // Spawn within cloud's x-range
    const cloudLeft = wrappedX - cloudWidth / 2;
    const cloudRight = wrappedX + cloudWidth / 2;
    let spawnX = cloudLeft + Math.random() * (cloudRight - cloudLeft);
    
    // Clamp to screen edges (40px margin)
    spawnX = Math.max(40 + DUMPLING_RADIUS, Math.min(canvasWidth - 40 - DUMPLING_RADIUS, spawnX));
    
    const spawnY = cloud.y + SPAWN_Y_OFFSET;
    
    // Check if position is valid: no stacking, no Y/X overlap, reachable by player
    if (
      !wouldStackVertically(spawnX, spawnY, existingDumplings) &&
      !isYLevelOccupied(spawnY, existingDumplings) &&
      !isXPositionOccupied(spawnX, existingDumplings) &&
      isSpawnPositionReachable(spawnX, spawnY, playerX, existingDumplings)
    ) {
      return {
        id: nextId,
        type: dumplingType,
        x: spawnX,
        y: spawnY,
        radius: DUMPLING_RADIUS,
        vy: BASE_VY * speedMultiplier,
        value: typeData.value,
      };
    }

    attempts++;
  }

  // No valid position found — skip this spawn so we never stack dumplings
  return null;
}
