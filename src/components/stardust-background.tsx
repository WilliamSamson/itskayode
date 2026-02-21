"use client";

import { useEffect, useState, useMemo, useRef } from "react";

interface StarSpec {
  x: number;
  y: number;
  size: number;
  opacity: number;
  delay: number;
  duration: number;
}

interface StardustBackgroundProps {
  variant?: "stars" | "neural-top";
}

function seededValue(seed: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function NeuralCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = 0;
    let height = 0;

    let particles: { x: number; y: number; vx: number; vy: number; radius: number; isHub: boolean; color: string }[] = [];
    const mouse = { x: -1000, y: -1000 };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };

    const handleMouseLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
    };

    const initParticles = () => {
      particles = [];
      const count = Math.min(Math.floor((width * height) / 8000), 120); // density
      for (let i = 0; i < count; i++) {
        const isHub = Math.random() > 0.9;
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.35,
          vy: (Math.random() - 0.5) * 0.35,
          radius: isHub ? Math.random() * 1.5 + 1.5 : Math.random() * 1 + 0.5,
          isHub,
          color: isHub ? "rgba(220, 38, 38, 0.85)" : "rgba(255, 255, 255, 0.6)",
        });
      }
    };

    const resize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        width = parent.clientWidth;
        height = parent.clientHeight;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        initParticles();
      }
    };

    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);
    window.addEventListener("mouseout", handleMouseLeave);

    // Initial setup with a slight delay to ensure container is fully sized
    setTimeout(resize, 0);

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // Update positions
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        // Bounce off walls gently
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        // Limit bounds so they don't get stuck outside on resize
        p.x = Math.max(0, Math.min(width, p.x));
        p.y = Math.max(0, Math.min(height, p.y));
      });

      // Draw connections
      const maxDist = 130;
      const mouseMaxDist = 180;

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distSq = dx * dx + dy * dy;

          if (distSq < maxDist * maxDist) {
            const dist = Math.sqrt(distSq);
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);

            // If one of them is a hub, make the line slightly reddish, else white
            const isRedConnection = particles[i].isHub || particles[j].isHub;
            const opacity = (1 - dist / maxDist) * 0.25;

            ctx.strokeStyle = isRedConnection
              ? `rgba(220, 38, 38, ${opacity})`
              : `rgba(255, 255, 255, ${opacity * 0.7})`;
            ctx.lineWidth = isRedConnection ? 1.2 : 0.8;
            ctx.stroke();
          }
        }

        // Mouse connection & interaction
        if (mouse.x !== -1000) {
          const mdx = particles[i].x - mouse.x;
          const mdy = particles[i].y - mouse.y;
          const mDistSq = mdx * mdx + mdy * mdy;

          if (mDistSq < mouseMaxDist * mouseMaxDist) {
            const mDist = Math.sqrt(mDistSq);
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(mouse.x, mouse.y);
            const opacity = (1 - mDist / mouseMaxDist) * 0.35;
            ctx.strokeStyle = `rgba(220, 38, 38, ${opacity})`;
            ctx.lineWidth = 1;
            ctx.stroke();

            // Parallax attraction towards mouse
            const attractionStrength = 0.02;
            particles[i].x -= mdx * attractionStrength;
            particles[i].y -= mdy * attractionStrength;
          }
        }

        // Draw the particle
        ctx.beginPath();
        ctx.arc(particles[i].x, particles[i].y, particles[i].radius, 0, Math.PI * 2);
        ctx.fillStyle = particles[i].color;
        ctx.fill();

        // Glow for hubs
        if (particles[i].isHub) {
          ctx.beginPath();
          ctx.arc(particles[i].x, particles[i].y, particles[i].radius * 4, 0, Math.PI * 2);
          const gradient = ctx.createRadialGradient(
            particles[i].x, particles[i].y, particles[i].radius,
            particles[i].x, particles[i].y, particles[i].radius * 4
          );
          gradient.addColorStop(0, "rgba(220, 38, 38, 0.4)");
          gradient.addColorStop(1, "rgba(220, 38, 38, 0)");
          ctx.fillStyle = gradient;
          ctx.fill();
        }
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("mouseout", handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true" />;
}

export function StardustBackground({ variant = "stars" }: StardustBackgroundProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const backgroundStars: StarSpec[] = useMemo(
    () =>
      Array.from({ length: 200 }, (_, i) => ({
        x: (i * 37) % 100,
        y: (i * 53) % 100,
        size: 0.7 + seededValue(i + 19) * 1.4,
        opacity: 0.15 + seededValue(i + 51) * 0.5,
        delay: -seededValue(i + 87) * 8,
        duration: 2.4 + seededValue(i + 113) * 3.2
      })),
    []
  );

  if (!mounted) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0">
        {backgroundStars.map((star, idx) => (
          <span
            key={`bg-star-${idx}`}
            className="stardust-star absolute rounded-full bg-white"
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              opacity: star.opacity,
              animationDelay: `${star.delay}s`,
              animationDuration: `${star.duration}s`
            }}
          />
        ))}
      </div>

      {variant === "neural-top" && (
        <div
          className="absolute inset-x-0 top-0 h-[34vh] min-h-[220px] max-h-[420px] opacity-[0.85]"
          style={{
            maskImage: "linear-gradient(to bottom, black 60%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to bottom, black 60%, transparent 100%)"
          }}
        >
          <NeuralCanvas />
        </div>
      )}
    </div>
  );
}
