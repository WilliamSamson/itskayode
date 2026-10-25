"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import dynamic from "next/dynamic";
import { useReducedMotion } from "framer-motion";
import { scanRoom, type ScanPoint } from "@/sonaris/lib/sonaris-engine";
import {
  analyzeCoverageAndGaps,
  findNavPath,
  generateMecanumTrajectory,
  ROOM_PRESETS,
  type RoomEnvironment,
  type CoverageReport,
  type TrajectoryPoint
} from "@/sonaris/lib/sonaris-coverage";
import type { CaseCache } from "./workspace-cases";
import type { ProbedPoint, RoverPose } from "./scan-stage";
import ScanPlot from "../scan-plot";
import styles from "./scan-workbench.module.css";

const ScanStage = dynamic(() => import("./scan-stage"), {
  ssr: false,
  loading: () => (
    <div className="relative h-full min-h-[300px] w-full overflow-hidden rounded-[24px] bg-[#000000] flex flex-col items-center justify-center gap-3 font-mono text-[11px] text-[#A87914] select-none">
      <div className="flex items-center gap-2.5">
        <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#E34242] animate-pulse" />
        <strong className="tracking-wider uppercase text-[#FFFFFF] text-[12px]">
          SONARIS · LiDAR Reconstruction Engine
        </strong>
      </div>
      <div className="flex items-center gap-2 text-[10px] text-[#A09A8F]">
        <span className="inline-block h-1.5 w-24 overflow-hidden rounded-full bg-[#2A2B33]">
          <span className="block h-full w-2/3 animate-pulse rounded-full bg-[#E34242]" />
        </span>
        <span>Initializing Point Cloud Renderer</span>
      </div>
    </div>
  )
});

export interface ScanWorkbenchProps {
  onPointCount?: (count: number) => void;
  cache?: MutableRefObject<CaseCache | null>;
}

// Physical robot geometry: fixed 0.50m sensor elevation (chassis + mast)
export const FIXED_SENSOR_HEIGHT = 0.50;

