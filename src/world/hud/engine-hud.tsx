"use client";

/**
 * ORRA — A Living World
 * =====================
 * Copyright (c) 2026 Kayode. All rights reserved.
 *
 * Floating Instrument HUD & Environmental Control Interfaces
 */

import React, { useState, useEffect } from "react";
import {
  Hand,
  Rotate3d,
  ZoomOut,
  Sliders,
  ArrowLeft,
  CloudSun,
  CloudRain,
  CloudFog,
  CloudSnow,
  Wind,
  Info,
  Compass,
  Building2,
  Play,
  Pause,
  ZoomIn,
  Satellite,
  BookOpen,
  Flower2,
  Lightbulb,
  LightbulbOff,
  Cpu,
  Zap,
} from "lucide-react";
import type { RenderStats } from "../engine/scene";
import type { StudioLightId } from "../studio/studio-world";
import {
  NavigationTool,
  ZoomRange,
  CameraPerspective,
  PERSPECTIVE_CONFIGS,
} from "../navigation/world-navigation";
import { WeatherPresetName, WeatherWorldState } from "../weather/weather-world-state";
import { RainPhase, LivingRainTelemetry } from "../weather/living-rain-types";
import type { WorldTime } from "../life/world-clock";
import { getTourState, type TourStatus } from "./orra-tour-guide";

const PRESET_TABS: { id: WeatherPresetName; label: string }[] = [
  { id: "clear", label: "Fair" },
  { id: "rain", label: "Rain & Storm" },
  { id: "snow", label: "Frost & Snow" },
  { id: "fog", label: "Valley Fog" },
  { id: "sandstorm", label: "Sandstorm" },
];


export function formatWorldClockTime12h(dayFraction: number): { time: string; period: string } {
  const norm = (((dayFraction % 1) + 1) % 1);
  const totalMinutes = Math.floor(norm * 24 * 60);
  const hours24 = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const isPM = hours24 >= 12;
  const hours12 = hours24 % 12 || 12;
  const period = isPM ? "PM" : "AM";
  const time = `${hours12}:${mins.toString().padStart(2, "0")}`;
  return { time, period };
}

interface EngineHudProps {
  /** Polled only while the engine drawer is open. */
  getStats: () => RenderStats | null;
  currentRange: ZoomRange;
  activeTool: NavigationTool;
  activePerspective?: CameraPerspective;
  onSelectPerspective?: (perspective: CameraPerspective) => void;
  onCyclePerspective?: () => void;
  weatherState: WeatherWorldState | null;
  weatherPreset: WeatherPresetName;
  transitionProgress: number;
  isClimateAuto?: boolean;
  onToggleClimateAuto?: (enabled?: boolean) => void;
  rainTelemetry?: LivingRainTelemetry | null;
  worldTime?: WorldTime | null;
  onTogglePauseTime?: () => void;
  onCycleTimeScale?: () => void;
  onSkipDays?: (days: number) => void;
  onSyncToLiveTime?: () => void;
  onScrubWorldTime?: (fraction: number) => void;
  timeScale?: number;
  onSelectRainPhase?: (phase: RainPhase) => void;
  onSetRainProgress?: (progress: number) => void;
  onSelectWeatherPreset: (preset: WeatherPresetName) => void;
  onCycleWeather: () => void;
  onSelectTool: (tool: NavigationTool) => void;
  onStepZoom: (direction: "in" | "out") => void;
  onReturnToEntry: () => void;
  isImmersive: boolean;
  onToggleImmersive: () => void;
  focusedStation?: import("../studio/stations").StudioObjectId | null;
  onDefocus?: () => void;
  roomLights?: Record<string, boolean>;
  onToggleRoomLight?: (id: StudioLightId) => void;
}

