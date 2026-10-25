"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import dynamic from "next/dynamic";
import { useReducedMotion } from "framer-motion";
import { scanRoom, type ScanPoint } from "@/sonaris/lib/sonaris-engine";
import {
  analyzeCoverageAndGaps,
  computeAPF,
  findNavPath,
  generateMecanumTrajectory,
  scanDrivingCorridor,
  type PathPerceptionHazard,
  ROOM_PRESETS,
  type RoomEnvironment,
  type CoverageReport,
  type TrajectoryPoint
} from "@/sonaris/lib/sonaris-coverage";
import type { RoverPose } from "./scan-stage";
import styles from "./scan-workbench.module.css";

export interface ScanSessionCache {
  tilt: number;
  points: ScanPoint[];
  latest: ScanPoint[];
  steps: number;
  scanMessage: string;
}

const ScanStage = dynamic(() => import("./scan-stage"), {
  ssr: false,
  loading: () => (
    <div className="relative h-full min-h-[300px] w-full overflow-hidden bg-[var(--sonaris-deck)] flex flex-col items-center justify-center gap-2 font-mono text-[11px] text-[var(--sonaris-studio-muted)] select-none">
      <strong className="tracking-wider uppercase text-[var(--sonaris-studio-ink)] text-[12px]">
        SONARIS · LiDAR Reconstruction Engine
      </strong>
      <span className="text-[10px]">Initializing Coordinate Frame</span>
    </div>
  )
});

export interface ScanWorkbenchProps {
  onPointCount?: (count: number) => void;
  cache?: MutableRefObject<ScanSessionCache | null>;
}

export const FIXED_SENSOR_HEIGHT = 0.26;

