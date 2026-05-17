/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, RotateCcw, HelpCircle, Trophy, User, ChevronRight, Loader2 } from 'lucide-react';
import { NeonGame } from './components/NeonGame';
import { getLeaderboard, saveScore, LeaderboardEntry, cleanupDuplicates, isNameTaken } from './services/firebase';
import { soundService } from './services/soundService';

type GameState = 'START' | 'NAME_ENTRY' | 'PLAYING' | 'GAMEOVER';

export default function App() {
  const [gameState, setGameState] = useState<GameState>('START');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [playerName, setPlayerName] = useState('');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nameError, setNameError] = useState('');
  const [isCheckingName, setIsCheckingName] = useState(false);
  
  const characterColors = [
    { id: 'cyan', name: 'NEON CYAN', primary: '#00f3ff', edge: '#0090ff' },
    { id: 'red', name: 'CRIMSON OVERDRIVE', primary: '#ff3131', edge: '#8b0000' },
    { id: 'purple', name: 'VIOLET PULSE', primary: '#ff00ff', edge: '#9400d3' },
    { id: 'gold', name: 'GOLDEN GRID', primary: '#ffd700', edge: '#b8860b' },
  ];
  const [selectedColor, setSelectedColor] = useState(characterColors[0]);

  useEffect(() => {
    const savedScore = localStorage.getItem('neon-dash-highscore');
    if (savedScore) setHighScore(parseInt(savedScore, 10));
    
    const savedName = localStorage.getItem('neon-dash-player-name');
    if (savedName) setPlayerName(savedName);

    const savedColorId = localStorage.getItem('neon-dash-char-color');
    if (savedColorId) {
      const color = characterColors.find(c => c.id === savedColorId);
      if (color) setSelectedColor(color);
    }

    fetchLeaderboard();
  }, []);

  const handleColorSelect = (color: typeof characterColors[0]) => {
    setSelectedColor(color);
    localStorage.setItem('neon-dash-char-color', color.id);
  };

  const fetchLeaderboard = async () => {
    setIsLoadingLeaderboard(true);
    const data = await getLeaderboard();
    setLeaderboard(data);
    setIsLoadingLeaderboard(false);
  };

  const handleGameOver = async (finalScore: number) => {
    soundService.playDeath();
    soundService.stopMusic();
    setScore(finalScore);
    if (finalScore > highScore) {
      setHighScore(finalScore);
      localStorage.setItem('neon-dash-highscore', finalScore.toString());
    }
    
    setGameState('GAMEOVER');
    
    // Auto-save score if name exists
    if (playerName && finalScore > 0) {
      setIsSubmitting(true);
      try {
        await saveScore(playerName, finalScore);
        await fetchLeaderboard();
      } catch (err: any) {
        console.error("Failed to save score:", err);
        // If it's an auth restriction error, we let the user know silently in console 
        // but we don't want to crash the UI.
        if (err.code === 'auth/admin-restricted-operation') {
          console.warn("Leaderboard submission requires Anonymous Auth to be enabled in Firebase Console.");
        }
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const proceedToGame = async () => {
    if (!playerName.trim()) return;
    
    await soundService.resume();
    soundService.startMusic();
    setIsCheckingName(true);
    setNameError('');
    
    const taken = await isNameTaken(playerName.trim());
    setIsCheckingName(false);
    
    if (taken) {
      setNameError('Identity already claimed by another operative');
      return;
    }

    localStorage.setItem('neon-dash-player-name', playerName.trim());
    setGameState('PLAYING');
    setScore(0);
  };

  const startGameSequence = async () => {
    await soundService.resume();
    if (playerName) {
      soundService.startMusic();
      setGameState('PLAYING');
      setScore(0);
    } else {
      setGameState('NAME_ENTRY');
    }
  };

  return (
    <div className="h-screen w-screen bg-dark-bg flex flex-col items-center justify-center relative overflow-hidden touch-none">
      {/* Branding Header */}
      <div className="absolute top-0 left-0 w-full px-6 py-4 z-20 pointer-events-none pt-[calc(0.75rem+env(safe-area-inset-top))] flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 md:w-8 md:h-8 bg-neon-blue rounded flex items-center justify-center font-black italic text-dark-bg text-xs md:text-base">B</div>
          <span className="font-mono text-neon-blue text-[10px] md:text-sm uppercase font-bold tracking-[0.2em]">BraxStudio</span>
        </div>
        <div className="text-[8px] md:text-[10px] font-mono text-white/20 uppercase tracking-[0.3em] hidden sm:block">v2.0.4</div>
      </div>

      {/* Background Decorative Grid */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" 
           style={{ 
             backgroundImage: 'linear-gradient(#00f3ff 1px, transparent 1px), linear-gradient(90deg, #00f3ff 1px, transparent 1px)',
             backgroundSize: '100px 100px' 
           }} 
      />

      <AnimatePresence mode="wait">
        {gameState === 'START' && (
          <motion.div
            key="start"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="z-10 text-center max-w-4xl w-full px-6 flex flex-col md:flex-row items-center justify-center gap-12"
            id="start-screen"
          >
            <div className="flex-1 text-center md:text-left">
              <div className="mb-2 text-xs font-mono text-neon-blue uppercase tracking-[0.4em] opacity-80">System.Initialize()</div>
              <h1 className="text-6xl md:text-8xl font-black italic uppercase tracking-tighter mb-8 neon-text-blue relative group">
                Neon<br/>Dash
                <span className="absolute -top-4 -right-12 text-[10px] font-mono text-neon-pink opacity-80 group-hover:opacity-100 transition-opacity whitespace-nowrap">© BraxStudio TM</span>
              </h1>
              
              <div className="flex flex-col items-center md:items-start gap-6">
                <button
                  onClick={startGameSequence}
                  className="group relative px-12 py-4 bg-transparent border-2 border-neon-blue text-neon-blue font-bold text-xl uppercase tracking-widest hover:bg-neon-blue hover:text-dark-bg transition-all duration-300 neon-glow-blue"
                >
                  <div className="flex items-center gap-2">
                    <Play size={24} fill="currentColor" />
                    {playerName ? `Run as ${playerName}` : 'Initiate Run'}
                  </div>
                </button>

                {playerName && (
                  <button 
                    onClick={() => setGameState('NAME_ENTRY')}
                    className="text-xs font-mono text-white/40 hover:text-white/80 uppercase tracking-widest transition-colors mb-2"
                  >
                    Change Identity
                  </button>
                )}

                {/* Character Customization */}
                <div className="mt-8 flex flex-col items-center md:items-start group/custom">
                  <div className="text-[10px] font-mono text-white/30 uppercase tracking-[0.2em] mb-4">Customization.Unit()</div>
                  
                  <div className="flex flex-col md:flex-row gap-6 items-center">
                    {/* Character Preview */}
                    <div className="relative w-16 h-16 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center overflow-hidden">
                      <div className="absolute inset-0 opacity-20" 
                           style={{ 
                             backgroundImage: 'linear-gradient(45deg, #fff 1px, transparent 1px)',
                             backgroundSize: '10px 10px' 
                           }} 
                      />
                      <motion.div 
                        initial={false}
                        animate={{ 
                          backgroundColor: selectedColor.primary,
                          boxShadow: `0 0 20px ${selectedColor.primary}`
                        }}
                        className="w-8 h-10 rounded-md relative flex items-center justify-center"
                      >
                        <div className="w-6 h-1.5 bg-white rounded-full absolute top-2" />
                        <div className="w-5 h-[1px] bg-white/30 absolute bottom-2" />
                      </motion.div>
                    </div>

                    <div className="flex flex-col gap-3">
                      <div className="flex gap-2">
                        {characterColors.map((color) => (
                          <button
                            key={color.id}
                            onClick={() => handleColorSelect(color)}
                            className={`w-10 h-10 rounded border-2 transition-all duration-300 relative group/btn ${
                              selectedColor.id === color.id 
                                ? 'border-white scale-110' 
                                : 'border-transparent opacity-50 hover:opacity-100'
                            }`}
                          >
                            <div className="absolute inset-1 rounded-[2px]" style={{ backgroundColor: color.primary }} />
                            {selectedColor.id === color.id && (
                              <div className="absolute -inset-2 border border-white/20 rounded-lg animate-pulse" />
                            )}
                          </button>
                        ))}
                      </div>
                      
                      <div className="flex flex-col">
                        <span className="text-xs font-mono font-black italic tracking-widest uppercase" style={{ color: selectedColor.primary }}>
                          {selectedColor.name}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[8px] font-mono text-white/40 uppercase">Module Identity: [AUTH_OK]</span>
                          <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="w-full md:w-80 bg-black/40 backdrop-blur-md border border-neon-blue/20 p-6 rounded-lg neon-border-blue">
              <div className="flex items-center gap-2 mb-4 text-neon-blue">
                <Trophy size={18} />
                <span className="font-mono text-sm uppercase tracking-widest">Global Top 5</span>
              </div>
              
              <div className="space-y-3">
                {isLoadingLeaderboard ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="animate-spin text-neon-blue/40" />
                  </div>
                ) : leaderboard.length > 0 ? (
                  leaderboard.slice(0, 5).map((entry, index) => (
                    <div key={entry.id} className="flex justify-between items-center bg-white/5 p-2 rounded">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono opacity-40">{index + 1}</span>
                        <span className="text-sm font-medium truncate max-w-[120px]">{entry.playerName}</span>
                      </div>
                      <span className="font-mono text-neon-pink text-sm">{entry.score}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-xs font-mono opacity-40">No records yet</div>
                )}
              </div>
              
              <div className="mt-6 pt-4 border-t border-white/10">
                <div className="text-[10px] font-mono opacity-30 uppercase mb-1">Your Personal Best</div>
                <div className="text-xl font-mono text-neon-blue">#{highScore}</div>
              </div>
            </div>

            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex items-center gap-4 text-xs font-mono opacity-20 italic">
              <span className="flex items-center gap-1 opacity-60"><HelpCircle size={14} /> SPACE / TOUCH TO JUMP</span>
            </div>
          </motion.div>
        )}

        {gameState === 'NAME_ENTRY' && (
          <motion.div
            key="name-entry"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="z-10 text-center bg-dark-bg/80 backdrop-blur-xl p-12 border-2 border-neon-blue neon-glow-blue max-w-md w-full"
            id="name-entry-screen"
          >
            <User className="mx-auto mb-4 text-neon-blue" size={48} />
            <h2 className="text-3xl font-black text-white italic uppercase mb-2">Identify User</h2>
            <p className="text-xs font-mono opacity-60 mb-8 uppercase tracking-widest">Enter operative handle for global ranking</p>
            
            <form onSubmit={(e) => { e.preventDefault(); proceedToGame(); }} className="space-y-6">
              <div className="relative">
                <input
                  autoFocus
                  type="text"
                  maxLength={20}
                  value={playerName}
                  onChange={(e) => {
                    setPlayerName(e.target.value);
                    setNameError('');
                  }}
                  placeholder="OPERATIVE NAME..."
                  className={`w-full bg-white/5 border-b-2 ${nameError ? 'border-neon-pink' : 'border-neon-blue'} px-4 py-3 text-center text-xl font-mono focus:outline-none focus:bg-white/10 transition-all placeholder:opacity-20`}
                />
                {nameError && (
                  <p className="absolute -bottom-6 left-0 w-full text-[10px] font-mono text-neon-pink uppercase tracking-widest">{nameError}</p>
                )}
              </div>
              
              <button
                type="submit"
                disabled={!playerName.trim() || isCheckingName}
                className="w-full py-4 bg-neon-blue text-dark-bg font-bold uppercase tracking-widest hover:brightness-125 transition-all disabled:opacity-50 disabled:grayscale"
              >
                <div className="flex items-center justify-center gap-2">
                  {isCheckingName ? (
                    <>Verifying Identity <Loader2 size={18} className="animate-spin" /></>
                  ) : (
                    <>Confirm Identity <ChevronRight size={18} /></>
                  )}
                </div>
              </button>
            </form>
          </motion.div>
        )}

        {gameState === 'PLAYING' && (
          <motion.div
            key="game"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full h-full"
          >
            <NeonGame 
              onGameOver={handleGameOver} 
              isPaused={false} 
              characterColor={selectedColor}
            />
          </motion.div>
        )}

        {gameState === 'GAMEOVER' && (
          <motion.div
            key="gameover"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="z-10 text-center bg-dark-bg/80 backdrop-blur-xl p-12 border-2 border-neon-pink neon-glow-pink max-w-lg w-full"
            id="gameover-screen"
          >
            <h2 className="text-5xl font-black text-neon-pink italic uppercase mb-2">Run Terminated</h2>
            <div className="text-xs font-mono opacity-60 mb-8 uppercase tracking-widest">Sector {Math.floor(score * 1.5)} :: Protocol Failure</div>
            
            <div className="grid grid-cols-2 gap-12 mb-10">
              <div>
                <div className="text-xs font-mono opacity-40 uppercase mb-1">Final Score</div>
                <div className="text-4xl font-mono text-white">{score}</div>
              </div>
              <div>
                <div className="text-xs font-mono opacity-40 uppercase mb-1">Personal Best</div>
                <div className="text-4xl font-mono text-neon-blue">{highScore}</div>
              </div>
            </div>

            {isSubmitting && (
              <div className="mb-6 flex items-center justify-center gap-2 text-neon-pink text-xs font-mono animate-pulse">
                <Loader2 size={14} className="animate-spin" /> UPLOADING DATA TO NEURAL NET...
              </div>
            )}

            <div className="flex flex-col gap-4">
              <button
                onClick={async () => {
                  await soundService.resume();
                  soundService.startMusic();
                  setGameState('PLAYING');
                }}
                className="w-full py-4 bg-neon-pink text-dark-bg font-bold uppercase tracking-widest hover:brightness-125 transition-all"
              >
                <div className="flex items-center justify-center gap-2">
                  <RotateCcw size={20} /> Restart Run
                </div>
              </button>
              <button
                onClick={() => setGameState('START')}
                className="w-full py-4 border border-white/20 text-white/60 font-bold uppercase tracking-widest hover:bg-white/10 transition-all text-sm"
              >
                Menu Interface
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Decorative corners */}
      <div className="absolute top-0 left-0 w-32 h-32 border-l-2 border-t-2 border-neon-blue/20 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-32 h-32 border-r-2 border-b-2 border-neon-blue/20 pointer-events-none" />

      {/* Copyright Footer */}
      <div className="absolute bottom-0 w-full text-center z-20 pointer-events-none pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <p className="text-[8px] md:text-[9px] font-mono text-white/10 uppercase tracking-[0.4em]">
          Copyright © {new Date().getFullYear()} BraxStudio. All Rights Reserved.
        </p>
      </div>
    </div>
  );
}
