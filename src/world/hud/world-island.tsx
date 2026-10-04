"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import type { WorldTime } from "../life/world-clock";
import type { WeatherPresetName } from "../weather/weather-world-state";
import { formatWorldClockTime12h } from "./engine-hud";
import { IconButton } from "./hud-controls";
import {
  ChevronRight,
  Clock3,
  CloudFog,
  CloudRain,
  CloudSnow,
  CloudSun,
  Lightbulb,
  LightbulbOff,
  Pause,
  Play,
  Wind,
  X,
} from "lucide-react";

/**
 * The island: one black surface at the top of the world that changes shape
 * with what it has to say. At rest it reads the world (sky, season, time).
 * Tapped, it opens the clock's controls. When a room is in focus it becomes
 * that room's name and the room's own controls. One surface, never a stack.
 */

export interface IslandFocus {
  title: string;
  subtitle?: string;
  light?: { on: boolean; toggle: () => void };
  onExit: () => void;
  /** A second row for room-specific controls. */
  extra?: ReactNode;
}

interface WorldIslandProps {
  worldTime: WorldTime | null;
  weatherPreset: WeatherPresetName;
  timeScale: number;
  onTogglePause?: () => void;
  onCycleTimeScale?: () => void;
  onSyncToLive?: () => void;
  focus: IslandFocus | null;
}

/** Morph with a settled spring: quick to arrive, no bounce past the target. */
const MORPH = { type: "spring", stiffness: 520, damping: 42, mass: 0.9 } as const;
const SWAP = { duration: 0.16, ease: [0.32, 0.72, 0, 1] } as const;
const SPEED_STEPS = [1, 5, 30, 120];

export function WorldIsland({
  worldTime,
  weatherPreset,
  timeScale,
  onTogglePause,
  onCycleTimeScale,
  onSyncToLive,
  focus,
}: WorldIslandProps) {
  const [open, setOpen] = useState(false);
  const surface = useRef<HTMLDivElement>(null);
  const mode = focus ? "focus" : open ? "time" : "compact";

  // An open clock closes on Escape or on any press outside the island.
  useEffect(() => {
    if (mode !== "time") return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onPress = (e: PointerEvent) => {
      if (surface.current && !surface.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPress);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPress);
    };
  }, [mode]);

  if (!worldTime && !focus) return null;

  return (
    <MotionConfig reducedMotion="user">
      <div className="pointer-events-none fixed inset-x-0 top-[max(0.75rem,env(safe-area-inset-top))] z-40 flex justify-center px-3">
        <motion.div
          ref={surface}
          layout
          transition={MORPH}
          style={{ borderRadius: 22 }}
          className="pointer-events-auto max-w-full overflow-hidden border border-neutral-800 bg-black text-white select-none"
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={mode}
              layout="position"
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              transition={SWAP}
            >
              {mode === "focus" && focus ? (
                <FocusFace focus={focus} />
              ) : worldTime ? (
                <TimeFace
                  open={mode === "time"}
                  onToggle={() => setOpen((v) => !v)}
                  worldTime={worldTime}
                  weatherPreset={weatherPreset}
                  timeScale={timeScale}
                  onTogglePause={onTogglePause}
                  onCycleTimeScale={onCycleTimeScale}
                  onSyncToLive={onSyncToLive}
                />
              ) : null}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>
    </MotionConfig>
  );
}

/** The same sky icons the dock uses for its weather button. */
function WeatherIcon({ preset }: { preset: WeatherPresetName }) {
  const cls = "w-4 h-4 shrink-0 text-neutral-300";
  if (preset === "clear" || preset === "partly_cloudy") return <CloudSun className={cls} />;
  if (preset === "snow" || preset === "light_snow" || preset === "frost") return <CloudSnow className={cls} />;
  if (preset === "sandstorm") return <Wind className={cls} />;
  if (preset === "fog") return <CloudFog className={cls} />;
  return <CloudRain className={cls} />;
}

function Clock({ dayFraction, paused }: { dayFraction: number; paused: boolean }) {
  const { time, period } = formatWorldClockTime12h(dayFraction);
  return (
    <span className="flex items-baseline font-mono tabular-nums text-[13px] font-semibold text-white">
      <span className={paused ? "text-neutral-400" : ""}>{time}</span>
      <span className="ml-1 font-sans text-[10px] font-medium uppercase text-neutral-400">{period}</span>
    </span>
  );
}

