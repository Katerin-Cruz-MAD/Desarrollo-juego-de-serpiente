/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  RotateCcw, 
  Play, 
  Pause, 
  ChevronUp, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight,
  Settings,
  Gamepad2
} from 'lucide-react';

// --- Constants ---
const GRID_SIZE = 20;
const INITIAL_SPEED = 150;
const SPEED_INCREMENT = 2;
const MIN_SPEED = 60;

type Point = { x: number; y: number };
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
type GameStatus = 'START' | 'PLAYING' | 'PAUSED' | 'GAMEOVER';

export default function App() {
  // --- State ---
  const [snake, setSnake] = useState<Point[]>([{ x: 10, y: 10 }, { x: 10, y: 11 }, { x: 10, y: 12 }]);
  const [food, setFood] = useState<Point>({ x: 5, y: 5 });
  const [direction, setDirection] = useState<Direction>('UP');
  const [status, setStatus] = useState<GameStatus>('START');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('snake-high-score');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [speed, setSpeed] = useState(INITIAL_SPEED);

  const lastProcessedDirection = useRef<Direction>('UP');
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);

  // --- Helpers ---
  const getRandomPoint = useCallback((): Point => {
    return {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };
  }, []);

  const resetGame = () => {
    setSnake([{ x: 10, y: 10 }, { x: 10, y: 11 }, { x: 10, y: 12 }]);
    setFood(getRandomPoint());
    setDirection('UP');
    lastProcessedDirection.current = 'UP';
    setScore(0);
    setSpeed(INITIAL_SPEED);
    setStatus('PLAYING');
  };

  const checkCollision = (head: Point, body: Point[]) => {
    // Wall collision
    if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) return true;
    // Self collision
    return body.some(segment => segment.x === head.x && segment.y === head.y);
  };

  const moveSnake = useCallback(() => {
    setSnake(prevSnake => {
      const head = prevSnake[0];
      const newHead = { ...head };

      switch (direction) {
        case 'UP': newHead.y -= 1; break;
        case 'DOWN': newHead.y += 1; break;
        case 'LEFT': newHead.x -= 1; break;
        case 'RIGHT': newHead.x += 1; break;
      }

      lastProcessedDirection.current = direction;

      if (checkCollision(newHead, prevSnake)) {
        setStatus('GAMEOVER');
        return prevSnake;
      }

      const newSnake = [newHead, ...prevSnake];

      // Eat food
      if (newHead.x === food.x && newHead.y === food.y) {
        setScore(s => s + 10);
        setFood(getRandomPoint());
        setSpeed(prev => Math.max(MIN_SPEED, prev - SPEED_INCREMENT));
      } else {
        newSnake.pop();
      }

      return newSnake;
    });
  }, [direction, food, getRandomPoint]);

  // --- Effects ---
  useEffect(() => {
    if (status === 'PLAYING') {
      gameLoopRef.current = setInterval(moveSnake, speed);
    } else {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    }
    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    };
  }, [status, moveSnake, speed]);

  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('snake-high-score', score.toString());
    }
  }, [score, highScore]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp': if (lastProcessedDirection.current !== 'DOWN') setDirection('UP'); break;
        case 'ArrowDown': if (lastProcessedDirection.current !== 'UP') setDirection('DOWN'); break;
        case 'ArrowLeft': if (lastProcessedDirection.current !== 'RIGHT') setDirection('LEFT'); break;
        case 'ArrowRight': if (lastProcessedDirection.current !== 'LEFT') setDirection('RIGHT'); break;
        case ' ': // Space to pause/start
          if (status === 'PLAYING') setStatus('PAUSED');
          else if (status === 'PAUSED' || status === 'START') setStatus('PLAYING');
          else if (status === 'GAMEOVER') resetGame();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [status]);

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-4 font-sans select-none overflow-hidden">
      {/* --- Background Glow --- */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-rose-500/10 blur-[120px] rounded-full" />
      </div>

      <div className="z-10 w-full max-w-md flex flex-col gap-6">
        {/* --- Header --- */}
        <header className="flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-black tracking-tighter uppercase italic leading-none bg-gradient-to-br from-emerald-400 to-cyan-500 bg-clip-text text-transparent">
              Neon Snake
            </h1>
            <p className="text-[10px] uppercase tracking-[0.2em] font-mono opacity-50 mt-1">
              Classic Arcade v1.0
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-2 text-xs font-mono opacity-60">
              <Trophy size={12} className="text-yellow-400" />
              <span>HIGH: {highScore.toString().padStart(4, '0')}</span>
            </div>
            <div className="text-2xl font-mono font-bold text-emerald-400 tabular-nums">
              {score.toString().padStart(4, '0')}
            </div>
          </div>
        </header>

        {/* --- Game Board --- */}
        <motion.div 
          animate={status === 'GAMEOVER' ? { x: [0, -10, 10, -10, 10, 0] } : {}}
          transition={{ duration: 0.4 }}
          className="relative aspect-square w-full bg-[#111] border-2 border-white/5 rounded-2xl overflow-hidden shadow-2xl shadow-emerald-500/5 group"
        >
          <div 
            className="absolute inset-0 grid overflow-hidden p-1"
            style={{ 
              gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
              gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)`
            }}
          >
            {/* Grid Helper Lines */}
            <div className="absolute inset-0 grid pointer-events-none opacity-[0.03]" 
              style={{ 
                gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
                gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)`
              }}
            >
              {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => (
                <div key={i} className="border-[0.5px] border-white" />
              ))}
            </div>

            {/* Snake */}
            {snake.map((segment, i) => (
              <motion.div
                key={`${i}-${segment.x}-${segment.y}`}
                initial={i === 0 ? { scale: 0.8 } : false}
                animate={{ scale: 1 }}
                className={`rounded-[20%] transition-colors duration-200 ${
                  i === 0 
                    ? 'bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.6)] z-10' 
                    : i === snake.length - 1 
                      ? 'bg-emerald-600/40' 
                      : 'bg-emerald-500/80'
                }`}
                style={{
                  gridColumnStart: segment.x + 1,
                  gridRowStart: segment.y + 1,
                }}
              />
            ))}

            {/* Food */}
            <motion.div
              animate={{ 
                scale: [1, 1.2, 1],
                filter: ['drop-shadow(0 0 5px rgba(244,63,94,0.4))', 'drop-shadow(0 0 12px rgba(244,63,94,0.8))', 'drop-shadow(0 0 5px rgba(244,63,94,0.4))']
              }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="bg-rose-500 rounded-full z-20"
              style={{
                gridColumnStart: food.x + 1,
                gridRowStart: food.y + 1,
              }}
            />
          </div>

          {/* Overlays */}
          <AnimatePresence>
            {status !== 'PLAYING' && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-30 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center"
              >
                {status === 'START' && (
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="space-y-6"
                  >
                    <div className="flex justify-center">
                      <div className="p-4 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        <Gamepad2 size={48} />
                      </div>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">Bienvenido</h2>
                      <p className="text-sm opacity-60 mt-2 max-w-[200px]">Usa las flechas o los controles táctiles para moverte.</p>
                    </div>
                    <button 
                      onClick={() => setStatus('PLAYING')}
                      className="w-full py-4 px-8 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/20 uppercase tracking-widest flex items-center justify-center gap-2"
                    >
                      <Play size={20} fill="currentColor" /> Jugar
                    </button>
                  </motion.div>
                )}

                {status === 'PAUSED' && (
                  <motion.div
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    className="space-y-6"
                  >
                    <h2 className="text-3xl font-black uppercase tracking-tighter italic">Pausa</h2>
                    <div className="space-y-2">
                      <button 
                        onClick={() => setStatus('PLAYING')}
                        className="w-full py-4 px-12 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl transition-all uppercase tracking-widest flex items-center justify-center gap-2"
                      >
                        <Play size={20} fill="currentColor" /> Reanudar
                      </button>
                      <button 
                        onClick={resetGame}
                        className="w-full py-3 px-12 border border-white/20 hover:bg-white/10 text-white font-bold rounded-xl transition-all uppercase tracking-widest flex items-center justify-center gap-2"
                      >
                        <RotateCcw size={18} /> Reiniciar
                      </button>
                    </div>
                  </motion.div>
                )}

                {status === 'GAMEOVER' && (
                  <motion.div
                    initial={{ y: 40, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="space-y-6"
                  >
                    <div className="space-y-1">
                      <h2 className="text-4xl font-black uppercase tracking-tighter italic text-rose-500">Perdiste</h2>
                      <p className="text-sm opacity-50">Puntuación final</p>
                    </div>
                    <div className="text-6xl font-mono font-bold text-white mb-2">{score}</div>
                    <div className="space-y-2">
                      <button 
                        onClick={resetGame}
                        className="w-full py-4 px-12 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/30 uppercase tracking-widest flex items-center justify-center gap-2"
                      >
                        <RotateCcw size={20} /> Intentar de nuevo
                      </button>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* --- Mobile Controls --- */}
        <div className="grid grid-cols-3 gap-2 w-full max-w-[240px] mx-auto mt-4">
          <div />
          <ControlButton 
            icon={<ChevronUp size={28} />} 
            onClick={() => { if (lastProcessedDirection.current !== 'DOWN') setDirection('UP'); }} 
          />
          <div />
          <ControlButton 
            icon={<ChevronLeft size={28} />} 
            onClick={() => { if (lastProcessedDirection.current !== 'RIGHT') setDirection('LEFT'); }} 
          />
          <ControlButton 
            icon={status === 'PLAYING' ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />} 
            onClick={() => {
              if (status === 'PLAYING') setStatus('PAUSED');
              else if (status === 'PAUSED' || status === 'START') setStatus('PLAYING');
              else if (status === 'GAMEOVER') resetGame();
            }}
            variant="flat"
          />
          <ControlButton 
            icon={<ChevronRight size={28} />} 
            onClick={() => { if (lastProcessedDirection.current !== 'LEFT') setDirection('RIGHT'); }} 
          />
          <div />
          <ControlButton 
            icon={<ChevronDown size={28} />} 
            onClick={() => { if (lastProcessedDirection.current !== 'UP') setDirection('DOWN'); }} 
          />
          <div />
        </div>

        {/* --- Footer Info --- */}
        <footer className="mt-4 flex justify-center gap-8 opacity-40 text-[10px] uppercase tracking-widest font-mono">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Escala 1:1</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            <span>Energía Detectada</span>
          </div>
        </footer>
      </div>
    </div>
  );
}

function ControlButton({ 
  icon, 
  onClick, 
  variant = 'normal' 
}: { 
  icon: React.ReactNode; 
  onClick: () => void; 
  variant?: 'normal' | 'flat'
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      className={`
        aspect-square rounded-2xl flex items-center justify-center transition-all
        ${variant === 'normal' 
          ? 'bg-white/5 border border-white/10 active:bg-white/20 hover:bg-white/10 text-white shadow-xl' 
          : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'}
      `}
    >
      {icon}
    </motion.button>
  );
}
