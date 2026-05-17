import React, { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';

import { soundService } from '../services/soundService';

interface NeonGameProps {
  onGameOver: (score: number) => void;
  isPaused: boolean;
  characterColor: {
    primary: string;
    edge: string;
  };
}

export const NeonGame: React.FC<NeonGameProps> = ({ onGameOver, isPaused, characterColor }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef({
    score: 0,
    gameSpeed: 5,
    obstacles: [] as any[],
    particles: [] as any[],
    playerY: 0,
    playerVelocity: 0,
    isJumping: false,
    frameId: 0,
    lastTime: 0,
    obstacleTimer: 0,
    lastMilestone: 0,
    isGameOver: false,
  });

  const [currentScore, setCurrentScore] = useState(0);
  const [currentTier, setCurrentTier] = useState({ name: 'ROOKIE', color: '#00f3ff' });

  useEffect(() => {
    gameRef.current = {
      score: 0,
      gameSpeed: 5,
      obstacles: [],
      particles: [],
      playerY: 0,
      playerVelocity: 0,
      isJumping: false,
      frameId: 0,
      lastTime: 0,
      obstacleTimer: 0,
      isGameOver: false,
      lastMilestone: 0,
      gravity: 1, // 1 for normal, -1 for flipped
      nextSections: [] as string[],
      currentSectionProgress: 0,
    };

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const PLAYER_HEIGHT = 40;
    const PLAYER_WIDTH = 30;
    const GRAVITY = 0.6;
    const JUMP_FORCE = -12;

    const handleResize = () => {
      if (containerRef.current) {
        canvas.width = containerRef.current.clientWidth;
        canvas.height = containerRef.current.clientHeight;
        const groundY = canvas.height * 0.7;
        gameRef.current.playerY = groundY - PLAYER_HEIGHT;
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    const spawnPattern = (type: string, xOffset = 0, yOffset = 0, width = 40, height = 40, colorOverride?: string) => {
      const groundY = canvas.height * 0.7;
      const ceilingY = canvas.height * 0.2;
      
      const colorMap: Record<string, string> = {
        ground: '#ff00ff',
        air: '#00f3ff',
        spike: '#ff3131',
        laser: '#39ff14',
        gap: '#000000',
        platform: '#00f3ff',
        orb: '#ffff00',
        portal: '#ffffff',
        ceiling_spike: '#ff3131'
      };

      let y = groundY - height + yOffset;
      if (type === 'ceiling_spike') y = ceilingY + yOffset;
      if (type === 'orb') y = groundY - 100 + yOffset;
      if (type === 'platform') y = groundY - 120 + yOffset;

      gameRef.current.obstacles.push({
        x: canvas.width + xOffset,
        y,
        width,
        height,
        color: colorOverride || colorMap[type],
        type,
        scored: false,
        amplitude: 0,
        centerY: y,
        speedY: 0
      });
    };

    const generateSection = () => {
      const sections = ['BASIC', 'STAIRS', 'PLATFORMS', 'ORB_JUMP', 'GRAVITY_FLIP', 'TUNNEL'];
      const section = sections[Math.floor(Math.random() * sections.length)];
      
      switch (section) {
        case 'STAIRS':
          spawnPattern('platform', 0, 0, 100, 20);
          spawnPattern('platform', 150, -40, 100, 20);
          spawnPattern('platform', 300, -80, 100, 20);
          spawnPattern('spike', 320, -120, 40, 40);
          break;
        case 'PLATFORMS':
          spawnPattern('platform', 0, -60, 150, 20);
          spawnPattern('spike', 50, -100, 40, 40);
          spawnPattern('platform', 250, -100, 150, 20);
          spawnPattern('spike', 300, -140, 40, 40);
          break;
        case 'ORB_JUMP':
          spawnPattern('gap', 0, 0, 300, 200);
          spawnPattern('orb', 100, 0, 30, 30);
          spawnPattern('orb', 220, -40, 30, 30);
          break;
        case 'GRAVITY_FLIP':
          spawnPattern('portal', 0, -50, 40, 100, '#ffffff'); // Flip portal
          spawnPattern('ceiling_spike', 200, 0, 40, 40);
          spawnPattern('ceiling_spike', 350, 0, 40, 40);
          spawnPattern('portal', 500, -50, 40, 100, '#ffffff'); // Unflip portal
          break;
        case 'TUNNEL':
          spawnPattern('platform', 0, -100, 400, 20); // Roof
          spawnPattern('spike', 100, 0, 40, 40);
          spawnPattern('spike', 250, 0, 40, 40);
          break;
        default: // BASIC
          spawnPattern('spike', 0, 0, 40, 40);
          spawnPattern('spike', 150, 0, 40, 40);
          break;
      }
    };

    const createParticles = (x: number, y: number, color: string, count = 10) => {
      for (let i = 0; i < count; i++) {
        gameRef.current.particles.push({
          x,
          y,
          vx: (Math.random() - 0.5) * 10,
          vy: (Math.random() - 0.5) * 10,
          life: 1,
          color
        });
      }
    };

    const getTier = (score: number) => {
      if (score < 100) return { name: 'ROOKIE', color: '#00f3ff' };
      if (score < 300) return { name: 'OPERATIVE', color: '#39ff14' };
      if (score < 600) return { name: 'ELITE', color: '#ff00ff' };
      if (score < 1000) return { name: 'GHOST', color: '#ff3131' };
      return { name: 'LEGENDARY', color: '#ffd700' };
    };

    const update = (time: number) => {
      if (isPaused) {
        gameRef.current.frameId = requestAnimationFrame(update);
        return;
      }

      const deltaTime = time - gameRef.current.lastTime;
      gameRef.current.lastTime = time;

      const playerX = canvas.width < 500 ? canvas.width * 0.15 : 100;

      // Update Player
      const currentGravity = GRAVITY * gameRef.current.gravity;
      gameRef.current.playerVelocity += currentGravity;
      gameRef.current.playerY += gameRef.current.playerVelocity;

      const groundY = canvas.height * 0.7;
      const ceilingY = canvas.height * 0.2;
      
      let playerBaseY = gameRef.current.gravity === 1 ? groundY - PLAYER_HEIGHT : ceilingY;
      
      // Check for platform collisions
      gameRef.current.obstacles.forEach(obs => {
        if (obs.type === 'platform') {
          const isAbove = gameRef.current.gravity === 1 
            ? gameRef.current.playerY + PLAYER_HEIGHT <= obs.y + 10 && gameRef.current.playerVelocity >= 0
            : gameRef.current.playerY >= obs.y + obs.height - 10 && gameRef.current.playerVelocity <= 0;

          if (isAbove &&
              playerX + PLAYER_WIDTH > obs.x &&
              playerX < obs.x + obs.width &&
              Math.abs(gameRef.current.playerY + (gameRef.current.gravity === 1 ? PLAYER_HEIGHT : 0) - (gameRef.current.gravity === 1 ? obs.y : obs.y + obs.height)) < 15) {
            
            gameRef.current.playerY = gameRef.current.gravity === 1 ? obs.y - PLAYER_HEIGHT : obs.y + obs.height;
            gameRef.current.playerVelocity = 0;
            gameRef.current.isJumping = false;
          }
        }
      });

      // Regular floor/ceiling logic
      const isOverGap = gameRef.current.obstacles.some(obs => 
        obs.type === 'gap' && 
        playerX + 5 < obs.x + obs.width && 
        playerX + PLAYER_WIDTH - 5 > obs.x
      );

      if (isOverGap && (gameRef.current.playerY === groundY - PLAYER_HEIGHT || gameRef.current.playerY === ceilingY)) {
        // Fall if on the ground/ceiling and there's a gap
      } else {
        if (gameRef.current.gravity === 1) {
          if (gameRef.current.playerY > groundY - PLAYER_HEIGHT) {
            gameRef.current.playerY = groundY - PLAYER_HEIGHT;
            gameRef.current.playerVelocity = 0;
            gameRef.current.isJumping = false;
          }
        } else {
          if (gameRef.current.playerY < ceilingY) {
            gameRef.current.playerY = ceilingY;
            gameRef.current.playerVelocity = 0;
            gameRef.current.isJumping = false;
          }
        }
      }

      // Death by falling/floating away
      if (gameRef.current.playerY > canvas.height + 50 || gameRef.current.playerY < -150) {
        if (!gameRef.current.isGameOver) {
          gameRef.current.isGameOver = true;
          onGameOver(Math.floor(gameRef.current.score));
        }
      }

      // Portal Interaction (Gravity Flip)
      gameRef.current.obstacles.forEach(obs => {
        if (obs.type === 'portal') {
          if (playerX + PLAYER_WIDTH > obs.x && playerX < obs.x + obs.width &&
              gameRef.current.playerY + PLAYER_HEIGHT > obs.y && gameRef.current.playerY < obs.y + obs.height) {
            if (!obs.used) {
              obs.used = true;
              gameRef.current.gravity *= -1;
              gameRef.current.playerVelocity = 0;
              createParticles(playerX + PLAYER_WIDTH/2, gameRef.current.playerY + PLAYER_HEIGHT/2, '#ffffff', 20);
            }
          }
        }
      });

      // Trail effect
      if (!isPaused && Math.random() > 0.5 && gameRef.current.playerY < canvas.height && gameRef.current.playerY > 0) {
        gameRef.current.particles.push({
          x: playerX + Math.random() * 5,
          y: gameRef.current.playerY + PLAYER_HEIGHT / 2 + (Math.random() - 0.5) * 5,
          vx: -gameRef.current.gameSpeed * 0.5,
          vy: (Math.random() - 0.5) * 2,
          life: 0.5,
          color: characterColor.primary,
          size: Math.random() * 3
        });
      }

      // Spawn Obstacles
      gameRef.current.obstacleTimer += deltaTime;
      const spawnRate = Math.max(1200, 2000 - (gameRef.current.score / 2));
      if (gameRef.current.obstacleTimer > spawnRate / (gameRef.current.gameSpeed / 5)) {
        generateSection();
        gameRef.current.obstacleTimer = 0;
      }

      // Update Obstacles
      gameRef.current.obstacles.forEach((obs) => {
        obs.x -= gameRef.current.gameSpeed;
        
        // Collision detection - lethal obstacles
        const padding = 5; 
        const isLethal = ['spike', 'ceiling_spike', 'laser', 'falling'].includes(obs.type);

        if (
          !gameRef.current.isGameOver &&
          isLethal &&
          playerX + padding < obs.x + obs.width &&
          playerX + PLAYER_WIDTH - padding > obs.x &&
          gameRef.current.playerY + padding < obs.y + obs.height &&
          gameRef.current.playerY + PLAYER_HEIGHT - padding > obs.y
        ) {
          gameRef.current.isGameOver = true;
          createParticles(playerX + PLAYER_WIDTH/2, gameRef.current.playerY + PLAYER_HEIGHT/2, '#ffffff', 30);
          onGameOver(Math.floor(gameRef.current.score));
          soundService.playDeath();
          confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.7 },
            colors: ['#ff00ff', '#00f3ff', '#ff3131']
          });
        }

        // Scoring
        if (!gameRef.current.isGameOver && obs.x + obs.width < playerX && !obs.scored) {
          obs.scored = true;
          gameRef.current.score += 10;
          setCurrentScore(Math.floor(gameRef.current.score));
          // Speed scales with score logic
          gameRef.current.gameSpeed = 5 + (gameRef.current.score / 200);

          // Update Tier
          const nextTier = getTier(gameRef.current.score);
          setCurrentTier(nextTier);

          // Milestone sound
          const currentMilestone = Math.floor(gameRef.current.score / 100);
          if (currentMilestone > gameRef.current.lastMilestone) {
            gameRef.current.lastMilestone = currentMilestone;
            soundService.playMilestone();
          }
        }
      });

      gameRef.current.obstacles = gameRef.current.obstacles.filter(obs => obs.x + obs.width >= -100 && obs.y < canvas.height + 100);
      
      // Update Particles
      gameRef.current.particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.02;
      });
      gameRef.current.particles = gameRef.current.particles.filter(p => p.life > 0);

      // Draw
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.shadowBlur = 0; // Ensure reset

      // Draw Ground & Ceiling (with gaps)
      const groundYLine = canvas.height * 0.7;
      const ceilingYLine = canvas.height * 0.2;
      ctx.strokeStyle = '#00f3ff';
      ctx.lineWidth = 2;
      
      const drawBoundaries = () => {
        // Ground
        ctx.beginPath();
        let currentXG = 0;
        const groundGaps = gameRef.current.obstacles
          .filter(obs => obs.type === 'gap')
          .sort((a, b) => a.x - b.x);

        groundGaps.forEach(gap => {
          if (gap.x > currentXG) {
            ctx.moveTo(currentXG, groundYLine);
            ctx.lineTo(gap.x, groundYLine);
          }
          currentXG = gap.x + gap.width;
        });
        if (currentXG < canvas.width) {
          ctx.moveTo(currentXG, groundYLine);
          ctx.lineTo(canvas.width, groundYLine);
        }
        ctx.stroke();

        // Ceiling
        ctx.beginPath();
        ctx.strokeStyle = gameRef.current.gravity === -1 ? '#ff00ff' : 'rgba(0, 243, 255, 0.3)';
        ctx.moveTo(0, ceilingYLine);
        ctx.lineTo(canvas.width, ceilingYLine);
        ctx.stroke();
      };
      drawBoundaries();

      // Draw dashed visual floor below
      ctx.strokeStyle = 'rgba(0, 243, 255, 0.1)';
      ctx.setLineDash([20, 20]);
      ctx.beginPath();
      ctx.moveTo(0, groundYLine + 40);
      ctx.lineTo(canvas.width, groundYLine + 40);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw Player
      if (gameRef.current.playerY < canvas.height) {
        ctx.save();
        const centerX = playerX + PLAYER_WIDTH / 2;
        const centerY = gameRef.current.playerY + PLAYER_HEIGHT / 2;
        
        ctx.translate(centerX, centerY);
        // Slight rotation based on velocity
        const rotation = Math.max(-0.2, Math.min(0.2, gameRef.current.playerVelocity * 0.05));
        ctx.rotate(rotation);
        
        // Main Body
        ctx.shadowBlur = 15;
        ctx.shadowColor = characterColor.primary;
        const gradient = ctx.createLinearGradient(-PLAYER_WIDTH/2, -PLAYER_HEIGHT/2, PLAYER_WIDTH/2, PLAYER_HEIGHT/2);
        gradient.addColorStop(0, characterColor.primary);
        gradient.addColorStop(1, characterColor.edge);
        ctx.fillStyle = gradient;
        
        ctx.beginPath();
        ctx.roundRect(-PLAYER_WIDTH/2, -PLAYER_HEIGHT/2, PLAYER_WIDTH, PLAYER_HEIGHT, 8);
        ctx.fill();
        
        // Inner Detail
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1;
        ctx.strokeRect(-PLAYER_WIDTH/2 + 4, -PLAYER_HEIGHT/2 + 4, PLAYER_WIDTH - 8, PLAYER_HEIGHT - 8);
        
        // Visor / Eye
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#fff';
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        const visorWidth = PLAYER_WIDTH - 10;
        const visorHeight = 6;
        ctx.roundRect(-visorWidth/2 + 2, -PLAYER_HEIGHT/2 + 8, visorWidth, visorHeight, 3);
        ctx.fill();
        
        // Tech Lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.beginPath();
        ctx.moveTo(-PLAYER_WIDTH/2 + 5, PLAYER_HEIGHT/2 - 10);
        ctx.lineTo(PLAYER_WIDTH/2 - 5, PLAYER_HEIGHT/2 - 10);
        ctx.stroke();
        
        ctx.restore();
      }
      ctx.shadowBlur = 0; // Reset shadow for other drawings

      // Draw Obstacles
      gameRef.current.obstacles.forEach(obs => {
        if (obs.type === 'gap') return; // Gaps are invisible (just breaks in the line)

        ctx.shadowBlur = 20;
        ctx.shadowColor = obs.color;
        ctx.fillStyle = obs.color;

        if (obs.type === 'spike' || obs.type === 'ceiling_spike') {
          ctx.beginPath();
          if (obs.type === 'ceiling_spike') {
            ctx.moveTo(obs.x, obs.y);
            ctx.lineTo(obs.x + obs.width / 2, obs.y + obs.height);
            ctx.lineTo(obs.x + obs.width, obs.y);
          } else {
            ctx.moveTo(obs.x, obs.y + obs.height);
            ctx.lineTo(obs.x + obs.width / 2, obs.y);
            ctx.lineTo(obs.x + obs.width, obs.y + obs.height);
          }
          ctx.closePath();
          ctx.fill();
        } else if (obs.type === 'orb') {
          ctx.shadowBlur = 30;
          ctx.beginPath();
          ctx.arc(obs.x + obs.width/2, obs.y + obs.height/2, obs.width/2, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 2;
          ctx.stroke();
        } else if (obs.type === 'portal') {
          const gradient = ctx.createLinearGradient(obs.x, obs.y, obs.x + obs.width, obs.y);
          gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
          gradient.addColorStop(0.5, obs.color);
          gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
          ctx.fillStyle = gradient;
          ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
          // Animated lines
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 1;
          for(let i=0; i<3; i++) {
            const y = obs.y + ((time/10 + i*20) % obs.height);
            ctx.strokeRect(obs.x, y, obs.width, 1);
          }
        } else if (obs.type === 'platform') {
          ctx.beginPath();
          ctx.roundRect(obs.x, obs.y, obs.width, obs.height, 4);
          ctx.fill();
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
          ctx.stroke();
        } else if (obs.type === 'laser') {
          ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
          ctx.shadowBlur = 30;
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 2;
          ctx.strokeRect(obs.x + 5, obs.y, 2, obs.height);
        } else if (obs.type === 'air') {
          // Drone shape
          ctx.beginPath();
          ctx.roundRect(obs.x, obs.y + 10, obs.width, 15, 5);
          ctx.fill();
          ctx.fillRect(obs.x + 10, obs.y, 20, 10);
          // Pulsing light
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.arc(obs.x + obs.width/2, obs.y + 17, 3 + Math.sin(time/100)*2, 0, Math.PI*2);
          ctx.fill();
        } else if (obs.type === 'falling') {
          // Gem/Meteor shape
          ctx.beginPath();
          ctx.moveTo(obs.x + obs.width/2, obs.y);
          ctx.lineTo(obs.x + obs.width, obs.y + obs.height/2);
          ctx.lineTo(obs.x + obs.width/2, obs.y + obs.height);
          ctx.lineTo(obs.x, obs.y + obs.height/2);
          ctx.closePath();
          ctx.fill();
        } else {
          // Default ground block
          ctx.beginPath();
          ctx.roundRect(obs.x, obs.y, obs.width, obs.height, 8);
          ctx.fill();
        }
      });
      ctx.shadowBlur = 0;

      // Draw Particles
      gameRef.current.particles.forEach(p => {
        ctx.shadowBlur = p.size ? 5 : 0;
        ctx.shadowColor = p.color;
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size || 2, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;

      gameRef.current.frameId = requestAnimationFrame(update);
    };

    const handleJump = () => {
      if (gameRef.current.isGameOver) return;
      
      const playerX = canvas.width < 500 ? canvas.width * 0.15 : 100;
      
      // Check for Orb interaction first (mid-air)
      const nearbyOrb = gameRef.current.obstacles.find(obs => 
        obs.type === 'orb' && 
        playerX + PLAYER_WIDTH > obs.x - 20 && 
        playerX < obs.x + obs.width + 20 &&
        gameRef.current.playerY + PLAYER_HEIGHT > obs.y - 20 && 
        gameRef.current.playerY < obs.y + obs.height + 20
      );

      if (nearbyOrb) {
        soundService.playJump();
        gameRef.current.playerVelocity = JUMP_FORCE * gameRef.current.gravity;
        createParticles(nearbyOrb.x + nearbyOrb.width/2, nearbyOrb.y + nearbyOrb.height/2, nearbyOrb.color, 15);
        return;
      }

      if (!gameRef.current.isJumping) {
        soundService.playJump();
        gameRef.current.playerVelocity = JUMP_FORCE * gameRef.current.gravity;
        gameRef.current.isJumping = true;
        const particlesY = gameRef.current.gravity === 1 ? gameRef.current.playerY + PLAYER_HEIGHT : gameRef.current.playerY;
        createParticles(playerX + PLAYER_WIDTH/2, particlesY, characterColor.primary);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        handleJump();
      }
    };

    const handleTouch = (e: TouchEvent) => {
      e.preventDefault();
      handleJump();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('touchstart', handleTouch, { passive: false });
    gameRef.current.frameId = requestAnimationFrame(update);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('touchstart', handleTouch);
      cancelAnimationFrame(gameRef.current.frameId);
    };
  }, [onGameOver, isPaused]);

  return (
    <div ref={containerRef} className="w-full h-full relative cursor-pointer touch-none">
      <canvas ref={canvasRef} className="block w-full h-full" />
      
      {/* HUD elements */}
      <div className="absolute top-4 md:top-8 left-1/2 -translate-x-1/2 text-center pt-[env(safe-area-inset-top)] pointer-events-none">
        <div className="flex flex-col items-center gap-1 mb-1">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: currentTier.color }} />
            <div className="text-[10px] md:text-xs font-mono font-bold tracking-[0.2em]" style={{ color: currentTier.color }}>
              STAGE: {currentTier.name}
            </div>
          </div>
          <div className="text-[8px] md:text-[10px] font-mono text-white/30 uppercase tracking-widest">Network Synchronized</div>
        </div>
        <div className="text-5xl md:text-6xl font-black font-mono neon-text-blue italic tracking-tighter">{currentScore}</div>
      </div>
    </div>
  );
};