function TimeFace({
  open,
  onToggle,
  worldTime,
  weatherPreset,
  timeScale,
  onTogglePause,
  onCycleTimeScale,
  onSyncToLive,
}: {
  open: boolean;
  onToggle: () => void;
  worldTime: WorldTime;
  weatherPreset: WeatherPresetName;
  timeScale: number;
  onTogglePause?: () => void;
  onCycleTimeScale?: () => void;
  onSyncToLive?: () => void;
}) {
  // Speed reads as one to four chevrons (1x, 5x, 30x, 120x) instead of a number chip.
  const steps = Math.max(1, SPEED_STEPS.indexOf(timeScale) + 1 || SPEED_STEPS.filter((s) => s <= timeScale).length);

  return (
    <div className="flex h-10 items-center gap-2 pl-3.5 pr-1.5">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-label={`${worldTime.season}, ${formatWorldClockTime12h(worldTime.dayFraction).time}. ${open ? "Close" : "Open"} time controls`}
        className="flex items-center gap-2.5 rounded-full py-1 pr-2 text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-400"
      >
        <WeatherIcon preset={weatherPreset} />
        <span className="font-sans text-[13px] font-semibold capitalize tracking-tight text-white">{worldTime.season}</span>
        <span aria-hidden="true" className="h-3.5 w-px bg-neutral-800" />
        <Clock dayFraction={worldTime.dayFraction} paused={worldTime.paused} />
        {open && (
          <>
            <span aria-hidden="true" className="h-3.5 w-px bg-neutral-800" />
            <span className="font-sans text-[12px] font-medium text-neutral-400">Day {worldTime.dayNumber}</span>
          </>
        )}
      </button>
      {open && (
        <div className="flex items-center gap-0.5">
          {onTogglePause && (
            <IconButton label={worldTime.paused ? "Resume time" : "Pause time"} onClick={onTogglePause} active={worldTime.paused}>
              {worldTime.paused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5 fill-current" />}
            </IconButton>
          )}
          {onCycleTimeScale && (
            <IconButton label={`Time runs ${timeScale} times faster. Change speed`} onClick={onCycleTimeScale} className="!w-auto px-2">
              <span className="flex -space-x-1.5">
                {Array.from({ length: steps }, (_, i) => (
                  <ChevronRight key={i} className="w-3.5 h-3.5" strokeWidth={2.5} />
                ))}
              </span>
            </IconButton>
          )}
          {/* Only when the world has drifted from the visitor's own clock. */}
          {onSyncToLive && !worldTime.isLiveSync && (
            <IconButton label="Back to your local time" onClick={onSyncToLive}>
              <Clock3 className="w-3.5 h-3.5" />
            </IconButton>
          )}
        </div>
      )}
    </div>
  );
}

function FocusFace({ focus }: { focus: IslandFocus }) {
  return (
    <div role="region" aria-label={`In focus: ${focus.title}`}>
      <div className="flex h-11 items-center gap-2 pl-4 pr-1.5">
        <span className="flex min-w-0 items-baseline gap-1.5">
          <span className="truncate font-sans text-[13px] font-semibold tracking-tight text-white">{focus.title}</span>
          {focus.subtitle && (
            <span className="hidden truncate border-l border-white/20 pl-2 font-sans text-[11px] text-neutral-400 sm:inline">
              {focus.subtitle}
            </span>
          )}
        </span>
        <span className="ml-1 flex items-center gap-0.5">
          {focus.light && (
            <IconButton
              label={focus.light.on ? "Turn room lights off" : "Turn room lights on"}
              onClick={focus.light.toggle}
              className={focus.light.on ? "!text-amber-300" : ""}
            >
              {focus.light.on ? <Lightbulb className="w-3.5 h-3.5" /> : <LightbulbOff className="w-3.5 h-3.5" />}
            </IconButton>
          )}
          <IconButton label="Leave room (Esc)" onClick={focus.onExit}>
            <X className="w-3.5 h-3.5" />
          </IconButton>
        </span>
      </div>
      {focus.extra && <div className="border-t border-neutral-800 px-1.5 py-1">{focus.extra}</div>}
    </div>
  );
}
