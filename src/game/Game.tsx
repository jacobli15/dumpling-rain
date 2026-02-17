import { useEffect, useRef, useState, useCallback } from 'react';
import type { GameState } from './types';
import { initialGameState } from './state';
import { update } from './update';
import { draw } from './draw';
import { fetchLeaderboard, submitScore, type LeaderboardEntry } from '../lib/leaderboard';
import { supabase } from '../lib/supabase';
import charSiuBaoImage from '../assets/dumplings/char-siu-bau.png';
import siuMaiImage from '../assets/dumplings/siu-mai.png';
import haGaoImage from '../assets/dumplings/ha-gao.png';
import fatBoyImage from '../assets/character/fat-boy.png';
import fatBoyEatingImage from '../assets/character/fat-boy-eating.png';
import cloudImage from '../assets/clouds/dumpling-clouds.png';

/**
 * Main game component
 */
export function Game() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameStateRef = useRef<GameState>(initialGameState());
  const [gameState, setGameState] = useState<GameState>(initialGameState());
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboardEntries, setLeaderboardEntries] = useState<LeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);
  const [saveName, setSaveName] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [scoreSubmitted, setScoreSubmitted] = useState(false);
  const lastTimeRef = useRef<number>(performance.now());
  const animationFrameRef = useRef<number | undefined>(undefined);
  const pressedKeysRef = useRef<Set<string>>(new Set());
  const pointerXRef = useRef<number | null>(null);
  const isPointerDownRef = useRef<boolean>(false);

  // Image refs
  const charSiuBaoImageRef = useRef<HTMLImageElement | null>(null);
  const siuMaiImageRef = useRef<HTMLImageElement | null>(null);
  const haGaoImageRef = useRef<HTMLImageElement | null>(null);
  const fatBoyImageRef = useRef<HTMLImageElement | null>(null);
  const fatBoyEatingImageRef = useRef<HTMLImageElement | null>(null);
  const cloudImageRef = useRef<HTMLImageElement | null>(null);

  // Load images
  useEffect(() => {
    const charSiuBaoImg = new Image();
    charSiuBaoImg.src = charSiuBaoImage;
    charSiuBaoImg.onload = () => {
      charSiuBaoImageRef.current = charSiuBaoImg;
    };

    const siuMaiImg = new Image();
    siuMaiImg.src = siuMaiImage;
    siuMaiImg.onload = () => {
      siuMaiImageRef.current = siuMaiImg;
    };

    const haGaoImg = new Image();
    haGaoImg.src = haGaoImage;
    haGaoImg.onload = () => {
      haGaoImageRef.current = haGaoImg;
    };

    const fatBoyImg = new Image();
    fatBoyImg.src = fatBoyImage;
    fatBoyImg.onload = () => {
      fatBoyImageRef.current = fatBoyImg;
    };

    const fatBoyEatingImg = new Image();
    fatBoyEatingImg.src = fatBoyEatingImage;
    fatBoyEatingImg.onload = () => {
      fatBoyEatingImageRef.current = fatBoyEatingImg;
    };

    // Load cloud image
    const cloudImg = new Image();
    cloudImg.src = cloudImage;
    cloudImg.onload = () => {
      cloudImageRef.current = cloudImg;
    };
  }, []);

  /**
   * Handle Start button click
   */
  const handleStart = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = canvas.width || window.innerWidth;
    const newState = initialGameState();
    newState.gameState = 'playing';
    newState.clouds = [
      { x: 100, y: 80, speed: 10 },
      { x: width * 0.5, y: 100, speed: 15 },
      { x: width - 150, y: 90, speed: 12 },
    ];
    newState.player = {
      x: width * 0.5,
      width: 80,
      fatness: 1.0,
    };
    newState.dumplings = [];
    newState.lastSpawnTime = 0;
    newState.dumplingsEaten = 0;
    newState.misses = 0;
    newState.effects = [];
    newState.eatingTimer = 0;
    gameStateRef.current = newState;
    setGameState(newState);
    setScoreSubmitted(false);
    setSaveSuccess(false);
    setSaveName('');
    setSaveError(null);
    lastTimeRef.current = performance.now();
  }, []);

  /**
   * Handle Restart button click
   */
  const handleRestart = useCallback(() => {
    handleStart();
  }, [handleStart]);

  /**
   * Handle Leaderboard button click
   */
  const handleLeaderboard = useCallback(() => {
    setShowLeaderboard(true);
  }, []);

  // Fetch leaderboard when modal opens
  useEffect(() => {
    if (!showLeaderboard) return;
    setLeaderboardError(null);
    setLeaderboardLoading(true);
    fetchLeaderboard()
      .then(setLeaderboardEntries)
      .catch((err) => setLeaderboardError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLeaderboardLoading(false));
  }, [showLeaderboard]);

  const handleSaveScore = useCallback(() => {
    const name = saveName.trim();
    if (!name) {
      setSaveError('Please enter a name');
      return;
    }
    setSaveError(null);
    submitScore(name, gameState.score)
      .then(() => {
        setSaveSuccess(true);
        setScoreSubmitted(true);
      })
      .catch((err) => setSaveError(err instanceof Error ? err.message : 'Failed to save'));
  }, [saveName, gameState.score]);

  const leaderboardAvailable = !!supabase;

  // Keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        pressedKeysRef.current.add(e.key);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        pressedKeysRef.current.delete(e.key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Pointer/touch input
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handlePointerDown = (e: PointerEvent) => {
      isPointerDownRef.current = true;
      const rect = canvas.getBoundingClientRect();
      pointerXRef.current = e.clientX - rect.left;
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (isPointerDownRef.current) {
        const rect = canvas.getBoundingClientRect();
        pointerXRef.current = e.clientX - rect.left;
      }
    };

    const handlePointerUp = () => {
      isPointerDownRef.current = false;
      pointerXRef.current = null;
    };

    const handlePointerCancel = () => {
      isPointerDownRef.current = false;
      pointerXRef.current = null;
    };

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      isPointerDownRef.current = true;
      const rect = canvas.getBoundingClientRect();
      if (e.touches[0]) {
        pointerXRef.current = e.touches[0].clientX - rect.left;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (isPointerDownRef.current && e.touches[0]) {
        const rect = canvas.getBoundingClientRect();
        pointerXRef.current = e.touches[0].clientX - rect.left;
      }
    };

    const handleTouchEnd = () => {
      isPointerDownRef.current = false;
      pointerXRef.current = null;
    };

    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerup', handlePointerUp);
    canvas.addEventListener('pointercancel', handlePointerCancel);

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd);

    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerup', handlePointerUp);
      canvas.removeEventListener('pointercancel', handlePointerCancel);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  // Game loop and canvas setup
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;
    
    // Optimize canvas rendering to prevent glitches
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    /**
     * Resize canvas to fill viewport
     */
    const resizeCanvas = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      
      // Initialize player position if needed
      if (gameStateRef.current.player.x === 400) {
        const updatedState = {
          ...gameStateRef.current,
          player: {
            ...gameStateRef.current.player,
            x: width * 0.5,
          },
        };
        gameStateRef.current = updatedState;
      }

      // Redraw after resize
      draw(ctx, gameStateRef.current, width, height, charSiuBaoImageRef.current, siuMaiImageRef.current, haGaoImageRef.current, fatBoyImageRef.current, fatBoyEatingImageRef.current, cloudImageRef.current);
    };

    /**
     * Game loop using requestAnimationFrame
     */
    const gameLoop = (currentTime: number) => {
      const currentState = gameStateRef.current;
      const width = canvas.width || window.innerWidth;
      const height = canvas.height || window.innerHeight;
      
      if (canvas.width === 0 || canvas.height === 0) {
        resizeCanvas();
        animationFrameRef.current = requestAnimationFrame(gameLoop);
        return;
      }
      
      if (currentState.gameState === 'playing') {
        const deltaTime = (currentTime - lastTimeRef.current) / 1000;
        lastTimeRef.current = currentTime;

        if (deltaTime > 0 && deltaTime < 0.1) {
          const updated = update(
            currentState,
            deltaTime,
            pressedKeysRef.current,
            width,
            height,
            pointerXRef.current
          );
          gameStateRef.current = updated; // Update ref immediately so draw uses latest state
          setGameState(updated);
        }
      }

      // Always draw current state
      draw(ctx, gameStateRef.current, width, height, charSiuBaoImageRef.current, siuMaiImageRef.current, haGaoImageRef.current, fatBoyImageRef.current, fatBoyEatingImageRef.current, cloudImageRef.current);

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    // Initial resize and start loop
    resizeCanvas();
    lastTimeRef.current = performance.now();
    animationFrameRef.current = requestAnimationFrame(gameLoop);

    window.addEventListener('resize', resizeCanvas);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Sync ref with state
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          touchAction: 'none',
          WebkitTouchCallout: 'none',
          WebkitUserSelect: 'none',
          userSelect: 'none',
        }}
      />
      
      {/* Start overlay */}
      {gameState.gameState === 'idle' && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '30px',
            zIndex: 10,
            pointerEvents: 'none',
          }}
        >
          {/* Title with bubble text effect */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0',
              pointerEvents: 'none',
            }}
          >
            <div
              style={{
                fontSize: '64px',
                fontWeight: 'bold',
                color: '#fff',
                textShadow: `
                  4px 4px 0px #000,
                  3px 3px 0px #000,
                  -2px -2px 0px #000,
                  2px -2px 0px #000,
                  -2px 2px 0px #000,
                  2px 2px 0px #000,
                  0px 0px 30px rgba(0, 0, 0, 0.8),
                  0px 0px 20px rgba(255, 255, 255, 0.3)
                `,
                letterSpacing: '4px',
                fontFamily: 'Arial, sans-serif',
                lineHeight: '1.1',
                textTransform: 'uppercase',
                WebkitTextStroke: '2px #000',
              }}
            >
              DUMPLING
            </div>
            <div
              style={{
                fontSize: '64px',
                fontWeight: 'bold',
                color: '#fff',
                textShadow: `
                  4px 4px 0px #000,
                  3px 3px 0px #000,
                  -2px -2px 0px #000,
                  2px -2px 0px #000,
                  -2px 2px 0px #000,
                  2px 2px 0px #000,
                  0px 0px 30px rgba(0, 0, 0, 0.8),
                  0px 0px 20px rgba(255, 255, 255, 0.3)
                `,
                letterSpacing: '4px',
                fontFamily: 'Arial, sans-serif',
                lineHeight: '1.1',
                textTransform: 'uppercase',
                WebkitTextStroke: '2px #000',
              }}
            >
              RAIN
            </div>
          </div>

          {/* Leaderboard button */}
          <button
            onClick={handleLeaderboard}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 24px',
              fontSize: '18px',
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              color: '#333',
              border: '2px solid #000',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              fontFamily: 'inherit',
              boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
              transition: 'all 0.2s ease',
              pointerEvents: 'auto',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#fff';
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{ flexShrink: 0 }}
            >
              <circle cx="10" cy="10" r="9" stroke="#333" strokeWidth="2" fill="none" />
              <rect x="6" y="6" width="8" height="8" fill="#333" />
            </svg>
            <span style={{ fontStyle: 'italic' }}>leaderboard</span>
          </button>

          {/* Start button */}
          <button
            onClick={handleStart}
            style={{
              padding: '15px 30px',
              fontSize: '24px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
              textDecoration: 'underline',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
              transition: 'all 0.2s ease',
              pointerEvents: 'auto',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#45a049';
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#4CAF50';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            start
          </button>
        </div>
      )}

      {/* Game Over overlay */}
      {gameState.gameState === 'gameover' && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: '40px',
            borderRadius: '12px',
            color: 'white',
            maxWidth: '90vw',
          }}
        >
          <h2 style={{ marginTop: 0, fontSize: '36px' }}>Game Over</h2>
          <p style={{ fontSize: '24px', margin: '20px 0' }}>Score: {gameState.score}</p>
          {leaderboardAvailable && !scoreSubmitted && (
            <div style={{ marginBottom: '20px' }}>
              <input
                type="text"
                placeholder="Your name"
                maxLength={25}
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                style={{
                  padding: '10px 14px',
                  fontSize: '18px',
                  borderRadius: '8px',
                  border: '2px solid #ccc',
                  marginRight: '8px',
                  width: '180px',
                }}
              />
              <button
                onClick={handleSaveScore}
                style={{
                  padding: '10px 20px',
                  fontSize: '18px',
                  backgroundColor: '#2196F3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                }}
              >
                Save to leaderboard
              </button>
              {saveError && <p style={{ color: '#FF6B6B', marginTop: '8px', fontSize: '14px' }}>{saveError}</p>}
              {saveSuccess && <p style={{ color: '#4CAF50', marginTop: '8px', fontSize: '14px' }}>Saved!</p>}
            </div>
          )}
          {leaderboardAvailable && scoreSubmitted && (
            <p style={{ color: '#4CAF50', marginBottom: '16px', fontSize: '16px' }}>Score saved to leaderboard!</p>
          )}
          <button
            onClick={handleRestart}
            style={{
              padding: '15px 30px',
              fontSize: '20px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            Restart
          </button>
        </div>
      )}

      {/* Leaderboard modal */}
      {showLeaderboard && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 20,
            padding: '24px',
          }}
        >
          <div
            style={{
              backgroundColor: 'rgba(40, 40, 40, 0.98)',
              borderRadius: '12px',
              padding: '32px',
              maxWidth: '400px',
              width: '100%',
              maxHeight: '80vh',
              overflow: 'auto',
              color: 'white',
            }}
          >
            <h2 style={{ marginTop: 0, marginBottom: '20px', fontSize: '28px', textAlign: 'center' }}>Leaderboard</h2>
            {!leaderboardAvailable ? (
              <p style={{ textAlign: 'center', color: '#aaa' }}>Leaderboard unavailable. Add Supabase URL and key to .env</p>
            ) : leaderboardLoading ? (
              <p style={{ textAlign: 'center', color: '#aaa' }}>Loading...</p>
            ) : leaderboardError ? (
              <p style={{ textAlign: 'center', color: '#FF6B6B' }}>{leaderboardError}</p>
            ) : leaderboardEntries.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#aaa' }}>No scores yet. Be the first!</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {leaderboardEntries.map((entry, index) => (
                  <li
                    key={`${entry.player_name}-${entry.score}-${index}`}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '10px 0',
                      borderBottom: '1px solid rgba(255,255,255,0.15)',
                      fontSize: '18px',
                    }}
                  >
                    <span style={{ fontWeight: 'bold', minWidth: '28px' }}>{index + 1}.</span>
                    <span style={{ flex: 1, textAlign: 'left', marginLeft: '12px' }}>{entry.player_name}</span>
                    <span style={{ fontWeight: 'bold' }}>{entry.score}</span>
                  </li>
                ))}
              </ul>
            )}
            <button
              onClick={() => setShowLeaderboard(false)}
              style={{
                display: 'block',
                marginTop: '24px',
                marginLeft: 'auto',
                marginRight: 'auto',
                padding: '12px 28px',
                fontSize: '18px',
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Instructions */}
      {gameState.gameState === 'playing' && gameState.timeElapsed < 3 && (
        <div
          style={{
            position: 'absolute',
            top: '15%',
            left: '50%',
            transform: 'translateX(-50%)',
            textAlign: 'center',
            color: 'white',
            fontSize: '18px',
            textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
          }}
        >
          Use ← → to catch dumplings
        </div>
      )}
    </div>
  );
}
