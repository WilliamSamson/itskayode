"use client";

import React, { useEffect, useId, useRef } from "react";
import { roverPose } from "./rover-motion";

interface RoverTopViewProps {
  className?: string;
  paused?: boolean;
}

export function RoverTopView({ className = "", paused = false }: RoverTopViewProps) {
  const id = useId().replace(/:/g, "");
  const root = useRef<SVGSVGElement>(null);
  const elapsed = useRef(0);
  useEffect(() => {
    if (paused) return;
    const previous = elapsed.current;
    const svg = root.current;
    if (!svg) return;
    const body = svg.querySelector<SVGGElement>("[data-body]");
    const tilt = svg.querySelector<SVGGElement>("[data-tilt]");
    const head = svg.querySelector<SVGGElement>("[data-scanner]");
    const wheels = ["r-fl", "r-fr", "r-rl", "r-rr"].map((name) =>
      svg.querySelector<SVGGElement>(`.${name}`)
    );
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let start: number | undefined;
    const draw = (now: number) => {
      start ??= now;
      const seconds = reduced.matches ? 0 : previous + (now - start) / 1000;
      elapsed.current = seconds;
      const pose = roverPose(seconds);
      body?.setAttribute("transform", `translate(${pose.x} ${pose.y}) rotate(${pose.angle})`);
      head?.setAttribute("transform", `rotate(${seconds * 360})`);
      // Illustrative step-and-settle mount tilt, separate from the 2D scanner rotation.
      const tiltStops = [1, 0.86, 0.7, 0.86];
      const step = Math.floor(seconds / 2);
      const progress = Math.min(1, (seconds % 2) / 0.4);
      const eased = progress * progress * (3 - 2 * progress);
      const tiltScale =
        tiltStops[step % 4] + (tiltStops[(step + 1) % 4] - tiltStops[step % 4]) * eased;
      tilt?.setAttribute("transform", `scale(1 ${tiltScale})`);
      wheels.forEach((wheel, i) => {
        const phase = ((pose.wheels[i] % 4) + 4) % 4;
        wheel?.setAttribute("transform", `translate(${phase} 0)`);
      });
      if (!reduced.matches) frame = requestAnimationFrame(draw);
    };
    const restart = () => {
      cancelAnimationFrame(frame);
      start = undefined;
      frame = requestAnimationFrame(draw);
    };
    restart();
    reduced.addEventListener("change", restart);
    return () => {
      cancelAnimationFrame(frame);
      reduced.removeEventListener("change", restart);
    };
  }, [paused]);

  const renderWheel = (x: number, y: number, dir: number, cls: string) => {
    const rollers = [-16, -12, -8, -4, 0, 4, 8, 12, 16].map((ox) => (
      <g key={ox} transform={`translate(${x + ox}, ${y}) rotate(${dir * 45})`}>
        <ellipse
          cx="0"
          cy="0"
          rx="4.8"
          ry="2.2"
          fill="#282830"
          stroke="#1A1A22"
          strokeWidth="0.6"
        />
        <ellipse cx="0" cy="-0.6" rx="3.6" ry="1" fill="#4B4B57" opacity="0.85" />
        <line x1="-4.6" y1="0" x2="-3.8" y2="0" stroke="#9E9A90" strokeWidth="0.8" />
        <line x1="3.8" y1="0" x2="4.6" y2="0" stroke="#9E9A90" strokeWidth="0.8" />
      </g>
    ));

    const axle =
      y < 0 ? (
        <rect
          x={x - 3}
          y={y + 6}
          width="6"
          height="7"
          rx="1.5"
          fill={`url(#${id}m)`}
          stroke="#8C8880"
          strokeWidth="0.5"
        />
      ) : (
        <rect
          x={x - 3}
          y={y - 13}
          width="6"
          height="7"
          rx="1.5"
          fill={`url(#${id}m)`}
          stroke="#8C8880"
          strokeWidth="0.5"
        />
      );

    return (
      <g key={`${x}-${y}`}>
        <rect x={x - 14} y={y - 8} width="28" height="16" rx="5" fill="#0A0A0D" opacity="0.35" />
        {axle}
        <rect
          x={x - 13}
          y={y - 7}
          width="26"
          height="14"
          rx="4.5"
          fill="#1C1C21"
          stroke="#2D2D35"
          strokeWidth="0.8"
        />
        <rect x={x - 11} y={y - 5.5} width="22" height="11" rx="3" fill="#131318" />
        <defs>
          <clipPath id={`${id}-${cls}`}>
            <rect x={x - 11} y={y - 5.5} width="22" height="11" rx="3" />
          </clipPath>
        </defs>
        <g clipPath={`url(#${id}-${cls})`}>
          <g className={cls}>{rollers}</g>
        </g>
        <circle cx={x} cy={y} r="2.2" fill={`url(#${id}m)`} stroke="#5A5750" strokeWidth="0.6" />
        <circle cx={x} cy={y} r="0.8" fill="#2B2B32" />
      </g>
    );
  };

  const bolts = [-36, 36].flatMap((bx) =>
    [-19, 19].map((by) => (
      <React.Fragment key={`${bx}-${by}`}>
        <circle cx={bx} cy={by} r="1.2" fill="#B5B1A8" />
        <circle cx={bx} cy={by} r="0.6" fill="#6B6760" />
      </React.Fragment>
    ))
  );

  return (
    <div className={`relative flex h-full w-full items-center justify-center ${className}`}>
      <svg
        ref={root}
        role="img"
        aria-label="Animated SONARIS rover concept with a mechanically tilting S2 30 m 2D LiDAR"
        viewBox="-100 -80 200 160"
        className="h-full max-h-[310px] w-full max-w-[400px] overflow-visible"
      >
        <title>SONARIS motion illustration, not measured performance</title>
        <defs>
          <linearGradient id={`${id}s`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#E2DFD7" />
          </linearGradient>
          <linearGradient id={`${id}m`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#F2F1EE" />
            <stop offset="50%" stopColor="#B9B6AF" />
            <stop offset="100%" stopColor="#ECEAE5" />
          </linearGradient>
          <radialGradient id={`${id}sh`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#000000" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Animated Rover Centered at (0,0) */}
        <g data-body>
          {/* Shadow */}
          <ellipse cx="0" cy="2" rx="51" ry="36" fill={`url(#${id}sh)`} />
          {/* Chassis Base Plate */}
          <rect x="-44" y="-28" width="88" height="56" rx="14" fill="#1E1E24" opacity="0.25" />

          {/* 4 Mecanum Wheels */}
          {renderWheel(-28, -30, 1, "r-rl")}
          {renderWheel(28, -30, -1, "r-fl")}
          {renderWheel(-28, 30, -1, "r-rr")}
          {renderWheel(28, 30, 1, "r-fr")}

          {/* Body Profile */}
          <path
            d="M -42 -25 H -16 L -13 -27 H 13 L 16 -25 H 42 Q 46 -25 46 -21 L 46 21 Q 46 26 42 26 H 16 L 13 28 H -13 L -16 26 H -42 Q -46 26 -46 21 L -46 -21 Q -46 -25 -42 -25 Z"
            fill={`url(#${id}s)`}
            stroke="#C8C4BA"
            strokeWidth="1.2"
          />
          <line x1="-38" y1="-13" x2="38" y2="-13" stroke="#ECE8E0" strokeWidth="1" />
          <line x1="-38" y1="13" x2="38" y2="13" stroke="#ECE8E0" strokeWidth="1" />
          <line x1="-16" y1="-25" x2="-16" y2="26" stroke="#ECE8E0" strokeWidth="0.8" />
          <line x1="16" y1="-25" x2="16" y2="26" stroke="#ECE8E0" strokeWidth="0.8" />
          {bolts}

          {/* Status LED strip */}
          <g className="b-led-slot">
            <rect x="42" y="-11" width="3.2" height="22" rx="1.6" fill="#18181D" />
            {[-7, -2.5, 2.5, 7].map((ly) => (
              <circle key={ly} cx="43.6" cy={ly} r="1" fill="#10B981" />
            ))}
          </g>

          {/* E-stop button */}
          <circle cx="16" cy="18" r="4.8" fill="#EAB308" stroke="#CA8A04" strokeWidth="0.6" />
          <circle cx="16" cy="18" r="3.2" fill="#DC2626" />
          <circle cx="15.2" cy="17.2" r="1.1" fill="#F87171" />

          {/* Display panel */}
          <rect
            x="-31"
            y="-23"
            width="17"
            height="13"
            rx="2.5"
            fill="#1A1A22"
            stroke="#33333F"
            strokeWidth="0.8"
          />
          <rect x="-29.5" y="-21.5" width="14" height="10" rx="1.2" fill="#070E1A" />
          <rect x="-27.5" y="-19.5" width="6.5" height="2" rx="0.5" fill="#10B981" />
          <rect x="-27.5" y="-16" width="10" height="1.5" rx="0.5" fill="#38BDF8" opacity="0.8" />
          <circle cx="-19" cy="-19" r="1.1" fill="#34D399" />

          {/* Mast & Turret */}
          <rect
            x="-13"
            y="-13"
            width="26"
            height="26"
            rx="3.5"
            fill={`url(#${id}m)`}
            stroke="#ABA69D"
            strokeWidth="0.9"
          />
          {[-10, 10].flatMap((bx) =>
            [-10, 10].map((by) => (
              <circle key={`${bx}-${by}`} cx={bx} cy={by} r="0.8" fill="#6E6A62" />
            ))
          )}
          <rect
            x="-6"
            y="-12"
            width="12"
            height="3"
            rx="1"
            fill={`url(#${id}s)`}
            stroke="#C8C4BA"
            strokeWidth="0.7"
          />
          <rect
            x="-6"
            y="9"
            width="12"
            height="3"
            rx="1"
            fill={`url(#${id}s)`}
            stroke="#C8C4BA"
            strokeWidth="0.7"
          />
          <circle cx="0" cy="14" r="4.2" fill={`url(#${id}m)`} stroke="#8A867E" strokeWidth="0.8" />
          <circle cx="0" cy="14" r="1.8" fill="#5A5750" />
          <path
            d="M 3 16 Q 8 19 7 13 Q 6 8 3 6"
            fill="none"
            stroke="#18181D"
            strokeWidth="1.6"
            strokeLinecap="round"
          />

          {/* The mount tilts the 2D scanner; rotation and tilt are separate motions. */}
          <g data-tilt>
            <g data-scanner>
              <circle cx="0" cy="0" r="11" fill="#18181D" stroke="#2D2D36" strokeWidth="1" />
              <circle cx="0" cy="0" r="9" fill="none" stroke="#242834" strokeWidth="1.8" />
              <circle cx="0" cy="0" r="7" fill="#1E1E24" />
              <path
                d="M 6.4 -4.8 A 9 9 0 0 1 9 0"
                fill="none"
                stroke="#38BDF8"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <polygon points="12,0 9.5,-2 9.5,2" fill="#38BDF8" />
              <circle cx="0" cy="0" r="3.2" fill="#141418" />
            </g>
          </g>
        </g>
      </svg>
    </div>
  );
}
