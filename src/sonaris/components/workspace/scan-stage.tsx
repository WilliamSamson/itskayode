"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { assemblyParts } from "@/sonaris/lib/sonaris-assembly";
import type { ScanPoint, ScanObstacle } from "@/sonaris/lib/sonaris-engine";
import {
  getRoomAttitudeAt,
  getRoomElevationAt,
  resolveRoverCollision,
  type RoomEnvironment
} from "@/sonaris/lib/sonaris-coverage";
import { createAssemblyModel } from "./assembly-models";

export interface ProbedPoint {
  x: number;
  y: number;
  z: number;
  distance: number;
}

export interface RoverPose {
  x: number;
  z: number;
  heading: number; // yaw in degrees (0° = +X, 90° = +Z, 180° = -X, 270° = -Z)
}

export interface ScanStageProps {
  points: ScanPoint[];
  latestPoints: ScanPoint[];
  tiltDeg: number;
  sensorHeight?: number;
  roverPose?: RoverPose;
  onRoverMove?: (pose: RoverPose) => void;
  waypoints?: [number, number][];
  activeWaypointIndex?: number;
  onAddWaypoint?: (point: [number, number]) => void;
  interactMode?: "waypoint" | "direct";
  obstacles?: ScanObstacle[];
  currentRoom?: RoomEnvironment;
  navPath?: [number, number][];
  odometryTrack?: [number, number][];
  isNavigating?: boolean;
  isHazardAhead?: boolean;
  wheelRPMs?: [number, number, number, number];
  roomWidth: number;
  roomDepth: number;
  roomHeight?: number;
  showRoomBounds?: boolean;
  showLaserFan?: boolean;
  pointSize?: number;
  colorMode?: "elevation" | "laser" | "plane";
  isSweeping?: boolean;
  registrationMode?: "slam_registered" | "raw_odometry";
  scanApertureDeg?: number;
  showGroundTruth?: boolean;
}

const PLANE_PALETTE = [
  new THREE.Color("#E34242"),
  new THREE.Color("#E8702A"),
  new THREE.Color("#D49520"),
  new THREE.Color("#2E9354"),
  new THREE.Color("#288BD5"),
  new THREE.Color("#6B5BD5"),
  new THREE.Color("#A83FA8")
];

// Pre-allocated static colors for zero-allocation point cloud streaming
const STATIC_TEMP_COLOR = new THREE.Color();
const COLOR_LASER_RED = new THREE.Color("#ff3333");

// Calibrated robotic elevation colormap for distinct terrain & obstacle heights
const COLOR_ELEV_VOID = new THREE.Color("#ef4444");      // Below floor: Sump pit / void hazard (-0.40m)
const COLOR_ELEV_FLOOR = new THREE.Color("#38bdf8");     // Floor datum: Level runway floor (0.0m)
const COLOR_ELEV_BUMP = new THREE.Color("#f59e0b");      // Micro-relief: Washboard bumps, gravel, curb (+0.02 - 0.04m)
const COLOR_ELEV_SLOPE = new THREE.Color("#10b981");     // Incline: Navigable climbing/descent ramps (+0.05 - 0.40m)
const COLOR_ELEV_PLATFORM = new THREE.Color("#06b6d4");  // Mezzanine: Elevated platform deck (+0.45m)
const COLOR_ELEV_MIDWALL = new THREE.Color("#a855f7");   // Low fixtures: Benches, columns, partition walls (+0.55 - 1.4m)
const COLOR_ELEV_HIGHWALL = new THREE.Color("#f8fafc");  // Upper enclosure: Upper boundary perimeter walls (>1.4m)

function disposeObject(object: THREE.Object3D) {
  if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Points) {
    object.geometry?.dispose();
    if (Array.isArray(object.material)) {
      object.material.forEach((m) => m.dispose());
    } else if (object.material) {
      object.material.dispose();
    }
  }
}

function clearAndDisposeGroup(group: THREE.Group) {
  while (group.children.length > 0) {
    const child = group.children[0];
    group.remove(child);
    child.traverse((obj) => disposeObject(obj));
  }
}

