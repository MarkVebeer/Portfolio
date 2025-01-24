import React, { useEffect, useRef } from 'react';

const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*';

export const GlitchBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const fontSize = 14;
    const columns = Math.floor(canvas.width / fontSize);
    
    ctx.font = `${fontSize}px monospace`;
    
    // Initialize drops with random starting positions
    const drops = Array(columns).fill(0).map(() => Math.random() * canvas.height / fontSize);
    const speeds = Array(columns).fill(0).map(() => Math.random() * 0.5 + 0.5); // Random speeds
    const activeColumns = Array(columns).fill(false);

    // Randomly activate columns over time
    const activateColumns = () => {
      for (let i = 0; i < columns; i++) {
        if (!activeColumns[i] && Math.random() > 0.995) {
          activeColumns[i] = true;
        }
      }
    };

    const draw = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      activateColumns();

      for (let i = 0; i < columns; i++) {
        if (!activeColumns[i]) continue;

        // Draw characters
        if (Math.random() > 0.8) {
          const char = characters[Math.floor(Math.random() * characters.length)];
          const x = i * fontSize;
          const y = drops[i] * fontSize;

          // Draw current character
          ctx.fillStyle = '#6d6d83';
          ctx.fillText(char, x, y);

          // Draw trailing characters with fade
          for (let j = 1; j < 8; j++) {
            const trailY = y - j * fontSize;
            if (trailY < 0) continue;

            const alpha = (8 - j) / 8;
            ctx.fillStyle = `rgba(71, 78, 147, ${alpha})`;
            ctx.fillText(char, x, trailY);
          }

          // Update position
          drops[i] += speeds[i];

          // Reset when reaching bottom
          if (drops[i] * fontSize > canvas.height) {
            drops[i] = 0;
            speeds[i] = Math.random() * 0.5 + 0.5; // New random speed
            activeColumns[i] = Math.random() > 0.5; // 50% chance to deactivate
          }
        }
      }
    };

    const interval = setInterval(draw, 30);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full opacity-25 pointer-events-none z-0"
      style={{ background: '#111' }}
    />
  );
};