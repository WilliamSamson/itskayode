"use client";

/**
 * ORRA — A Living World
 * =====================
 * Copyright (c) 2026 Kayode. All rights reserved.
 *
 * Title Screen & Entry Gateway
 */

import React, { useEffect } from "react";
import type { OrraPhase } from "./engine/scene";

interface OrraTitleScreenProps {
  phase?: OrraPhase;
  isReady: boolean;
  onEnter: () => void;
  hasEntered: boolean;
}

/**
 * Bold, thick paintbrush tribal typography for "ORRA", inspired by Horizon Zero Dawn's
 * weathered brush strokes, technological focus iris, and massive tribal crossbars.
 * Rendered with heavy paint coverage, solid mass, and bold presence.
 * Accents use solar yellow #FFD84D and hot amber #FFB21A.
 */
function OrraPaintbrushLogo({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 640 150"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="ORRA"
    >
      <defs>
        {/* Dry-brush edge distress filter */}
        <filter id="orra-brush-filter" x="-15%" y="-15%" width="130%" height="130%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.04 0.08"
            numOctaves="3"
            result="noise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="3.0"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>

      <g filter="url(#orra-brush-filter)">
        {/* === LETTER O (Bold & Thick) === */}
        {/* Left thick painted arch */}
        <path
          d="M 90 8 C 45 10 10 38 8 75 C 6 112 42 142 90 144 C 76 130 52 110 50 75 C 48 40 76 20 90 8 Z"
          fill="#ffffff"
        />
        {/* Right thick painted arch */}
        <path
          d="M 90 8 C 135 10 170 38 172 75 C 174 112 138 142 90 144 C 104 130 128 110 130 75 C 132 40 104 20 90 8 Z"
          fill="#ffffff"
        />
        {/* Supplementary thick brush layer filling body */}
        <path
          d="M 90 14 C 55 16 24 42 22 75 C 20 108 52 136 90 138 C 128 136 160 108 158 75 C 156 42 125 16 90 14 Z"
          stroke="#ffffff"
          strokeWidth="12"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Internal dry-brush texture fibers */}
        <path
          d="M 28 50 Q 20 75 28 100"
          stroke="#ffffff"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path
          d="M 152 50 Q 160 75 152 100"
          stroke="#ffffff"
          strokeWidth="4"
          strokeLinecap="round"
        />
        {/* Bold focal iris & thick telemetry tick ring */}
        <circle cx="90" cy="75" r="9" fill="#ffd84d" />
        <circle
          cx="90"
          cy="75"
          r="18"
          stroke="#ffb21a"
          strokeWidth="4"
          strokeDasharray="16 7"
          fill="none"
        />

        {/* === LETTER R (1) (Bold & Thick) === */}
        {/* Massive vertical painted stem */}
        <path d="M 172 6 L 222 10 L 216 144 L 166 140 Z" fill="#ffffff" />
        <path d="M 162 10 L 162 52" stroke="#ffffff" strokeWidth="4" />
        <path d="M 160 92 L 160 140" stroke="#ffffff" strokeWidth="4" />
        {/* Upper thick painted bowl */}
        <path
          d="M 222 18 C 276 18 302 36 300 58 C 298 78 270 88 222 88 L 222 64 C 256 64 274 59 274 54 C 274 44 254 36 222 36 Z"
          fill="#ffffff"
        />
        <path
          d="M 220 22 C 265 22 290 36 288 56 C 286 72 262 82 220 82"
          stroke="#ffffff"
          strokeWidth="10"
          strokeLinecap="round"
          fill="none"
        />
        {/* Solid bold tribal crossbar extension */}
        <path d="M 148 72 L 248 72 L 248 95 L 148 95 Z" fill="#ffb21a" />
        {/* Thick muscular diagonal kick leg */}
        <path
          d="M 234 80 C 254 96 278 120 306 144 L 274 146 C 252 120 234 100 216 88 Z"
          fill="#ffffff"
        />
        <path
          d="M 232 82 L 298 144"
          stroke="#ffffff"
          strokeWidth="12"
          strokeLinecap="round"
        />
        <path
          d="M 284 124 L 314 148"
          stroke="#ffffff"
          strokeWidth="4"
          strokeLinecap="round"
        />

        {/* === LETTER R (2) (Bold & Thick) === */}
        {/* Massive vertical painted stem */}
        <path d="M 324 6 L 374 10 L 368 144 L 318 140 Z" fill="#ffffff" />
        <path d="M 314 10 L 314 52" stroke="#ffffff" strokeWidth="4" />
        <path d="M 312 92 L 312 140" stroke="#ffffff" strokeWidth="4" />
        {/* Upper thick painted bowl */}
        <path
          d="M 374 18 C 428 18 454 36 452 58 C 450 78 422 88 374 88 L 374 64 C 408 64 426 59 426 54 C 426 44 406 36 374 36 Z"
          fill="#ffffff"
        />
        <path
          d="M 372 22 C 417 22 442 36 440 56 C 438 72 414 82 372 82"
          stroke="#ffffff"
          strokeWidth="10"
          strokeLinecap="round"
          fill="none"
        />
        {/* Solid bold tribal crossbar extension */}
        <path d="M 300 72 L 400 72 L 400 95 L 300 95 Z" fill="#ffb21a" />
        {/* Thick muscular diagonal kick leg */}
        <path
          d="M 386 80 C 406 96 430 120 458 144 L 426 146 C 404 120 386 100 368 88 Z"
          fill="#ffffff"
        />
        <path
          d="M 384 82 L 450 144"
          stroke="#ffffff"
          strokeWidth="12"
          strokeLinecap="round"
        />
        <path
          d="M 436 124 L 466 148"
          stroke="#ffffff"
          strokeWidth="4"
          strokeLinecap="round"
        />

        {/* === LETTER A (Bold & Thick) === */}
        {/* Thick left diagonal painted stroke */}
        <path d="M 528 4 L 568 8 L 492 144 L 454 140 Z" fill="#ffffff" />
        <path d="M 548 6 L 474 142" stroke="#ffffff" strokeWidth="12" strokeLinecap="round" />
        {/* Thick right diagonal painted stroke */}
        <path d="M 524 4 L 564 8 L 638 140 L 600 144 Z" fill="#ffffff" />
        <path d="M 544 6 L 618 142" stroke="#ffffff" strokeWidth="12" strokeLinecap="round" />
        {/* Apex bristle & solid joint cap */}
        <path d="M 508 18 L 584 18 L 546 2 Z" fill="#ffffff" />
        {/* Massive extended tribal crossbar cutting completely through A */}
        <path d="M 428 72 L 638 72 L 638 95 L 428 95 Z" fill="#ffb21a" />
        {/* Whiskers at crossbar ends */}
        <path
          d="M 416 83 L 434 83"
          stroke="#ffb21a"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path
          d="M 632 83 L 640 83"
          stroke="#ffb21a"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}