function createRampGeometry(
  w: number,
  h: number,
  d: number,
  dir: "posX" | "negX" | "posZ" | "negZ" = "posZ"
): THREE.BufferGeometry {
  const halfW = w / 2;
  const halfD = d / 2;
  let vertices: number[];
  if (dir === "posZ") {
    vertices = [
      // Sloped face
      -halfW, 0, -halfD,   halfW, 0, -halfD,   halfW, h, halfD,
      -halfW, 0, -halfD,   halfW, h, halfD,   -halfW, h, halfD,
      // Back face
      -halfW, h, halfD,    halfW, h, halfD,    halfW, 0, halfD,
      -halfW, h, halfD,    halfW, 0, halfD,   -halfW, 0, halfD,
      // Left triangle
      -halfW, 0, -halfD,  -halfW, h, halfD,   -halfW, 0, halfD,
      // Right triangle
      halfW, 0, -halfD,    halfW, 0, halfD,    halfW, h, halfD,
      // Bottom face
      -halfW, 0, -halfD,  -halfW, 0, halfD,    halfW, 0, halfD,
      -halfW, 0, -halfD,   halfW, 0, halfD,    halfW, 0, -halfD
    ];
  } else if (dir === "negZ") {
    vertices = [
      // Sloped face
      halfW, 0, halfD,    -halfW, 0, halfD,   -halfW, h, -halfD,
      halfW, 0, halfD,    -halfW, h, -halfD,   halfW, h, -halfD,
      // Back face
      halfW, h, -halfD,   -halfW, h, -halfD,  -halfW, 0, -halfD,
      halfW, h, -halfD,   -halfW, 0, -halfD,   halfW, 0, -halfD,
      // Left triangle
      -halfW, 0, halfD,   -halfW, h, -halfD,  -halfW, 0, -halfD,
      // Right triangle
      halfW, 0, halfD,     halfW, 0, -halfD,   halfW, h, -halfD,
      // Bottom face
      -halfW, 0, -halfD,  -halfW, 0, halfD,    halfW, 0, halfD,
      -halfW, 0, -halfD,   halfW, 0, halfD,    halfW, 0, -halfD
    ];
  } else if (dir === "posX") {
    vertices = [
      // Sloped face
      -halfW, 0, halfD,   -halfW, 0, -halfD,   halfW, h, -halfD,
      -halfW, 0, halfD,    halfW, h, -halfD,   halfW, h, halfD,
      // Back face
      halfW, h, halfD,     halfW, h, -halfD,   halfW, 0, -halfD,
      halfW, h, halfD,     halfW, 0, -halfD,   halfW, 0, halfD,
      // Front triangle
      -halfW, 0, halfD,    halfW, 0, halfD,    halfW, h, halfD,
      // Back triangle
      -halfW, 0, -halfD,   halfW, h, -halfD,   halfW, 0, -halfD,
      // Bottom face
      -halfW, 0, -halfD,  -halfW, 0, halfD,    halfW, 0, halfD,
      -halfW, 0, -halfD,   halfW, 0, halfD,    halfW, 0, -halfD
    ];
  } else {
    vertices = [
      // Sloped face
      halfW, 0, -halfD,    halfW, 0, halfD,   -halfW, h, halfD,
      halfW, 0, -halfD,   -halfW, h, halfD,   -halfW, h, -halfD,
      // Back face
      -halfW, h, halfD,   -halfW, h, -halfD,  -halfW, 0, -halfD,
      -halfW, h, halfD,   -halfW, 0, -halfD,  -halfW, 0, halfD,
      // Front triangle
      halfW, 0, halfD,    -halfW, 0, halfD,   -halfW, h, halfD,
      // Back triangle
      halfW, 0, -halfD,   -halfW, 0, -halfD,  -halfW, h, -halfD,
      // Bottom face
      -halfW, 0, -halfD,  -halfW, 0, halfD,    halfW, 0, halfD,
      -halfW, 0, -halfD,   halfW, 0, halfD,    halfW, 0, -halfD
    ];
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geo.computeVertexNormals();
  return geo;
}

export default function ScanStage({
  points,
  latestPoints,
  tiltDeg,
  sensorHeight = 0.26,
  roverPose = { x: 0, z: 0, heading: 0 },
  onRoverMove,
  waypoints = [],
  activeWaypointIndex = -1,
  onAddWaypoint,
  interactMode = "waypoint",
  obstacles = [],
  currentRoom,
  navPath = [],
  odometryTrack = [],
  isNavigating = false,
  isHazardAhead = false,
  roomWidth,
  roomDepth,
  roomHeight = 3,
  showRoomBounds = true,
  showLaserFan = true,
  pointSize = 2.5,
  colorMode = "elevation",
  isSweeping = false,
  registrationMode = "slam_registered",
  scanApertureDeg = 270,
  showGroundTruth = false
}: ScanStageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const runtimeRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    pointsMesh: THREE.Points;
    latestMesh: THREE.Points;
    ribbonsMesh: THREE.LineSegments;
    roomGroup: THREE.Group;
    obstaclesGroup: THREE.Group;
    pathGroup: THREE.Group;
    trackGroup: THREE.Group;
    roverGroup: THREE.Group;
    scaledChassis: THREE.Group;
    corridorMesh: THREE.Mesh;
    tiltHead: THREE.Group;
    laserFan: THREE.Group;
    laserBeam: THREE.Line;
    floorMesh: THREE.Mesh;
    render: () => void;
    wake: () => void;
  } | null>(null);

  const [webglError, setWebglError] = useState<string | null>(null);
  const onRoverMoveRef = useRef(onRoverMove);
  onRoverMoveRef.current = onRoverMove;
  const onAddWaypointRef = useRef(onAddWaypoint);
  onAddWaypointRef.current = onAddWaypoint;
  const interactModeRef = useRef(interactMode);
  interactModeRef.current = interactMode;
  const roverPoseRef = useRef(roverPose);
  roverPoseRef.current = roverPose;
  const isSweepingRef = useRef(isSweeping);
  isSweepingRef.current = isSweeping;
  const showLaserFanRef = useRef(showLaserFan);
  showLaserFanRef.current = showLaserFan;
  const isHazardAheadRef = useRef(isHazardAhead);
  isHazardAheadRef.current = isHazardAhead;
  const isNavigatingRef = useRef(isNavigating);
  isNavigatingRef.current = isNavigating;
  const registrationModeRef = useRef(registrationMode);
  registrationModeRef.current = registrationMode;
  const scanApertureRef = useRef(scanApertureDeg);
  scanApertureRef.current = scanApertureDeg;
  const prevNavigatingRef = useRef(isNavigating);
  const settleStartTimeRef = useRef(0);
  const renderedPointCountRef = useRef(0);
  const prevFirstPointRef = useRef<ScanPoint | null>(null);
  const prevColorModeRef = useRef(colorMode);
  const prevRoomHeightRef = useRef(roomHeight);
  const currentPitchRadRef = useRef(0);
  const currentRollRadRef = useRef(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    } catch {
      setWebglError("WebGL is unavailable on this device.");
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
    renderer.setClearColor(0x050608, 1);
    renderer.domElement.style.touchAction = "none";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, container.clientWidth / container.clientHeight, 0.05, 60);
    camera.position.set(6.8, 6.0, 7.4);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 0.5;
    controls.maxDistance = 35;
    controls.target.set(0, 0.4, 0);

    // Subtle lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.9));
    const keyLight = new THREE.DirectionalLight(0xfff5ea, 1.6);
    keyLight.position.set(5, 8, 4);
    scene.add(keyLight);

    // Groups
    const roomGroup = new THREE.Group();
    scene.add(roomGroup);

    const obstaclesGroup = new THREE.Group();
    scene.add(obstaclesGroup);

    const pathGroup = new THREE.Group();
    scene.add(pathGroup);

    const trackGroup = new THREE.Group();
    scene.add(trackGroup);

    const roverGroup = new THREE.Group();
    scene.add(roverGroup);

    // Floor Mesh for clicking
    const floorGeo = new THREE.PlaneGeometry(roomWidth + 0.4, roomDepth + 0.4);
    const floorMat = new THREE.MeshBasicMaterial({ color: 0x07080b, side: THREE.DoubleSide });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = -0.001;
    scene.add(floorMesh);

    // 1. Rover Physical Geometry (authentic sculpted SONARIS assembly scaled 1 mm -> 0.001 m, pointing +X)
    const scaledChassis = new THREE.Group();
    scaledChassis.scale.setScalar(0.001);
    const ROVER_STAGE_IDS = new Set([
      "base",
      "deck",
      "shell",
      "bumper",
      "estop",
      "tilt-frame",
      "servo",
      "wheel-front-left",
      "wheel-front-right",
      "wheel-rear-left",
      "wheel-rear-right",
      "motor-front-left",
      "motor-front-right",
      "motor-rear-left",
      "motor-rear-right",
      "bracket-front-left",
      "bracket-front-right",
      "bracket-rear-left",
      "bracket-rear-right"
    ]);
    for (const part of assemblyParts) {
      if (!ROVER_STAGE_IDS.has(part.id)) continue;
      const model = createAssemblyModel(part);
      model.position.set(part.home[0], part.home[1], part.home[2]);
      scaledChassis.add(model);
    }
    roverGroup.add(scaledChassis);

    // Rover Physical Collision Hitbox Envelope (0.22m radius / 260x340mm bumper margin)
    const hitboxGeo = new THREE.RingGeometry(0.215, 0.225, 32);
    const hitboxMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4, // Cyan collision bumper ring
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.75
    });
    const hitboxMesh = new THREE.Mesh(hitboxGeo, hitboxMat);
    hitboxMesh.rotation.x = -Math.PI / 2;
    hitboxMesh.position.y = 0.02; // Just above ground plane
    roverGroup.add(hitboxMesh);

    // Compact gimbal mount collar linking the rover deck to the LiDAR tilt head
    const collarHeight = Math.max(0.015, sensorHeight - 0.23);
    const mast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.014, 0.018, collarHeight, 16),
      new THREE.MeshStandardMaterial({ color: 0x2e3138, roughness: 0.4, metalness: 0.7 })
    );
    mast.position.set(0.08, 0.23 + collarHeight / 2, 0);
    roverGroup.add(mast);

    // Tilt Head at Fixed Sensor Elevation with authentic RPLIDAR S2 optical turret
    const tiltHead = new THREE.Group();
    tiltHead.position.set(0.08, sensorHeight, 0);
    roverGroup.add(tiltHead);

    const lidarDef = assemblyParts.find((p) => p.id === "lidar");
    if (lidarDef) {
      const s2Model = createAssemblyModel(lidarDef);
      s2Model.scale.setScalar(0.001);
      tiltHead.add(s2Model);
    }

    // 2. Forward 180° Laser Fan Sector (facing forward along +X)
    const laserFan = new THREE.Group();
    tiltHead.add(laserFan);

    const fanGeo = new THREE.RingGeometry(0.06, 3.8, 36, 1, -Math.PI / 2, Math.PI);
    const fanMat = new THREE.MeshBasicMaterial({
      color: 0xff2222,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.18,
      depthWrite: false
    });
    const fanMesh = new THREE.Mesh(fanGeo, fanMat);
    fanMesh.rotation.x = Math.PI / 2;
    laserFan.add(fanMesh);

    // Forward arc border
    const edgeGeo = new THREE.BufferGeometry().setFromPoints(
      Array.from({ length: 33 }, (_, i) => {
        const theta = -Math.PI / 2 + (i / 32) * Math.PI;
        return new THREE.Vector3(Math.cos(theta) * 3.8, 0, Math.sin(theta) * 3.8);
      })
    );
    const edgeLine = new THREE.Line(
      edgeGeo,
      new THREE.LineBasicMaterial({ color: 0xff3b30, transparent: true, opacity: 0.85 })
    );
    laserFan.add(edgeLine);

    // Oscillating Laser Beam Ray with bright optical core
    const beamGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(3.8, 0, 0)
    ]);
    const laserBeam = new THREE.Line(beamGeo, new THREE.LineBasicMaterial({ color: 0xff3333, linewidth: 3 }));
    laserFan.add(laserBeam);

    // 3. Dynamic Forward Perception Corridor (Active Ground Path Scanning)
    const corridorGeo = new THREE.BufferGeometry();
    const corridorVerts = new Float32Array([
      0.15, 0.004, -0.20,
      0.85, 0.004, -0.28,
      0.85, 0.004, 0.28,

      0.15, 0.004, -0.20,
      0.85, 0.004, 0.28,
      0.15, 0.004, 0.20
    ]);
    corridorGeo.setAttribute("position", new THREE.BufferAttribute(corridorVerts, 3));
    const corridorMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const corridorMesh = new THREE.Mesh(corridorGeo, corridorMat);
    corridorMesh.visible = false;
    roverGroup.add(corridorMesh);

    // 4. Point Cloud & Ribbons (Pre-allocated Buffers for Zero-Lag Streaming)
    const MAX_POINTS = 60000;
    const pointsGeo = new THREE.BufferGeometry();
    pointsGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(MAX_POINTS * 3), 3));
    pointsGeo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(MAX_POINTS * 3), 3));
    pointsGeo.setDrawRange(0, 0);

    const pointsMat = new THREE.PointsMaterial({
      size: pointSize,
      vertexColors: true,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0.92
    });
    const pointsMesh = new THREE.Points(pointsGeo, pointsMat);
    scene.add(pointsMesh);

    const MAX_LATEST = 1000;
    const latestGeo = new THREE.BufferGeometry();
    latestGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(MAX_LATEST * 3), 3));
    latestGeo.setDrawRange(0, 0);

    const latestMat = new THREE.PointsMaterial({
      size: Math.max(5.0, pointSize * 2.2),
      color: 0xff3b30,
      sizeAttenuation: false,
      transparent: true,
      opacity: 1
    });
    const latestMesh = new THREE.Points(latestGeo, latestMat);
    scene.add(latestMesh);

    const MAX_RIBBONS = 2000;
    const ribbonsGeo = new THREE.BufferGeometry();
    ribbonsGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(MAX_RIBBONS * 6), 3));
    ribbonsGeo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(MAX_RIBBONS * 6), 3));
    ribbonsGeo.setDrawRange(0, 0);

    const ribbonsMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      depthWrite: false
    });
    const ribbonsMesh = new THREE.LineSegments(ribbonsGeo, ribbonsMat);
    scene.add(ribbonsMesh);

    let frameId = 0;
    let inAnimate = false;
    let disposed = false;

    const animate = () => {
      if (disposed) {
        frameId = 0;
        return;
      }
      inAnimate = true;
      const unsettled = controls.update();

      // Damped suspension settle rock on transit arrival (physical pitch vibration)
      let isSettling = false;
      const settleElapsed = (performance.now() - settleStartTimeRef.current) / 1000;
      if (settleStartTimeRef.current > 0 && settleElapsed < 0.6) {
        isSettling = true;
        const rockPitch = 0.02 * Math.exp(-6.0 * settleElapsed) * Math.cos(22.0 * settleElapsed);
        scaledChassis.rotation.z = currentPitchRadRef.current + rockPitch;
      } else {
        scaledChassis.rotation.z = currentPitchRadRef.current + (isNavigatingRef.current ? -0.012 : 0);
      }
      scaledChassis.rotation.x = currentRollRadRef.current;

      // Synchronized RPLIDAR S2 10 Hz laser sweep beam tracking (600 RPM, 100 ms per rev)
      const isActiveLaser = (isSweepingRef.current || isNavigatingRef.current) && showLaserFanRef.current;
      if (isActiveLaser && laserBeam) {
        // High-fidelity 10 Hz rotational beam sweep across optical aperture
        const sweepProgress = (Date.now() / 100) % 1;
        const aperture = scanApertureRef.current;
        const startRad = aperture >= 360 ? -Math.PI : ((-aperture / 2) * Math.PI) / 180;
        const lenRad = (Math.min(360, aperture) * Math.PI) / 180;
        laserBeam.rotation.y = startRad + sweepProgress * lenRad;
      }

      renderer.render(scene, camera);
      inAnimate = false;

      if (unsettled || isActiveLaser || isSettling) {
        frameId = requestAnimationFrame(animate);
      } else {
        frameId = 0;
      }
    };

    const wake = () => {
      if (!frameId && !inAnimate && !disposed) {
        frameId = requestAnimationFrame(animate);
      }
    };

    controls.addEventListener("change", wake);

    // Pointer Interaction: Floor Click Navigation
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let downX = 0, downY = 0;

    const handlePointerDown = (e: PointerEvent) => {
      downX = e.clientX;
      downY = e.clientY;
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > 5) return;

      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);
      const floorHits = raycaster.intersectObject(floorMesh);
      if (floorHits.length > 0) {
        const pt = floorHits[0].point;
        // Resolve click against physical boundaries & obstacle hitboxes
        const resolved = resolveRoverCollision(
          pt.x,
          pt.z,
          0.28,
          currentRoom?.obstacles ?? obstacles,
          roomWidth,
          roomDepth
        );
        const clampedX = Number(resolved.x.toFixed(2));
        const clampedZ = Number(resolved.z.toFixed(2));

        if (interactModeRef.current === "waypoint" && onAddWaypointRef.current) {
          onAddWaypointRef.current([clampedX, clampedZ]);
          wake();
          return;
        }

        if (onRoverMoveRef.current) {
          const current = roverPoseRef.current;
          const targetHeading = Math.round(
            (Math.atan2(clampedZ - current.z, clampedX - current.x) * 180) / Math.PI + 360
          ) % 360;

          onRoverMoveRef.current({
            x: clampedX,
            z: clampedZ,
            heading: targetHeading
          });
          wake();
        }
      }
    };

    renderer.domElement.addEventListener("pointerdown", handlePointerDown);
    renderer.domElement.addEventListener("pointerup", handlePointerUp);

    const resizeObserver = new ResizeObserver(() => {
      if (!container || !renderer) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
      wake();
    });
    resizeObserver.observe(container);

    runtimeRef.current = {
      renderer,
      scene,
      camera,
      controls,
      pointsMesh,
      latestMesh,
      ribbonsMesh,
      roomGroup,
      obstaclesGroup,
      pathGroup,
      trackGroup,
      roverGroup,
      scaledChassis,
      corridorMesh,
      tiltHead,
      laserFan,
      laserBeam,
      floorMesh,
      render: () => renderer.render(scene, camera),
      wake
    };

    wake();

    return () => {
      disposed = true;
      if (frameId) cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      controls.removeEventListener("change", wake);
      controls.dispose();
      renderer.domElement.removeEventListener("pointerdown", handlePointerDown);
      renderer.domElement.removeEventListener("pointerup", handlePointerUp);
      scene.traverse((obj) => disposeObject(obj));
      renderer.dispose();
      renderer.domElement.remove();
      runtimeRef.current = null;
    };
  }, []);

  // Update Room Geometry & Obstacles
  useEffect(() => {
    const rt = runtimeRef.current;
    if (!rt) return;

    const { roomGroup, obstaclesGroup, floorMesh, wake } = rt;
    clearAndDisposeGroup(roomGroup);
    clearAndDisposeGroup(obstaclesGroup);

    const halfW = roomWidth / 2;
    const halfD = roomDepth / 2;

    floorMesh.geometry.dispose();
    floorMesh.geometry = new THREE.PlaneGeometry(roomWidth + 0.4, roomDepth + 0.4);

    // Architectural Ground Grid
    const maxDim = Math.max(roomWidth, roomDepth);
    const grid = new THREE.GridHelper(maxDim, Math.round(maxDim * 2), 0x323746, 0x161822);
    grid.position.y = 0;
    roomGroup.add(grid);

    if (showRoomBounds) {
      // Corner structural columns
      const cornerTicks = [
        [halfW, -halfD],
        [halfW, halfD],
        [-halfW, -halfD],
        [-halfW, halfD]
      ];
      const postMat = new THREE.LineBasicMaterial({ color: 0x5a6275, transparent: true, opacity: 0.85 });
      cornerTicks.forEach(([cx, cz]) => {
        const postGeo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(cx, 0, cz),
          new THREE.Vector3(cx, roomHeight, cz)
        ]);
        roomGroup.add(new THREE.Line(postGeo, postMat));
      });

      // Solid Perimeter Arena Boundary Walls (0.80m high solid safety boundary barriers)
      const wallMat = new THREE.MeshStandardMaterial({
        color: 0x12141c,
        roughness: 0.5,
        metalness: 0.75
      });
      const wallCapMat = new THREE.LineBasicMaterial({
        color: 0x64748b, // Slate steel wall cap line
        transparent: true,
        opacity: 0.95
      });
      const wallThickness = 0.12;
      const wallHeight = 0.80;

      // North Boundary Wall (-halfD)
      const nWallGeo = new THREE.BoxGeometry(roomWidth + wallThickness * 2, wallHeight, wallThickness);
      const nWallMesh = new THREE.Mesh(nWallGeo, wallMat);
      nWallMesh.position.set(0, wallHeight / 2, -halfD - wallThickness / 2);
      nWallMesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(nWallGeo), wallCapMat));
      roomGroup.add(nWallMesh);

      // South Boundary Wall (+halfD)
      const sWallGeo = new THREE.BoxGeometry(roomWidth + wallThickness * 2, wallHeight, wallThickness);
      const sWallMesh = new THREE.Mesh(sWallGeo, wallMat);
      sWallMesh.position.set(0, wallHeight / 2, halfD + wallThickness / 2);
      sWallMesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(sWallGeo), wallCapMat));
      roomGroup.add(sWallMesh);

      // West Boundary Wall (-halfW)
      const wWallGeo = new THREE.BoxGeometry(wallThickness, wallHeight, roomDepth);
      const wWallMesh = new THREE.Mesh(wWallGeo, wallMat);
      wWallMesh.position.set(-halfW - wallThickness / 2, wallHeight / 2, 0);
      wWallMesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(wWallGeo), wallCapMat));
      roomGroup.add(wWallMesh);

      // East Boundary Wall (+halfW)
      const eWallGeo = new THREE.BoxGeometry(wallThickness, wallHeight, roomDepth);
      const eWallMesh = new THREE.Mesh(eWallGeo, wallMat);
      eWallMesh.position.set(halfW + wallThickness / 2, wallHeight / 2, 0);
      eWallMesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(eWallGeo), wallCapMat));
      roomGroup.add(eWallMesh);
    }

    // Physical Obstacles & Floor Holes/Voids
    const holeMat = new THREE.MeshBasicMaterial({ color: 0x020305 });
    const holeEdgeMat = new THREE.LineBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.95 });

    // Category-specific materials to clearly distinguish physical feature types
    const platformMat = new THREE.MeshStandardMaterial({ color: 0x141f2d, roughness: 0.55, metalness: 0.4 });
    const platformEdgeMat = new THREE.LineBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.95 });

    const rampMat = new THREE.MeshStandardMaterial({ color: 0x12261a, roughness: 0.65, metalness: 0.25 });
    const rampEdgeMat = new THREE.LineBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.95 });
    const rampTreadMat = new THREE.LineBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.85 });

    const curbMat = new THREE.MeshStandardMaterial({ color: 0x2b2514, roughness: 0.85, metalness: 0.1 });
    const curbEdgeMat = new THREE.LineBasicMaterial({ color: 0xeab308, transparent: true, opacity: 0.95 });

    const wallObstacleMat = new THREE.MeshStandardMaterial({ color: 0x171922, roughness: 0.7, metalness: 0.4 });
    const wallObstacleEdgeMat = new THREE.LineBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.92 });

    const columnMat = new THREE.MeshStandardMaterial({ color: 0x162130, roughness: 0.5, metalness: 0.6 });
    const columnEdgeMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.92 });

    const benchMat = new THREE.MeshStandardMaterial({ color: 0x202433, roughness: 0.4, metalness: 0.7 });
    const benchEdgeMat = new THREE.LineBasicMaterial({ color: 0xa855f7, transparent: true, opacity: 0.92 });

    const defaultObsMat = new THREE.MeshStandardMaterial({ color: 0x181a24, roughness: 0.45, metalness: 0.8 });

    for (const obs of obstacles) {
      const isHole = (obs as { isHole?: boolean }).isHole || obs.height <= 0 || obs.category === "void";
      if (isHole) {
        // Floor Void / Hole Pit Cutout (e.g. sump pit at -0.40m)
        const pitDepth = 0.40;
        const pitGeo = new THREE.BoxGeometry(obs.width, pitDepth, obs.depth);
        const pitMesh = new THREE.Mesh(pitGeo, holeMat);
        pitMesh.position.set(obs.x, -pitDepth / 2, obs.z);
        pitMesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(pitGeo), holeEdgeMat));
        obstaclesGroup.add(pitMesh);
      } else if (obs.shape === "cylinder" || obs.category === "column") {
        const baseY = obs.baseY ?? 0;
        const radius = obs.radius ?? obs.width / 2;
        const geo = new THREE.CylinderGeometry(radius, radius, obs.height, 32);
        const mesh = new THREE.Mesh(geo, columnMat);
        mesh.position.set(obs.x, baseY + obs.height / 2, obs.z);
        mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 30), columnEdgeMat));
        obstaclesGroup.add(mesh);
      } else if (obs.shape === "ramp" || obs.category === "ramp") {
        const baseY = obs.baseY ?? 0;
        const dir = obs.rampDirection ?? "posZ";
        const geo = createRampGeometry(obs.width, obs.height, obs.depth, dir);
        const mesh = new THREE.Mesh(geo, rampMat);
        mesh.position.set(obs.x, baseY, obs.z);
        mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), rampEdgeMat));

        // Add transverse traction tread markings across the sloped ramp face
        const treadStep = 0.22;
        const span = dir === "posZ" || dir === "negZ" ? obs.depth : obs.width;
        const numTreads = Math.max(2, Math.floor(span / treadStep));
        const treadPositions: number[] = [];
        const halfW = obs.width / 2;
        const halfD = obs.depth / 2;

        for (let t = 1; t < numTreads; t++) {
          const s = t / numTreads;
          const yTread = s * obs.height + 0.003;
          if (dir === "posZ") {
            const zTread = -halfD + s * obs.depth;
            treadPositions.push(-halfW * 0.90, yTread, zTread, halfW * 0.90, yTread, zTread);
          } else if (dir === "negZ") {
            const zTread = halfD - s * obs.depth;
            treadPositions.push(-halfW * 0.90, yTread, zTread, halfW * 0.90, yTread, zTread);
          } else if (dir === "posX") {
            const xTread = -halfW + s * obs.width;
            treadPositions.push(xTread, yTread, -halfD * 0.90, xTread, yTread, halfD * 0.90);
          } else {
            const xTread = halfW - s * obs.width;
            treadPositions.push(xTread, yTread, -halfD * 0.90, xTread, yTread, halfD * 0.90);
          }
        }

        if (treadPositions.length > 0) {
          const treadGeo = new THREE.BufferGeometry();
          treadGeo.setAttribute("position", new THREE.Float32BufferAttribute(treadPositions, 3));
          mesh.add(new THREE.LineSegments(treadGeo, rampTreadMat));
        }

        obstaclesGroup.add(mesh);
      } else {
        const baseY = obs.baseY ?? 0;
        const geo = new THREE.BoxGeometry(obs.width, obs.height, obs.depth);
        let selectedMat = defaultObsMat;
        let selectedEdgeMat = columnEdgeMat;

        if (obs.category === "platform") {
          selectedMat = platformMat;
          selectedEdgeMat = platformEdgeMat;
        } else if (obs.category === "curb") {
          selectedMat = curbMat;
          selectedEdgeMat = curbEdgeMat;
        } else if (obs.category === "wall") {
          selectedMat = wallObstacleMat;
          selectedEdgeMat = wallObstacleEdgeMat;
        } else if (obs.category === "bench") {
          selectedMat = benchMat;
          selectedEdgeMat = benchEdgeMat;
        } else {
          // Distinguish high-hangs (violet/indigo), low-hangs/shelves (warm amber), and ground fixtures
          const edgeColor = baseY >= 1.2 ? 0xa78bfa : baseY > 0 ? 0xf59e0b : 0x38bdf8;
          selectedEdgeMat = new THREE.LineBasicMaterial({
            color: edgeColor,
            transparent: true,
            opacity: 0.92
          });
        }

        const mesh = new THREE.Mesh(geo, selectedMat);
        mesh.position.set(obs.x, baseY + obs.height / 2, obs.z);
        mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), selectedEdgeMat));
        obstaclesGroup.add(mesh);
      }
    }

    // Physical Terrain Features: Washboard bumps course and gravel bed
    if (currentRoom?.terrainFeatures) {
      for (const feat of currentRoom.terrainFeatures) {
        if (feat.type === "bumps") {
          const bWave = feat.bumpWavelengthM ?? 0.32;
          const bHeight = feat.bumpHeightM ?? 0.020;
          const numBars = Math.floor(feat.depth / bWave);
          const bumpMat = new THREE.MeshStandardMaterial({
            color: 0x221f1a,
            roughness: 0.6,
            metalness: 0.2
          });
          const bumpEdgeMat = new THREE.LineBasicMaterial({
            color: 0xf59e0b, // Warm amber for washboard test bumps
            transparent: true,
            opacity: 0.85
          });

          for (let k = 0; k < numBars; k++) {
            const barZ = (feat.z - feat.depth / 2) + (k + 0.5) * bWave;
            const barGeo = new THREE.CylinderGeometry(bHeight, bHeight, feat.width, 16);
            const barMesh = new THREE.Mesh(barGeo, bumpMat);
            barMesh.rotation.z = Math.PI / 2;
            barMesh.position.set(feat.x, bHeight / 2, barZ);
            barMesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(barGeo, 30), bumpEdgeMat));
            obstaclesGroup.add(barMesh);
          }
        } else if (feat.type === "gravel") {
          const gravelBaseGeo = new THREE.BoxGeometry(feat.width, 0.012, feat.depth);
          const gravelMat = new THREE.MeshStandardMaterial({
            color: 0x2a241d,
            roughness: 0.95,
            metalness: 0.05
          });
          const gravelMesh = new THREE.Mesh(gravelBaseGeo, gravelMat);
          gravelMesh.position.set(feat.x, 0.006, feat.z);
          const gravelEdgeMat = new THREE.LineBasicMaterial({
            color: 0xd97706, // Amber-bronze perimeter kerb border
            transparent: true,
            opacity: 0.9
          });
          gravelMesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(gravelBaseGeo), gravelEdgeMat));
          obstaclesGroup.add(gravelMesh);
        }
      }
    }

    // Solid world architecture: obstaclesGroup is always visible so boundaries and hitboxes are real
    obstaclesGroup.visible = true;

    wake();
  }, [roomWidth, roomDepth, roomHeight, showRoomBounds, obstacles, currentRoom, showGroundTruth]);

  // Update Trajectory & Waypoint Paths
  useEffect(() => {
    const rt = runtimeRef.current;
    if (!rt) return;
    const { pathGroup, wake } = rt;
    clearAndDisposeGroup(pathGroup);

    // 1. Render Plotted Route Waypoints & Stems
    if (waypoints && waypoints.length > 0) {
      const allWaypoints = [[roverPose.x, roverPose.z], ...waypoints].map(
        ([x, z]) => {
          const elev = currentRoom ? getRoomElevationAt(currentRoom, x, z) : 0;
          return new THREE.Vector3(x, elev + 0.012, z);
        }
      );
      const routeGeo = new THREE.BufferGeometry().setFromPoints(allWaypoints);
      const routeLine = new THREE.Line(
        routeGeo,
        new THREE.LineBasicMaterial({
          color: 0x991f1f,
          transparent: true,
          opacity: 0.6
        })
      );
      pathGroup.add(routeLine);

      // Render pins and rings for each planned waypoint
      waypoints.forEach(([wx, wz], idx) => {
        const isActive = idx === activeWaypointIndex;
        const color = isActive ? 0xff4d4d : 0xd49520;
        const elev = currentRoom ? getRoomElevationAt(currentRoom, wx, wz) : 0;

        const ringGeo = new THREE.RingGeometry(0.05, 0.13, 24);
        const ringMat = new THREE.MeshBasicMaterial({
          color,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: isActive ? 0.95 : 0.65
        });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.rotation.x = -Math.PI / 2;
        ringMesh.position.set(wx, elev + 0.006, wz);
        pathGroup.add(ringMesh);

        // Center Pip
        const dotGeo = new THREE.CircleGeometry(0.025, 16);
        const dotMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const dotMesh = new THREE.Mesh(dotGeo, dotMat);
        dotMesh.rotation.x = -Math.PI / 2;
        dotMesh.position.set(wx, elev + 0.007, wz);
        pathGroup.add(dotMesh);

        // Vertical Pin Stem
        const pinGeo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(wx, elev + 0.007, wz),
          new THREE.Vector3(wx, elev + 0.22, wz)
        ]);
        const pinMat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.8 });
        pathGroup.add(new THREE.Line(pinGeo, pinMat));
      });
    }

    // 2. Render Live Kinematics Execution Path
    if (navPath.length > 1) {
      const pts = navPath.map(([x, z]) => {
        const elev = currentRoom ? getRoomElevationAt(currentRoom, x, z) : 0;
        return new THREE.Vector3(x, elev + 0.015, z);
      });
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xff3333, linewidth: 2 }));
      pathGroup.add(line);
    }

    wake();
  }, [navPath, waypoints, activeWaypointIndex]);

  // Update Historical Tracked Path (Odometry Breadcrumbs) without churning waypoint geometry
  useEffect(() => {
    const rt = runtimeRef.current;
    if (!rt) return;
    const { trackGroup, wake } = rt;
    clearAndDisposeGroup(trackGroup);

    if (odometryTrack.length > 1) {
      const trackPts = odometryTrack.map(([x, z]) => new THREE.Vector3(x, 0.008, z));
      const trackGeo = new THREE.BufferGeometry().setFromPoints(trackPts);
      const trackLine = new THREE.Line(
        trackGeo,
        new THREE.LineBasicMaterial({
          color: 0x38bdf8, // Electric cyan track
          transparent: true,
          opacity: 0.85
        })
      );
      trackGroup.add(trackLine);
    }
    wake();
  }, [odometryTrack]);

  // Dynamically update Laser Fan Geometry to match calibrated RPLIDAR S2 viewport aperture
  useEffect(() => {
    const rt = runtimeRef.current;
    if (!rt) return;

    const { laserFan, wake } = rt;

    while (laserFan.children.length > 0) {
      const child = laserFan.children[0];
      laserFan.remove(child);
      if (child instanceof THREE.Mesh || child instanceof THREE.Line) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
        else child.material.dispose();
      }
    }

    const startRad = scanApertureDeg >= 360 ? 0 : ((-scanApertureDeg / 2) * Math.PI) / 180;
    const lenRad = (Math.min(360, scanApertureDeg) * Math.PI) / 180;
    const segs = Math.max(24, Math.round((scanApertureDeg / 360) * 48));

    const fanGeo = new THREE.RingGeometry(0.06, 3.8, segs, 1, startRad, lenRad);
    const fanMat = new THREE.MeshBasicMaterial({
      color: 0xff2222,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.18,
      depthWrite: false
    });
    const fanMesh = new THREE.Mesh(fanGeo, fanMat);
    fanMesh.rotation.x = Math.PI / 2;
    laserFan.add(fanMesh);

    // Border Arc
    const arcPts: THREE.Vector3[] = [];
    if (scanApertureDeg < 360) {
      arcPts.push(new THREE.Vector3(0, 0, 0));
    }
    for (let i = 0; i <= segs; i++) {
      const theta = startRad + (i / segs) * lenRad;
      arcPts.push(new THREE.Vector3(Math.cos(theta) * 3.8, 0, Math.sin(theta) * 3.8));
    }
    if (scanApertureDeg < 360) {
      arcPts.push(new THREE.Vector3(0, 0, 0));
    }
    const edgeGeo = new THREE.BufferGeometry().setFromPoints(arcPts);
    const edgeLine = new THREE.Line(
      edgeGeo,
      new THREE.LineBasicMaterial({ color: 0xff3b30, transparent: true, opacity: 0.85 })
    );
    laserFan.add(edgeLine);

    // Oscillating Laser Beam Ray with bright optical core
    const beamGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(3.8, 0, 0)
    ]);
    const laserBeam = new THREE.Line(beamGeo, new THREE.LineBasicMaterial({ color: 0xff3333, linewidth: 3 }));
    laserFan.add(laserBeam);
    rt.laserBeam = laserBeam;

    wake();
  }, [scanApertureDeg]);

  // Update Rover Pose, Heading & Forward Dynamic Driving Corridor
  useEffect(() => {
    const rt = runtimeRef.current;
    if (!rt) return;

    const { roverGroup, scaledChassis, corridorMesh, tiltHead, laserFan, wake } = rt;

    const effectiveRoom: RoomEnvironment = currentRoom ?? {
      id: "custom",
      name: "Custom",
      width: roomWidth,
      depth: roomDepth,
      height: roomHeight ?? 3,
      description: "",
      obstacles
    };
    const attitude = getRoomAttitudeAt(effectiveRoom, roverPose.x, roverPose.z, roverPose.heading);

    roverGroup.position.set(roverPose.x, attitude.elevation, roverPose.z);
    // In Three.js, positive Y rotation rotates +X toward -Z.
    // Mathematical heading: 0° = +X, 90° = +Z, so rotation.y must be -headingRad.
    roverGroup.rotation.y = -(roverPose.heading * Math.PI) / 180;

    const pitchRad = (attitude.pitchDeg * Math.PI) / 180;
    const rollRad = (attitude.rollDeg * Math.PI) / 180;
    currentPitchRadRef.current = pitchRad;
    currentRollRadRef.current = rollRad;
    scaledChassis.rotation.x = rollRad;
    scaledChassis.rotation.z = pitchRad + (isNavigating ? -0.012 : 0);

    tiltHead.position.set(0.08, sensorHeight, 0);
    // Downward angle window while moving to scan floor paths void of obstacles/holes, or 0° level interlock
    const defaultNavTilt = isNavigating ? 0 : tiltDeg;
    const effectiveTilt = isNavigating ? tiltDeg : defaultNavTilt;
    // Autonomous inertial tilt leveling: compensate ST3215 servo elevation by chassis pitch
    tiltHead.rotation.z = ((effectiveTilt - attitude.pitchDeg) * Math.PI) / 180;

    laserFan.visible = showLaserFan;

    // Active forward driving terrain corridor
    corridorMesh.visible = isNavigating;
    if (isNavigating) {
      const hazard = isHazardAheadRef.current;
      (corridorMesh.material as THREE.MeshBasicMaterial).color.setHex(hazard ? 0xef4444 : 0x38bdf8);
      (corridorMesh.material as THREE.MeshBasicMaterial).opacity = hazard ? 0.55 : 0.22;
    }

    // Trigger physical suspension settle rock when stopping after navigation
    if (prevNavigatingRef.current && !isNavigating) {
      settleStartTimeRef.current = performance.now();
    }
    prevNavigatingRef.current = isNavigating;

    wake();
  }, [
    roverPose.x,
    roverPose.z,
    roverPose.heading,
    tiltDeg,
    sensorHeight,
    showLaserFan,
    isNavigating,
    isHazardAhead,
    currentRoom,
    roomWidth,
    roomDepth,
    roomHeight,
    obstacles
  ]);

  // Update Point Cloud and Ribbons (Zero-Garbage Collection Buffer Streaming)
  useEffect(() => {
    const rt = runtimeRef.current;
    if (!rt) return;

    const { pointsMesh, latestMesh, ribbonsMesh, wake } = rt;
    (pointsMesh.material as THREE.PointsMaterial).size = Math.max(3.2, pointSize * 1.3);
    (pointsMesh.material as THREE.PointsMaterial).opacity = registrationMode === "raw_odometry" ? 0.72 : 0.95;
    (latestMesh.material as THREE.PointsMaterial).size = Math.max(5.0, pointSize * 2.2);

    const count = points.length;
    let posAttr = pointsMesh.geometry.getAttribute("position") as THREE.BufferAttribute;
    let colAttr = pointsMesh.geometry.getAttribute("color") as THREE.BufferAttribute;

    const firstPoint = count > 0 ? points[0] : null;
    let reallocated = false;

    if (!posAttr || posAttr.count < count) {
      const capacity = Math.max(120000, count + 20000);
      const positions = new Float32Array(capacity * 3);
      const colors = new Float32Array(capacity * 3);
      pointsMesh.geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      pointsMesh.geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      posAttr = pointsMesh.geometry.getAttribute("position") as THREE.BufferAttribute;
      colAttr = pointsMesh.geometry.getAttribute("color") as THREE.BufferAttribute;
      reallocated = true;
    }

    const posArray = posAttr.array as Float32Array;
    const colArray = colAttr.array as Float32Array;

    const isReset =
      reallocated ||
      count < renderedPointCountRef.current ||
      prevFirstPointRef.current !== firstPoint ||
      prevColorModeRef.current !== colorMode ||
      prevRoomHeightRef.current !== roomHeight;

    const startIdx = isReset ? 0 : renderedPointCountRef.current;

    if (startIdx < count) {
      for (let i = startIdx; i < count; i++) {
        const p = points[i];
        const i3 = i * 3;
        posArray[i3] = p.x;
        posArray[i3 + 1] = p.y;
        posArray[i3 + 2] = p.z;

        if (colorMode === "elevation") {
          const y = p.y;
          if (y < -0.02) {
            STATIC_TEMP_COLOR.copy(COLOR_ELEV_VOID);
          } else if (y < 0.015) {
            STATIC_TEMP_COLOR.copy(COLOR_ELEV_FLOOR);
          } else if (y < 0.045) {
            const u = (y - 0.015) / 0.030;
            STATIC_TEMP_COLOR.copy(COLOR_ELEV_BUMP).lerp(COLOR_ELEV_SLOPE, u * 0.25);
          } else if (y < 0.40) {
            const u = (y - 0.045) / (0.40 - 0.045);
            STATIC_TEMP_COLOR.copy(COLOR_ELEV_SLOPE).lerp(COLOR_ELEV_PLATFORM, u);
          } else if (y < 0.55) {
            STATIC_TEMP_COLOR.copy(COLOR_ELEV_PLATFORM);
          } else if (y < 1.40) {
            const u = (y - 0.55) / (1.40 - 0.55);
            STATIC_TEMP_COLOR.copy(COLOR_ELEV_MIDWALL).lerp(COLOR_ELEV_HIGHWALL, u * 0.4);
          } else {
            const u = Math.min(1, (y - 1.40) / Math.max(0.5, (roomHeight ?? 3.0) - 1.40));
            STATIC_TEMP_COLOR.copy(COLOR_ELEV_MIDWALL).lerp(COLOR_ELEV_HIGHWALL, 0.4 + u * 0.6);
          }
        } else if (colorMode === "laser") {
          STATIC_TEMP_COLOR.copy(COLOR_LASER_RED);
        } else {
          STATIC_TEMP_COLOR.copy(PLANE_PALETTE[Math.floor(i / 180) % PLANE_PALETTE.length]);
        }

        colArray[i3] = STATIC_TEMP_COLOR.r;
        colArray[i3 + 1] = STATIC_TEMP_COLOR.g;
        colArray[i3 + 2] = STATIC_TEMP_COLOR.b;
      }

      pointsMesh.geometry.setDrawRange(0, count);
      posAttr.needsUpdate = true;
      colAttr.needsUpdate = true;
    } else if (isReset && count === 0) {
      pointsMesh.geometry.setDrawRange(0, 0);
      posAttr.needsUpdate = true;
      colAttr.needsUpdate = true;
    }

    renderedPointCountRef.current = count;
    prevFirstPointRef.current = firstPoint;
    prevColorModeRef.current = colorMode;
    prevRoomHeightRef.current = roomHeight;

    // Ribbons: link points within recent active swaths (capped at 1000 segments)
    const rPosAttr = ribbonsMesh.geometry.getAttribute("position") as THREE.BufferAttribute;
    const rColAttr = ribbonsMesh.geometry.getAttribute("color") as THREE.BufferAttribute;
    if (rPosAttr && rColAttr) {
      const rPosArray = rPosAttr.array as Float32Array;
      const rColArray = rColAttr.array as Float32Array;
      let segCount = 0;
      const startIndex = Math.max(0, count - 720);
      for (let i = startIndex; i < count - 1 && segCount < 1000; i++) {
        const p1 = points[i];
        const p2 = points[i + 1];
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const dz = p1.z - p2.z;
        const distSq = dx * dx + dy * dy + dz * dz;
        if (distSq < 0.16) {
          const s6 = segCount * 6;
          rPosArray[s6] = p1.x;
          rPosArray[s6 + 1] = p1.y;
          rPosArray[s6 + 2] = p1.z;
          rPosArray[s6 + 3] = p2.x;
          rPosArray[s6 + 4] = p2.y;
          rPosArray[s6 + 5] = p2.z;

          const i3 = i * 3;
          rColArray[s6] = colArray[i3];
          rColArray[s6 + 1] = colArray[i3 + 1];
          rColArray[s6 + 2] = colArray[i3 + 2];
          rColArray[s6 + 3] = colArray[i3 + 3];
          rColArray[s6 + 4] = colArray[i3 + 4];
          rColArray[s6 + 5] = colArray[i3 + 5];
          segCount++;
        }
      }
      ribbonsMesh.geometry.setDrawRange(0, segCount * 2);
      rPosAttr.needsUpdate = true;
      rColAttr.needsUpdate = true;
    }

    wake();
  }, [points, pointSize, colorMode, roomHeight, registrationMode]);

  // Update Live Slice Highlight (Active RPLIDAR S2 Laser Beam Returns)
  useEffect(() => {
    const rt = runtimeRef.current;
    if (!rt) return;

    const { latestMesh, wake } = rt;
    const lCount = latestPoints.length;
    const lPosAttr = latestMesh.geometry.getAttribute("position") as THREE.BufferAttribute;
    if (lPosAttr) {
      const lPosArray = lPosAttr.array as Float32Array;
      for (let j = 0; j < lCount && j < 1000; j++) {
        const j3 = j * 3;
        lPosArray[j3] = latestPoints[j].x;
        lPosArray[j3 + 1] = latestPoints[j].y;
        lPosArray[j3 + 2] = latestPoints[j].z;
      }
      latestMesh.geometry.setDrawRange(0, Math.min(1000, lCount));
      lPosAttr.needsUpdate = true;
    }
    wake();
  }, [latestPoints]);

  if (webglError) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#050608] p-6 text-center font-mono text-[11px] text-[#A87914]">
        {webglError}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden select-none"
      style={{ touchAction: "none" }}
    />
  );
}
