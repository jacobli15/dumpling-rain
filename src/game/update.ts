import type { GameState, GameStateType } from './types';
import { spawnDumpling, shouldSpawn, getSpeedMultiplier, BASE_VY } from './spawn';
import { circleRectIntersect, getMouthHitbox } from './collisions';

const PLAYER_SPEED = 750 * 1.19264; // pixels per second
const MAX_FATNESS = 1.8;
const FATNESS_INCREMENT = 0.02;
const EFFECT_DURATION = 1.0; // seconds
const EATING_ANIMATION_DURATION = 0.3; // seconds - how long eating animation lasts
const CATCH_ANIMATION_DURATION = 0.2; // seconds - how long it takes dumpling to go into mouth
const DIFFICULTY_RAMP_ENABLED = true;
const MAX_MISSES = 3;

/**
 * Update game state based on deltaTime
 */
export function update(
  state: GameState,
  deltaTime: number,
  pressedKeys: Set<string>,
  canvasWidth: number,
  canvasHeight: number,
  pointerX: number | null = null
): GameState {
  if (state.gameState !== 'playing') {
    return state;
  }

  const newTimeElapsed = state.timeElapsed + deltaTime;

  // Calculate player movement
  let newPlayerX = state.player.x;
  if (pointerX !== null) {
    // Pointer/touch input takes precedence
    const smoothing = 0.15;
    newPlayerX = state.player.x + (pointerX - state.player.x) * smoothing;
  } else {
    // Keyboard input
    let playerMovement = 0;
    if (pressedKeys.has('ArrowLeft')) {
      playerMovement -= PLAYER_SPEED * deltaTime;
    }
    if (pressedKeys.has('ArrowRight')) {
      playerMovement += PLAYER_SPEED * deltaTime;
    }
    newPlayerX += playerMovement;
  }
  
  // Clamp player to screen bounds
  newPlayerX = Math.max(state.player.width / 2, Math.min(canvasWidth - state.player.width / 2, newPlayerX));

  // Update clouds
  const updatedClouds = state.clouds.map((cloud) => ({
    ...cloud,
    x: cloud.x + cloud.speed * deltaTime,
  }));

  // Spawn dumplings
  let dumplings = [...state.dumplings];
  let lastSpawnTime = state.lastSpawnTime;
  const speedMultiplier = getSpeedMultiplier(newTimeElapsed);
  
  if (shouldSpawn(lastSpawnTime, newTimeElapsed, newTimeElapsed)) {
    const nextId = dumplings.length > 0 ? Math.max(...dumplings.map((d) => d.id)) + 1 : 0;
    const newDumpling = spawnDumpling(
      updatedClouds,
      nextId,
      canvasWidth,
      speedMultiplier,
      dumplings,
      newPlayerX
    );
    dumplings.push(newDumpling);
    lastSpawnTime = newTimeElapsed;
  }

  // Apply difficulty ramp to existing dumplings
  if (DIFFICULTY_RAMP_ENABLED) {
    dumplings = dumplings.map((dumpling) => ({
      ...dumpling,
      vy: Math.max(dumpling.vy, BASE_VY * speedMultiplier * 0.8),
    }));
  }

  // Update dumpling positions and check collisions
  const groundY = canvasHeight - 100;
  const mouthHitbox = getMouthHitbox(
    { ...state.player, x: newPlayerX },
    canvasHeight
  );
  
  // Calculate mouth position (center of mouth hitbox, near bottom)
  const mouthX = newPlayerX;
  const mouthY = mouthHitbox.y + mouthHitbox.height * 0.8; // Near bottom of catch area

  let score = state.score;
  let dumplingsEaten = state.dumplingsEaten;
  let misses = state.misses;
  let newFatness = state.player.fatness;
  let effects = [...state.effects];
  let nextEffectId = effects.length > 0 ? Math.max(...effects.map((e) => e.id)) + 1 : 0;
  let gameState: GameStateType = state.gameState;
  let eatingTimer = Math.max(0, state.eatingTimer - deltaTime); // Count down eating timer

  // Check collisions and update dumplings
  const remainingDumplings: typeof dumplings = [];
  for (const dumpling of dumplings) {
    // Handle caught dumplings (animating into mouth)
    if (dumpling.isCaught) {
      const catchProgress = (dumpling.catchTimeElapsed || 0) + deltaTime;
      const progress = Math.min(catchProgress / CATCH_ANIMATION_DURATION, 1);
      
      // Use stored catch start position, or current position as fallback
      const startX = dumpling.catchStartX ?? dumpling.x;
      const startY = dumpling.catchStartY ?? dumpling.y;
      const targetX = mouthX;
      const targetY = mouthY;
      
      const animatedX = startX + (targetX - startX) * progress;
      const animatedY = startY + (targetY - startY) * progress;
      const scale = 1 - progress; // Shrink as it approaches mouth
      
      // If animation complete, remove dumpling
      if (progress >= 1) {
        // Score was already added when caught, just remove it
        continue;
      }
      
      // Keep animating
      remainingDumplings.push({
        ...dumpling,
        x: animatedX,
        y: animatedY,
        radius: dumpling.radius * scale,
        catchTimeElapsed: catchProgress,
      });
      continue;
    }

    const oldY = dumpling.y;
    const updatedDumpling = {
      ...dumpling,
      y: dumpling.y + dumpling.vy * deltaTime,
    };

    // Check collision with mouth hitbox FIRST (only between the red indicator lines)
    if (gameState === 'playing') {
      const collisionAtNewPos = circleRectIntersect(
        updatedDumpling.x,
        updatedDumpling.y,
        updatedDumpling.radius,
        mouthHitbox.x,
        mouthHitbox.y,
        mouthHitbox.width,
        mouthHitbox.height
      );
      
      const oldAboveHitbox = oldY < mouthHitbox.y;
      const newInHitboxRange = updatedDumpling.y >= mouthHitbox.y && updatedDumpling.y <= mouthHitbox.y + mouthHitbox.height;
      const xInHitboxRange = updatedDumpling.x >= mouthHitbox.x - updatedDumpling.radius && 
                             updatedDumpling.x <= mouthHitbox.x + mouthHitbox.width + updatedDumpling.radius;
      
      const passedThroughHitbox = oldAboveHitbox && newInHitboxRange && xInHitboxRange;
      
      if (collisionAtNewPos || passedThroughHitbox) {
        // Caught! Mark as caught instead of removing immediately
        score += updatedDumpling.value;
        dumplingsEaten += 1;
        newFatness = Math.min(
          MAX_FATNESS,
          1.0 + dumplingsEaten * FATNESS_INCREMENT
        );

        effects.push({
          id: nextEffectId++,
          type: 'score',
          x: updatedDumpling.x,
          y: updatedDumpling.y,
          value: updatedDumpling.value,
          timeElapsed: 0,
          duration: EFFECT_DURATION,
        });

        // Start eating animation
        eatingTimer = EATING_ANIMATION_DURATION;

        // Mark dumpling as caught - it will animate into mouth
        // Store the original catch position for animation
        remainingDumplings.push({
          ...updatedDumpling,
          isCaught: true,
          catchTimeElapsed: 0,
          catchStartX: updatedDumpling.x,
          catchStartY: updatedDumpling.y,
        });
        continue;
      }
    }

    // Check if dumpling hit the ground
    const dumplingBottom = updatedDumpling.y + updatedDumpling.radius;
    if (dumplingBottom >= groundY) {
      if (gameState === 'playing') {
        misses += 1;
        if (misses >= MAX_MISSES) {
          gameState = 'gameover';
        }
      }
      continue; // Remove dumpling
    }

    remainingDumplings.push(updatedDumpling);
  }

  // Update effects
  effects = effects
    .map((effect) => ({
      ...effect,
      timeElapsed: effect.timeElapsed + deltaTime,
      y: effect.y - 30 * deltaTime, // Float up
    }))
    .filter((effect) => effect.timeElapsed < effect.duration);

  return {
    ...state,
    gameState,
    timeElapsed: gameState === 'playing' ? newTimeElapsed : state.timeElapsed,
    score,
    clouds: updatedClouds,
    player: {
      ...state.player,
      x: newPlayerX,
      fatness: newFatness,
    },
    dumplings: remainingDumplings,
    lastSpawnTime,
    dumplingsEaten,
    misses,
    effects,
    eatingTimer,
  };
}