/**
 * Authentic bold paintbrush underline stroke in Hot Amber #FFB21A / Solar Yellow #FFD84D.
 */
function PaintbrushUnderline({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 280 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <filter id="brush-underline-filter" x="-10%" y="-20%" width="120%" height="140%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.05 0.1"
            numOctaves="2"
            result="noise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="2.6"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>

      <g filter="url(#brush-underline-filter)">
        {/* Muscular broad flat-brush painted stroke */}
        <path
          d="M 4 10 C 40 5 95 6 150 5.5 C 205 5 250 6 276 4.5 C 262 13 220 16 165 16.5 C 110 17 55 15 18 17 C 8 17 2 14 4 10 Z"
          fill="#ffb21a"
        />
        {/* Secondary thick body pass */}
        <path
          d="M 12 10 L 268 8"
          stroke="#ffb21a"
          strokeWidth="5"
          strokeLinecap="round"
        />
        {/* Dry-brush bristle whiskers & flick at ends in Solar Yellow #FFD84D */}
        <path
          d="M 2 10 L 26 10 M 256 6 L 278 5 M 205 14 L 255 12"
          stroke="#ffd84d"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}

export function OrraTitleScreen({
  phase = "forming terrain",
  isReady,
  onEnter,
  hasEntered,
}: OrraTitleScreenProps) {
  // Keyboard listener: Enter / Space triggers entry
  useEffect(() => {
    if (!isReady || hasEntered) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onEnter();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isReady, hasEntered, onEnter]);

  return (
    <div
      className={`fixed inset-0 z-30 flex flex-col items-center justify-center px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] select-none pointer-events-none transition-all duration-1000 ease-out overflow-hidden ${
        hasEntered
          ? "opacity-0 pointer-events-none bg-transparent"
          : isReady
            ? "bg-transparent opacity-100"
            : "bg-black opacity-100"
      }`}
      role="region"
      aria-label="ORRA Title Screen"
    >
      {/* Centered Identity & Entry Trigger — bold, thick, unboxed, confident, fully responsive across mobile, laptops & 4K */}
      <div
        className={`w-full max-w-[min(94vw,620px)] flex flex-col items-center justify-center text-center transition-transform duration-1000 ease-out ${
          hasEntered ? "scale-95 translate-y-4" : "scale-100 translate-y-0"
        }`}
      >
        <h1 className="sr-only">ORRA</h1>

        {/* Paintbrush Tribal Title — Bold & Thick */}
        <div className="w-full flex items-center justify-center drop-shadow-[0_16px_48px_rgba(0,0,0,0.95)]">
          <OrraPaintbrushLogo className="w-full h-auto max-h-[clamp(85px,20vh,155px)] object-contain" />
        </div>

        {/* Minimal Subtitle with Solid Hot Amber Hairlines */}
        <div className="mt-[clamp(0.5rem,1.8vh,1.25rem)] flex items-center justify-center gap-3">
          <span className="h-[2px] w-6 sm:w-12 bg-[#ffb21a]" />
          <span className="text-[clamp(11px,1.25vw,13px)] font-black tracking-[0.44em] uppercase text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
            A Living World
          </span>
          <span className="h-[2px] w-6 sm:w-12 bg-[#ffb21a]" />
        </div>

        {/* Centered Action Button — Pure Text with Thick Paintbrush Underline in Hot Amber/Solar Yellow */}
        <div className="mt-[clamp(1.25rem,3.5vh,2.5rem)] min-h-[64px] flex flex-col items-center justify-center">
          {isReady ? (
            <div className="pointer-events-auto transition-opacity duration-500 ease-out opacity-100">
              <button
                type="button"
                onClick={onEnter}
                className="group relative inline-flex flex-col items-center justify-center py-2 px-4 cursor-pointer bg-transparent border-0 outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 focus-visible:ring-0 transition-all duration-300"
              >
                {/* Bold thick text: solar yellow #FFD84D hovering to pure white */}
                <div className="inline-flex items-center gap-3 text-[clamp(15px,1.5vw,20px)] font-heading font-black tracking-[0.34em] text-[#ffd84d] group-hover:text-white transition-colors duration-300 drop-shadow-[0_3px_16px_rgba(0,0,0,0.95)]">
                  <span>ENTER ORRA</span>
                  <span
                    aria-hidden
                    className="text-sm font-black transition-transform duration-300 group-hover:translate-x-1.5 text-[#ffb21a] group-hover:text-white"
                  >
                    &rarr;
                  </span>
                </div>

                {/* Thick Paintbrush Underline Stroke in Hot Amber #FFB21A & Solar Yellow #FFD84D */}
                <div className="w-full max-w-[220px] sm:max-w-[260px] mt-1.5 overflow-visible">
                  <PaintbrushUnderline className="w-full h-auto drop-shadow-[0_3px_10px_rgba(255,178,26,0.4)] transition-transform duration-300 group-hover:scale-x-105" />
                </div>
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center font-sans text-[12px] font-medium text-neutral-400">
              <span className="capitalize tracking-wider">{phase || "forming terrain"}...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
