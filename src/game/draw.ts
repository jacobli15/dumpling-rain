import type { GameState, Dumpling, Effect } from './types';

const MAX_MISSES = 3;

/**
 * Draw game state to canvas
 */
export function draw(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  width: number,
  height: number,
  charSiuBaoImage: HTMLImageElement | null = null,
  siuMaiImage: HTMLImageElement | null = null,
  haGaoImage: HTMLImageElement | null = null,
  fatBoyImage: HTMLImageElement | null = null,
  fatBoyEatingImage: HTMLImageElement | null = null,
  cloudImage: HTMLImageElement | null = null
): void {
  // Clear canvas first to prevent glitches
  ctx.clearRect(0, 0, width, height);
  
  // Draw gradient sky background
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#B0E0E6'); // Light sky blue at top
  gradient.addColorStop(0.5, '#87CEEB'); // Sky blue in middle
  gradient.addColorStop(1, '#4682B4'); // Steel blue at bottom (near horizon)
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Draw clouds
  drawClouds(ctx, state, width, cloudImage);

  // Draw ground
  drawGround(ctx, width, height);

  // Draw player (behind dumplings)
  const isEating = state.eatingTimer > 0;
  drawPlayer(ctx, state.player, width, height, fatBoyImage, fatBoyEatingImage, isEating);

  // Draw dumplings (falling, in front of player)
  drawDumplings(ctx, state.dumplings, charSiuBaoImage, siuMaiImage, haGaoImage);

  // Draw effects
  drawEffects(ctx, state.effects);

  // Draw UI
  if (state.gameState === 'playing' || state.gameState === 'gameover') {
    drawScore(ctx, state.score, state.dumplingsEaten, state.misses);
    drawTime(ctx, state.timeElapsed, width);
  }
}

/**
 * Draw clouds using cloud image
 */
