import type { Player } from './types';

/**
 * Check if a circle (dumpling) intersects with a rectangle (character hitbox)
 * @param dumplingX - Center x of dumpling circle
 * @param dumplingY - Center y of dumpling circle
 * @param dumplingRadius - Radius of dumpling circle
 * @param rectX - Left edge of rectangle
 * @param rectY - Top edge of rectangle
 * @param rectWidth - Width of rectangle
 * @param rectHeight - Height of rectangle
 */
export function circleRectIntersect(
  dumplingX: number,
  dumplingY: number,
  dumplingRadius: number,
  rectX: number,
  rectY: number,
  rectWidth: number,
  rectHeight: number
): boolean {
  // Find the closest point on the rectangle to the circle center
  const closestX = Math.max(rectX, Math.min(dumplingX, rectX + rectWidth));
  const closestY = Math.max(rectY, Math.min(dumplingY, rectY + rectHeight));

  // Calculate distance from circle center to closest point
  const dx = dumplingX - closestX;
  const dy = dumplingY - closestY;
  const distanceSquared = dx * dx + dy * dy;

  // Check if distance is less than radius
  return distanceSquared <= dumplingRadius * dumplingRadius;
}

/**
 * Calculate mouth hitbox rectangle for player (between the red indicator lines)
 * This represents the catch area between the two red lines
 * @param player - Player object
 * @param canvasHeight - Height of canvas
 */
export function getMouthHitbox(
  player: Player,
  canvasHeight: number
): { x: number; y: number; width: number; height: number } {
  const groundHeight = 100;
  const groundY = canvasHeight - groundHeight;
  const basePlayerY = groundY - 30; // Base position above ground
  const baseSize = player.width * 1.5; // Base character size
  const characterSize = baseSize * player.fatness; // Scale with fatness
  
  // Adjust Y position so feet stay at same level as fatness increases
  const playerY = basePlayerY - (characterSize - baseSize) * 0.5;

  // Mouth hitbox is between the red indicator lines
  // X: from player.x - player.width/2 to player.x + player.width/2
  // Y: from top of catch area (playerY - characterSize/2) to ground
  const mouthWidth = player.width;
  const mouthX = player.x - mouthWidth / 2;
  const mouthY = playerY - characterSize / 2;
  const mouthHeight = groundY - mouthY;

  return {
    x: mouthX,
    y: mouthY,
    width: mouthWidth,
    height: mouthHeight,
  };
}

/**
 * Calculate character body hitbox rectangle for player (deprecated, kept for compatibility)
 * This represents the entire character image area
 * @param player - Player object
 * @param canvasHeight - Height of canvas
 */
export function getCharacterHitbox(
  player: Player,
  canvasHeight: number
): { x: number; y: number; width: number; height: number } {
  return getMouthHitbox(player, canvasHeight);
}
