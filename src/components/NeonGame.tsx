import React, { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';

interface NeonGameProps {
  onGameOver: (score: number) => void;
  isPaused: boolean;
}

export const NeonGame: React.FC<NeonGameProps> = ({ onGameOver, isPaused }) => {
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
  });

  const [currentScore, setCurrentScore] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const handleResize = () => {
      if (containerRef.current) {
        canvas.width = containerRef.current.clientWidth;
        canvas.height = containerRef.current.clientHeight;
        gameRef.current.playerY = canvas.height - 80;
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    const PLAYER_HEIGHT = 40;
    const PLAYER_WIDTH = 30;
    const GRAVITY = 0.6;
    const JUMP_FORCE = -12;

    const spawnObstacle = () => {
      const rand = Math.random();
      let type: 'ground' | 'air' | 'spike' | 'laser' = 'ground';
      
      if (rand < 0.3) type = 'spike';
      else if (rand < 0.5) type = 'air';
      else if (rand < 0.7) type = 'laser';
      else type = 'ground';

      const colorMap = {
        ground: '#ff00ff',
        air: '#00f3ff',
        spike: '#ff3131',
        laser: '#39ff14'
      };

      gameRef.current.obstacles.push({
        x: canvas.width,
        y: type === 'air' ? canvas.height - 150 : (type === 'laser' ? canvas.height - 200 : canvas.height - 80),
        width: type === 'spike' ? 40 : (type === 'laser' ? 15 : 40),
        height: type === 'spike' ? 40 : (type === 'laser' ? 120 : 40),
        color: colorMap[type],
        type
      });
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

    const update = (time: number) => {
      if (isPaused) {
        gameRef.current.frameId = requestAnimationFrame(update);
        return;
      }

      const deltaTime = time - gameRef.current.lastTime;
      gameRef.current.lastTime = time;

      // Update Player
      gameRef.current.playerVelocity += GRAVITY;
      gameRef.current.playerY += gameRef.current.playerVelocity;

      const groundY = canvas.height - 80;
      if (gameRef.current.playerY > groundY) {
        gameRef.current.playerY = groundY;
        gameRef.current.playerVelocity = 0;
        gameRef.current.isJumping = false;
      }

      // Trail effect
      if (!isPaused && Math.random() > 0.5) {
        gameRef.current.particles.push({
          x: 100 + Math.random() * 5,
          y: gameRef.current.playerY + PLAYER_HEIGHT / 2 + (Math.random() - 0.5) * 20,
          vx: -gameRef.current.gameSpeed * 0.5,
          vy: (Math.random() - 0.5) * 2,
          life: 0.5,
          color: '#00f3ff',
          size: Math.random() * 3
        });
      }

      // Spawn Obstacles
      gameRef.current.obstacleTimer += deltaTime;
      if (gameRef.current.obstacleTimer > 1200 / (gameRef.current.gameSpeed / 5)) {
        spawnObstacle();
        gameRef.current.obstacleTimer = 0;
      }

      // Update Obstacles
      gameRef.current.obstacles.forEach((obs, index) => {
        obs.x -= gameRef.current.gameSpeed;
        
        // Collision detection - simple bounding box
        const playerX = 100;
        const padding = 5; // Forgiving hitbox
        if (
          playerX + padding < obs.x + obs.width &&
          playerX + PLAYER_WIDTH - padding > obs.x &&
          gameRef.current.playerY + padding < obs.y + obs.height &&
          gameRef.current.playerY + PLAYER_HEIGHT - padding > obs.y
        ) {
          createParticles(playerX + PLAYER_WIDTH/2, gameRef.current.playerY + PLAYER_HEIGHT/2, '#ffffff', 30);
          onGameOver(Math.floor(gameRef.current.score));
          confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#ff00ff', '#00f3ff', '#ff3131']
          });
        }

        if (obs.x + obs.width < 0) {
          gameRef.current.obstacles.splice(index, 1);
          gameRef.current.score += 10;
          setCurrentScore(Math.floor(gameRef.current.score));
          gameRef.current.gameSpeed += 0.05;
        }
      });

      // Update Particles
      gameRef.current.particles.forEach((p, index) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.02;
        if (p.life <= 0) gameRef.current.particles.splice(index, 1);
      });

      // Draw
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw Ground
      ctx.strokeStyle = '#00f3ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, canvas.height - 40);
      ctx.lineTo(canvas.width, canvas.height - 40);
      ctx.stroke();

      // Draw Player
      ctx.save();
      const playerX = 100;
      const centerX = playerX + PLAYER_WIDTH / 2;
      const centerY = gameRef.current.playerY + PLAYER_HEIGHT / 2;
      
      ctx.translate(centerX, centerY);
      // Slight rotation based on velocity
      const rotation = Math.max(-0.2, Math.min(0.2, gameRef.current.playerVelocity * 0.05));
      ctx.rotate(rotation);
      
      // Main Body
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#00f3ff';
      const gradient = ctx.createLinearGradient(-PLAYER_WIDTH/2, -PLAYER_HEIGHT/2, PLAYER_WIDTH/2, PLAYER_HEIGHT/2);
      gradient.addColorStop(0, '#00f3ff');
      gradient.addColorStop(1, '#0090ff');
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
      ctx.shadowBlur = 0; // Reset shadow for other drawings

      // Draw Obstacles
      gameRef.current.obstacles.forEach(obs => {
        ctx.shadowBlur = 20;
        ctx.shadowColor = obs.color;
        ctx.fillStyle = obs.color;

        if (obs.type === 'spike') {
          ctx.beginPath();
          ctx.moveTo(obs.x, obs.y + obs.height);
          ctx.lineTo(obs.x + obs.width / 2, obs.y);
          ctx.lineTo(obs.x + obs.width, obs.y + obs.height);
          ctx.closePath();
          ctx.fill();
          // Add a second spike for variety
          ctx.beginPath();
          ctx.moveTo(obs.x - 10, obs.y + obs.height);
          ctx.lineTo(obs.x - 5, obs.y + 20);
          ctx.lineTo(obs.x, obs.y + obs.height);
          ctx.closePath();
          ctx.fill();
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
        } else {
          // Default ground block
          ctx.beginPath();
          ctx.roundRect(obs.x, obs.y, obs.width, obs.height, 8);
          ctx.fill();
        }
      });

      // Draw Particles
      gameRef.current.particles.forEach(p => {
        ctx.shadowBlur = p.size ? 5 : 0;
        ctx.shadowColor = p.color;
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size || 2, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      gameRef.current.frameId = requestAnimationFrame(update);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.code === 'Space' || e.code === 'ArrowUp') && !gameRef.current.isJumping) {
        gameRef.current.playerVelocity = JUMP_FORCE;
        gameRef.current.isJumping = true;
        createParticles(115, gameRef.current.playerY + 40, '#00f3ff');
      }
    };

    const handleTouch = () => {
      if (!gameRef.current.isJumping) {
        gameRef.current.playerVelocity = JUMP_FORCE;
        gameRef.current.isJumping = true;
        createParticles(115, gameRef.current.playerY + 40, '#00f3ff');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('touchstart', handleTouch);
    gameRef.current.frameId = requestAnimationFrame(update);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('touchstart', handleTouch);
      cancelAnimationFrame(gameRef.current.frameId);
    };
  }, [onGameOver, isPaused]);

  return (
    <div ref={containerRef} className="w-full h-full relative cursor-pointer">
      <canvas ref={canvasRef} className="block w-full h-full" />
      <div className="absolute top-8 left-8">
        <div className="text-sm font-mono text-neon-blue uppercase tracking-widest opacity-70">Current Score</div>
        <div className="text-4xl font-bold font-mono neon-text-blue">{currentScore}</div>
      </div>
    </div>
  );
};