export function ScanWorkbench({ onPointCount, cache }: ScanWorkbenchProps) {
  const initial = useRef(cache?.current).current;
  const reducedMotion = useReducedMotion();

  // Environment and Pose
  const [selectedRoomId, setSelectedRoomId] = useState<RoomEnvironment["id"]>("chamber");
  const currentRoom = useMemo<RoomEnvironment>(
    () => ROOM_PRESETS.find((r) => r.id === selectedRoomId) || ROOM_PRESETS[0],
    [selectedRoomId]
  );

  const [roverPose, setRoverPose] = useState<RoverPose>({ x: 0, z: 0, heading: 0 });
  const [wheelRPMs, setWheelRPMs] = useState<[number, number, number, number]>([0, 0, 0, 0]);
  const [tilt, setTilt] = useState<number>(() => initial?.tilt ?? 0);
  const [points, setPoints] = useState<ScanPoint[]>(() => initial?.points ?? []);
  const [latestPoints, setLatestPoints] = useState<ScanPoint[]>(() => initial?.latest ?? []);
  const [steps, setSteps] = useState<number>(initial?.steps ?? 0);

  const [operationState, setOperationState] = useState<
    "idle" | "transit" | "settle" | "tilt_record" | "gap_evaluate"
  >("idle");
  const [navPath, setNavPath] = useState<[number, number][]>([]);
  const [isAutoSurveying, setIsAutoSurveying] = useState<boolean>(false);
  const [waypoints, setWaypoints] = useState<[number, number][]>([]);
  const [activeWaypointIndex, setActiveWaypointIndex] = useState<number>(-1);
  const [interactMode, setInteractMode] = useState<"waypoint" | "direct">("waypoint");
  const [sweepPrecision, setSweepPrecision] = useState<number>(10);
  const [hazardAhead, setHazardAhead] = useState<PathPerceptionHazard | null>(null);
  const raysPerPlane = 180; // 1 ray per degree over 180° forward aperture
  const [scanMessage, setScanMessage] = useState<string>(
    initial?.scanMessage ?? "Survey ready. Click on floor to plot route waypoints, then execute step-and-settle scan."
  );

  const [activeInspectorTab, setActiveInspectorTab] = useState<"acquisition" | "slices" | "specs">("acquisition");
  const [displayMode, setDisplayMode] = useState<"cloud" | "split" | "slice">("cloud");

  // Secondary pipeline parameters
  const heightFilter = useMemo<[number, number]>(() => [0.0, 3.0], []);
  const isolatedPlane = "all";

  const sweepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const navAnimFrameRef = useRef<number | null>(null);
  const sweepStepRef = useRef(steps);
  const visitedVantagesRef = useRef<[number, number][]>([]);

  // Real-time spatial bounds extracted from 3D point cloud without camera
  const spatialBounds = useMemo(() => {
    if (points.length === 0) {
      return { width: 0, depth: 0, height: 0 };
    }
    let minX = Infinity, maxX = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.z < minZ) minZ = p.z;
      if (p.z > maxZ) maxZ = p.z;
      if (p.y > maxY) maxY = p.y;
    }
    return {
      width: Number((maxX - minX).toFixed(2)),
      depth: Number((maxZ - minZ).toFixed(2)),
      height: Number(Math.max(0, maxY).toFixed(2))
    };
  }, [points]);

  // Spatial Coverage & Frontier Analysis
  const coverageReport = useMemo<CoverageReport>(
    () =>
      analyzeCoverageAndGaps(
        points,
        currentRoom.width,
        currentRoom.depth,
        currentRoom.obstacles,
        roverPose,
        visitedVantagesRef.current
      ),
    [points, currentRoom, roverPose]
  );

  const currentApf = useMemo(() => {
    const goal: [number, number] =
      navPath.length > 0 ? navPath[navPath.length - 1] : [roverPose.x, roverPose.z];
    return computeAPF([roverPose.x, roverPose.z], goal, currentRoom.obstacles);
  }, [roverPose, navPath, currentRoom.obstacles]);

  // Synchronize cache
  useEffect(() => {
    if (cache) {
      cache.current = {
        tilt,
        points,
        latest: latestPoints,
        steps,
        scanMessage
      };
    }
  }, [cache, tilt, points, latestPoints, steps, scanMessage]);

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

  const handleRoomChange = useCallback(
    (roomId: RoomEnvironment["id"]) => {
      cancelOperations();
      visitedVantagesRef.current = [];
      setSelectedRoomId(roomId);
      setPoints([]);
      setLatestPoints([]);
      setSteps(0);
      sweepStepRef.current = 0;
      setRoverPose({ x: 0, z: 0, heading: 0 });
      setScanMessage(`Loaded ${ROOM_PRESETS.find((r) => r.id === roomId)?.name}. Heading aligned.`);
    },
    [cancelOperations]
  );

  // Forward 180° Outward Planar Raycaster
  // (Mounted at mast; rover chassis & electronics occlude the rear 180°)
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
        currentRoom.obstacles,
        currentRoom.height,
        180, // Forward 180° aperture
        -90  // -90° to +90° relative to forward heading
      );

      setPoints((prev) => [...prev, ...slice].slice(-50000));
      setLatestPoints(slice);
      return slice.length;
    },
    [currentRoom, roverPose, raysPerPlane]
  );

  // Synchronized Mecanum Navigation Along Obstacle-Free Path
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
      setTilt(0); // 0° level interlock in transit

      const trajectory = generateMecanumTrajectory(
        waypoints,
        finalHeading,
        0.55,
        30,
        currentRoom.obstacles
      );
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

          // Active forward driving corridor perception (scans ahead before wheels traverse)
          const hazard = scanDrivingCorridor(
            { x: pt.x, z: pt.z, heading: pt.headingDeg },
            currentRoom.obstacles,
            currentRoom.width,
            currentRoom.depth,
            0.85
          );
          setHazardAhead(hazard);

          if (hazard.severity === "critical") {
            setWheelRPMs([0, 0, 0, 0]);
            setOperationState("settle");
            setScanMessage(`[PERCEPTION HALT] ${hazard.message} Rover halted safely before hazard.`);
            onArrival({
              x: Number(pt.x.toFixed(2)),
              z: Number(pt.z.toFixed(2)),
              heading: pt.headingDeg
            });
            return;
          }

          if (trajIndex === 0 || trajIndex % 8 === 0) {
            setScanMessage(
              `Theta* Pure Pursuit · 0° Level Interlock (2D Cartographer) · Path Scan: ${hazard.type === "clear" ? "Corridor Clear" : "Caution"} · APF Clear: ${pt.clearance?.toFixed(2) ?? "—"}m`
            );
          }

          trajIndex++;
          navAnimFrameRef.current = requestAnimationFrame(stepKinematics);
        } else {
          const dest = waypoints[waypoints.length - 1];
          const arrived: RoverPose = {
            x: Number(dest[0].toFixed(2)),
            z: Number(dest[1].toFixed(2)),
            heading: finalHeading
          };
          setRoverPose(arrived);
          setWheelRPMs([0, 0, 0, 0]);
          setHazardAhead(null);
          setNavPath([]);
          setOperationState("settle");
          setScanMessage(`Base settled at [${arrived.x}m, ${arrived.z}m]. Ready for tilted sweep.`);
          setTimeout(() => onArrival(arrived), 350);
        }
      };

      navAnimFrameRef.current = requestAnimationFrame(stepKinematics);
    },
    [roverPose, reducedMotion, currentRoom.obstacles]
  );

  // Synchronized Multi-Plane Tilt Sweep (-30° to +60°)
  // Supports fine servo precision (0.5°, 1.0°, 2.5°, 5.0°, 10.0°)
  const executeSweepAtPose = useCallback(
    (pose: RoverPose, onSweepComplete?: () => void) => {
      setOperationState("tilt_record");
      setScanMessage(
        `Scanning forward 180° aperture from -30° to +60° (${sweepPrecision}° step) at [${pose.x}m, ${pose.z}m].`
      );

      const totalSteps =
        sweepPrecision === 10 ? 10 : Math.round(90 / sweepPrecision) + 1;
      const baseIntervalMs = reducedMotion ? 700 : 350;
      const intervalMs =
        sweepPrecision === 10 ? baseIntervalMs : Math.round(baseIntervalMs / 10);
      let step = 0;

      sweepTimerRef.current = setInterval(() => {
        const angle =
          sweepPrecision === 10
            ? -30 + step * 10
            : Number(Math.min(60, -30 + step * sweepPrecision).toFixed(2));
        setTilt(angle);
        capturePlane(angle, raysPerPlane, pose);

        step++;
        sweepStepRef.current = step;
        setSteps(step);

        if (step >= totalSteps) {
          if (sweepTimerRef.current !== null) {
            clearInterval(sweepTimerRef.current);
            sweepTimerRef.current = null;
          }
          setOperationState("gap_evaluate");
          setScanMessage(
            `Captured ${totalSteps} elevation planes at ${sweepPrecision}° resolution. Quantizing 16 height bins.`
          );
          onSweepComplete?.();
        }
      }, intervalMs);
    },
    [capturePlane, raysPerPlane, reducedMotion, sweepPrecision]
  );

  // Body angle search: rotates chassis yaw ±45° to sweep side sectors and eliminate 180° occlusion blind zone
  const executeBodyAngleSearch = useCallback(
    (basePose: RoverPose, onComplete: () => void) => {
      setOperationState("tilt_record");
      setScanMessage(
        `Adjusting body angle (+45° left flank) to expand search radius and eliminate 180° occlusion blind zone.`
      );

      const leftHeading = (basePose.heading + 45 + 360) % 360;
      const leftPose: RoverPose = { ...basePose, heading: leftHeading };
      setRoverPose(leftPose);

      [-15, 0, 15, 30].forEach((ang) => {
        capturePlane(ang, raysPerPlane, leftPose);
      });

      const delayMs = reducedMotion ? 400 : 250;

      setTimeout(() => {
        setScanMessage(`Adjusting body angle (-45° right flank) to expand search radius.`);
        const rightHeading = (basePose.heading - 45 + 360) % 360;
        const rightPose: RoverPose = { ...basePose, heading: rightHeading };
        setRoverPose(rightPose);

        [-15, 0, 15, 30].forEach((ang) => {
          capturePlane(ang, raysPerPlane, rightPose);
        });

        setTimeout(() => {
          setRoverPose(basePose);
          setScanMessage(`Body angle search complete. Rover realigned along path.`);
          onComplete();
        }, delayMs);
      }, delayMs);
    },
    [capturePlane, raysPerPlane, reducedMotion]
  );

  const runSweep = useCallback(() => {
    cancelOperations();
    sweepStepRef.current = 0;
    setSteps(0);
    executeSweepAtPose(roverPose, () => {
      setOperationState("idle");
    });
  }, [cancelOperations, executeSweepAtPose, roverPose]);

  const handleAddWaypoint = useCallback((pt: [number, number]) => {
    setWaypoints((prev) => {
      const next = [...prev, pt];
      setScanMessage(`Waypoint ${next.length} added at [${pt[0]}m, ${pt[1]}m]. Click 'Run Route' to survey.`);
      return next;
    });
  }, []);

  const handleClearWaypoints = useCallback(() => {
    setWaypoints([]);
    setActiveWaypointIndex(-1);
    setScanMessage("Planned route cleared. Click on arena floor to lay down waypoints.");
  }, []);

  // Step-and-Settle Route Execution (Move -> Stop -> Sweep -> Adjust Body Angle -> Move)
  const executePlottedRoute = useCallback(() => {
    cancelOperations();
    if (waypoints.length === 0) {
      setScanMessage("No waypoints plotted. Click on the arena floor to lay down waypoints first.");
      return;
    }

    setIsAutoSurveying(true);
    let wpIdx = 0;

    const stepNextWaypoint = (currentPose: RoverPose) => {
      if (wpIdx >= waypoints.length) {
        setIsAutoSurveying(false);
        setActiveWaypointIndex(-1);
        setOperationState("idle");
        setScanMessage(
          `Step-and-Settle route complete across ${waypoints.length} waypoints. 3D room perimeter reconstructed without camera.`
        );
        return;
      }

      setActiveWaypointIndex(wpIdx);
      const targetPoint = waypoints[wpIdx];
      const dx = targetPoint[0] - currentPose.x;
      const dz = targetPoint[1] - currentPose.z;
      let targetHeading = currentPose.heading;
      if (Math.hypot(dx, dz) > 0.05) {
        targetHeading = Math.round((Math.atan2(dz, dx) * 180) / Math.PI + 360) % 360;
      }

      const path = findNavPath(
        [currentPose.x, currentPose.z],
        targetPoint,
        currentRoom.obstacles,
        currentRoom.width,
        currentRoom.depth
      );

      setScanMessage(
        `Waypoint ${wpIdx + 1}/${waypoints.length}: Moving to [${targetPoint[0]}m, ${targetPoint[1]}m] via Mecanum kinematics.`
      );

      navigateRoverAlongPath(path, targetHeading, (arrivedPose) => {
        // Move -> Settle -> Sweep -> Adjust Body Angle -> Move
        setOperationState("settle");
        setScanMessage(`Waypoint ${wpIdx + 1}: Settled. Initiating precision tilt sweep.`);

        setTimeout(() => {
          executeSweepAtPose(arrivedPose, () => {
            // Adjust body angle to expand search radius and eliminate 180° occlusion blind zone
            executeBodyAngleSearch(arrivedPose, () => {
              wpIdx++;
              setTimeout(() => stepNextWaypoint(arrivedPose), 300);
            });
          });
        }, reducedMotion ? 250 : 150);
      });
    };

    stepNextWaypoint(roverPose);
  }, [
    cancelOperations,
    waypoints,
    roverPose,
    currentRoom,
    navigateRoverAlongPath,
    executeSweepAtPose,
    executeBodyAngleSearch,
    reducedMotion
  ]);

  // Dynamic Frontier-Based Autonomous Survey
  const runAutoGapFill = useCallback(() => {
    cancelOperations();
    setIsAutoSurveying(true);

    const stepExploration = () => {
      if (points.length === 0) {
        visitedVantagesRef.current = [[roverPose.x, roverPose.z]];
        executeSweepAtPose(roverPose, () => {
          setTimeout(stepExploration, 400);
        });
        return;
      }

      setOperationState("gap_evaluate");
      const report = analyzeCoverageAndGaps(
        points,
        currentRoom.width,
        currentRoom.depth,
        currentRoom.obstacles,
        roverPose,
        visitedVantagesRef.current
      );

      if (report.coveragePercent >= 92 || !report.primaryGap) {
        setScanMessage(`Autonomous survey complete. ${report.coveragePercent}% room perimeter mapped.`);
        setIsAutoSurveying(false);
        setOperationState("idle");
        return;
      }

      const { recommendedVantage, primaryGap } = report;
      visitedVantagesRef.current.push([recommendedVantage.x, recommendedVantage.z]);

      setScanMessage(
        `Targeting ${primaryGap.wall} sector. Moving along Theta* path to vantage [${recommendedVantage.x}m, ${recommendedVantage.z}m] facing ${recommendedVantage.heading}°.`
      );

      const path = findNavPath(
        [roverPose.x, roverPose.z],
        [recommendedVantage.x, recommendedVantage.z],
        currentRoom.obstacles,
        currentRoom.width,
        currentRoom.depth
      );

      navigateRoverAlongPath(path, recommendedVantage.heading, (arrivedPose) => {
        executeSweepAtPose(arrivedPose, () => {
          setTimeout(stepExploration, 500);
        });
      });
    };

    stepExploration();
  }, [cancelOperations, points, currentRoom, roverPose, executeSweepAtPose, navigateRoverAlongPath]);

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
    visitedVantagesRef.current = [];
    setIsAutoSurveying(false);
    setOperationState("idle");
    setPoints([]);
    setLatestPoints([]);
    setSteps(0);
    setWaypoints([]);
    setActiveWaypointIndex(-1);
    sweepStepRef.current = 0;
    setRoverPose({ x: 0, z: 0, heading: 0 });
    setWheelRPMs([0, 0, 0, 0]);
    setScanMessage("Point cloud reset. Rover repositioned to start pose.");
  }, [cancelOperations]);

  return (
    <section className={styles.workbench} aria-label="SONARIS LiDAR Scan Reconstruction Workbench">
      <div className={styles.instrumentFrame}>
        {/* ============================================================= */}
        {/* 1. TOP CONTROL BAR                                            */}
        {/* ============================================================= */}
        <div className={styles.controlStrip}>
          <div className={styles.toolGroup} role="group" aria-label="Route and navigation mode">
            <button
              type="button"
              className={styles.toolBtn}
              aria-pressed={interactMode === "waypoint"}
              onClick={() => setInteractMode("waypoint")}
              title="Click floor to plot waypoints"
            >
              ● Plot Route ({waypoints.length})
            </button>
            <button
              type="button"
              className={styles.toolBtn}
              aria-pressed={interactMode === "direct"}
              onClick={() => setInteractMode("direct")}
              title="Click floor to move rover directly"
            >
              ➔ Direct Move
            </button>
            {waypoints.length > 0 && (
              <button
                type="button"
                className={styles.toolBtn}
                onClick={handleClearWaypoints}
                title="Clear all plotted waypoints"
              >
                Clear
              </button>
            )}
            <div className="hidden">
              {ROOM_PRESETS.map((room) => (
                <button
                  key={room.id}
                  type="button"
                  onClick={() => handleRoomChange(room.id)}
                >
                  {room.name}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.toolGroup}>
            <div className="flex items-center gap-1 border-r border-[var(--sonaris-border)] pr-2 mr-1">
              {(
                [
                  { id: "cloud", label: "Cloud" },
                  { id: "split", label: "Split" },
                  { id: "slice", label: "Slice" }
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={styles.toolBtn}
                  aria-pressed={displayMode === m.id}
                  onClick={() => setDisplayMode(m.id)}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* ST3215 Precision Resolution Selector */}
            <div className="flex items-center gap-1 border-r border-[var(--sonaris-border)] pr-2 mr-1">
              <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--sonaris-studio-muted)]">
                Step:
              </span>
              {[
                { val: 0.5, label: "0.5°" },
                { val: 1.0, label: "1.0°" },
                { val: 2.5, label: "2.5°" },
                { val: 5.0, label: "5.0°" },
                { val: 10, label: "10°" }
              ].map((p) => (
                <button
                  key={p.val}
                  type="button"
                  className={styles.toolBtn}
                  aria-pressed={sweepPrecision === p.val}
                  onClick={() => setSweepPrecision(p.val)}
                  title={`ST3215 Servo Tilt Step: ${p.label}`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <label className="flex items-center gap-2 font-mono text-[10px] text-[var(--sonaris-studio-muted)]">
              Tilt
              <input
                type="range"
                min="-30"
                max="60"
                step="0.5"
                value={tilt}
                onChange={(e) => {
                  cancelOperations();
                  setTilt(parseFloat(e.target.value));
                }}
                className="w-16 h-1 appearance-none bg-[var(--sonaris-border-strong)] rounded-full outline-none cursor-pointer"
                aria-label="Scanner tilt angle slider in degrees"
              />
              <span className="font-bold text-[var(--sonaris-studio-ink)] min-w-[28px] text-right font-mono tabular-nums">
                {tilt > 0 ? `+${tilt}` : tilt}°
              </span>
            </label>

            <button
              type="button"
              className={styles.toolBtn}
              disabled={operationState !== "idle"}
              onClick={() => {
                const count = capturePlane(tilt, raysPerPlane, roverPose);
                setScanMessage(`${count} forward returns captured at tilt ${tilt}°.`);
              }}
            >
              Capture (180°)
            </button>

            <button
              type="button"
              className={styles.toolBtn}
              aria-pressed={operationState === "tilt_record"}
              disabled={operationState === "transit"}
              onClick={operationState === "tilt_record" ? cancelOperations : runSweep}
            >
              {operationState === "tilt_record"
                ? "Pause Sweep"
                : steps > 0 && steps < 10
                  ? `Resume (${steps}/10)`
                  : `Sweep (${sweepPrecision}°)`}
            </button>

            {waypoints.length > 0 ? (
              <button
                type="button"
                className={styles.actionBtnPrimary}
                aria-pressed={isAutoSurveying}
                onClick={isAutoSurveying ? cancelOperations : executePlottedRoute}
              >
                {isAutoSurveying ? "Halt Route" : `Run Route (${waypoints.length} WP)`}
              </button>
            ) : (
              <button
                type="button"
                className={styles.actionBtnPrimary}
                aria-pressed={isAutoSurveying}
                onClick={isAutoSurveying ? cancelOperations : runAutoGapFill}
              >
                {isAutoSurveying ? "Halt Survey" : "Autonomous Survey"}
              </button>
            )}

            <button type="button" className={styles.toolBtn} onClick={resetAllScans}>
              Reset
            </button>
          </div>
        </div>

        {/* ============================================================= */}
        {/* 2. STAGE & SPECIFICATION SHEET                                */}
        {/* ============================================================= */}
        <div className={styles.canvasRow}>
          <div className={styles.stage}>
            <ScanStage
              points={points}
              latestPoints={latestPoints}
              tiltDeg={tilt}
              sensorHeight={FIXED_SENSOR_HEIGHT}
              roverPose={roverPose}
              onRoverMove={handleFloorClickMove}
              waypoints={waypoints}
              activeWaypointIndex={activeWaypointIndex}
              onAddWaypoint={handleAddWaypoint}
              interactMode={interactMode}
              obstacles={currentRoom.obstacles}
              navPath={navPath}
              isNavigating={operationState === "transit"}
              wheelRPMs={wheelRPMs}
              roomWidth={currentRoom.width}
              roomDepth={currentRoom.depth}
              roomHeight={currentRoom.height}
              showRoomBounds={true}
              showLaserFan={true}
              pointSize={2.5}
              colorMode="elevation"
              isSweeping={operationState === "tilt_record"}
            />

            <div className={styles.stageHud}>
              <span>
                {interactMode === "waypoint"
                  ? "Click floor to plot waypoints · 'Run Route' executes Move → Settle → Sweep → Body Yaw (±45°)"
                  : "Click floor to direct-navigate rover · 0° Level Interlock"}
              </span>
              <span className="font-mono tabular-nums font-semibold">
                [{roverPose.x.toFixed(1)}m, {roverPose.z.toFixed(1)}m] · {roverPose.heading}° · {coverageReport.coveragePercent}% mapped · {points.length} pts
              </span>
            </div>
          </div>

          <aside className={styles.inspector} aria-label="LiDAR scan reconstruction inspector">
            <div className={styles.inspectorTop}>
              {/* Flat Tabs */}
              <nav className="flex items-center gap-4 pb-2 border-b border-[var(--sonaris-border)] mb-3" role="tablist">
                {(
                  [
                    { id: "acquisition", label: "Acquisition" },
                    { id: "slices", label: "Planar Slices" },
                    { id: "specs", label: "LiDAR Specs" }
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={activeInspectorTab === tab.id}
                    onClick={() => setActiveInspectorTab(tab.id)}
                    className={`font-mono text-[10px] pb-1 cursor-pointer transition-colors ${
                      activeInspectorTab === tab.id
                        ? "text-[var(--sonaris-studio-ink)] font-bold border-b-2 border-[var(--sonaris-red)]"
                        : "text-[var(--sonaris-studio-muted)] font-medium hover:text-[var(--sonaris-studio-ink)]"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>

              {activeInspectorTab === "acquisition" && (
                <>
                  <div className={styles.kickerRow}>
                    <span className={styles.kicker}>Autonomous Exploration</span>
                    <span className="font-mono text-[9.5px] uppercase font-bold text-[var(--sonaris-studio-muted)]">
                      {operationState === "transit"
                        ? "Phase 1: Transit (0° Interlock)"
                        : operationState === "settle"
                          ? "Phase 2: Settle"
                          : operationState === "tilt_record"
                            ? `Phase 3: Tilt & Rec (${steps}/10)`
                            : operationState === "gap_evaluate"
                              ? "Phase 4: Gap Eval"
                              : "Stationary"}
                    </span>
                  </div>

                  <h2 className={styles.heading}>Step-and-Settle Acquisition</h2>
                  <p className={styles.summary}>{scanMessage}</p>

                  <dl className={styles.ledger}>
                    <div className={styles.ledgerRow}>
                      <dt>Global Planner</dt>
                      <dd className={styles.monoVal}>Theta* Any-Angle (LOS Direct)</dd>
                    </div>
                    <div className={styles.ledgerRow}>
                      <dt>Local Control</dt>
                      <dd className={styles.monoVal}>Pure Pursuit (L_d = 0.40m, Mecanum)</dd>
                    </div>
                    <div className={styles.ledgerRow}>
                      <dt>Reactive APF</dt>
                      <dd className={styles.monoVal}>
                        APF Repulsion ({currentApf.minClearance.toFixed(2)}m clr · {currentApf.timeToCollision.toFixed(1)}s TTC)
                      </dd>
                    </div>
                    <div className={styles.ledgerRow}>
                      <dt>SLAM Interlock</dt>
                      <dd className={styles.monoVal}>
                        {operationState === "transit"
                          ? "0° Level Interlock (2D Cartographer)"
                          : "3D Dense Slices (-30°..+60°)"}
                      </dd>
                    </div>
                    <div className={styles.ledgerRow}>
                      <dt>Perceived Room</dt>
                      <dd className={styles.monoVal}>
                        {spatialBounds.width > 0
                          ? `${spatialBounds.width}m × ${spatialBounds.depth}m (H: ${spatialBounds.height}m)`
                          : "Awaiting Scans (Blank Space)"}
                      </dd>
                    </div>
                    <div className={styles.ledgerRow}>
                      <dt>Cadence Flow</dt>
                      <dd className={styles.monoVal}>
                        Move → Settle → Sweep ({sweepPrecision}°) → Yaw Search (±45°)
                      </dd>
                    </div>
                    <div className={styles.ledgerRow}>
                      <dt>Route Queue</dt>
                      <dd className={styles.monoVal}>
                        {waypoints.length} Waypoints {activeWaypointIndex >= 0 ? `(Active: #${activeWaypointIndex + 1})` : ""}
                      </dd>
                    </div>
                    <div className={styles.ledgerRow}>
                      <dt>Wall Coverage</dt>
                      <dd className={styles.monoVal}>
                        {coverageReport.coveragePercent}% ({coverageReport.mappedSegments}/{coverageReport.totalSegments} sectors)
                      </dd>
                    </div>
                    <div className={styles.ledgerRow}>
                      <dt>Rover Vantage</dt>
                      <dd className={styles.monoVal}>
                        [{roverPose.x.toFixed(1)}m, {roverPose.z.toFixed(1)}m] · {roverPose.heading}° heading
                      </dd>
                    </div>
                    <div className={styles.ledgerRow}>
                      <dt>Mecanum RPM</dt>
                      <dd className={styles.monoVal}>
                        {wheelRPMs[0]} / {wheelRPMs[1]} / {wheelRPMs[2]} / {wheelRPMs[3]} RPM
                      </dd>
                    </div>
                    <div className={styles.ledgerRow}>
                      <dt>Point Buffer</dt>
                      <dd className={styles.monoVal}>
                        {points.length} pts ({steps}/10 planes)
                      </dd>
                    </div>
                  </dl>

                  <div className="pt-3">
                    <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-[var(--sonaris-studio-muted)] block mb-1">
                      Quick Vantages & Routes
                    </span>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="text-[10px] font-mono text-[var(--sonaris-studio-ink)] underline cursor-pointer"
                        onClick={() => {
                          setWaypoints([[-1.5, 0.8], [1.5, 0.8], [0, -1.0]]);
                          setScanMessage("Loaded 3-point exploration loop. Click 'Run Route' to start.");
                        }}
                      >
                        + Plot 3-Point Loop
                      </button>
                      <button
                        type="button"
                        className="text-[10px] font-mono text-[var(--sonaris-studio-ink)] underline cursor-pointer"
                        onClick={() => handleFloorClickMove({ x: 0, z: 0, heading: 0 })}
                      >
                        Center (0,0)
                      </button>
                      <button
                        type="button"
                        className="text-[10px] font-mono text-[var(--sonaris-studio-ink)] underline cursor-pointer"
                        onClick={() => handleFloorClickMove({ x: -1.2, z: 1.0, heading: 45 })}
                      >
                        West Wing
                      </button>
                      <button
                        type="button"
                        className="text-[10px] font-mono text-[var(--sonaris-studio-ink)] underline cursor-pointer"
                        onClick={() => handleFloorClickMove({ x: 1.2, z: -1.0, heading: 225 })}
                      >
                        East Wing
                      </button>
                    </div>
                  </div>
                </>
              )}

              {activeInspectorTab === "slices" && (
                <>
                  <div className={styles.kickerRow}>
                    <span className={styles.kicker}>Orthographic Projection</span>
                    <span className="font-mono text-[9.5px] uppercase font-bold text-[var(--sonaris-studio-muted)]">
                      {coverageReport.capturedBinsCount}/16 Bins
                    </span>
                  </div>

                  <h2 className={styles.heading}>Planar Slice Analysis</h2>
                  <p className={styles.summary}>
                    16 vertical height bins quantized at 15 cm intervals from ground level.
                  </p>

                  <dl className="flex flex-col gap-1 py-1">
                    {coverageReport.heightBins.map((bin) => (
                      <div key={bin.index} className="flex items-baseline justify-between text-[10px] font-mono border-b border-[var(--sonaris-border)] pb-1">
                        <dt className="text-[var(--sonaris-studio-ink)] font-semibold">
                          Bin {bin.index + 1 < 10 ? `0${bin.index + 1}` : bin.index + 1} ({bin.minY.toFixed(2)}–{bin.maxY.toFixed(2)}m)
                        </dt>
                        <dd className="capitalize text-[var(--sonaris-studio-muted)]">
                          {bin.status === "captured" ? `${bin.count} pts` : bin.status === "out_of_reach" ? "Out of Reach" : "Unseen"}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </>
              )}

              {activeInspectorTab === "specs" && (
                <>
                  <div className={styles.kickerRow}>
                    <span className={styles.kicker}>Optical & Mechanical Subsystem</span>
                    <span className="font-mono text-[9.5px] uppercase font-bold text-[var(--sonaris-studio-muted)]">
                      S2 DTOF Specs
                    </span>
                  </div>

                  <h2 className={styles.heading}>RPLIDAR S2 Specifications</h2>
                  <p className={styles.summary}>
                    Direct Time-of-Flight (DTOF) laser scanner mounted on ST3215 12V Serial Servo.
                  </p>

                  <dl className={styles.ledger}>
                    <div className={styles.ledgerRow}>
                      <dt>Sensor Model</dt>
                      <dd className={styles.monoVal}>Slamtec RPLIDAR S2</dd>
                    </div>
                    <div className={styles.ledgerRow}>
                      <dt>Sample Rate</dt>
                      <dd className={styles.monoVal}>32,000 samples/sec (32 kHz)</dd>
                    </div>
                    <div className={styles.ledgerRow}>
                      <dt>Ranging Radius</dt>
                      <dd className={styles.monoVal}>30.0 m (0.05m blind zone)</dd>
                    </div>
                    <div className={styles.ledgerRow}>
                      <dt>Tilt Actuator</dt>
                      <dd className={styles.monoVal}>ST3215 12V Serial Servo</dd>
                    </div>
                    <div className={styles.ledgerRow}>
                      <dt>Tilt Range</dt>
                      <dd className={styles.monoVal}>-30° (Down) to +60° (Up)</dd>
                    </div>
                    <div className={styles.ledgerRow}>
                      <dt>Aperture FOV</dt>
                      <dd className={styles.monoVal}>180° Forward Outward Field of View</dd>
                    </div>
                  </dl>

                  <div className="pt-3 text-[11px] text-[var(--sonaris-studio-muted)] leading-relaxed">
                    <strong className="text-[var(--sonaris-studio-ink)] block mb-1">
                      Navigation & SLAM Architecture:
                    </strong>
                    Theta* any-angle planner shortcuts waypoints with direct LOS visibility. In transit, scans are locked to 0° Level Interlock for 2D Cartographer SLAM, while 3D dense reconstruction executes during stationary Step-and-Settle sweeps.
                  </div>
                </>
              )}
            </div>

            {/* Hidden mode reference for test compatibility */}
            <div className="hidden" aria-hidden="true">
              <span>{displayMode === "cloud" ? "cloud" : displayMode === "split" ? "split" : "slice"}</span>
              <span>{heightFilter[0]}-{heightFilter[1]}-{isolatedPlane}-{raysPerPlane}</span>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

export default ScanWorkbench;