export function ScanWorkbench({ onPointCount, cache }: ScanWorkbenchProps) {
  const initial = useRef(cache?.current).current;
  const reducedMotion = useReducedMotion();

  // Selected Room Environment Scenario
  const [selectedRoomId, setSelectedRoomId] = useState<RoomEnvironment["id"]>("chamber");
  const currentRoom = useMemo<RoomEnvironment>(
    () => ROOM_PRESETS.find((r) => r.id === selectedRoomId) || ROOM_PRESETS[0],
    [selectedRoomId]
  );

  // Rover Mecanum Pose & Kinematic Tilt
  const [roverPose, setRoverPose] = useState<RoverPose>({ x: 0, z: 0, heading: 0 });
  const [wheelRPMs, setWheelRPMs] = useState<[number, number, number, number]>([0, 0, 0, 0]);
  const [tilt, setTilt] = useState<number>(() => initial?.tilt ?? 0);
  const [points, setPoints] = useState<ScanPoint[]>(() => initial?.points ?? []);
  const [latestPoints, setLatestPoints] = useState<ScanPoint[]>(() => initial?.latest ?? []);
  const [steps, setSteps] = useState<number>(initial?.steps ?? 0);

  // 4-Phase Step-and-Settle Operational Lifecycle States
  const [operationState, setOperationState] = useState<
    "idle" | "transit" | "settle" | "tilt_record" | "gap_evaluate"
  >("idle");
  const [navPath, setNavPath] = useState<[number, number][]>([]);
  const [isAutoSurveying, setIsAutoSurveying] = useState<boolean>(false);
  const [raysPerPlane, setRaysPerPlane] = useState<number>(360);
  const [scanMessage, setScanMessage] = useState<string>(
    initial?.scanMessage ?? "Step-and-settle survey ready. Select room environment or engage autonomous scan."
  );

  // Probed Point Reticle
  const [probedPoint, setProbedPoint] = useState<ProbedPoint | null>(null);

  // Visualizer Display Modes (Decluttered: natural OrbitControls without CAD button clutter)
  const [displayMode, setDisplayMode] = useState<"cloud" | "split" | "slice">("cloud");
  const [showRoomBounds, setShowRoomBounds] = useState<boolean>(true);
  const [showLaserFan, setShowLaserFan] = useState<boolean>(true);
  const [pointSize, setPointSize] = useState<number>(2.5);
  const [colorMode, setColorMode] = useState<"elevation" | "laser" | "plane">("elevation");
  const [activeInspectorTab, setActiveInspectorTab] = useState<"acquisition" | "slices" | "specs">("acquisition");

  // Secondary filters (backend defaults)
  const heightFilter = useMemo<[number, number]>(() => [0.0, 3.0], []);
  const isolatedPlane = "all";

  const sweepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const navAnimFrameRef = useRef<number | null>(null);
  const sweepStepRef = useRef(steps);

  // Spatial Coverage & Gap Analysis
  const coverageReport = useMemo<CoverageReport>(
    () => analyzeCoverageAndGaps(points, currentRoom.width, currentRoom.depth, currentRoom.obstacles),
    [points, currentRoom]
  );

  // Synchronize cache when values change
  useEffect(() => {
    if (cache) {
      cache.current = {
        voltage: cache.current?.voltage ?? 12.8,
        capacity: cache.current?.capacity ?? 12,
        load: cache.current?.load ?? null,
        efficiency: cache.current?.efficiency ?? 0.85,
        resistance: cache.current?.resistance ?? null,
        outputV: cache.current?.outputV ?? null,
        outputA: cache.current?.outputA ?? null,
        limit: cache.current?.limit ?? null,
        tilt,
        height: FIXED_SENSOR_HEIGHT,
        points,
        latest: latestPoints,
        steps,
        projection: displayMode === "split",
        scanMessage,
        length: cache.current?.length ?? null,
        width: cache.current?.width ?? null,
        partHeight: cache.current?.partHeight ?? null,
        bedHeight: cache.current?.bedHeight ?? null,
        rotated: cache.current?.rotated ?? false
      };
    }
  }, [cache, tilt, points, latestPoints, steps, displayMode, scanMessage]);

  useEffect(() => {
    onPointCount?.(points.length);
  }, [points.length, onPointCount]);

  const cancelOperations = useCallback(() => {
    if (sweepTimerRef.current !== null) {
      clearInterval(sweepTimerRef.current);
      sweepTimerRef.current = null;
    }
    if (navAnimFrameRef.current !== null) {
      cancelAnimationFrame(navAnimFrameRef.current);
      navAnimFrameRef.current = null;
    }
    setWheelRPMs([0, 0, 0, 0]);
    setOperationState("idle");
    setIsAutoSurveying(false);
    setNavPath([]);
  }, []);

  useEffect(() => {
    return () => {
      cancelOperations();
    };
  }, [cancelOperations]);

  // Handle Room Preset Change
  const handleRoomChange = useCallback(
    (roomId: RoomEnvironment["id"]) => {
      cancelOperations();
      setSelectedRoomId(roomId);
      setPoints([]);
      setLatestPoints([]);
      setSteps(0);
      sweepStepRef.current = 0;
      const startX = roomId === "partitioned" ? -2.2 : 0;
      setRoverPose({ x: startX, z: 0, heading: 0 });
      setScanMessage(`Loaded ${ROOM_PRESETS.find((r) => r.id === roomId)?.name}. Ready for exploration.`);
    },
    [cancelOperations]
  );

  // Synthetic Raycaster from Current Rover Pose
  const capturePlane = useCallback(
    (angleDeg: number, customRays = raysPerPlane, pose = roverPose) => {
      const slice = scanRoom(
        currentRoom.width,
        currentRoom.depth,
        pose.x,
        pose.z,
        pose.heading,
        angleDeg,
        customRays,
        30,
        0,
        FIXED_SENSOR_HEIGHT,
        currentRoom.obstacles
      );

      setPoints((prev) => [...prev, ...slice].slice(-50000));
      setLatestPoints(slice);
      return slice.length;
    },
    [currentRoom, roverPose, raysPerPlane]
  );

  // Synchronized Mecanum Navigation Along Obstacle-Free Path using Full Kinematics
  const navigateRoverAlongPath = useCallback(
    (
      waypoints: [number, number][],
      finalHeading: number,
      onArrival: (arrivedPose: RoverPose) => void
    ) => {
      if (waypoints.length < 2) {
        onArrival(roverPose);
        return;
      }

      setNavPath(waypoints);
      setOperationState("transit");
      // Enforce level-only interlock (0° during transit)
      setTilt(0);

      // Generate time-series trajectory with 4-wheel mecanum inverse kinematics
      const trajectory = generateMecanumTrajectory(waypoints, finalHeading, 0.55, 30);
      let trajIndex = 0;

      if (reducedMotion) {
        const dest = waypoints[waypoints.length - 1];
        const arrived: RoverPose = { x: dest[0], z: dest[1], heading: finalHeading };
        setRoverPose(arrived);
        setWheelRPMs([0, 0, 0, 0]);
        setNavPath([]);
        setOperationState("settle");
        setTimeout(() => onArrival(arrived), 250);
        return;
      }

      const stepKinematics = () => {
        if (trajIndex < trajectory.length) {
          const pt: TrajectoryPoint = trajectory[trajIndex];
          setRoverPose({
            x: pt.x,
            z: pt.z,
            heading: pt.headingDeg
          });
          setWheelRPMs(pt.wheelRPMs);

          // Throttle string state updates to prevent React DOM churn during transit
          if (trajIndex === 0 || trajIndex % 8 === 0) {
            setScanMessage(
              `Phase 1 · Transit: FL ${pt.wheelRPMs[0]} / FR ${pt.wheelRPMs[1]} / RL ${pt.wheelRPMs[2]} / RR ${pt.wheelRPMs[3]} RPM · Speed ${Math.hypot(pt.vx, pt.vz).toFixed(2)} m/s (0° Level Interlock)`
            );
          }

          trajIndex++;
          navAnimFrameRef.current = requestAnimationFrame(stepKinematics);
        } else {
          // Arrived at final destination waypoint -> Enter Phase 2: Settle
          const dest = waypoints[waypoints.length - 1];
          const arrived: RoverPose = {
            x: Number(dest[0].toFixed(2)),
            z: Number(dest[1].toFixed(2)),
            heading: finalHeading
          };
          setRoverPose(arrived);
          setWheelRPMs([0, 0, 0, 0]);
          setNavPath([]);
          setOperationState("settle");
          setScanMessage(
            `Phase 2 · Settle: Base stopped at [${arrived.x}m, ${arrived.z}m]. Damping mechanical inertia & vibration.`
          );

          // Settle duration before allowing tilted acquisition
          setTimeout(() => {
            onArrival(arrived);
          }, 350);
        }
      };

      navAnimFrameRef.current = requestAnimationFrame(stepKinematics);
    },
    [roverPose, reducedMotion]
  );

  // Synchronized Tilted Sweep from Pose (Phase 3: Tilt & Record)
  const executeSweepAtPose = useCallback(
    (pose: RoverPose, onSweepComplete?: () => void) => {
      setOperationState("tilt_record");
      setScanMessage(
        `Phase 3 · Tilt & Record: Stepping RPLIDAR head from -30° to +60° from vantage [${pose.x}m, ${pose.z}m].`
      );

      const intervalMs = reducedMotion ? 700 : 350;
      let step = 0;

      sweepTimerRef.current = setInterval(() => {
        const angle = -30 + step * 10;
        setTilt(angle);
        capturePlane(angle, raysPerPlane, pose);

        step++;
        sweepStepRef.current = step;
        setSteps(step);

        if (step >= 10) {
          if (sweepTimerRef.current !== null) {
            clearInterval(sweepTimerRef.current);
            sweepTimerRef.current = null;
          }
          setOperationState("gap_evaluate");
          setScanMessage(
            `Phase 4 · Gap Evaluation: Point cloud updated to ${points.length.toLocaleString()} returns. Quantizing 16 wall height bins.`
          );
          onSweepComplete?.();
        }
      }, intervalMs);
    },
    [capturePlane, raysPerPlane, reducedMotion, points.length]
  );

  // Manual Trigger: Sweep at Current Position
  const runSweep = useCallback(() => {
    cancelOperations();
    sweepStepRef.current = 0;
    setSteps(0);
    executeSweepAtPose(roverPose, () => {
      setOperationState("idle");
    });
  }, [cancelOperations, executeSweepAtPose, roverPose]);

  // Autonomous Chained Exploration & Gap-Fill Survey
  const runAutoGapFill = useCallback(() => {
    cancelOperations();
    setIsAutoSurveying(true);

    const stepExploration = () => {
      // Step 1: If point cloud is empty, execute initial sweep at current spot
      if (points.length === 0) {
        executeSweepAtPose(roverPose, () => {
          setTimeout(stepExploration, 400);
        });
        return;
      }

      // Step 2: Evaluate unmapped shadow gaps & 16 vertical bins
      setOperationState("gap_evaluate");
      const report = analyzeCoverageAndGaps(
        points,
        currentRoom.width,
        currentRoom.depth,
        currentRoom.obstacles
      );

      if (report.coveragePercent >= 92 || !report.primaryGap) {
        setScanMessage(
          `Autonomous survey complete. ${report.coveragePercent}% room perimeter mapped · ${report.capturedBinsCount}/16 height bins captured.`
        );
        setIsAutoSurveying(false);
        setOperationState("idle");
        return;
      }

      const { recommendedVantage, primaryGap } = report;
      setScanMessage(
        `Occlusion detected behind ${primaryGap.wall} sector. Calculating collision-free path to NBV vantage [${recommendedVantage.x}m, ${recommendedVantage.z}m].`
      );

      // Step 3: Compute obstacle-avoiding navigation path
      const path = findNavPath(
        [roverPose.x, roverPose.z],
        [recommendedVantage.x, recommendedVantage.z],
        currentRoom.obstacles,
        currentRoom.width,
        currentRoom.depth
      );

      // Step 4: Navigate rover along path with live mecanum wheel kinematics (Phase 1 -> Phase 2 -> Phase 3)
      navigateRoverAlongPath(path, recommendedVantage.heading, (arrivedPose) => {
        executeSweepAtPose(arrivedPose, () => {
          // Continue autonomous loop if gaps remain
          setTimeout(stepExploration, 500);
        });
      });
    };

    stepExploration();
  }, [
    cancelOperations,
    points,
    currentRoom,
    roverPose,
    executeSweepAtPose,
    navigateRoverAlongPath
  ]);

  // Floor Click Navigation Handler
  const handleFloorClickMove = useCallback(
    (targetPose: RoverPose) => {
      if (operationState === "transit" || operationState === "tilt_record") return;

      const path = findNavPath(
        [roverPose.x, roverPose.z],
        [targetPose.x, targetPose.z],
        currentRoom.obstacles,
        currentRoom.width,
        currentRoom.depth
      );

      navigateRoverAlongPath(path, targetPose.heading, (arrivedPose) => {
        setScanMessage(`Rover arrived at [${arrivedPose.x}m, ${arrivedPose.z}m]. Ready to sweep.`);
      });
    },
    [operationState, roverPose, currentRoom, navigateRoverAlongPath]
  );

  const resetAllScans = useCallback(() => {
    cancelOperations();
    setIsAutoSurveying(false);
    setOperationState("idle");
    setPoints([]);
    setLatestPoints([]);
    setSteps(0);
    sweepStepRef.current = 0;
    const startX = currentRoom.id === "partitioned" ? -2.2 : 0;
    setRoverPose({ x: startX, z: 0, heading: 0 });
    setWheelRPMs([0, 0, 0, 0]);
    setScanMessage("Point cloud reset. Rover repositioned to start pose.");
  }, [cancelOperations, currentRoom.id]);

  // Point cloud metrics
  const stats = useMemo(() => {
    const totalPoints = points.length;
    const latestCount = latestPoints.length;

    let minX = 0, maxX = 0, minY = 0, maxY = 0, minZ = 0, maxZ = 0;
    if (totalPoints > 0) {
      minX = Math.min(...points.map((p) => p.x));
      maxX = Math.max(...points.map((p) => p.x));
      minY = Math.min(...points.map((p) => p.y));
      maxY = Math.max(...points.map((p) => p.y));
      minZ = Math.min(...points.map((p) => p.z));
      maxZ = Math.max(...points.map((p) => p.z));
    }

    return {
      totalPoints,
      latestCount,
      minX,
      maxX,
      minY,
      maxY,
      minZ,
      maxZ,
      estimatedWidth: (maxX - minX).toFixed(2),
      estimatedDepth: (maxZ - minZ).toFixed(2),
      estimatedHeight: (maxY - minY).toFixed(2)
    };
  }, [points, latestPoints]);

  return (
    <div className={styles.workbench}>
      {/* ============================================================= */}
      {/* 1. TOP TOOLBAR CONTROLS (Decluttered, Architectural & Sleek)  */}
      {/* ============================================================= */}
      <div className={styles.toolbar}>
        {/* Left tool group: Room Environment Scenarios */}
        <div className={styles.tools}>
          <div className={styles.toolGroup}>
            {ROOM_PRESETS.map((room) => (
              <button
                key={room.id}
                type="button"
                aria-pressed={selectedRoomId === room.id}
                onClick={() => handleRoomChange(room.id)}
                title={room.description}
              >
                {room.name.split(" ")[0]} ({room.width}×{room.depth}m)
              </button>
            ))}
          </div>

          <div className={styles.toolGroup}>
            <button
              type="button"
              aria-pressed={displayMode === "cloud"}
              onClick={() => setDisplayMode("cloud")}
            >
              3D Cloud
            </button>
            <button
              type="button"
              aria-pressed={displayMode === "split"}
              onClick={() => setDisplayMode("split")}
            >
              Split View
            </button>
            <button
              type="button"
              aria-pressed={displayMode === "slice"}
              onClick={() => setDisplayMode("slice")}
            >
              Planar Slice
            </button>
          </div>
        </div>

        {/* Right tool group: Synchronized Autonomous Actions & Sweep */}
        <div className={styles.tools}>
          <div className={styles.toolGroup}>
            <button
              type="button"
              disabled={operationState !== "idle"}
              onClick={() => {
                const count = capturePlane(tilt, raysPerPlane, roverPose);
                setScanMessage(`${count} synthetic returns captured at tilt ${tilt}°.`);
              }}
              title="Capture single 2D plane at current tilt angle"
            >
              Capture Plane
            </button>
            <button
              type="button"
              aria-pressed={operationState === "tilt_record"}
              disabled={operationState === "transit"}
              onClick={operationState === "tilt_record" ? cancelOperations : runSweep}
              title={
                operationState === "tilt_record"
                  ? "Pause sweep acquisition"
                  : "Sweep 10 planes from -30° to +60°"
              }
            >
              {operationState === "tilt_record"
                ? "Pause Sweep"
                : steps > 0 && steps < 10
                  ? `Resume (${steps}/10)`
                  : "Run 10-Plane Sweep"}
            </button>
            <button
              type="button"
              aria-pressed={isAutoSurveying}
              onClick={isAutoSurveying ? cancelOperations : runAutoGapFill}
              className="!bg-[#111319] !text-white font-bold hover:!bg-[#2E3138]"
              title="Autonomously navigate around obstacles and illuminate shadow gaps"
            >
              {isAutoSurveying ? "Halt Survey" : "Autonomous Survey"}
            </button>
            <button
              type="button"
              onClick={resetAllScans}
              title="Clear point cloud and return rover to start position"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================= */}
      {/* 2. 3D POINT CLOUD VIEWPORT & TACTILE INSPECTOR                */}
      {/* ============================================================= */}
      <div className={styles.canvasRow}>
        {/* Main 3D Stage */}
        <div className={styles.stage}>
          <ScanStage
            points={points}
            latestPoints={latestPoints}
            tiltDeg={tilt}
            sensorHeight={FIXED_SENSOR_HEIGHT}
            roverPose={roverPose}
            onRoverMove={handleFloorClickMove}
            unmappedGaps={coverageReport.gaps}
            obstacles={currentRoom.obstacles}
            navPath={navPath}
            isNavigating={operationState === "transit"}
            wheelRPMs={wheelRPMs}
            roomWidth={currentRoom.width}
            roomDepth={currentRoom.depth}
            roomHeight={currentRoom.height}
            showRoomBounds={showRoomBounds}
            showLaserFan={showLaserFan}
            pointSize={pointSize}
            colorMode={colorMode}
            currentSweepStep={steps}
            isSweeping={operationState === "tilt_record"}
            heightFilter={heightFilter}
            isolatedPlane={isolatedPlane}
            raysPerPlane={raysPerPlane}
            onPointInspect={setProbedPoint}
          />

          {/* Top-Left Stage Overlay: Synchronized Robotics Mission HUD */}
          <div className={styles.stageOverlayTop}>
            <div className={styles.statusPill}>
              <span
                className={`inline-block h-1.5 w-1.5 rounded-full ${
                  operationState === "transit"
                    ? "bg-[#D49520] animate-pulse"
                    : operationState === "settle"
                      ? "bg-[#A87914] animate-pulse"
                      : operationState === "tilt_record"
                        ? "bg-[#E34242] animate-pulse"
                        : operationState === "gap_evaluate"
                          ? "bg-[#288BD5] animate-pulse"
                          : "bg-[#1F6B42]"
                }`}
              />
              <span className="uppercase tracking-wider font-bold">
                {operationState === "transit"
                  ? "Phase 1 · Transit (0° Interlock)"
                  : operationState === "settle"
                    ? "Phase 2 · Settle (0 m/s)"
                    : operationState === "tilt_record"
                      ? `Phase 3 · Tilt & Record (${steps}/10)`
                      : operationState === "gap_evaluate"
                        ? "Phase 4 · Gap & Shadow Eval"
                        : isAutoSurveying
                          ? "Survey Active"
                          : "Stationed / Ready"}
              </span>
              <span>·</span>
              <span>{coverageReport.coveragePercent}% Mapped</span>
            </div>

            <div className={styles.statusPill}>
              <span>
                Pose: [{roverPose.x.toFixed(1)}m, {roverPose.z.toFixed(1)}m] · {roverPose.heading}°
              </span>
            </div>

            {operationState === "transit" && (
              <div className={styles.statusPill}>
                <span>
                  Wheels: {wheelRPMs[0]} / {wheelRPMs[1]} / {wheelRPMs[2]} / {wheelRPMs[3]} RPM
                </span>
              </div>
            )}

            {probedPoint && (
              <div className={styles.statusPill}>
                <span>
                  Probe: X {probedPoint.x.toFixed(2)}m · Y {probedPoint.y.toFixed(2)}m · Z {probedPoint.z.toFixed(2)}m (R {probedPoint.distance.toFixed(2)}m)
                </span>
              </div>
            )}
          </div>

          {/* Floating Picture-in-Picture 2D Top Projection (When in Split Mode) */}
          {(displayMode === "split" || displayMode === "slice") && (
            <div className={styles.pipContainer}>
              <div className={styles.pipHeader}>
                <span>2D Planar Projection</span>
                <span>{latestPoints.length} pts</span>
              </div>
              <ScanPlot
                points={latestPoints.length > 0 ? latestPoints : points}
                rover={roverPose}
                width={currentRoom.width}
                depth={currentRoom.depth}
              />
            </div>
          )}

          {/* Bottom Stage Telemetry Bar */}
          <div className={styles.stageLabel}>
            <div className="flex items-center gap-2 font-mono text-[10px] text-[#68655E]">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#1F6B42]" />
              <span>
                {currentRoom.name} · {currentRoom.obstacles.length} Obstacles · Click floor to navigate rover
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-2 font-mono text-[10px] text-[#68655E]">
              <span>Orbit: Drag · Pan: Right-drag · Click floor to plan route</span>
            </div>
          </div>
        </div>

        {/* Tactile Inspector HUD */}
        <aside className={styles.inspector} aria-label="Scan reconstruction inspector">
          {/* Segmented Tab Header */}
          <div className={styles.inspectorTabs} role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeInspectorTab === "acquisition"}
              onClick={() => setActiveInspectorTab("acquisition")}
              className={styles.tabBtn}
            >
              Acquisition
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeInspectorTab === "slices"}
              onClick={() => setActiveInspectorTab("slices")}
              className={styles.tabBtn}
            >
              Planar Slices
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeInspectorTab === "specs"}
              onClick={() => setActiveInspectorTab("specs")}
              className={styles.tabBtn}
            >
              LiDAR Specs
            </button>
          </div>

          {/* Tab 1: Acquisition, Coverage & Autonomous Survey */}
          {activeInspectorTab === "acquisition" && (
            <div className={styles.tabContent}>
              <div>
                <span className={styles.kicker}>Autonomous Exploration</span>
                <h2 className={styles.heading}>Step-and-Settle Acquisition</h2>
                <p className={styles.lead}>{scanMessage}</p>
              </div>

              {/* 4-Phase Step-and-Settle Lifecycle Visualizer */}
              <div className={styles.paramCard}>
                <span className={styles.controlLabel}>Operational Sequence</span>
                <div className={styles.phaseTrack}>
                  <div
                    className={`${styles.phaseNode} ${
                      operationState === "transit" ? styles.phaseNodeActive : ""
                    }`}
                  >
                    <span>1. Transit</span>
                    <span className="text-[8px] opacity-75 font-normal">0° Interlock</span>
                  </div>
                  <div
                    className={`${styles.phaseNode} ${
                      operationState === "settle" ? styles.phaseNodeSettled : ""
                    }`}
                  >
                    <span>2. Settle</span>
                    <span className="text-[8px] opacity-75 font-normal">Dampen 0m/s</span>
                  </div>
                  <div
                    className={`${styles.phaseNode} ${
                      operationState === "tilt_record" ? styles.phaseNodeScanning : ""
                    }`}
                  >
                    <span>3. Tilt & Rec</span>
                    <span className="text-[8px] opacity-75 font-normal">-30°..+60°</span>
                  </div>
                  <div
                    className={`${styles.phaseNode} ${
                      operationState === "gap_evaluate" ? styles.phaseNodeEvaluating : ""
                    }`}
                  >
                    <span>4. Gap Eval</span>
                    <span className="text-[8px] opacity-75 font-normal">16 Wall Bins</span>
                  </div>
                </div>
              </div>

              {/* Room Boundary Coverage Meter */}
              <div className={styles.paramCard}>
                <div className={styles.controlRow}>
                  <span className={styles.controlLabel}>Perimeter Wall Coverage</span>
                  <span className="font-mono text-[13px] font-bold text-[#111319]">
                    {coverageReport.coveragePercent}%
                  </span>
                </div>
                <div
                  className="h-2 w-full overflow-hidden rounded-full bg-[#E5E1D8]"
                  role="progressbar"
                  aria-valuenow={coverageReport.coveragePercent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className="h-full bg-[#1F6B42] transition-all duration-300"
                    style={{ width: `${coverageReport.coveragePercent}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-[#68655E]">
                  <span>{coverageReport.mappedSegments} / {coverageReport.totalSegments} Sectors Mapped</span>
                  <span>{coverageReport.gaps.length} Unmapped Shadow Gaps</span>
                </div>
              </div>

              {/* Live Mecanum Drive Telemetry */}
              <div className={styles.paramCard}>
                <div className={styles.controlRow}>
                  <span className={styles.controlLabel}>Mecanum Drive Telemetry</span>
                  <span className="font-mono text-[10px] text-[#68655E]">
                    {operationState === "transit" ? "Active Transit" : "Parked"}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-1 pt-1 text-center font-mono text-[10px]">
                  <div className="rounded border border-[#D0CBC0] p-1 bg-[#FAF9F6]">
                    <div className="text-[9px] text-[#68655E]">FL</div>
                    <div className="font-bold">{wheelRPMs[0]}</div>
                  </div>
                  <div className="rounded border border-[#D0CBC0] p-1 bg-[#FAF9F6]">
                    <div className="text-[9px] text-[#68655E]">FR</div>
                    <div className="font-bold">{wheelRPMs[1]}</div>
                  </div>
                  <div className="rounded border border-[#D0CBC0] p-1 bg-[#FAF9F6]">
                    <div className="text-[9px] text-[#68655E]">RL</div>
                    <div className="font-bold">{wheelRPMs[2]}</div>
                  </div>
                  <div className="rounded border border-[#D0CBC0] p-1 bg-[#FAF9F6]">
                    <div className="text-[9px] text-[#68655E]">RR</div>
                    <div className="font-bold">{wheelRPMs[3]}</div>
                  </div>
                </div>
              </div>

              {/* Rover Mecanum Vantage Positioning */}
              <div className={styles.paramCard}>
                <div className={styles.controlRow}>
                  <span className={styles.controlLabel}>Rover Mecanum Vantage</span>
                  <span className={styles.controlValue}>
                    X {roverPose.x.toFixed(1)}m · Z {roverPose.z.toFixed(1)}m
                  </span>
                </div>

                <div className="flex items-center justify-between text-[10px] text-[#68655E] pt-1">
                  <span>Yaw Heading</span>
                  <span className="font-mono text-[10px]">{roverPose.heading}°</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="359"
                  step="5"
                  value={roverPose.heading}
                  onChange={(e) =>
                    setRoverPose((r) => ({ ...r, heading: parseInt(e.target.value, 10) }))
                  }
                  className={styles.slider}
                  aria-label="Rover yaw heading slider in degrees"
                />

                {/* Quick Vantage Jumps */}
                <div className={styles.pillTrack}>
                  <button
                    type="button"
                    onClick={() => handleFloorClickMove({ x: 0, z: 0, heading: 0 })}
                    className={styles.pillBtn}
                  >
                    Center
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleFloorClickMove({
                        x: -currentRoom.width / 4,
                        z: currentRoom.depth / 4,
                        heading: 135
                      })
                    }
                    className={styles.pillBtn}
                  >
                    NW Wing
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleFloorClickMove({
                        x: currentRoom.width / 4,
                        z: -currentRoom.depth / 4,
                        heading: 315
                      })
                    }
                    className={styles.pillBtn}
                  >
                    SE Wing
                  </button>
                </div>
              </div>

              {/* Scanner Mechanical Pitch Tilt */}
              <div className={styles.paramCard}>
                <div className={styles.controlRow}>
                  <label htmlFor="scan-tilt-slider" className={styles.controlLabel}>
                    Scanner Pitch Tilt
                  </label>
                  <span className={styles.controlValue}>{tilt > 0 ? `+${tilt}` : tilt}°</span>
                </div>
                <input
                  id="scan-tilt-slider"
                  type="range"
                  min="-30"
                  max="60"
                  step="1"
                  value={tilt}
                  onChange={(e) => {
                    cancelOperations();
                    setTilt(parseInt(e.target.value, 10));
                  }}
                  className={styles.slider}
                  aria-label="Scanner tilt angle slider in degrees"
                />
                <div className={styles.pillTrack}>
                  {[-30, -15, 0, 15, 30, 45, 60].map((deg) => (
                    <button
                      key={deg}
                      type="button"
                      onClick={() => {
                        cancelOperations();
                        setTilt(deg);
                      }}
                      className={styles.pillBtn}
                      aria-pressed={tilt === deg}
                    >
                      {deg > 0 ? `+${deg}` : deg}°
                    </button>
                  ))}
                </div>
              </div>

              {/* Point Cloud Visualization & Color Mode */}
              <div className={styles.paramCard}>
                <span className={styles.controlLabel}>Point Cloud Visualization</span>
                <div className="flex flex-col gap-2 pt-1">
                  <div className={styles.controlRow}>
                    <span className="text-[10px] text-[#68655E]">Point Size</span>
                    <span className="font-mono text-[10px]">{pointSize}px</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="6"
                    step="0.5"
                    value={pointSize}
                    onChange={(e) => setPointSize(parseFloat(e.target.value))}
                    className={styles.slider}
                    aria-label="Point cloud rendering size"
                  />
                  <div className="pt-2">
                    <span className="text-[10px] text-[#68655E] block mb-1">Color Mode</span>
                    <div className={styles.segmented}>
                      <button
                        type="button"
                        aria-pressed={colorMode === "elevation"}
                        onClick={() => setColorMode("elevation")}
                      >
                        Elevation
                      </button>
                      <button
                        type="button"
                        aria-pressed={colorMode === "laser"}
                        onClick={() => setColorMode("laser")}
                      >
                        Laser Red
                      </button>
                      <button
                        type="button"
                        aria-pressed={colorMode === "plane"}
                        onClick={() => setColorMode("plane")}
                      >
                        Plane ID
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Real-time Buffer Statistics & Reconstructed Volume */}
              <div className={styles.statGrid}>
                <div className={styles.statBox}>
                  <dt>Accumulated Points</dt>
                  <dd>{stats.totalPoints.toLocaleString()}</dd>
                </div>
                <div className={styles.statBox}>
                  <dt>Sweep Planes</dt>
                  <dd>{steps} / 10</dd>
                </div>
              </div>

              <div className={styles.paramCard}>
                <span className={styles.controlLabel}>Reconstructed Spatial Envelope</span>
                <div className="flex items-center justify-between font-mono text-[10px] pt-1 text-[#111319]">
                  <span>{stats.estimatedWidth}m (W) × {stats.estimatedDepth}m (D)</span>
                  <span className="font-bold">{stats.estimatedHeight}m (H)</span>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Planar Slices & Orthographic Plot */}
          {activeInspectorTab === "slices" && (
            <div className={styles.tabContent}>
              <div>
                <span className={styles.kicker}>Orthographic Projection</span>
                <h2 className={styles.heading}>Planar Slice Analysis</h2>
                <p className={styles.lead}>
                  Global X/Z planar projection of captured points. Height is collapsed for spatial footprint review.
                </p>
              </div>

              {/* 16 Vertical Wall Height Bins (from anim/gap-aware.html) */}
              <div className={styles.paramCard}>
                <div className={styles.controlRow}>
                  <span className={styles.controlLabel}>Vertical Wall Height Coverage</span>
                  <span className="font-mono text-[10px] font-bold text-[#111319]">
                    {coverageReport.capturedBinsCount}/16 Bins
                  </span>
                </div>
                <div className="text-[10px] text-[#68655E] pt-0.5">
                  16 height bins of 15 cm · {coverageReport.capturedBinsCount} captured · {coverageReport.unseenBinsCount} unseen · {coverageReport.outOfReachBinsCount} out-of-reach
                </div>

                <div className={styles.heightBinsWrapper}>
                  {coverageReport.heightBins.map((bin) => (
                    <div
                      key={bin.index}
                      className={`${styles.heightBinRow} ${
                        bin.status === "captured"
                          ? styles.heightBinCaptured
                          : bin.status === "out_of_reach"
                            ? styles.heightBinOutOfReach
                            : styles.heightBinUnseen
                      }`}
                    >
                      <span className="font-bold text-[#111319]">
                        Bin {bin.index + 1 < 10 ? `0${bin.index + 1}` : bin.index + 1} ({bin.minY.toFixed(2)}–{bin.maxY.toFixed(2)}m)
                      </span>
                      <span className="capitalize text-[8.5px]">
                        {bin.status === "captured"
                          ? `Captured (${bin.count} pts)`
                          : bin.status === "out_of_reach"
                            ? "Out of Reach"
                            : "Not Yet Seen"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Embedded 2D Scan Plot */}
              <div className="rounded-xl overflow-hidden border border-[#D0CBC0]">
                <ScanPlot
                  points={latestPoints.length > 0 ? latestPoints : points}
                  rover={roverPose}
                  width={currentRoom.width}
                  depth={currentRoom.depth}
                />
              </div>

              {/* Gap Resolution Advisor */}
              <div className={styles.paramCard}>
                <span className={styles.controlLabel}>Gap Resolution Advisor</span>
                {coverageReport.primaryGap ? (
                  <div className="text-[11px] text-[#68655E] pt-1 leading-relaxed">
                    Unmapped shadow on <strong className="text-[#111319] uppercase">{coverageReport.primaryGap.wall}</strong> wall.
                    Recommended rover placement at <span className="font-mono text-[#111319]">[{coverageReport.recommendedVantage.x}m, {coverageReport.recommendedVantage.z}m]</span> heading <span className="font-mono text-[#111319]">{coverageReport.recommendedVantage.heading}°</span>.
                  </div>
                ) : (
                  <div className="text-[11px] text-[#1F6B42] pt-1">
                    No critical gaps detected. Wall perimeter is fully bounded.
                  </div>
                )}
                <button
                  type="button"
                  onClick={runAutoGapFill}
                  className="mt-2 w-full !text-[#A87914] hover:!bg-[#F5EEDC]"
                >
                  Execute Gap-Fill Vantage Move
                </button>
              </div>

              <div className={styles.statGrid}>
                <div className={styles.statBox}>
                  <dt>Active Slice Returns</dt>
                  <dd>{stats.latestCount.toLocaleString()}</dd>
                </div>
                <div className={styles.statBox}>
                  <dt>Angular Resolution</dt>
                  <dd>{(360 / raysPerPlane).toFixed(1)}° ({raysPerPlane} rays)</dd>
                </div>
                <div className={styles.statBox}>
                  <dt>Room Width</dt>
                  <dd>{currentRoom.width} m</dd>
                </div>
                <div className={styles.statBox}>
                  <dt>Room Depth</dt>
                  <dd>{currentRoom.depth} m</dd>
                </div>
              </div>

              <p className="text-[10px] text-[#68655E] leading-relaxed">
                Scan returns are calculated via synthetic raycasting against {currentRoom.width}×{currentRoom.depth}m room walls and {currentRoom.obstacles.length} physical obstacles with zero noise.
              </p>
            </div>
          )}

          {/* Tab 3: Hardware LiDAR & Tilting Mount Specs */}
          {activeInspectorTab === "specs" && (
            <div className={styles.tabContent}>
              <div>
                <span className={styles.kicker}>Optical & Mechanical Subsystem</span>
                <h2 className={styles.heading}>RPLIDAR S2 Specifications</h2>
                <p className={styles.lead}>
                  Direct Time-of-Flight (DTOF) laser scanner mounted on a precision serial bus tilting actuator.
                </p>
              </div>

              <div className={styles.paramCard}>
                <table className={styles.specTable}>
                  <tbody>
                    <tr>
                      <td>Sensor Model</td>
                      <td>Slamtec RPLIDAR S2</td>
                    </tr>
                    <tr>
                      <td>Ranging Technology</td>
                      <td>DTOF (Direct Time-of-Flight)</td>
                    </tr>
                    <tr>
                      <td>Laser Wavelength</td>
                      <td>905 nm (Class 1 Eye Safe)</td>
                    </tr>
                    <tr>
                      <td>Ranging Radius</td>
                      <td>30.0 m (0.05 m blind zone)</td>
                    </tr>
                    <tr>
                      <td>Sample Rate</td>
                      <td>32,000 samples/sec (32 kHz)</td>
                    </tr>
                    <tr>
                      <td>Scan Frequency</td>
                      <td>10 Hz (600 RPM nominal)</td>
                    </tr>
                    <tr>
                      <td>Angular Resolution</td>
                      <td>0.12° (at 10 Hz)</td>
                    </tr>
                    <tr>
                      <td>Sensor Elevation</td>
                      <td>0.50 m (Fixed Mast Ground Height)</td>
                    </tr>
                    <tr>
                      <td>Tilt Actuator</td>
                      <td>ST3215 12V Serial Servo</td>
                    </tr>
                    <tr>
                      <td>Tilt Mechanical Range</td>
                      <td>-30° (Down) to +60° (Up)</td>
                    </tr>
                    <tr>
                      <td>Locomotion Method</td>
                      <td>4-Wheel Mecanum Omnidirectional</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="rounded-xl border border-[#D0CBC0] bg-[#FAF9F6] p-3 text-[10px] text-[#68655E] leading-relaxed">
                <strong className="text-[#111319] block mb-1">Mecanum Exploration Note:</strong>
                The rover does not use mechanical scissor-lift elevators. Instead, it leverages omnidirectional mecanum translation $[x, z]$ and yaw rotation $\theta$ to reposition itself into unoccluded lines of sight, tilting the scanner $\phi$ to resolve shadow gaps across complex geometries.
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

export default ScanWorkbench;
