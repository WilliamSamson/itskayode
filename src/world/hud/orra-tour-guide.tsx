"use client";

/**
 * ORRA Tour Guide & Onboarding Walkthrough
 * ========================================
 * Lightweight, non-intrusive interactive tour guide for first-time visitors.
 * Features reactive step-advancement, quick facility teleportation, and
 * full anonymous telemetry tracking without impacting frame rates.
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  X,
  Compass,
  Building2,
  Cpu,
  CloudSun,
  ChevronRight,
  Rotate3d,
  Sun,
  Moon,
  Zap,
  Check,
} from "lucide-react";
import type { CameraPerspective, NavigationTool } from "../navigation/world-navigation";
import type { StudioObjectId } from "../studio/stations";
import type { WeatherPresetName } from "../weather/weather-world-state";
import { logWorldEvent } from "../../lib/telemetry";

export const TOUR_STATUS_KEY = "orra_tour_status_v1";
export const TOUR_LEGACY_KEY = "orra_tour_seen";

export type TourStatus = "unviewed" | "dismissed" | "completed";

export interface TourStateRecord {
  status: TourStatus;
  step: number;
  completedAt?: number;
  dismissedAt?: number;
  updatedAt: number;
}

export function getTourState(): TourStateRecord {
  if (typeof window === "undefined") {
    return { status: "unviewed", step: 0, updatedAt: 0 };
  }
  try {
    const raw = window.localStorage?.getItem(TOUR_STATUS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as TourStateRecord;
      if (parsed && (parsed.status === "completed" || parsed.status === "dismissed" || parsed.status === "unviewed")) {
        return parsed;
      }
    }
    // Backward compatibility: if old boolean key was set
    const oldSeen = window.localStorage?.getItem(TOUR_LEGACY_KEY);
    if (oldSeen === "true") {
      return { status: "completed", step: 4, updatedAt: Date.now() };
    }
  } catch {}
  return { status: "unviewed", step: 0, updatedAt: 0 };
}

export function saveTourState(record: TourStateRecord) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage?.setItem(TOUR_STATUS_KEY, JSON.stringify(record));
    if (record.status === "completed") {
      window.localStorage?.setItem(TOUR_LEGACY_KEY, "true");
    }
    window.dispatchEvent(new CustomEvent("orra_tour_status_change", { detail: record }));
  } catch {}
}

interface OrraTourGuideProps {
  hasEntered: boolean;
  activePerspective: CameraPerspective;
  focusedStation: StudioObjectId | null;
  activeTool: NavigationTool;
  worldTheme: "dark" | "light";
  weatherPreset: WeatherPresetName;
  onFocusStation: (id: StudioObjectId) => void;
  onSelectTool: (tool: NavigationTool) => void;
  onToggleWorldTheme?: () => void;
  onCycleWeather?: () => void;
  isOpenExternal?: boolean;
  onCloseExternal?: () => void;
}

export function OrraTourGuide({
  hasEntered,
  focusedStation,
  activeTool,
  worldTheme,
  weatherPreset: _weatherPreset,
  onFocusStation,
  onSelectTool,
  onToggleWorldTheme,
  onCycleWeather,
  isOpenExternal = false,
  onCloseExternal,
}: OrraTourGuideProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState<0 | 1 | 2 | 3 | 4>(0);
  const stepStartTimeRef = useRef<number>(Date.now());
  const tourStartTimeRef = useRef<number>(Date.now());

  // Listen for external trigger to start/restart tour (e.g. from About drawer)
  useEffect(() => {
    if (isOpenExternal) {
      setIsVisible(true);
      setCurrentStep(1);
      stepStartTimeRef.current = Date.now();
      tourStartTimeRef.current = Date.now();
      logWorldEvent("orra_tour_started", { source: "about_drawer" });
    }
  }, [isOpenExternal]);

  // Check if first-time visitor on initial entry (only prompt if unviewed)
  useEffect(() => {
    if (!hasEntered) return;
    try {
      const state = getTourState();
      if (state.status === "unviewed") {
        // Show gentle invitation after 1.8s
        const timer = setTimeout(() => {
          setIsVisible(true);
          setCurrentStep(0);
          stepStartTimeRef.current = Date.now();
          tourStartTimeRef.current = Date.now();
          logWorldEvent("orra_tour_prompt_shown");
        }, 1800);
        return () => clearTimeout(timer);
      }
    } catch {}
  }, [hasEntered]);

  // Listen for global custom event to trigger or replay tour
  useEffect(() => {
    const handleGlobalTrigger = () => {
      setIsVisible(true);
      setCurrentStep(1);
      stepStartTimeRef.current = Date.now();
      tourStartTimeRef.current = Date.now();
      logWorldEvent("orra_tour_started", { source: "custom_event" });
    };
    window.addEventListener("orra_start_tour", handleGlobalTrigger);
    return () => window.removeEventListener("orra_start_tour", handleGlobalTrigger);
  }, []);

  const completeTour = useCallback(() => {
    const totalDurationSec = Math.round((Date.now() - tourStartTimeRef.current) / 1000);
    saveTourState({
      status: "completed",
      step: 4,
      completedAt: Date.now(),
      updatedAt: Date.now(),
    });
    setIsVisible(false);
    onCloseExternal?.();
    logWorldEvent("orra_tour_finished", { totalDurationSec });
  }, [onCloseExternal]);

  const dismissTour = useCallback((reason: "explore_freely" | "skipped") => {
    const timeSpentSec = Math.round((Date.now() - stepStartTimeRef.current) / 1000);
    saveTourState({
      status: "dismissed",
      step: currentStep,
      dismissedAt: Date.now(),
      updatedAt: Date.now(),
    });
    setIsVisible(false);
    onCloseExternal?.();
    logWorldEvent("orra_tour_dismissed", { reason, step: currentStep, timeSpentSec });
  }, [currentStep, onCloseExternal]);

  const advanceStep = useCallback((targetStep: 1 | 2 | 3 | 4) => {
    const timeSpentSec = Math.round((Date.now() - stepStartTimeRef.current) / 1000);
    logWorldEvent("orra_tour_step_complete", {
      step: currentStep,
      timeSpentSec,
      nextStep: targetStep,
    });
    setCurrentStep(targetStep);
    stepStartTimeRef.current = Date.now();
  }, [currentStep]);

  // Auto-advance Step 1 when user switches to Orbit tool
  useEffect(() => {
    if (isVisible && currentStep === 1 && activeTool === "orbit") {
      const timer = setTimeout(() => {
        advanceStep(2);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [isVisible, currentStep, activeTool, advanceStep]);

  // Auto-advance Step 2 when user focuses any station
  useEffect(() => {
    if (isVisible && currentStep === 2 && focusedStation !== null) {
      const timer = setTimeout(() => {
        advanceStep(3);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, currentStep, focusedStation, advanceStep]);

  if (!hasEntered || !isVisible) return null;

  return (
    <aside
      role="region"
      aria-label="ORRA Interactive Guide"
      className="fixed bottom-[max(7.25rem,calc(env(safe-area-inset-bottom)+6.75rem))] sm:bottom-28 left-1/2 -translate-x-1/2 z-40 w-[min(92vw,420px)] pointer-events-auto select-none transition-all duration-300"
    >
      <div className="rounded-xl border border-white/10 bg-black/95 p-3.5 sm:p-4 text-white shadow-2xl backdrop-blur-md">
        {/* Step Progress Hairline (for active tour steps 1–4) */}
        {currentStep > 0 && (
          <div className="mb-3 flex items-center gap-1.5" aria-label={`Step ${currentStep} of 4`}>
            {[1, 2, 3, 4].map((stepIdx) => (
              <div
                key={stepIdx}
                className={`h-0.5 flex-1 rounded-full transition-all duration-300 ${
                  stepIdx < currentStep
                    ? "bg-white"
                    : stepIdx === currentStep
                      ? "bg-[#ffb21a]"
                      : "bg-white/15"
                }`}
              />
            ))}
          </div>
        )}

        {/* Step 0: Welcome Prompt */}
        {currentStep === 0 && (
          <div>
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="font-sans text-[11px] font-medium tracking-wide text-[#ffb21a]">
                  First-Time Visitor
                </span>
                <h3 className="font-heading text-[15px] sm:text-[16px] font-semibold text-white tracking-tight mt-0.5">
                  Welcome to ORRA
                </h3>
              </div>
              <button
                type="button"
                onClick={() => dismissTour("skipped")}
                aria-label="Dismiss tour prompt"
                className="flex items-center justify-center w-7 h-7 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="mt-1.5 font-sans text-[12.5px] leading-relaxed text-neutral-300">
              An interactive 1 km² living world and architectural campus suspended in cosmic space. Would you like a 60-second guided tour?
            </p>
            <div className="mt-3.5 flex items-center justify-between gap-2.5">
              <button
                type="button"
                onClick={() => {
                  advanceStep(1);
                  logWorldEvent("orra_tour_started", { source: "initial_prompt" });
                }}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md bg-white text-black font-sans text-[12px] font-semibold hover:bg-neutral-200 transition-all active:scale-95"
              >
                <span>Take 60s Tour</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => dismissTour("explore_freely")}
                className="px-3 py-2 rounded-md font-sans text-[12px] font-medium text-neutral-400 hover:text-white transition-colors"
              >
                Explore freely
              </button>
            </div>
          </div>
        )}

        {/* Step 1: Navigation & Orbit */}
        {currentStep === 1 && (
          <div>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-[#ffb21a]" />
                <span className="font-sans text-[11px] font-medium text-neutral-400">
                  Step 1 of 4 • Navigation
                </span>
              </div>
              <button
                type="button"
                onClick={() => dismissTour("skipped")}
                aria-label="Skip tour"
                className="flex items-center justify-center w-6 h-6 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <h3 className="font-heading text-[14.5px] sm:text-[15px] font-semibold text-white tracking-tight mt-1">
              Explore the Island
            </h3>
            <p className="mt-1 font-sans text-[12px] leading-relaxed text-neutral-300">
              Drag anywhere to pan across the landscape. Hold right-click, shift-key, or use 2 fingers to rotate in 3D.
            </p>
            <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => onSelectTool(activeTool === "orbit" ? "pan" : "orbit")}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-neutral-800 bg-neutral-900 font-sans text-[11.5px] font-medium text-neutral-300 hover:text-white hover:border-neutral-700 transition-all active:scale-95"
              >
                <Rotate3d className="w-3.5 h-3.5 text-[#ffb21a]" />
                <span>{activeTool === "orbit" ? "Orbiting Active" : "Toggle 3D Orbit"}</span>
              </button>
              <button
                type="button"
                onClick={() => advanceStep(2)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-white text-black font-sans text-[11.5px] font-semibold hover:bg-neutral-200 transition-all active:scale-95"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Station Inspection */}
        {currentStep === 2 && (
          <div>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#ffb21a]" />
                <span className="font-sans text-[11px] font-medium text-neutral-400">
                  Step 2 of 4 • Stations
                </span>
              </div>
              <button
                type="button"
                onClick={() => dismissTour("skipped")}
                aria-label="Skip tour"
                className="flex items-center justify-center w-6 h-6 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <h3 className="font-heading text-[14.5px] sm:text-[15px] font-semibold text-white tracking-tight mt-1">
              Inspect Facilities Up Close
            </h3>
            <p className="mt-1 font-sans text-[12px] leading-relaxed text-neutral-300">
              The island houses operational facilities. Tap any building directly or jump using the fast travel links below:
            </p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => {
                  onFocusStation("advanced-tech-lab");
                  advanceStep(3);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-neutral-800 bg-neutral-900 font-sans text-[11px] font-medium text-neutral-300 hover:text-white hover:border-neutral-700 transition-all active:scale-95"
              >
                <Cpu className="w-3 h-3 text-[#ffb21a]" />
                <span>Tech Lab</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onFocusStation("power-grid");
                  advanceStep(3);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-neutral-800 bg-neutral-900 font-sans text-[11px] font-medium text-neutral-300 hover:text-white hover:border-neutral-700 transition-all active:scale-95"
              >
                <Zap className="w-3 h-3 text-[#ffd84d]" />
                <span>Power Grid</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onFocusStation("command-desk");
                  advanceStep(3);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-neutral-800 bg-neutral-900 font-sans text-[11px] font-medium text-neutral-300 hover:text-white hover:border-neutral-700 transition-all active:scale-95"
              >
                <Building2 className="w-3 h-3 text-neutral-400" />
                <span>West Pavilion</span>
              </button>
            </div>
            <div className="mt-3 flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => advanceStep(3)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-white text-black font-sans text-[11.5px] font-semibold hover:bg-neutral-200 transition-all active:scale-95"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Hardware Interactivity */}
        {currentStep === 3 && (
          <div>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-[#ffb21a]" />
                <span className="font-sans text-[11px] font-medium text-neutral-400">
                  Step 3 of 4 • Systems
                </span>
              </div>
              <button
                type="button"
                onClick={() => dismissTour("skipped")}
                aria-label="Skip tour"
                className="flex items-center justify-center w-6 h-6 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <h3 className="font-heading text-[14.5px] sm:text-[15px] font-semibold text-white tracking-tight mt-1">
              Live Hardware Controls
            </h3>
            <p className="mt-1 font-sans text-[12px] leading-relaxed text-neutral-300">
              Each facility features interactive engineering controls. When focused on a station, look at the top control bar to toggle room lights, tune grid power, or inspect the cryogenic core.
            </p>
            <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-white/10">
              <span className="font-sans text-[11px] text-neutral-400">
                Tip: Press <kbd className="px-1 py-0.5 bg-neutral-900 border border-neutral-700 rounded text-neutral-200">Esc</kbd> to exit any room
              </span>
              <button
                type="button"
                onClick={() => advanceStep(4)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-white text-black font-sans text-[11.5px] font-semibold hover:bg-neutral-200 transition-all active:scale-95"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Atmospheric Continuum */}
        {currentStep === 4 && (
          <div>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <CloudSun className="w-4 h-4 text-[#ffb21a]" />
                <span className="font-sans text-[11px] font-medium text-neutral-400">
                  Step 4 of 4 • Atmosphere
                </span>
              </div>
              <button
                type="button"
                onClick={completeTour}
                aria-label="Finish tour"
                className="flex items-center justify-center w-6 h-6 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <h3 className="font-heading text-[14.5px] sm:text-[15px] font-semibold text-white tracking-tight mt-1">
              Weather and time
            </h3>
            <p className="mt-1 font-sans text-[12px] leading-relaxed text-neutral-300">
              Change the sky with <kbd className="px-1 py-0.5 bg-neutral-900 border border-neutral-700 rounded text-neutral-200">W</kbd>. Tap the island at the top to pause time or speed it up.
            </p>
            <div className="mt-2.5 flex items-center gap-2">
              {onToggleWorldTheme && (
                <button
                  type="button"
                  onClick={onToggleWorldTheme}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-neutral-800 bg-neutral-900 font-sans text-[11.5px] font-medium text-neutral-300 hover:text-white hover:border-neutral-700 transition-all active:scale-95"
                >
                  {worldTheme === "light" ? <Moon className="w-3.5 h-3.5 text-neutral-400" /> : <Sun className="w-3.5 h-3.5 text-amber-300" />}
                  <span>{worldTheme === "light" ? "Switch to Space" : "Switch to Daylight"}</span>
                </button>
              )}
              {onCycleWeather && (
                <button
                  type="button"
                  onClick={onCycleWeather}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-neutral-800 bg-neutral-900 font-sans text-[11.5px] font-medium text-neutral-300 hover:text-white hover:border-neutral-700 transition-all active:scale-95"
                >
                  <CloudSun className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Cycle Weather</span>
                </button>
              )}
            </div>
            <div className="mt-3 flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={completeTour}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#ffb21a] text-black font-sans text-[12px] font-semibold hover:bg-amber-400 transition-all active:scale-95"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Complete Tour</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
