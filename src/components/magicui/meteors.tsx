"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { cn } from "@/lib/utils";

interface MeteorsProps {
  number?: number;
  minDelay?: number;
  maxDelay?: number;
  minDuration?: number;
  maxDuration?: number;
  angle?: number;
  className?: string;
}

export function Meteors({
  number = 20,
  minDelay = 0.2,
  maxDelay = 1.2,
  minDuration = 2,
  maxDuration = 10,
  angle = 215,
  className
}: MeteorsProps) {
  const [meteorStyles, setMeteorStyles] = useState<CSSProperties[]>([]);

  useEffect(() => {
    setMeteorStyles(
      Array.from({ length: number }, () => ({
        "--angle": `${-angle}deg`,
        top: "-5%",
        left: `${Math.random() * 100}%`,
        animationDelay: `${Math.random() * (maxDelay - minDelay) + minDelay}s`,
        animationDuration: `${Math.random() * (maxDuration - minDuration) + minDuration}s`
      })) as CSSProperties[]
    );
  }, [angle, maxDelay, maxDuration, minDelay, minDuration, number]);

  return (
    <>
      {meteorStyles.map((style, index) => (
        <span
          key={index}
          aria-hidden
          style={style}
          className={cn(
            "animate-meteor pointer-events-none absolute z-[1] h-1 w-1 rotate-[var(--angle)] rounded-full bg-accent-blue shadow-[0_0_10px_2px_rgb(37_99_235_/_0.35)] motion-reduce:hidden",
            className
          )}
        >
          <span className="pointer-events-none absolute right-0 top-1/2 -z-10 h-px w-20 -translate-y-1/2 bg-gradient-to-l from-accent-blue/80 to-transparent" />
        </span>
      ))}
    </>
  );
}
