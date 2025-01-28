import React, { useEffect, useRef } from 'react';

export const Background = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const points: Point[] = [];
    const numPoints = 50;

    class Point {
      x: number;
      y: number;
      size: number;
      direction: number;
      velocity: number;
      distances: Distance[];
      neighbors: Distance[];

      constructor() {
        this.x = Math.random() * window.innerWidth;
        this.y = Math.random() * window.innerHeight;
        this.size = Math.random() * (3 - 0.5) + 0.5;
        this.direction = Math.random() * 360;
        this.velocity = Math.random() * (4 - 0.1) + 0.2;
        this.distances = [];
        this.neighbors = [];
      }

      step() {
        const radianAngle = this.direction * Math.PI / 180;
        this.x += this.velocity * Math.cos(radianAngle);
        this.y += this.velocity * Math.sin(radianAngle);

        if (this.x > window.innerWidth) this.x = 0;
        if (this.x < 0) this.x = window.innerWidth;
        if (this.y > window.innerHeight) this.y = 0;
        if (this.y < 0) this.y = window.innerHeight;
      }

      draw(ctx: CanvasRenderingContext2D) {
        this.computeNeighbors();
        
        ctx.beginPath();
        this.neighbors.forEach(neighbor => {
          ctx.moveTo(this.x, this.y);
          ctx.lineTo(neighbor.point.x, neighbor.point.y);
          ctx.lineWidth = 0.1 + 5 / neighbor.distance;
        });
        ctx.strokeStyle = '#666';
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = '#666';
        ctx.fill();
      }

      computeNeighbors() {
        this.distances = points
          .filter(p => p !== this)
          .map(p => ({
            point: p,
            distance: Math.sqrt(Math.pow(this.x - p.x, 2) + Math.pow(this.y - p.y, 2))
          }))
          .sort((a, b) => a.distance - b.distance);

        this.neighbors = this.distances.slice(0, 3);
      }
    }

    const init = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      for (let i = 0; i < numPoints; i++) {
        points.push(new Point());
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      points.forEach(point => {
        point.step();
        point.draw(ctx);
      });

      requestAnimationFrame(animate);
    };

    init();
    animate();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed top-0 left-0 w-full h-full opacity-30 pointer-events-none z-0"
    />
  );
};

interface Distance {
  point: Point;
  distance: number;
}