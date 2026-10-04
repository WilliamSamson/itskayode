"use client";

/**
 * ORRA — A Living World
 * =====================
 * Copyright (c) 2026 Kayode. All rights reserved.
 *
 * Fullscreen Interactive Viewport & Lifecycle Bridge
 */

import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { OrraScene, OrraPhase } from "./engine/scene";
import { OrraTitleScreen } from "./orra-title-screen";
import { EngineHud } from "./hud/engine-hud";
import { OrraTourGuide } from "./hud/orra-tour-guide";
import { WorldIsland, type IslandFocus } from "./hud/world-island";
import { Divider, IconButton, Reading, TextToggle } from "./hud/hud-controls";
import { ChevronDown, ChevronUp } from "lucide-react";
import { logWorldEvent } from "../lib/telemetry";
import { NavigationTool, ZoomRange, CameraPerspective } from "./navigation/world-navigation";
import { twoFingerGesture, type TwoFingerPose } from "./navigation/touch-gestures";
import { WeatherPresetName, WeatherWorldState } from "./weather/weather-world-state";
import { type ClockSnapshot, type WorldClock, type WorldTime } from "./life/world-clock";
import { RainPhase, LivingRainTelemetry } from "./weather/living-rain-types";
import { STUDIO_STATIONS, type StudioObjectId } from "./studio/stations";
import type { StudioLightId } from "./studio/studio-world";

const CLOCK_KEY = "orra_world_time";

function isClockSnapshot(value: unknown): value is ClockSnapshot {
  const v = value as Partial<ClockSnapshot> | null;
  return (
    !!v &&
    Number.isFinite(v.worldSeconds) &&
    (v.worldSeconds as number) >= 0 &&
    Number.isFinite(v.savedAt) &&
    Number.isFinite(v.timeScale) &&
    typeof v.paused === "boolean" &&
    typeof v.isLiveSync === "boolean"
  );
}

