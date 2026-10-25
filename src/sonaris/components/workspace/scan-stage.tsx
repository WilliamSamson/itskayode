"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { assemblyParts } from "@/sonaris/lib/sonaris-assembly";
import type { ScanPoint, ScanObstacle } from "@/sonaris/lib/sonaris-engine";
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
  navPath?: [number, number][];
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
  navPath = [],
  isNavigating = false,
  isHazardAhead = false,
  roomWidth,
  roomDepth,
  roomHeight = 3,
  showRoomBounds = true,
  showLaserFan = true,
  pointSize = 2.5,
  colorMode = "elevation",
  isSweeping = false
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
    roverGroup: THREE.Group;
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
    const camera = new THREE.PerspectiveCamera(42, container.clientWidth / container.clientHeight, 0.05, 50);
    camera.position.set(4.8, 4.2, 5.2);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 0.5;
    controls.maxDistance = 25;
    controls.target.set(0, 0.6, 0);

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
      color: 0x991f1f,
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
      new THREE.LineBasicMaterial({ color: 0xff4d4d, transparent: true, opacity: 0.55 })
    );
    laserFan.add(edgeLine);

    // Oscillating Laser Beam Ray
    const beamGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(3.8, 0, 0)
    ]);
    const laserBeam = new THREE.Line(beamGeo, new THREE.LineBasicMaterial({ color: 0xff3333, linewidth: 2 }));
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
      size: pointSize * 1.5,
      color: 0xffffff,
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

      // Continuous laser beam oscillation during sweeps
      if (isSweepingRef.current && showLaserFanRef.current) {
        laserBeam.rotation.y = Math.sin(Date.now() * 0.008) * (Math.PI / 2);
      }

      renderer.render(scene, camera);
      inAnimate = false;

      if (unsettled || (isSweepingRef.current && showLaserFanRef.current)) {
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
        const clampedX = Number(Math.max(-roomWidth / 2 + 0.35, Math.min(roomWidth / 2 - 0.35, pt.x)).toFixed(2));
        const clampedZ = Number(Math.max(-roomDepth / 2 + 0.35, Math.min(roomDepth / 2 - 0.35, pt.z)).toFixed(2));

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
      roverGroup,
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
    roomGroup.clear();
    obstaclesGroup.clear();

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
      // Corner elevation tick columns
      const cornerTicks = [
        [halfW, -halfD],
        [halfW, halfD],
        [-halfW, -halfD],
        [-halfW, halfD]
      ];
      const postMat = new THREE.LineBasicMaterial({ color: 0x5a6275, transparent: true, opacity: 0.7 });
      cornerTicks.forEach(([cx, cz]) => {
        const postGeo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(cx, 0, cz),
          new THREE.Vector3(cx, roomHeight, cz)
        ]);
        roomGroup.add(new THREE.Line(postGeo, postMat));
      });
    }

    // Physical Obstacles
    const obsMat = new THREE.MeshStandardMaterial({ color: 0x181a24, roughness: 0.45, metalness: 0.8 });
    const obsEdgeMat = new THREE.LineBasicMaterial({ color: 0x424859, transparent: true, opacity: 0.9 });

    for (const obs of obstacles) {
      const geo = new THREE.BoxGeometry(obs.width, obs.height, obs.depth);
      const mesh = new THREE.Mesh(geo, obsMat);
      mesh.position.set(obs.x, obs.height / 2, obs.z);
      mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), obsEdgeMat));
      obstaclesGroup.add(mesh);
    }

    wake();
  }, [roomWidth, roomDepth, roomHeight, showRoomBounds, obstacles]);

  // Update Trajectory & Waypoint Paths
  useEffect(() => {
    const rt = runtimeRef.current;
    if (!rt) return;
    const { pathGroup, wake } = rt;
    pathGroup.clear();

    // 1. Render Plotted Route Waypoints & Stems
    if (waypoints && waypoints.length > 0) {
      const allWaypoints = [[roverPose.x, roverPose.z], ...waypoints].map(
        ([x, z]) => new THREE.Vector3(x, 0.012, z)
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

        const ringGeo = new THREE.RingGeometry(0.05, 0.13, 24);
        const ringMat = new THREE.MeshBasicMaterial({
          color,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: isActive ? 0.95 : 0.65
        });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.rotation.x = -Math.PI / 2;
        ringMesh.position.set(wx, 0.006, wz);
        pathGroup.add(ringMesh);

        // Center Pip
        const dotGeo = new THREE.CircleGeometry(0.025, 16);
        const dotMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const dotMesh = new THREE.Mesh(dotGeo, dotMat);
        dotMesh.rotation.x = -Math.PI / 2;
        dotMesh.position.set(wx, 0.007, wz);
        pathGroup.add(dotMesh);

        // Vertical Pin Stem
        const pinGeo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(wx, 0.007, wz),
          new THREE.Vector3(wx, 0.22, wz)
        ]);
        const pinMat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.8 });
        pathGroup.add(new THREE.Line(pinGeo, pinMat));
      });
    }

    // 2. Render Live Kinematics Execution Path
    if (navPath.length > 1) {
      const pts = navPath.map(([x, z]) => new THREE.Vector3(x, 0.015, z));
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xff3333, linewidth: 2 }));
      pathGroup.add(line);
    }
    wake();
  }, [navPath, waypoints, activeWaypointIndex]);

  // Update Rover Pose, Heading & Forward Dynamic Driving Corridor
  useEffect(() => {
    const rt = runtimeRef.current;
    if (!rt) return;

    const { roverGroup, corridorMesh, tiltHead, laserFan, wake } = rt;

    roverGroup.position.set(roverPose.x, 0, roverPose.z);
    // In Three.js, positive Y rotation rotates +X toward -Z.
    // Mathematical heading: 0° = +X, 90° = +Z, so rotation.y must be -headingRad.
    roverGroup.rotation.y = -(roverPose.heading * Math.PI) / 180;

    tiltHead.position.set(0.08, sensorHeight, 0);
    // Tilt rotates around local Z-axis (pitching up/down along heading)
    const effectiveTilt = isNavigating ? 0 : tiltDeg;
    tiltHead.rotation.z = (effectiveTilt * Math.PI) / 180;

    laserFan.visible = showLaserFan;

    // Active forward driving terrain corridor
    corridorMesh.visible = isNavigating;
    if (isNavigating) {
      const hazard = isHazardAheadRef.current;
      (corridorMesh.material as THREE.MeshBasicMaterial).color.setHex(hazard ? 0xef4444 : 0x38bdf8);
      (corridorMesh.material as THREE.MeshBasicMaterial).opacity = hazard ? 0.55 : 0.22;
    }

    wake();
  }, [roverPose.x, roverPose.z, roverPose.heading, tiltDeg, sensorHeight, showLaserFan, isNavigating, isHazardAhead]);

  // Update Point Cloud and Ribbons (Zero-Garbage Collection Buffer Streaming)
  useEffect(() => {
    const rt = runtimeRef.current;
    if (!rt) return;

    const { pointsMesh, latestMesh, ribbonsMesh, wake } = rt;
    (pointsMesh.material as THREE.PointsMaterial).size = pointSize;
    (latestMesh.material as THREE.PointsMaterial).size = pointSize * 1.5;

    const count = points.length;
    let posAttr = pointsMesh.geometry.getAttribute("position") as THREE.BufferAttribute;
    let colAttr = pointsMesh.geometry.getAttribute("color") as THREE.BufferAttribute;

    if (!posAttr || posAttr.count < count) {
      const capacity = Math.max(60000, count + 10000);
      const positions = new Float32Array(capacity * 3);
      const colors = new Float32Array(capacity * 3);
      pointsMesh.geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      pointsMesh.geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      posAttr = pointsMesh.geometry.getAttribute("position") as THREE.BufferAttribute;
      colAttr = pointsMesh.geometry.getAttribute("color") as THREE.BufferAttribute;
    }

    const posArray = posAttr.array as Float32Array;
    const colArray = colAttr.array as Float32Array;

    const tempColor = new THREE.Color();
    const deepWine = new THREE.Color("#8A1C1C");
    const warmAmber = new THREE.Color("#C89228");
    const lightTitanium = new THREE.Color("#E5E1D8");
    const laserRed = new THREE.Color("#E34242");

    for (let i = 0; i < count; i++) {
      const p = points[i];
      const i3 = i * 3;
      posArray[i3] = p.x;
      posArray[i3 + 1] = p.y;
      posArray[i3 + 2] = p.z;

      if (colorMode === "elevation") {
        const t = Math.max(0, Math.min(1, p.y / Math.max(0.1, roomHeight)));
        if (t < 0.5) {
          tempColor.copy(deepWine).lerp(warmAmber, t * 2);
        } else {
          tempColor.copy(warmAmber).lerp(lightTitanium, (t - 0.5) * 2);
        }
      } else if (colorMode === "laser") {
        tempColor.copy(laserRed);
      } else {
        tempColor.copy(PLANE_PALETTE[Math.floor(i / 180) % PLANE_PALETTE.length]);
      }

      colArray[i3] = tempColor.r;
      colArray[i3 + 1] = tempColor.g;
      colArray[i3 + 2] = tempColor.b;
    }

    pointsMesh.geometry.setDrawRange(0, count);
    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;

    // Ribbons: link points within recent active swaths (capped at 1000 segments)
    let rPosAttr = ribbonsMesh.geometry.getAttribute("position") as THREE.BufferAttribute;
    let rColAttr = ribbonsMesh.geometry.getAttribute("color") as THREE.BufferAttribute;
    if (rPosAttr && rColAttr) {
      const rPosArray = rPosAttr.array as Float32Array;
      const rColArray = rColAttr.array as Float32Array;
      let segCount = 0;
      const startIndex = Math.max(0, count - 720);
      for (let i = startIndex; i < count - 1 && segCount < 1000; i++) {
        const p1 = points[i];
        const p2 = points[i + 1];
        const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y, p1.z - p2.z);
        if (dist < 0.40) {
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

    // Latest slice highlight
    const lCount = latestPoints.length;
    let lPosAttr = latestMesh.geometry.getAttribute("position") as THREE.BufferAttribute;
    if (lPosAttr) {
      const lPosArray = lPosAttr.array as Float32Array;
      for (let j = 0; j < lCount && j < 1000; j++) {
        const j3 = j * 3;
        lPosArray[j3] = latestPoints[j].x;
        lPosArray[j3 + 1] = latestPoints[j].y;
        lPosArray[j3 + 2] = latestPoints[j].z;
      }
      latestMesh.geometry.setDrawRange(0, lCount);
      lPosAttr.needsUpdate = true;
    }

    wake();
  }, [points, latestPoints, pointSize, colorMode, roomHeight]);

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