export function EngineHud({
  getStats,
  currentRange,
  activeTool,
  activePerspective = "oblique",
  onSelectPerspective,
  onCyclePerspective,
  focusedStation,
  onDefocus,
  roomLights,
  onToggleRoomLight,
  weatherState,
  weatherPreset,
  transitionProgress: _transitionProgress,
  isClimateAuto = true,
  onToggleClimateAuto,
  rainTelemetry,
  worldTime,
  onTogglePauseTime,
  onCycleTimeScale,
  onSkipDays,
  onSyncToLiveTime,
  onScrubWorldTime,
  timeScale = 1,
  onSelectRainPhase: _onSelectRainPhase,
  onSetRainProgress: _onSetRainProgress,
  onSelectWeatherPreset,
  onCycleWeather: _onCycleWeather,
  onSelectTool,
  onStepZoom,
  onReturnToEntry,
  isImmersive,
  onToggleImmersive,
}: EngineHudProps) {
  const [activeDrawer, setActiveDrawer] = useState<"none" | "views" | "weather" | "engine" | "about">("none");
  const [tourStatus, setTourStatus] = useState<TourStatus>("unviewed");
  const [stats, setStats] = useState<RenderStats | null>(null);

  useEffect(() => {
    if (activeDrawer !== "engine") return;
    const poll = () => setStats(getStats());
    poll();
    const id = window.setInterval(poll, 350);
    return () => window.clearInterval(id);
  }, [activeDrawer, getStats]);

  useEffect(() => {
    setTourStatus(getTourState().status);
    const handleTourChange = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.status) {
        setTourStatus(detail.status);
      } else {
        setTourStatus(getTourState().status);
      }
    };
    window.addEventListener("orra_tour_status_change", handleTourChange);
    return () => window.removeEventListener("orra_tour_status_change", handleTourChange);
  }, []);

  // The weather preset is the single authority on precipitation (see scene.ts).
  // The HUD must read from that same authority, or it will narrate a storm the
  // world is not rendering.
  const isRaining = (weatherState?.precipitation ?? 0) > 0.05;

  // Keyboard shortcuts:
  // V or v : toggles Perspectives HUD drawer
  // ~ or ` : toggles Engine telemetry drawer
  // W or w : toggles Weather atmosphere drawer
  // I or i : toggles About ORRA drawer
  // L or l : toggles World atmosphere theme (Daylight vs Cosmic Dark)
  // P or p : cycles camera perspectives
  // E or e : focuses the Executive Office
  // B or b : focuses the Boardroom
  // H or h : overhead map
  // O or o : focuses 3/4 Oblique Overview
  // Escape : closes open drawers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "v" || e.key === "V") {
        e.preventDefault();
        setActiveDrawer((prev) => (prev === "views" ? "none" : "views"));
      } else if (e.key === "~" || e.key === "`") {
        e.preventDefault();
        setActiveDrawer((prev) => (prev === "engine" ? "none" : "engine"));
      } else if (e.key === "w" || e.key === "W") {
        e.preventDefault();
        setActiveDrawer((prev) => (prev === "weather" ? "none" : "weather"));
      } else if (e.key === "i" || e.key === "I") {
        e.preventDefault();
        setActiveDrawer((prev) => (prev === "about" ? "none" : "about"));
      } else if (e.key === "p" || e.key === "P") {
        e.preventDefault();
        onCyclePerspective?.();
      } else if (e.key === "e" || e.key === "E") {
        e.preventDefault();
        onSelectPerspective?.("office");
      } else if (e.key === "b" || e.key === "B" || e.key === "f" || e.key === "F") {
        e.preventDefault();
        if (activePerspective === "boardroom" || focusedStation === "boardroom") {
          if (onDefocus) onDefocus();
          else onSelectPerspective?.("oblique");
        } else {
          onSelectPerspective?.("boardroom");
        }
      } else if (e.key === "g" || e.key === "G") {
        e.preventDefault();
        if (activePerspective === "solarium" || focusedStation === "talent-desk") {
          if (onDefocus) onDefocus();
          else onSelectPerspective?.("oblique");
        } else {
          onSelectPerspective?.("solarium");
        }
      } else if (e.key === "t" || e.key === "T") {
        e.preventDefault();
        if (activePerspective === "tech-lab" || focusedStation === "advanced-tech-lab") {
          if (onDefocus) onDefocus();
          else onSelectPerspective?.("oblique");
        } else {
          onSelectPerspective?.("tech-lab");
        }
      } else if (e.key === "k" || e.key === "K") {
        e.preventDefault();
        if (activePerspective === "power-grid" || focusedStation === "power-grid") {
          if (onDefocus) onDefocus();
          else onSelectPerspective?.("oblique");
        } else {
          onSelectPerspective?.("power-grid");
        }
      } else if (e.key === "h" || e.key === "H") {
        e.preventDefault();
        onSelectPerspective?.("overhead");
      } else if (e.key === "o" || e.key === "O") {
        e.preventDefault();
        onSelectPerspective?.("oblique");
      } else if (e.key === "s" || e.key === "S") {
        e.preventDefault();
        onSelectPerspective?.("satellite");
      } else if (e.key === "+" || e.key === "=") {
        onStepZoom("in");
      } else if (e.key === "-" || e.key === "_") {
        onStepZoom("out");
      } else if (e.key === "Escape") {
        if (
          activePerspective === "boardroom" ||
          focusedStation === "boardroom" ||
          activePerspective === "solarium" ||
          focusedStation === "talent-desk" ||
          activePerspective === "tech-lab" ||
          focusedStation === "advanced-tech-lab" ||
          activePerspective === "power-grid" ||
          focusedStation === "power-grid"
        ) {
          if (onDefocus) onDefocus();
          else onSelectPerspective?.("oblique");
        }
        setActiveDrawer("none");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onStepZoom, onCyclePerspective, onSelectPerspective, activePerspective, focusedStation, onDefocus]);

  // Auto-close open HUD drawers when clicking or tapping outside on the 3D world canvas
  useEffect(() => {
    if (activeDrawer === "none") return;
    const handleOutsidePointer = (e: PointerEvent | MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest("[data-engine-hud]")) {
        setActiveDrawer("none");
      }
    };
    window.addEventListener("pointerdown", handleOutsidePointer, { capture: true });
    window.addEventListener("touchstart", handleOutsidePointer, { capture: true });
    return () => {
      window.removeEventListener("pointerdown", handleOutsidePointer, { capture: true });
      window.removeEventListener("touchstart", handleOutsidePointer, { capture: true });
    };
  }, [activeDrawer]);

  const stopEvent = (e: React.SyntheticEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      data-engine-hud="true"
      onTouchStart={stopEvent}
      onTouchMove={stopEvent}
      onTouchEnd={stopEvent}
      onPointerDown={stopEvent}
      onPointerMove={stopEvent}
      onPointerUp={stopEvent}
      className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] sm:bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-50 flex flex-col items-center select-none pointer-events-auto max-w-[calc(100vw-1rem)]"
    >
      {/* ============================================================ */}
      {/* 0. PERSPECTIVES DRAWER (SOLID OLED BLACK, ZERO CARDS)        */}
      {/* ============================================================ */}
      {activeDrawer === "views" && (
        <div
          role="region"
          aria-label="ORRA Camera Perspectives"
          className="w-[calc(100vw-2rem)] sm:w-[350px] md:w-[360px] mb-2 sm:mb-2.5 rounded-xl border border-neutral-800 bg-black p-3 sm:p-3.5 text-white shadow-2xl space-y-2"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
            <div className="flex items-center gap-2">
              <span className="font-sans font-semibold text-[13px] text-white">Perspectives</span>
            </div>
            <span className="text-[11px] font-sans font-semibold text-white">
              {PERSPECTIVE_CONFIGS[activePerspective].label}
            </span>
          </div>

          {/* Perspective options */}
          <div className="grid grid-cols-1 gap-1 pt-0.5">
            {[
              {
                id: "oblique" as const,
                label: "3/4 Oblique",
                desc: "The whole studio island floating in space",
                shortcut: "O",
                icon: Compass,
              },
              {
                id: "office" as const,
                label: "The West Pavilion",
                desc: "Panoramic minimalist lounge, marble hearth & space vista",
                shortcut: "E",
                icon: Building2,
                lightCircuit: "command-desk" as const,
              },
              {
                id: "boardroom" as const,
                label: "The Study",
                desc: "Private library, research desk & garden terrace",
                shortcut: "F",
                icon: BookOpen,
                lightCircuit: "boardroom" as const,
              },
              {
                id: "solarium" as const,
                label: "Southern Solarium",
                desc: "Indoor flora terrace, water basin & cosmic space panorama",
                shortcut: "G",
                icon: Flower2,
                lightCircuit: "talent-desk" as const,
              },
              {
                id: "tech-lab" as const,
                label: "Advanced Tech Lab",
                desc: "Cryogenic quantum power core & advanced engineering",
                shortcut: "T",
                icon: Cpu,
                lightCircuit: "advanced-tech-lab" as const,
              },
              {
                id: "power-grid" as const,
                label: "100 kW Power Grid",
                desc: "Substation, turbogenerators, induction coils & electric arc",
                shortcut: "K",
                icon: Zap,
              },
              {
                id: "satellite" as const,
                label: "Orbital Fleet",
                desc: "Relay probes and deep-space observatory in orbit",
                shortcut: "S",
                icon: Satellite,
              },
              {
                id: "overhead" as const,
                label: "Overhead Map",
                desc: "Top-down floor plan of the island",
                shortcut: "H",
                icon: ZoomIn,
              },
            ].map((view) => {
              const Icon = view.icon;
              const isSelected = activePerspective === view.id;
              const hasLight = Boolean(view.lightCircuit);
              const isLightOn = view.lightCircuit ? (roomLights?.[view.lightCircuit] ?? true) : false;

              return (
                <div
                  key={view.id}
                  className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg transition-all ${
                    isSelected
                      ? "bg-neutral-900 text-white border border-neutral-600"
                      : "text-neutral-300 hover:text-white hover:bg-neutral-900 border border-transparent"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      onSelectPerspective?.(view.id);
                    }}
                    className="flex items-center gap-2.5 min-w-0 flex-1 text-left focus:outline-none"
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isSelected ? "text-white" : "text-neutral-400"}`} />
                    <div className="min-w-0">
                      <div className={`text-[12px] font-sans font-medium leading-snug truncate ${isSelected ? "text-white font-semibold" : "text-neutral-200"}`}>
                        {view.label}
                      </div>
                      <div className="text-[10.5px] font-sans text-neutral-500 truncate">
                        {view.desc}
                      </div>
                    </div>
                  </button>

                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {hasLight && view.lightCircuit && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleRoomLight?.(view.lightCircuit);
                        }}
                        className={`p-1 rounded transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white ${
                          isLightOn
                            ? "text-amber-300 hover:text-amber-200 hover:bg-neutral-800"
                            : "text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800"
                        }`}
                        title={`Toggle ${view.label} lighting (${isLightOn ? "On" : "Off"})`}
                        aria-label={`Toggle ${view.label} lighting`}
                      >
                        {isLightOn ? (
                          <Lightbulb className="w-3.5 h-3.5" />
                        ) : (
                          <LightbulbOff className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                    <kbd className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-neutral-900 text-neutral-400 border border-neutral-800">
                      {view.shortcut}
                    </kbd>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 1. WEATHER ATMOSPHERE DRAWER (SOLID OLED BLACK, ZERO CARDS)  */}
      {/* ============================================================ */}
      {activeDrawer === "weather" && (
        <div
          role="region"
          aria-label="ORRA Atmosphere Controller"
          className="w-[calc(100vw-2rem)] sm:w-[350px] md:w-[360px] mb-2 sm:mb-2.5 rounded-xl border border-neutral-800 bg-black p-3 sm:p-3.5 text-white shadow-2xl space-y-2.5"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
            <div className="flex items-center gap-2">
              <span className="font-sans font-semibold text-[13px] text-white">Atmosphere</span>
              <span className="text-[11px] font-sans text-neutral-500">
                {isClimateAuto ? "Season-Driven" : "Manual Override"}
              </span>
            </div>
            {onToggleClimateAuto && (
              <button
                type="button"
                onClick={() => onToggleClimateAuto(!isClimateAuto)}
                className={`px-2 py-0.5 rounded text-[11px] font-sans transition-colors ${
                  isClimateAuto
                    ? "bg-neutral-900 text-neutral-200 hover:bg-neutral-800 border border-neutral-600"
                    : "bg-neutral-900 text-neutral-400 hover:text-white hover:bg-neutral-800 border border-neutral-800"
                }`}
                title={
                  isClimateAuto
                    ? "Auto seasonal climate is active. Click to switch to manual override."
                    : "Manual override active. Click to restore automatic seasonal climate."
                }
              >
                {isClimateAuto ? "Auto Climate" : "Manual Mode"}
              </button>
            )}
          </div>

          {/* Flat inline tabs for the 5 primary atmospheric presets */}
          <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar py-0.5 text-[11.5px] font-sans">
            {PRESET_TABS.map((p) => {
              const active = weatherPreset === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onSelectWeatherPreset(p.id)}
                  className={`shrink-0 transition-colors font-medium pb-0.5 whitespace-nowrap ${
                    active
                      ? "text-white border-b-2 border-white"
                      : "text-neutral-500 hover:text-neutral-300"
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* Interactive Time-of-Day Arc & Slider */}
          {worldTime && (
            <div className="pt-2 border-t border-neutral-800 space-y-2">
              <div className="flex items-baseline justify-between">
                <div className="flex items-baseline gap-2">
                  <span className="font-sans font-semibold text-[12px] text-white">Time of Day</span>
                  <span className="text-[11px] font-sans capitalize text-white font-semibold">
                    {worldTime.diurnalPhase} · {formatWorldClockTime12h(worldTime.dayFraction).time} {formatWorldClockTime12h(worldTime.dayFraction).period}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {worldTime.isLiveSync ? (
                    <span className="text-[10px] font-sans px-1.5 py-0.5 rounded bg-neutral-900 text-neutral-300 border border-neutral-800">
                      Live Sync
                    </span>
                  ) : (
                    onSyncToLiveTime && (
                      <button
                        type="button"
                        onClick={onSyncToLiveTime}
                        className="text-[10px] font-sans px-1.5 py-0.5 rounded bg-neutral-900 text-neutral-300 hover:text-white hover:bg-neutral-800 border border-neutral-700 transition-colors"
                        title="Sync time back to visitor live local clock"
                      >
                        Sync Live
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Time of Day Slider */}
              {onScrubWorldTime && (
                <input
                  type="range"
                  min="0"
                  max="0.999"
                  step="0.005"
                  value={worldTime.dayFraction}
                  onChange={(e) => onScrubWorldTime(parseFloat(e.target.value))}
                  aria-label="Time of Day Slider"
                  className="w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-white"
                />
              )}

              {/* Diurnal Phase Quick-Select Buttons */}
              {onScrubWorldTime && (
                <div className="flex items-center justify-between text-[10.5px] font-sans text-neutral-400 pt-0.5">
                  <button
                    type="button"
                    onClick={() => onScrubWorldTime(0.26)}
                    className={`hover:text-white transition-colors ${
                      worldTime.diurnalPhase === "dawn" ? "text-white font-semibold" : ""
                    }`}
                  >
                    Dawn
                  </button>
                  <button
                    type="button"
                    onClick={() => onScrubWorldTime(0.50)}
                    className={`hover:text-white transition-colors ${
                      worldTime.diurnalPhase === "noon" ? "text-white font-semibold" : ""
                    }`}
                  >
                    Noon
                  </button>
                  <button
                    type="button"
                    onClick={() => onScrubWorldTime(0.74)}
                    className={`hover:text-white transition-colors ${
                      worldTime.diurnalPhase === "dusk" ? "text-white font-semibold" : ""
                    }`}
                  >
                    Dusk
                  </button>
                  <button
                    type="button"
                    onClick={() => onScrubWorldTime(0.92)}
                    className={`hover:text-white transition-colors ${
                      worldTime.diurnalPhase === "night" ? "text-white font-semibold" : ""
                    }`}
                  >
                    Night
                  </button>
                </div>
              )}
            </div>
          )}

          {/* World Calendar & Time Controls */}
          {worldTime && (
            <div className="flex items-baseline justify-between gap-3 pt-2 pb-0.5 border-t border-neutral-800">
              <div className="flex items-baseline gap-2 min-w-0">
                <span className="font-sans text-[13px] text-white capitalize font-medium">
                  {worldTime.season}
                </span>
                <span className="font-mono tabular-nums text-[11px] text-neutral-400">
                  day {worldTime.day} · year {worldTime.year}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {onTogglePauseTime && (
                  <button
                    type="button"
                    onClick={onTogglePauseTime}
                    title={worldTime.paused ? "Resume simulation" : "Pause simulation"}
                    aria-label={worldTime.paused ? "Resume simulation" : "Pause simulation"}
                    className="p-1 rounded text-neutral-300 hover:text-white hover:bg-neutral-900 transition-colors"
                  >
                    {worldTime.paused ? (
                      <Play className="w-3.5 h-3.5 fill-current" />
                    ) : (
                      <Pause className="w-3.5 h-3.5 fill-current" />
                    )}
                  </button>
                )}
                {onSkipDays && (
                  <button
                    type="button"
                    onClick={() => onSkipDays(8)}
                    title="Skip forward one season"
                    className="font-sans text-[11px] text-neutral-400 hover:text-white transition-colors"
                  >
                    +1 season
                  </button>
                )}
                {onCycleTimeScale && (
                  <button
                    type="button"
                    onClick={onCycleTimeScale}
                    title="Change how fast world time runs"
                    className="font-mono tabular-nums text-[11px] text-white hover:text-neutral-300 transition-colors"
                  >
                    {timeScale}×
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Key atmospheric readings (4 glance metrics) */}
          {weatherState && (
            <div className="grid grid-cols-4 gap-x-2 text-[11px] pt-1.5 border-t border-neutral-800">
              <div>
                <span className="text-neutral-500 text-[10px] block font-sans">Visibility</span>
                <span className="font-mono tabular-nums text-white">
                  {Math.round(weatherState.visibility * 100)}%
                </span>
              </div>
              <div>
                <span className="text-neutral-500 text-[10px] block font-sans">Wind</span>
                <span className="font-mono tabular-nums text-white">
                  {Math.round(weatherState.wind * 24)} m/s
                </span>
              </div>
              <div>
                <span className="text-neutral-500 text-[10px] block font-sans">
                  {weatherPreset === "light_snow" ? "Snow" : weatherPreset === "sandstorm" ? "Sand" : "Precip"}
                </span>
                <span className="font-mono tabular-nums text-white">
                  {Math.round(weatherState.precipitation * 100)}%
                </span>
              </div>
              <div>
                <span className="text-neutral-500 text-[10px] block font-sans">Temp</span>
                <span className="font-mono tabular-nums text-white">
                  {weatherState.temperature !== undefined ? `${Math.round(weatherState.temperature)}°C` : "20°C"}
                </span>
              </div>
            </div>
          )}

          {/* Rain lifecycle is shown only while the preset actually permits rain.
              Surfacing the 9-phase cycle during clear weather advertised a storm
              that was not happening and broke the sense that the sky is one thing. */}
          {rainTelemetry && isRaining && (
            <div className="space-y-1.5 pt-2 border-t border-neutral-800">
              <div className="flex items-baseline justify-between text-[11px]">
                <span className="font-sans text-neutral-300">
                  {rainTelemetry.phase.replace(/_/g, " ")}
                </span>
                <span className="font-sans text-neutral-500 text-[10px]">
                  {Math.round(rainTelemetry.cameraLocalRain * 100)}% overhead
                </span>
              </div>
              <div className="h-1 w-full bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white transition-all duration-150"
                  style={{ width: `${Math.round(rainTelemetry.phaseProgress * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. ENGINE TELEMETRY DRAWER (SOLID OLED BLACK, ZERO CARDS)     */}
      {/* ============================================================ */}
      {activeDrawer === "engine" && (
        <div
          role="region"
          aria-label="ORRA Engine Telemetry"
          className="w-[calc(100vw-2rem)] sm:w-[350px] md:w-[360px] mb-2 sm:mb-2.5 rounded-xl border border-neutral-800 bg-black p-3 sm:p-3.5 text-white shadow-2xl space-y-2.5"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
            <div className="flex items-center gap-2">
              <span className="font-sans font-semibold text-[13px] text-white">Engine telemetry</span>
              <span className="text-[11px] font-mono tabular-nums text-white font-semibold">
                {stats?.fps ?? 60} fps
              </span>
              <span className="text-[11px] font-mono tabular-nums text-neutral-500">
                {stats?.frameTimeMs ?? 16.6} ms
              </span>
            </div>

            <button
              type="button"
              onClick={onToggleImmersive}
              className="text-[10px] font-sans font-medium text-neutral-300 hover:text-white transition-colors"
            >
              {isImmersive ? "Windowed view" : "Immersive view"}
            </button>
          </div>

          {/* Position on one line */}
          <div className="flex items-baseline justify-between text-[11px] gap-3">
            {stats ? (
              <span className="font-mono tabular-nums text-neutral-200 min-w-0 truncate">
                <span className="font-sans text-neutral-500 capitalize">{currentRange}</span>
                <span className="text-neutral-600"> · </span>
                {Math.round(stats.cameraPosition.x)}, {Math.round(stats.cameraPosition.z)}
                <span className="text-neutral-600"> · </span>
                <span className="text-white font-semibold">{Math.round(stats.cameraPosition.y)}m</span>
              </span>
            ) : (
              <span className="font-sans text-neutral-500 capitalize">{currentRange}</span>
            )}
          </div>

          {/* Diagnostics */}
          <div className="space-y-1 pt-2 border-t border-neutral-800 text-[11px] text-neutral-400">
            {stats && (
              <div className="flex items-baseline justify-between">
                <span className="font-sans text-neutral-500">Draw calls · triangles</span>
                <span className="font-mono tabular-nums text-neutral-200">
                  {stats.drawCalls.toLocaleString()} · {stats.triangles.toLocaleString()}
                </span>
              </div>
            )}
            {stats && (
              <div className="flex items-baseline justify-between">
                <span className="font-sans text-neutral-500">GPU buffers</span>
                <span className="font-mono tabular-nums text-neutral-200">
                  {stats.geometries} geometries · {stats.textures} textures
                </span>
              </div>
            )}
            {stats && (
              <div className="flex items-baseline justify-between">
                <span className="font-sans text-neutral-500">Island flora & reach</span>
                <span className="font-mono tabular-nums text-neutral-200">
                  {stats.grassClumps.toLocaleString()} grass clumps · {stats.islandReach}m
                </span>
              </div>
            )}
            {worldTime && (
              <div className="flex items-baseline justify-between">
                <span className="font-sans text-neutral-500">World ephemeris</span>
                <span className="font-mono tabular-nums text-neutral-200">
                  year {worldTime.year} (day {worldTime.day}) · solar elev {Math.round(worldTime.sunElevation * 90)}°
                </span>
              </div>
            )}
            {weatherState && (
              <div className="flex items-baseline justify-between">
                <span className="font-sans text-neutral-500">Atmosphere vector</span>
                <span className="font-mono tabular-nums text-neutral-200">
                  {Math.round(weatherState.cloudCoverage * 100)}% cloud · {Math.round(weatherState.humidity * 100)}% hum · {Math.round(weatherState.surfaceWetness * 100)}% wet
                </span>
              </div>
            )}
            <div className="flex items-baseline justify-between">
              <span className="font-sans text-neutral-500">Orbital constellation</span>
              <span className="font-mono tabular-nums text-neutral-200">
                4 craft · active telemetry uplink
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. ABOUT ORRA COMPACT INSTRUMENT SURFACE                     */}
      {/* ============================================================ */}
      {activeDrawer === "about" && (
        <div
          role="region"
          aria-label="About ORRA"
          className="w-[calc(100vw-2rem)] sm:w-[350px] mb-2 sm:mb-2.5 rounded-xl border border-neutral-800 bg-black p-3.5 sm:p-4 text-white shadow-2xl space-y-3"
        >
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-heading font-semibold text-[15px] tracking-tight text-white">
                ORRA
              </h2>
              <p className="font-sans text-[12px] leading-relaxed text-neutral-300 mt-0.5">
                A living digital world shaped by time, climate and its environment.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveDrawer("none")}
              className="p-1 -mr-1 -mt-1 text-neutral-500 hover:text-white transition-colors"
              title="Close [Esc]"
              aria-label="Close About"
            >
              <span className="text-xs font-mono">✕</span>
            </button>
          </div>

          {/* Hairline Divider & Spec Matrix */}
          <div className="border-t border-neutral-800 pt-2.5 space-y-1.5 text-[12px] font-sans">
            <div className="flex items-baseline justify-between">
              <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">
                World
              </span>
              <span className="font-sans text-neutral-200 text-[12px]">
                Floating studio island
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">
                Status
              </span>
              <span className="font-sans text-neutral-200 text-[12px] font-medium">
                In development
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">
                Version
              </span>
              <span className="font-mono tabular-nums text-neutral-300 text-[11px]">
                0.5.0
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">
                Walkthrough
              </span>
              <span className="font-sans text-[11px] font-medium flex items-center gap-1.5">
                {tourStatus === "completed" ? (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <span>Completed</span>
                    <span aria-hidden="true">✓</span>
                  </span>
                ) : tourStatus === "dismissed" ? (
                  <span className="text-neutral-400">Incomplete</span>
                ) : (
                  <span className="text-amber-400/90">Unviewed</span>
                )}
              </span>
            </div>
          </div>

          {/* Hairline Divider & Attribution */}
          <div className="border-t border-neutral-800 pt-2.5 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveDrawer("none");
                if (typeof window !== "undefined") {
                  window.dispatchEvent(new CustomEvent("orra_start_tour"));
                }
              }}
              className="w-full py-2 px-3 rounded-md bg-white text-black font-sans text-[12px] font-semibold hover:bg-neutral-200 transition-all active:scale-95 flex items-center justify-center gap-1.5 shadow-sm"
            >
              <span>{tourStatus === "completed" ? "Replay Guided Tour" : "Start Guided Tour"}</span>
              <span aria-hidden="true">&rarr;</span>
            </button>
            <div className="flex flex-col gap-2 pt-1">
              <div className="flex items-center justify-between">
                <span className="font-sans text-[12px] font-medium text-neutral-200">
                  Created and developed by Kayode Williams Olalere
                </span>
                <a
                  href="/about"
                  className="text-[11px] font-sans font-medium text-neutral-400 hover:text-white underline transition-colors"
                  title="View Kayode's portfolio profile"
                >
                  Profile ↗
                </a>
              </div>

              {/* Social Links */}
              <div className="flex items-center gap-2 pt-0.5">
                <a
                  href="https://www.linkedin.com/in/kayode-williams-olalere-b68b09250/"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="LinkedIn profile"
                  className="p-1.5 rounded-md bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700 transition-colors"
                  title="Kayode Williams Olalere on LinkedIn"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.64c-.9 0-1.63.73-1.63 1.63 0 .9.73 1.63 1.63 1.63.9 0 1.63-.73 1.63-1.63 0-.9-.73-1.63-1.63-1.63z" />
                  </svg>
                </a>
                <a
                  href="https://github.com/WilliamSamson"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="GitHub profile"
                  className="p-1.5 rounded-md bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700 transition-colors"
                  title="Kayode Williams Olalere on GitHub"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                  </svg>
                </a>
                <a
                  href="https://www.instagram.com/buildwithkayode"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Instagram profile"
                  className="p-1.5 rounded-md bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700 transition-colors"
                  title="Kayode Williams Olalere on Instagram"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                </a>
              </div>

              <span className="font-sans text-[11px] text-neutral-500">
                © 2026 Kayode Williams Olalere. ORRA.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* PRIMARY SOLID OLED BLACK FLOATING INSTRUMENT DOCK (AGENTS.md §7) */}
      {/* ============================================================ */}
      <nav
        aria-label="ORRA World Navigation Instrument"
        className="h-11 sm:h-12 px-2.5 sm:px-3 rounded-full border border-neutral-800 bg-black shadow-2xl flex items-center gap-1 sm:gap-1.5 text-white max-w-full overflow-x-auto scrollbar-none"
      >
        {/* Navigation Mode: Pan */}
        <button
          type="button"
          onClick={() => onSelectTool("pan")}
          className={`shrink-0 flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-400 ${
            activeTool === "pan"
              ? "bg-white text-black shadow font-semibold"
              : "text-neutral-400 hover:text-white hover:bg-neutral-900 active:scale-95"
          }`}
          title="Pan [Drag to pan]"
          aria-label="Pan Tool"
          aria-pressed={activeTool === "pan"}
        >
          <Hand className="w-4 h-4" />
        </button>

        {/* Navigation Mode: Orbit */}
        <button
          type="button"
          onClick={() => onSelectTool("orbit")}
          className={`shrink-0 flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-400 ${
            activeTool === "orbit"
              ? "bg-white text-black shadow font-semibold"
              : "text-neutral-400 hover:text-white hover:bg-neutral-900 active:scale-95"
          }`}
          title="Orbit [Rotate 3D view]"
          aria-label="Orbit Tool"
          aria-pressed={activeTool === "orbit"}
        >
          <Rotate3d className="w-4 h-4" />
        </button>

        {/* Perspectives Drawer Toggle */}
        <button
          type="button"
          onClick={() => setActiveDrawer((prev) => (prev === "views" ? "none" : "views"))}
          className={`shrink-0 flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-400 ${
            activeDrawer === "views"
              ? "bg-white text-black shadow font-semibold"
              : "text-neutral-400 hover:text-white hover:bg-neutral-900 active:scale-95"
          }`}
          title="Perspectives [V]"
          aria-label="Camera Perspectives"
          aria-expanded={activeDrawer === "views"}
        >
          <Compass className="w-4 h-4" />
        </button>

        {/* Weather Drawer Toggle */}
        <button
          type="button"
          onClick={() => setActiveDrawer((prev) => (prev === "weather" ? "none" : "weather"))}
          className={`shrink-0 flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-400 ${
            activeDrawer === "weather"
              ? "bg-white text-black shadow font-semibold"
              : "text-neutral-400 hover:text-white hover:bg-neutral-900 active:scale-95"
          }`}
          title={`Atmosphere [W]: ${weatherPreset}`}
          aria-label={`Atmospheric weather: ${weatherPreset}`}
          aria-expanded={activeDrawer === "weather"}
        >
          {weatherPreset === "clear" || weatherPreset === "partly_cloudy" ? (
            <CloudSun className="w-4 h-4" />
          ) : weatherPreset === "snow" || weatherPreset === "light_snow" || weatherPreset === "frost" ? (
            <CloudSnow className="w-4 h-4" />
          ) : weatherPreset === "sandstorm" ? (
            <Wind className="w-4 h-4" />
          ) : weatherPreset === "fog" ? (
            <CloudFog className="w-4 h-4" />
          ) : (
            <CloudRain className="w-4 h-4" />
          )}
        </button>

        {/* Hairline Divider */}
        <div className="shrink-0 w-px h-5 bg-neutral-800 mx-0.5" aria-hidden="true" />

        {/* Zoom In */}
        <button
          type="button"
          onClick={() => onStepZoom("in")}
          className="shrink-0 w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full text-neutral-400 hover:text-white hover:bg-neutral-900 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-400"
          title="Zoom In [+]"
          aria-label="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        {/* Zoom Out */}
        <button
          type="button"
          onClick={() => onStepZoom("out")}
          className="shrink-0 w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full text-neutral-400 hover:text-white hover:bg-neutral-900 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-400"
          title="Zoom Out [-]"
          aria-label="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        {/* Hairline Divider */}
        <div className="shrink-0 w-px h-5 bg-neutral-800 mx-0.5" aria-hidden="true" />

        {/* Engine Telemetry Drawer Toggle */}
        <button
          type="button"
          onClick={() => setActiveDrawer((prev) => (prev === "engine" ? "none" : "engine"))}
          className={`shrink-0 flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-400 ${
            activeDrawer === "engine"
              ? "bg-white text-black shadow font-semibold"
              : "text-neutral-400 hover:text-white hover:bg-neutral-900 active:scale-95"
          }`}
          title="Engine Telemetry [~]"
          aria-label="Toggle Engine Telemetry"
          aria-expanded={activeDrawer === "engine"}
        >
          <Sliders className="w-4 h-4" />
        </button>

        {/* About ORRA Drawer Toggle */}
        <button
          type="button"
          onClick={() => setActiveDrawer((prev) => (prev === "about" ? "none" : "about"))}
          className={`shrink-0 flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-400 ${
            activeDrawer === "about"
              ? "bg-white text-black shadow font-semibold"
              : "text-neutral-400 hover:text-white hover:bg-neutral-900 active:scale-95"
          }`}
          title="About ORRA [I]"
          aria-label="About ORRA"
          aria-expanded={activeDrawer === "about"}
        >
          <Info className="w-4 h-4" />
        </button>

        {/* Return to Title Screen */}
        <button
          type="button"
          onClick={onReturnToEntry}
          className="shrink-0 flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-900 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-400"
          title="Return to Title Screen"
          aria-label="Return to Title Screen"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
      </nav>
    </div>
  );
}