/** Storage is visitor-controlled input: anything malformed (or the old format) is ignored, leaving live time. */
function loadClock(clock: WorldClock): void {
  try {
    const raw = window.localStorage.getItem(CLOCK_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (isClockSnapshot(parsed)) clock.restore(parsed, Date.now());
  } catch {}
}

function saveClock(clock: WorldClock): void {
  try {
    window.localStorage.setItem(CLOCK_KEY, JSON.stringify(clock.snapshot(Date.now())));
  } catch {}
}

export function OrraViewport() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<OrraScene | null>(null);

  const [phase, setPhase] = useState<OrraPhase>("forming terrain");
  const [isReady, setIsReady] = useState(false);
  // Keep the server and first client render identical; restore the session after mount.
  const [hasEntered, setHasEntered] = useState(false);
  const [overlayMounted, setOverlayMounted] = useState(true);
  const [isImmersive, setIsImmersive] = useState(false);

  // Navigation and Camera states
  const [activeTool, setActiveTool] = useState<NavigationTool>("pan");
  const [activePerspective, setActivePerspective] = useState<CameraPerspective>("oblique");
  const [currentRange, setCurrentRange] = useState<ZoomRange>("district");
  const [focusedStation, setFocusedStation] = useState<StudioObjectId | null>(null);
  const [powerKw, setPowerKw] = useState(100);
  const [arcActive, setArcActive] = useState(true);
  const [isScientificMode, setIsScientificMode] = useState(false);

  // Weather states
  const [weatherState, setWeatherState] = useState<WeatherWorldState | null>(null);
  const [weatherPreset, setWeatherPreset] = useState<WeatherPresetName>("clear");
  const [weatherProgress, setWeatherProgress] = useState(1.0);
  const [isClimateAuto, setIsClimateAuto] = useState(true);
  const [rainTelemetry, setRainTelemetry] = useState<LivingRainTelemetry | null>(null);
  const [worldTime, setWorldTime] = useState<WorldTime | null>(null);
  const [timeScale, setTimeScale] = useState(1);

  // The engine drawer polls render stats itself, only while it is open.
  const getRenderStats = useCallback(() => sceneRef.current?.getRenderStats() ?? null, []);

  // ORRA is presented in space only; the tour still reads the theme.
  const worldTheme = "dark" as const;


  // Sync fullscreen change with isImmersive state
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsImmersive(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const toggleImmersive = useCallback(() => {
    if (typeof document === "undefined") return;
    if (!document.fullscreenElement) {
      wrapperRef.current?.requestFullscreen?.().catch(() => {
        setIsImmersive(Boolean(document.fullscreenElement));
      });
    } else {
      document.exitFullscreen?.().catch(() => {
        setIsImmersive(Boolean(document.fullscreenElement));
      });
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const getViewportSize = () => ({
      width: container.clientWidth || window.innerWidth,
      height: container.clientHeight || window.innerHeight,
    });

    const { width, height } = getViewportSize();

    const world = new OrraScene(width, height);
    sceneRef.current = world;
    world.setupRenderer(container, width, height);

    // ORRA is always the world in space; the old daylight toggle is gone, so
    // a stored preference from it must not strand a visitor in daylight.
    try {
      window.localStorage.removeItem("orra_world_theme");
    } catch {}
    world.setWorldTheme("dark");

    // Resume the world's clock where this visitor left it (day, speed, pause).
    loadClock(world.worldClock);
    setTimeScale(world.worldClock.timeScale);

    if (typeof window !== "undefined") {
      (window as unknown as { __orraScene?: OrraScene; __orraEnter?: () => void }).__orraScene = world;
      (window as unknown as { __orraScene?: OrraScene; __orraEnter?: () => void }).__orraEnter = () => {
        setHasEntered(true);
        world.enterImmediately(() => {
          setOverlayMounted(false);
          setActiveTool("pan");
          setCurrentRange(world.nav.getCurrentZoomRange());
        });
      };
    }

    let readySafetyTimer: number | null = null;
    const markWorldReady = () => {
      if (readySafetyTimer !== null) {
        clearTimeout(readySafetyTimer);
        readySafetyTimer = null;
      }
      setIsReady(true);
      world.isReady = true;
      // Check persisted state on initialization
      const persisted = world.nav.restoreState();
      if (persisted && persisted.hasEntered) {
        world.enterImmediately(() => {
          setHasEntered(true);
          setOverlayMounted(false);
          setActiveTool(persisted.activeTool || "pan");
          setCurrentRange(persisted.zoomRange || "district");
          if (persisted.perspective) {
            setActivePerspective(persisted.perspective);
          }
        });
      }
    };

    // Failsafe watchdog: ensure isReady is never blocked on any device (e.g. mobile GPU shader link stall)
    readySafetyTimer = window.setTimeout(() => {
      markWorldReady();
    }, 1500);

    // Initialize world progressively
    world.initializeWorld((currentPhase) => {
      setPhase(currentPhase);
      if (currentPhase === "ready") {
        markWorldReady();
      }
    });

    // Precise container resize tracking (supports windowed dev, devtools, and fullscreen transitions)
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        if (w > 0 && h > 0) {
          world.resize(w, h);
        }
      }
    });
    resizeObserver.observe(container);

    const handleWindowResize = () => {
      if (!container) return;
      const size = getViewportSize();
      world.resize(size.width, size.height);
    };
    window.addEventListener("resize", handleWindowResize);

    // ====================================================================
    // NATIVE MULTI-TOUCH GESTURES & DESKTOP POINTER NAVIGATION
    // ====================================================================
    let isMouseDown = false;
    let mouseDragMode: "pan" | "orbit" = "pan";
    let prevMouse = { x: 0, y: 0 };
    let mouseDownPos = { x: 0, y: 0 };

    // Multi-touch tracking
    let previousTwoFinger: TwoFingerPose | null = null;
    let gestureHadMultiTouch = false;
    let prevSingleTouch = { x: 0, y: 0 };
    let touchStartPos = { x: 0, y: 0 };
    let touchMoveDistance = 0;
    let lastTapTime = 0;
    let lastTapPos = { x: 0, y: 0 };

    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const isHudEvent = (e: Event) => {
      const target = e.target as HTMLElement | null;
      return Boolean(target?.closest("[data-engine-hud]"));
    };

    // --- MOUSE HANDLERS (Desktop) ---
    const onPointerDown = (e: PointerEvent) => {
      if (world.mode !== "interactive" || isHudEvent(e) || e.pointerType === "touch" || ![0, 1, 2].includes(e.button)) return;
      isMouseDown = true;
      prevMouse = { x: e.clientX, y: e.clientY };
      mouseDownPos = { x: e.clientX, y: e.clientY };

      if (e.button === 2 || e.altKey || e.shiftKey || world.nav.activeTool === "orbit") {
        mouseDragMode = "orbit";
      } else {
        mouseDragMode = "pan";
      }
    };

    const localPoint = (clientX: number, clientY: number) => {
      const rect = container.getBoundingClientRect();
      return { x: clientX - rect.left, y: clientY - rect.top, w: rect.width, h: rect.height };
    };

    // Stations are the island's clickable desks and rooms: hovering shows a
    // pointer, a click glides to the station's designed framing.
    const focusStationAt = (clientX: number, clientY: number): boolean => {
      const p = localPoint(clientX, clientY);
      const id = world.stationAt(p.x, p.y, p.w, p.h);
      if (!id) return false;
      world.focusStation(id);
      setFocusedStation(id);
      logWorldEvent("station_focused", { stationId: id });
      return true;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType !== "touch" && !isMouseDown && !isHudEvent(e) && world.mode === "interactive") {
        const p = localPoint(e.clientX, e.clientY);
        container.style.cursor = world.stationAt(p.x, p.y, p.w, p.h) ? "pointer" : "";
      }
      if (e.pointerType === "touch" || !isMouseDown) return;
      const dx = e.clientX - prevMouse.x;
      const dy = e.clientY - prevMouse.y;
      prevMouse = { x: e.clientX, y: e.clientY };

      if (mouseDragMode === "pan") {
        world.pan(dx, dy);
      } else {
        world.orbit(dx, dy);
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      if (isMouseDown) {
        world.nav.saveState(true);
        const moved = Math.hypot(e.clientX - mouseDownPos.x, e.clientY - mouseDownPos.y);
        if (moved < 5 && e.button === 0 && !isHudEvent(e)) focusStationAt(e.clientX, e.clientY);
      }
      isMouseDown = false;
    };

    const onWheel = (e: WheelEvent) => {
      if (world.mode !== "interactive") return;
      e.preventDefault();
      world.zoom(e.deltaY);
      setCurrentRange(world.nav.getCurrentZoomRange());
    };

    const onDoubleClick = (e: MouseEvent) => {
      if (isHudEvent(e)) return;
      const rect = container.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;
      world.raycastAndFocus(clientX, clientY, rect.width, rect.height);
    };

    // --- TOUCH HANDLERS (Mobile / Tablet) ---
    const touchPose = (touches: TouchList): TwoFingerPose => ({
      first: { x: touches[0].clientX, y: touches[0].clientY },
      second: { x: touches[1].clientX, y: touches[1].clientY },
    });

    const onTouchStart = (e: TouchEvent) => {
      if (world.mode !== "interactive" || isHudEvent(e)) return;
      if (e.touches.length === 1) {
        const t = e.touches[0];
        prevSingleTouch = { x: t.clientX, y: t.clientY };
        touchStartPos = { x: t.clientX, y: t.clientY };
        touchMoveDistance = 0;
        gestureHadMultiTouch = false;
        previousTwoFinger = null;
      } else if (e.touches.length >= 2) {
        previousTwoFinger = touchPose(e.touches);
        gestureHadMultiTouch = true;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (world.mode !== "interactive" || isHudEvent(e)) return;
      e.preventDefault();

      // One finger directly manipulates the selected camera tool.
      if (e.touches.length === 1) {
        const t = e.touches[0];
        const dx = t.clientX - prevSingleTouch.x;
        const dy = t.clientY - prevSingleTouch.y;
        touchMoveDistance += Math.hypot(dx, dy);
        prevSingleTouch = { x: t.clientX, y: t.clientY };
        if (world.nav.activeTool === "orbit") world.orbit(dx, dy);
        else world.pan(dx, dy);
      } else if (e.touches.length >= 2) {
        const current = touchPose(e.touches);
        if (previousTwoFinger) {
          const gesture = twoFingerGesture(previousTwoFinger, current, world.nav.activeTool);
          touchMoveDistance += gesture.movement;
          if (gesture.zoom) {
            world.zoom(gesture.zoom);
            setCurrentRange(world.nav.getCurrentZoomRange());
          }
          if (gesture.orbitX || gesture.orbitY) world.orbit(gesture.orbitX, gesture.orbitY);
          if (gesture.panX || gesture.panY) world.pan(gesture.panX, gesture.panY);
        }
        previousTwoFinger = current;
        gestureHadMultiTouch = true;
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (world.mode !== "interactive") return;
      if (e.touches.length === 1) {
        const t = e.touches[0];
        prevSingleTouch = { x: t.clientX, y: t.clientY };
        previousTwoFinger = null;
      } else if (e.touches.length === 0) {
        previousTwoFinger = null;
        world.nav.saveState(true);

        // A pinch or twist must never turn into a tap-to-focus on release.
        if (!gestureHadMultiTouch && touchMoveDistance < 12) {
          const now = performance.now();
          const distFromLastTap = Math.hypot(
            touchStartPos.x - lastTapPos.x,
            touchStartPos.y - lastTapPos.y
          );
          if (focusStationAt(touchStartPos.x, touchStartPos.y)) {
            lastTapTime = 0;
          } else if (now - lastTapTime < 320 && distFromLastTap < 25) {
            const rect = container.getBoundingClientRect();
            world.raycastAndFocus(
              touchStartPos.x - rect.left,
              touchStartPos.y - rect.top,
              rect.width,
              rect.height
            );
            lastTapTime = 0;
          } else {
            lastTapTime = now;
            lastTapPos = { x: touchStartPos.x, y: touchStartPos.y };
          }
        }
        gestureHadMultiTouch = false;
      }
    };

    const onTouchCancel = () => {
      previousTwoFinger = null;
      gestureHadMultiTouch = false;
      touchMoveDistance = Infinity;
    };

    container.addEventListener("contextmenu", onContextMenu);
    container.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    container.addEventListener("wheel", onWheel, { passive: false });
    container.addEventListener("dblclick", onDoubleClick);

    container.addEventListener("touchstart", onTouchStart, { passive: true });
    container.addEventListener("touchmove", onTouchMove, { passive: false });
    container.addEventListener("touchend", onTouchEnd, { passive: true });
    container.addEventListener("touchcancel", onTouchCancel, { passive: true });

    // Live Streaming & Adaptive Diagnostics polling loop (calibrated throttle to prevent GC/re-render hitching)
    let statsAnimId: number;
    let lastPoll = 0;
    let lastStation: StudioObjectId | null = null;
    let lastRange: ZoomRange | null = null;
    let lastPerspective: CameraPerspective | null = null;
    let lastPreset: WeatherPresetName | null = null;
    let lastAuto: boolean | null = null;
    let lastWeatherKey = "";
    let lastRainKey = "";
    let lastTimeKey = "";

    const pollMetrics = () => {
      statsAnimId = requestAnimationFrame(pollMetrics);
      const now = performance.now();
      if (now - lastPoll >= 350) {
        lastPoll = now;

        const currentStation = world.getFocusedStation();
        if (currentStation !== lastStation) {
          lastStation = currentStation;
          setFocusedStation(currentStation);
        }

        if (world.mode === "interactive") {
          const currentR = world.nav.getCurrentZoomRange();
          if (currentR !== lastRange) {
            lastRange = currentR;
            setCurrentRange(currentR);
          }
          const currentP = world.nav.activePerspective;
          if (currentP !== lastPerspective) {
            lastPerspective = currentP;
            setActivePerspective(currentP);
          }
        }

        const currentPreset = world.getWeatherPresetName();
        if (currentPreset !== lastPreset) {
          lastPreset = currentPreset;
          setWeatherPreset(currentPreset);
        }

        const currentAuto = world.isClimateWeatherEnabled();
        if (currentAuto !== lastAuto) {
          lastAuto = currentAuto;
          setIsClimateAuto(currentAuto);
        }

        // Each poll builds fresh objects, so setting them unconditionally
        // re-rendered the whole viewport ~3x a second even when nothing on
        // screen changed. Compare at the precision the HUD displays.
        setWeatherProgress(Math.round(world.getTransitionProgress() * 100) / 100);

        const weather = world.getWeatherState();
        const weatherKey = [
          weather.visibility, weather.wind, weather.precipitation, weather.cloudCoverage,
          weather.humidity, weather.surfaceWetness, (weather.temperature ?? 0) / 100,
        ].map((v) => Math.round(v * 100)).join();
        if (weatherKey !== lastWeatherKey) {
          lastWeatherKey = weatherKey;
          setWeatherState(weather);
        }

        if (typeof world.getRainTelemetry === "function") {
          const rain = world.getRainTelemetry();
          const rainKey = `${rain.phase}|${Math.round(rain.cameraLocalRain * 100)}|${Math.round(rain.phaseProgress * 100)}`;
          if (rainKey !== lastRainKey) {
            lastRainKey = rainKey;
            setRainTelemetry(rain);
          }
        }
        if (typeof world.getWorldTime === "function") {
          const time = world.getWorldTime();
          // The clock shows minutes; 1/1440 of a day is one world minute.
          const timeKey = [
            time.year, time.day, time.season, time.diurnalPhase, time.paused, time.isLiveSync,
            Math.floor(time.dayFraction * 1440), Math.round(time.sunElevation * 90),
          ].join();
          if (timeKey !== lastTimeKey) {
            lastTimeKey = timeKey;
            setWorldTime(time);
          }
        }
      }
    };
    statsAnimId = requestAnimationFrame(pollMetrics);

    return () => {
      cancelAnimationFrame(statsAnimId);
      resizeObserver.disconnect();
      window.removeEventListener("resize", handleWindowResize);
      container.removeEventListener("contextmenu", onContextMenu);
      container.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      container.removeEventListener("wheel", onWheel);
      container.removeEventListener("dblclick", onDoubleClick);
      container.removeEventListener("touchstart", onTouchStart);
      container.removeEventListener("touchmove", onTouchMove);
      container.removeEventListener("touchend", onTouchEnd);
      container.removeEventListener("touchcancel", onTouchCancel);
      if (readySafetyTimer !== null) {
        clearTimeout(readySafetyTimer);
      }
      if (typeof window !== "undefined") {
        delete (window as unknown as { __orraScene?: OrraScene }).__orraScene;
        delete (window as unknown as { __orraEnter?: () => void }).__orraEnter;
      }
      world.dispose();
    };
  }, []);

  const handleEnter = () => {
    if (!isReady || hasEntered) return;
    setHasEntered(true);
    logWorldEvent("orra_world_entered", { theme: worldTheme });

    sceneRef.current?.triggerEnterTransition(() => {
      setOverlayMounted(false);
    });
  };

  const handleFocusStationDirect = useCallback((id: StudioObjectId) => {
    sceneRef.current?.focusStation(id);
    setFocusedStation(id);
    logWorldEvent("station_focused", { stationId: id, source: "tour_guide" });
  }, []);

  const handleReturnToEntry = () => {
    sceneRef.current?.returnToEntry(() => {
      setHasEntered(false);
      setOverlayMounted(true);
    });
  };

  const handleSelectTool = (tool: NavigationTool) => {
    setActiveTool(tool);
    if (sceneRef.current) {
      sceneRef.current.nav.activeTool = tool;
    }
  };

  const handleSelectPerspective = useCallback((p: CameraPerspective) => {
    setActivePerspective(p);
    sceneRef.current?.setPerspective(p);
    if (sceneRef.current?.nav) {
      setCurrentRange(sceneRef.current.nav.getCurrentZoomRange());
    }
  }, []);

  const handleCyclePerspective = useCallback(() => {
    if (!sceneRef.current) return;
    const next = sceneRef.current.cyclePerspective();
    setActivePerspective(next);
    if (sceneRef.current?.nav) {
      setCurrentRange(sceneRef.current.nav.getCurrentZoomRange());
    }
  }, []);

  const handleResetView = useCallback(() => {
    if (!sceneRef.current) return;
    setActivePerspective("oblique");
    if (typeof sceneRef.current.resetView === "function") {
      sceneRef.current.resetView();
    } else if (sceneRef.current.nav && typeof sceneRef.current.nav.resetView === "function") {
      sceneRef.current.nav.resetView(true);
    }
    if (sceneRef.current.nav) {
      setCurrentRange(sceneRef.current.nav.getCurrentZoomRange());
    }
  }, []);

  const [solariumAngle, setSolariumAngle] = useState<"garden" | "telescope">("garden");

  const playSingingBowlChime = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === "suspended") {
        void ctx.resume();
      }
      const now = ctx.currentTime;
      const harmonics = [
        { freq: 432, gain: 0.32, decay: 4.8 },
        { freq: 864, gain: 0.20, decay: 3.6 },
        { freq: 1296, gain: 0.10, decay: 2.4 },
        { freq: 2160, gain: 0.04, decay: 1.4 },
      ];
      harmonics.forEach(({ freq, gain, decay }) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.linearRampToValueAtTime(freq - 1.2, now + decay);
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(gain, now + 0.03);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + decay);
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + decay);
      });
    } catch {
      // Audio playback gracefully handles user gesture policies
    }
  }, []);

  const handleToggleSolariumView = useCallback(() => {
    if (!sceneRef.current) return;
    if (solariumAngle === "garden") {
      setSolariumAngle("telescope");
      sceneRef.current.nav.focusFrom(
        new THREE.Vector3(9.8, 1.25, 9.6),
        new THREE.Vector3(9.8, 1.6, 12.5)
      );
    } else {
      setSolariumAngle("garden");
      sceneRef.current.focusStation("talent-desk");
    }
  }, [solariumAngle]);

  const handleDefocusStation = useCallback(() => {
    setFocusedStation(null);
    setSolariumAngle("garden");
    if (
      activePerspective === "boardroom" ||
      activePerspective === "solarium" ||
      activePerspective === "tech-lab" ||
      activePerspective === "power-grid"
    ) {
      handleSelectPerspective("oblique");
    } else {
      handleResetView();
    }
  }, [activePerspective, handleSelectPerspective, handleResetView]);

  const [roomLights, setRoomLights] = useState<Record<string, boolean>>({
    "command-desk": true,
    boardroom: true,
    "talent-desk": true,
    "advanced-tech-lab": true,
  });

  const handleToggleRoomLight = useCallback((id: import("./studio/studio-world").StudioLightId) => {
    setRoomLights((prev) => {
      const current = prev[id] ?? true;
      const next = !current;
      sceneRef.current?.setRoomLightState(id, next);
      logWorldEvent("room_light_toggled", { circuitId: id, active: next });
      return { ...prev, [id]: next };
    });
  }, []);


  const handleToggleArc = () => {
    const next = sceneRef.current?.togglePowerPlantArc() ?? !arcActive;
    setArcActive(next);
    logWorldEvent("power_grid_arc_toggled", { active: next });
  };

  const handleToggleScientificUpgrade = () => {
    const next = sceneRef.current?.toggleScientificUpgrade() ?? !isScientificMode;
    setIsScientificMode(next);
    if (next) {
      setPowerKw(1000);
    } else {
      setPowerKw(100);
    }
    logWorldEvent("scientific_core_upgraded", { active: next, powerKw: next ? 1000 : 100 });
  };

  const adjustPowerKw = (deltaKw: number) => {
    const maxKw = isScientificMode ? 1200 : 120;
    const next = Math.max(0, Math.min(maxKw, powerKw + deltaKw));
    sceneRef.current?.setPowerPlantLevel(next);
    setPowerKw(next);
  };

  const handleStepZoom = (direction: "in" | "out") => {
    if (sceneRef.current) {
      if (typeof sceneRef.current.stepZoom === "function") {
        sceneRef.current.stepZoom(direction);
      } else if (sceneRef.current.nav && typeof sceneRef.current.nav.stepZoom === "function") {
        sceneRef.current.nav.stepZoom(direction);
      }
      if (sceneRef.current.nav) {
        setCurrentRange(sceneRef.current.nav.getCurrentZoomRange());
      }
    }
  };

  const handleSelectWeatherPreset = (preset: WeatherPresetName) => {
    sceneRef.current?.setWeatherPreset(preset);
    setWeatherPreset(preset);
    logWorldEvent("weather_preset_selected", { preset });
  };

  const handleCycleWeather = () => {
    const presets: WeatherPresetName[] = [
      "clear",
      "rain",
      "snow",
      "fog",
      "sandstorm",
    ];
    const nextIdx = (presets.indexOf(weatherPreset) + 1) % presets.length;
    const nextPreset = presets[nextIdx];
    sceneRef.current?.setWeatherPreset(nextPreset);
    setWeatherPreset(nextPreset);
    logWorldEvent("weather_cycled", { preset: nextPreset });
  };

  const handleToggleClimateAuto = useCallback((enabled?: boolean) => {
    if (!sceneRef.current) return;
    const next = enabled !== undefined ? enabled : !sceneRef.current.isClimateWeatherEnabled();
    sceneRef.current.setClimateWeatherEnabled(next);
    setIsClimateAuto(next);
    if (sceneRef.current.getWeatherState) {
      setWeatherState(sceneRef.current.getWeatherState());
      setWeatherPreset(sceneRef.current.getWeatherPresetName());
    }
  }, []);

  /** After any clock change: refresh the HUD and save where the world is. */
  const commitTime = useCallback(() => {
    const world = sceneRef.current;
    if (!world) return;
    const wt = world.getWorldTime();
    setWorldTime(wt);
    setTimeScale(wt.timeScale);
    saveClock(world.worldClock);
  }, []);

  const handleSyncToLiveTime = useCallback(() => {
    sceneRef.current?.syncToLiveTime();
    commitTime();
  }, [commitTime]);

  const handleScrubWorldTime = useCallback((fraction: number) => {
    sceneRef.current?.scrubWorldTime(fraction);
    commitTime();
  }, [commitTime]);

  const handleTogglePauseTime = useCallback(() => {
    sceneRef.current?.togglePauseTime();
    commitTime();
  }, [commitTime]);

  const handleCycleTimeScale = useCallback(() => {
    sceneRef.current?.cycleTimeScale();
    commitTime();
  }, [commitTime]);

  const handleSkipDays = useCallback((days: number) => {
    sceneRef.current?.skipWorldDays(days);
    commitTime();
  }, [commitTime]);

  // Time at speed moves on between clicks, so save again whenever the page is
  // hidden or closed; otherwise closing the tab loses everything since.
  useEffect(() => {
    const save = () => {
      if (sceneRef.current) saveClock(sceneRef.current.worldClock);
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") save();
    };
    window.addEventListener("pagehide", save);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", save);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const handleSelectRainPhase = useCallback((p: RainPhase) => {
    sceneRef.current?.setRainPhase(p);
    if (sceneRef.current?.getRainTelemetry) {
      setRainTelemetry(sceneRef.current.getRainTelemetry());
    }
  }, []);

  const handleSetRainProgress = useCallback((prog: number) => {
    sceneRef.current?.setRainPhaseProgress(prog);
    if (sceneRef.current?.getRainTelemetry) {
      setRainTelemetry(sceneRef.current.getRainTelemetry());
    }
  }, []);

  // What the island shows while a room is in focus: its name, its lights,
  // and the one or two controls that belong to that room alone.
  const focusedId: StudioObjectId | null =
    focusedStation ??
    ({ boardroom: "boardroom", solarium: "talent-desk", "tech-lab": "advanced-tech-lab", "power-grid": "power-grid" } as Partial<
      Record<CameraPerspective, StudioObjectId>
    >)[activePerspective] ??
    null;
  const focusedRoom = focusedId ? STUDIO_STATIONS[focusedId] : null;
  const lightCircuit: StudioLightId | null =
    focusedId === "command-desk" || focusedId === "boardroom" || focusedId === "talent-desk" || focusedId === "advanced-tech-lab"
      ? focusedId
      : null;
  const islandFocus: IslandFocus | null =
    focusedId && focusedRoom
      ? {
          title: focusedRoom.label,
          subtitle: focusedRoom.subtitle,
          light: lightCircuit
            ? { on: roomLights[lightCircuit] ?? true, toggle: () => handleToggleRoomLight(lightCircuit) }
            : undefined,
          onExit: handleDefocusStation,
          extra:
            focusedId === "talent-desk" ? (
              <div className="flex items-center justify-center">
                <TextToggle onClick={playSingingBowlChime}>Ring the bowl</TextToggle>
                <Divider />
                <TextToggle pressed={solariumAngle === "telescope"} onClick={handleToggleSolariumView}>
                  Telescope
                </TextToggle>
              </div>
            ) : focusedId === "power-grid" ? (
              <div className="flex flex-wrap items-center justify-center">
                <Reading
                  label={isScientificMode ? "Core" : "Grid"}
                  value={powerKw >= 1000 ? `${(powerKw / 1000).toFixed(1)} MW` : `${powerKw} kW`}
                />
                <IconButton label="Less power" onClick={() => adjustPowerKw(isScientificMode ? -50 : -10)}>
                  <ChevronDown className="w-3.5 h-3.5" />
                </IconButton>
                <IconButton label="More power" onClick={() => adjustPowerKw(isScientificMode ? 50 : 10)}>
                  <ChevronUp className="w-3.5 h-3.5" />
                </IconButton>
                <Divider />
                <TextToggle pressed={arcActive} onClick={handleToggleArc}>
                  Arc
                </TextToggle>
                <TextToggle pressed={isScientificMode} onClick={handleToggleScientificUpgrade}>
                  Science core
                </TextToggle>
              </div>
            ) : undefined,
        }
      : null;

  return (
    <div
      ref={wrapperRef}
      className={`relative w-full h-full min-h-[100dvh] overflow-hidden select-none bg-black touch-none overscroll-none ${
        isImmersive ? "fixed inset-0 z-50 h-screen" : ""
      }`}
    >
      {/* 3D WebGL Canvas — fills 100% of parent container */}
      <div
        ref={containerRef}
        className={`absolute inset-0 w-full h-full overflow-hidden touch-none ${
          hasEntered
            ? activeTool === "pan"
              ? "cursor-grab active:cursor-grabbing"
              : "cursor-crosshair active:cursor-crosshair"
            : "cursor-default"
        }`}
      />

      {/* Cinematic Title Screen Overlay */}
      {overlayMounted && (
        <OrraTitleScreen
          phase={phase}
          isReady={isReady}
          onEnter={handleEnter}
          hasEntered={hasEntered}
        />
      )}

      {/* Solid Floating Instrument HUD — strictly rendered only once entered into the interactive world */}
      {hasEntered && !overlayMounted && (
        <EngineHud
          getStats={getRenderStats}
          currentRange={currentRange}
          activeTool={activeTool}
          activePerspective={activePerspective}
          onSelectPerspective={handleSelectPerspective}
          onCyclePerspective={handleCyclePerspective}
          weatherState={weatherState}
          weatherPreset={weatherPreset}
          transitionProgress={weatherProgress}
          isClimateAuto={isClimateAuto}
          onToggleClimateAuto={handleToggleClimateAuto}
          rainTelemetry={rainTelemetry}
          worldTime={worldTime}
          timeScale={timeScale}
          onTogglePauseTime={handleTogglePauseTime}
          onCycleTimeScale={handleCycleTimeScale}
          onSkipDays={handleSkipDays}
          onSyncToLiveTime={handleSyncToLiveTime}
          onScrubWorldTime={handleScrubWorldTime}
          onSelectRainPhase={handleSelectRainPhase}
          onSetRainProgress={handleSetRainProgress}
          onSelectWeatherPreset={handleSelectWeatherPreset}
          onCycleWeather={handleCycleWeather}
          onSelectTool={handleSelectTool}
          onStepZoom={handleStepZoom}
          onReturnToEntry={handleReturnToEntry}
          isImmersive={isImmersive}
          onToggleImmersive={toggleImmersive}
          focusedStation={focusedStation}
          onDefocus={handleDefocusStation}
          roomLights={roomLights}
          onToggleRoomLight={handleToggleRoomLight}
        />
      )}

      {/* Interactive Tour Guide for First-Time Visitors & Re-discovery */}
      {hasEntered && !overlayMounted && (
        <OrraTourGuide
          hasEntered={hasEntered}
          activePerspective={activePerspective}
          focusedStation={focusedStation}
          activeTool={activeTool}
          worldTheme={worldTheme}
          weatherPreset={weatherPreset}
          onFocusStation={handleFocusStationDirect}
          onSelectTool={handleSelectTool}
          onCycleWeather={handleCycleWeather}
        />
      )}

      {/* The island: world readout at rest, clock controls when tapped, the room when focused. */}
      {hasEntered && !overlayMounted && (
        <WorldIsland
          worldTime={worldTime}
          weatherPreset={weatherPreset}
          timeScale={timeScale}
          onTogglePause={handleTogglePauseTime}
          onCycleTimeScale={handleCycleTimeScale}
          onSyncToLive={handleSyncToLiveTime}
          focus={islandFocus}
        />
      )}
    </div>
  );
}