function drawClouds(ctx: CanvasRenderingContext2D, state: GameState, width: number, cloudImage: HTMLImageElement | null): void {
  const wrapX = (x: number, cloudWidth: number = 500): number => {
    if (x < -cloudWidth) {
      return x + width + cloudWidth;
    }
    if (x > width) {
      return x - width - cloudWidth;
    }
    return x;
  };

  const clouds = state.clouds;
  const cloudWidth = 500; // Approximate cloud width (increased from 300)
  const cloudHeight = 250; // Approximate cloud height (increased from 150)
  
  if (cloudImage && cloudImage.complete) {
    // Draw clouds using image
    if (clouds[0]) {
      const cloud1X = wrapX(clouds[0].x, cloudWidth);
      ctx.drawImage(
        cloudImage,
        cloud1X - cloudWidth / 2,
        clouds[0].y - cloudHeight / 2,
        cloudWidth,
        cloudHeight
      );
    }

    if (clouds[1]) {
      const cloud2X = wrapX(clouds[1].x, cloudWidth);
      ctx.drawImage(
        cloudImage,
        cloud2X - cloudWidth / 2,
        clouds[1].y - cloudHeight / 2,
        cloudWidth,
        cloudHeight
      );
    }

    if (clouds[2]) {
      const cloud3X = wrapX(clouds[2].x, cloudWidth);
      ctx.drawImage(
        cloudImage,
        cloud3X - cloudWidth / 2,
        clouds[2].y - cloudHeight / 2,
        cloudWidth,
        cloudHeight
      );
    }
  } else {
    // Fallback: draw simple shapes if image not loaded
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    
    if (clouds[0]) {
      const cloud1X = wrapX(clouds[0].x);
      ctx.beginPath();
      ctx.arc(cloud1X, clouds[0].y, 40, 0, Math.PI * 2);
      ctx.arc(cloud1X + 30, clouds[0].y, 50, 0, Math.PI * 2);
      ctx.arc(cloud1X + 60, clouds[0].y, 40, 0, Math.PI * 2);
      ctx.arc(cloud1X + 30, clouds[0].y - 20, 40, 0, Math.PI * 2);
      ctx.fill();
    }

    if (clouds[1]) {
      const cloud2X = wrapX(clouds[1].x);
      ctx.beginPath();
      ctx.arc(cloud2X, clouds[1].y, 45, 0, Math.PI * 2);
      ctx.arc(cloud2X + 35, clouds[1].y, 55, 0, Math.PI * 2);
      ctx.arc(cloud2X + 70, clouds[1].y, 45, 0, Math.PI * 2);
      ctx.arc(cloud2X + 35, clouds[1].y - 25, 45, 0, Math.PI * 2);
      ctx.fill();
    }

    if (clouds[2]) {
      const cloud3X = wrapX(clouds[2].x);
      ctx.beginPath();
      ctx.arc(cloud3X, clouds[2].y, 40, 0, Math.PI * 2);
      ctx.arc(cloud3X + 30, clouds[2].y, 50, 0, Math.PI * 2);
      ctx.arc(cloud3X + 60, clouds[2].y, 40, 0, Math.PI * 2);
      ctx.arc(cloud3X + 30, clouds[2].y - 20, 40, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/**
 * Process image to replace dark backgrounds with sky blue
 */
function processImageBackground(
  image: HTMLImageElement,
  size: number,
  skyBlue: { r: number; g: number; b: number }
): HTMLCanvasElement | null {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(image, 0, 0, size, size);
    const imageData = ctx.getImageData(0, 0, size, size);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const brightness = (r + g + b) / 3;

      // Replace dark/black pixels with sky blue
      if (brightness < 50) {
        data[i] = skyBlue.r;
        data[i + 1] = skyBlue.g;
        data[i + 2] = skyBlue.b;
      }
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas;
  } catch {
    return null;
  }
}

/**
 * Draw dumplings
 */
function drawDumplings(
  ctx: CanvasRenderingContext2D,
  dumplings: Dumpling[],
  charSiuBaoImage: HTMLImageElement | null,
  siuMaiImage: HTMLImageElement | null,
  haGaoImage: HTMLImageElement | null
): void {
  const skyBlue = { r: 135, g: 206, b: 235 };

  dumplings.forEach((dumpling) => {
    ctx.save();
    
    // If caught, apply scaling and ensure it's drawn correctly
    const currentRadius = dumpling.radius;
    
    switch (dumpling.type) {
      case 'charSiuBao':
        if (charSiuBaoImage && charSiuBaoImage.complete) {
          const size = currentRadius * 2.5;
          const processedCanvas = processImageBackground(charSiuBaoImage, size, skyBlue);
          if (processedCanvas) {
            ctx.drawImage(processedCanvas, dumpling.x - size / 2, dumpling.y - size / 2);
          } else {
            ctx.drawImage(charSiuBaoImage, dumpling.x - size / 2, dumpling.y - size / 2, size, size);
          }
        } else {
          ctx.fillStyle = '#D2691E';
          ctx.beginPath();
          ctx.arc(dumpling.x, dumpling.y, currentRadius, 0, Math.PI * 2);
          ctx.fill();
        }
        break;

      case 'siuMai':
        if (siuMaiImage && siuMaiImage.complete) {
          const size = currentRadius * 2.5;
          const processedCanvas = processImageBackground(siuMaiImage, size, skyBlue);
          if (processedCanvas) {
            ctx.drawImage(processedCanvas, dumpling.x - size / 2, dumpling.y - size / 2);
          } else {
            ctx.drawImage(siuMaiImage, dumpling.x - size / 2, dumpling.y - size / 2, size, size);
          }
        } else {
          const siuMaiSize = currentRadius * 1.8;
          ctx.fillStyle = '#FF6B6B';
          ctx.strokeStyle = '#FF4757';
          ctx.lineWidth = 2;
          const left = dumpling.x - siuMaiSize / 2;
          const top = dumpling.y - siuMaiSize / 2;
          const right = dumpling.x + siuMaiSize / 2;
          const bottom = dumpling.y + siuMaiSize / 2;
          const cornerRadius = 8;
          ctx.beginPath();
          ctx.moveTo(left + cornerRadius, top);
          ctx.lineTo(right - cornerRadius, top);
          ctx.quadraticCurveTo(right, top, right, top + cornerRadius);
          ctx.lineTo(right, bottom - cornerRadius);
          ctx.quadraticCurveTo(right, bottom, right - cornerRadius, bottom);
          ctx.lineTo(left + cornerRadius, bottom);
          ctx.quadraticCurveTo(left, bottom, left, bottom - cornerRadius);
          ctx.lineTo(left, top + cornerRadius);
          ctx.quadraticCurveTo(left, top, left + cornerRadius, top);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
        break;

      case 'haGao':
        if (haGaoImage && haGaoImage.complete) {
          const size = currentRadius * 2.5;
          const processedCanvas = processImageBackground(haGaoImage, size, skyBlue);
          if (processedCanvas) {
            ctx.drawImage(processedCanvas, dumpling.x - size / 2, dumpling.y - size / 2);
          } else {
            ctx.drawImage(haGaoImage, dumpling.x - size / 2, dumpling.y - size / 2, size, size);
          }
        } else {
          ctx.fillStyle = '#F0F0F0';
          ctx.strokeStyle = '#CCCCCC';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.save();
          ctx.translate(dumpling.x, dumpling.y);
          ctx.scale(1.1, 0.8);
          ctx.arc(0, 0, currentRadius, 0, Math.PI * 2);
          ctx.restore();
          ctx.fill();
          ctx.stroke();
        }
        break;
    }
    ctx.restore();
  });
}

/**
 * Draw ground
 */
function drawGround(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const groundHeight = 100;
  const groundY = height - groundHeight;

  ctx.fillStyle = '#8B7355';
  ctx.fillRect(0, groundY, width, groundHeight);

  ctx.fillStyle = '#6B8E23';
  ctx.fillRect(0, groundY, width, 5);
}

/**
 * Draw player character
 */
function drawPlayer(
  ctx: CanvasRenderingContext2D,
  player: { x: number; width: number; fatness: number },
  _width: number,
  height: number,
  fatBoyImage: HTMLImageElement | null,
  fatBoyEatingImage: HTMLImageElement | null,
  isEating: boolean
): void {
  const groundHeight = 100;
  const groundY = height - groundHeight;
  const basePlayerY = groundY - 30;
  const baseSize = player.width * 1.5;
  const characterSize = baseSize * player.fatness;
  
  const playerY = basePlayerY - (characterSize - baseSize) * 0.5;

  // Choose which image to use based on eating state
  let imageToUse: HTMLImageElement | null = null;
  if (isEating) {
    if (fatBoyEatingImage && fatBoyEatingImage.complete) {
      imageToUse = fatBoyEatingImage;
    } else if (fatBoyImage && fatBoyImage.complete) {
      imageToUse = fatBoyImage;
    }
  } else {
    if (fatBoyImage && fatBoyImage.complete) {
      imageToUse = fatBoyImage;
    }
  }

  if (imageToUse && imageToUse.complete) {
    ctx.drawImage(
      imageToUse,
      player.x - characterSize / 2,
      playerY - characterSize / 2,
      characterSize,
      characterSize
    );
  } else {
    // Fallback
    const faceRadius = (player.width / 2) * player.fatness;
    ctx.fillStyle = '#FFDBAC';
    ctx.beginPath();
    ctx.arc(player.x, playerY, faceRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Draw catch area indicator
  ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)';
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(player.x - player.width / 2, groundY);
  ctx.lineTo(player.x - player.width / 2, playerY - characterSize / 2);
  ctx.moveTo(player.x + player.width / 2, groundY);
  ctx.lineTo(player.x + player.width / 2, playerY - characterSize / 2);
  ctx.stroke();
  ctx.setLineDash([]);
}

/**
 * Draw effects
 */
function drawEffects(ctx: CanvasRenderingContext2D, effects: Effect[]): void {
  effects.forEach((effect) => {
    if (effect.type === 'score') {
      const progress = effect.timeElapsed / effect.duration;
      const opacity = 1 - progress;
      
      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.fillStyle = '#4CAF50';
      ctx.font = `bold 20px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`+${effect.value}`, effect.x, effect.y);
      ctx.restore();
    }
  });
}

/**
 * Helper: draw text with readable background and outline
 */
function drawLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  options: { align?: CanvasTextAlign; fillStyle?: string; fontSize?: number } = {}
): void {
  const align = options.align ?? 'left';
  const fillStyle = options.fillStyle ?? '#FFFFFF';
  const fontSize = options.fontSize ?? 22;
  ctx.font = `bold ${fontSize}px Arial`;
  ctx.textAlign = align;
  ctx.textBaseline = 'top';

  const metrics = ctx.measureText(text);
  const padding = 10;
  const boxWidth = metrics.width + padding * 2;
  const boxHeight = fontSize + padding;
  let boxX = x;
  if (align === 'right') boxX = x - boxWidth;
  else if (align === 'center') boxX = x - boxWidth / 2;
  const boxY = y - 2;

  // Background pill
  ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
  const r = boxHeight / 2;
  ctx.beginPath();
  ctx.roundRect(boxX, boxY, boxWidth, boxHeight, r);
  ctx.fill();

  // Text outline for contrast
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 3;
  ctx.fillStyle = fillStyle;
  ctx.strokeText(text, align === 'left' ? x + padding : align === 'right' ? x - padding : x, y + padding / 2);
  ctx.fillText(text, align === 'left' ? x + padding : align === 'right' ? x - padding : x, y + padding / 2);
}

/**
 * Draw score UI
 */
function drawScore(ctx: CanvasRenderingContext2D, score: number, dumplingsEaten: number, misses: number): void {
  const x = 20;
  let y = 18;

  drawLabel(ctx, `Score: ${score}`, x, y, { fontSize: 24 });
  y += 38;
  drawLabel(ctx, `Streak: ${dumplingsEaten}`, x, y, { fontSize: 20 });
  y += 38;
  drawLabel(ctx, `Misses: ${misses}/${MAX_MISSES}`, x, y, {
    fontSize: 20,
    fillStyle: misses >= MAX_MISSES ? '#FF6B6B' : '#FFFFFF',
  });
}

/**
 * Draw time UI
 */
function drawTime(ctx: CanvasRenderingContext2D, timeElapsed: number, width: number): void {
  drawLabel(ctx, `Time: ${Math.floor(timeElapsed)}s`, width - 20, 18, { align: 'right', fontSize: 22 });
}
