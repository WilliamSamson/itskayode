"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { ScanPoint, ScanObstacle } from "@/sonaris/lib/sonaris-engine";

export interface ProbedPoint {
  x: number;
  y: number;
  z: number;
  distance: number;
}

export interface RoverPose {
  x: number;
  z: number;
  heading: number; // yaw in degrees
}

export interface ScanStageProps {
  points: ScanPoint[];
  latestPoints: ScanPoint[];
  tiltDeg: number;
  sensorHeight?: number;
  roverPose?: RoverPose;
  onRoverMove?: (pose: RoverPose) => void;
  unmappedGaps?: { center: [number, number]; spanM: number; wall: string }[];
  obstacles?: ScanObstacle[];
  navPath?: [number, number][];
  isNavigating?: boolean;
  wheelRPMs?: [number, number, number, number];
  roomWidth: number;
  roomDepth: number;
  roomHeight?: number;
  showRoomBounds: boolean;
  showLaserFan: boolean;
  showSpinningBeam?: boolean;
  pointSize: number;
  colorMode: "elevation" | "laser" | "plane";
  currentSweepStep: number;
  isSweeping: boolean;
  view?: "isometric" | "top" | "front";
  heightFilter?: [number, number];
  isolatedPlane?: number | "all";
  raysPerPlane?: number;
  onPointInspect?: (point: ProbedPoint | null) => void;
}

// 10 distinct calibrated laboratory colors for 10 sweep planes (-30° to +60°)
const PLANE_PALETTE = [
  new THREE.Color("#E34242"),
  new THREE.Color("#E8702A"),
  new THREE.Color("#D49520"),
  new THREE.Color("#9E9826"),
  new THREE.Color("#2E9354"),
  new THREE.Color("#1DA69A"),
  new THREE.Color("#288BD5"),
  new THREE.Color("#6B5BD5"),
  new THREE.Color("#A83FA8"),
  new THREE.Color("#E53E7C")
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
  sensorHeight = 0.50,
  roverPose = { x: 0, z: 0, heading: 0 },
  onRoverMove,
  unmappedGaps = [],
  obstacles = [],
  navPath = [],
  isNavigating = false,
  wheelRPMs = [0, 0, 0, 0],
  roomWidth,
  roomDepth,
  roomHeight = 3,
  showRoomBounds,
  showLaserFan,
  showSpinningBeam = true,
  pointSize,
  colorMode,
  currentSweepStep,
  isSweeping,
  view,
  heightFilter = [0, 3],
  isolatedPlane = "all",
  raysPerPlane = 360,
  onPointInspect
}: ScanStageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const runtimeRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    pointsMesh: THREE.Points;
    latestMesh: THREE.Points;
    roomGroup: THREE.Group;
    gapsGroup: THREE.Group;
    obstaclesGroup: THREE.Group;
    pathGroup: THREE.Group;
    roverGroup: THREE.Group;
    wheels: THREE.Mesh[];
    tiltHead: THREE.Group;
    laserFan: THREE.Group;
    fanMesh: THREE.Mesh;
    laserBeam: THREE.Line;
    probeMarker: THREE.Group;
    floorMesh: THREE.Mesh;
    render: () => void;
    wake: () => void;
  } | null>(null);

  const [webglError, setWebglError] = useState<string | null>(null);
  const onPointInspectRef = useRef(onPointInspect);
  onPointInspectRef.current = onPointInspect;
  const onRoverMoveRef = useRef(onRoverMove);
  onRoverMoveRef.current = onRoverMove;

  // Initialize Three.js context
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
    renderer.setClearColor(0x050507, 1);
    renderer.domElement.style.touchAction = "none";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    renderer.domElement.setAttribute("aria-label", "Interactive 3D Scan Point Cloud Viewport");
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050507, 0.032);

    const camera = new THREE.PerspectiveCamera(42, container.clientWidth / container.clientHeight, 0.05, 50);
    camera.position.set(4.8, 3.8, 5.2);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.rotateSpeed = 0.85;
    controls.minDistance = 0.5;
    controls.maxDistance = 25;
    controls.target.set(0, 0.8, 0);

    // Subtle laboratory lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.95);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xfff5ea, 1.8);
    keyLight.position.set(5, 8, 4);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x7090b0, 0.8);
    rimLight.position.set(-4, 3, -4);
    scene.add(rimLight);

    // Content groups
    const roomGroup = new THREE.Group();
    scene.add(roomGroup);

    const obstaclesGroup = new THREE.Group();
    scene.add(obstaclesGroup);

    const gapsGroup = new THREE.Group();
    scene.add(gapsGroup);

    const pathGroup = new THREE.Group();
    scene.add(pathGroup);

    const roverGroup = new THREE.Group();
    scene.add(roverGroup);

    // Floor Mesh for clicking & navigation
    const floorGeo = new THREE.PlaneGeometry(roomWidth + 0.4, roomDepth + 0.4);
    const floorMat = new THREE.MeshBasicMaterial({ color: 0x0a0b0e, side: THREE.DoubleSide });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = -0.001;
    scene.add(floorMesh);

    // 1. Build Physical Rover & Tilting S2 Mount
    const roverChassis = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.06, 0.26),
      new THREE.MeshStandardMaterial({ color: 0x1c1e24, roughness: 0.35, metalness: 0.8 })
    );
    roverChassis.position.y = 0.04;
    roverGroup.add(roverChassis);

    // Forward Direction Arrow Indicator on Rover Chassis
    const dirArrow = new THREE.Mesh(
      new THREE.ConeGeometry(0.025, 0.06, 12),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    dirArrow.rotation.x = -Math.PI / 2;
    dirArrow.position.set(0.12, 0.075, 0);
    roverGroup.add(dirArrow);

    // Mecanum wheel hubs (4 corners)
    const wheels: THREE.Mesh[] = [];
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111317, roughness: 0.8, metalness: 0.5 });
    const hubMat = new THREE.MeshStandardMaterial({ color: 0x991f1f, roughness: 0.3, metalness: 0.9 });
    const wheelPositions = [
      [0.14, 0.04, 0.14],
      [-0.14, 0.04, 0.14],
      [0.14, 0.04, -0.14],
      [-0.14, 0.04, -0.14]
    ];
    wheelPositions.forEach(([wx, wy, wz]) => {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.03, 16), wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wx, wy, wz);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.032, 12), hubMat);
      wheel.add(hub);
      roverGroup.add(wheel);
      wheels.push(wheel);
    });

    // Tilt Riser Mast (420mm structural aluminum mast)
    const mast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.016, 0.02, 0.44, 16),
      new THREE.MeshStandardMaterial({ color: 0x2e3138, roughness: 0.4, metalness: 0.7 })
    );
    mast.position.y = 0.26;
    roverGroup.add(mast);

    // Servo U-Bracket
    const bracket = new THREE.Mesh(
      new THREE.BoxGeometry(0.07, 0.05, 0.06),
      new THREE.MeshStandardMaterial({ color: 0x111319, roughness: 0.5, metalness: 0.6 })
    );
    bracket.position.y = 0.48;
    roverGroup.add(bracket);

    // Pivot Tilt Head (Rotates on X-axis according to tilt angle)
    const tiltHead = new THREE.Group();
    tiltHead.position.set(0, 0.50, 0); // 0.50m fixed sensor elevation
    roverGroup.add(tiltHead);

    // RPLIDAR S2 Scanner Head
    const s2Cylinder = new THREE.Mesh(
      new THREE.CylinderGeometry(0.038, 0.038, 0.032, 24),
      new THREE.MeshStandardMaterial({ color: 0x08090b, roughness: 0.2, metalness: 0.9 })
    );
    tiltHead.add(s2Cylinder);

    // Optical Window Dome
    const dome = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.035, 0.012, 24),
      new THREE.MeshStandardMaterial({ color: 0x991f1f, roughness: 0.1, metalness: 0.95, transparent: true, opacity: 0.85 })
    );
    dome.position.y = 0.02;
    tiltHead.add(dome);

    // Optical emitter eye aperture
    const eye = new THREE.Mesh(
      new THREE.BoxGeometry(0.012, 0.008, 0.01),
      new THREE.MeshBasicMaterial({ color: 0xff3b3b })
    );
    eye.position.set(0.025, 0.02, 0);
    tiltHead.add(eye);

    // 2. Real-Time Tilted Laser Scan Fan & Spinning Beam
    const laserFan = new THREE.Group();
    tiltHead.add(laserFan);

    // Transparent laser plane disc
    const fanGeo = new THREE.RingGeometry(0.06, 4.2, 48, 1, 0, Math.PI * 2);
    const fanMat = new THREE.MeshBasicMaterial({
      color: 0x991f1f,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.16,
      depthWrite: false
    });
    const fanMesh = new THREE.Mesh(fanGeo, fanMat);
    fanMesh.rotation.x = Math.PI / 2; // Flat in the scanner's local plane
    laserFan.add(fanMesh);

    // Outer subtle boundary ring
    const edgeGeo = new THREE.BufferGeometry().setFromPoints(
      Array.from({ length: 64 }, (_, i) => {
        const theta = (i / 64) * Math.PI * 2;
        return new THREE.Vector3(Math.cos(theta) * 4.2, 0, Math.sin(theta) * 4.2);
      })
    );
    const edgeLine = new THREE.LineLoop(
      edgeGeo,
      new THREE.LineBasicMaterial({ color: 0xff4d4d, transparent: true, opacity: 0.4 })
    );
    laserFan.add(edgeLine);

    // 10 Hz Rotating Laser Beam Ray
    const beamGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(4.2, 0, 0)
    ]);
    const beamMat = new THREE.LineBasicMaterial({ color: 0xff3333, linewidth: 2 });
    const laserBeam = new THREE.Line(beamGeo, beamMat);
    laserFan.add(laserBeam);

    // 3. Point Cloud BufferGeometries
    const pointsGeo = new THREE.BufferGeometry();
    const pointsMat = new THREE.PointsMaterial({
      size: pointSize,
      vertexColors: true,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0.92
    });
    const pointsMesh = new THREE.Points(pointsGeo, pointsMat);
    scene.add(pointsMesh);

    // Latest slice highlight points
    const latestGeo = new THREE.BufferGeometry();
    const latestMat = new THREE.PointsMaterial({
      size: pointSize * 1.5,
      color: 0xffffff,
      sizeAttenuation: false,
      transparent: true,
      opacity: 1
    });
    const latestMesh = new THREE.Points(latestGeo, latestMat);
    scene.add(latestMesh);

    // 4. Probed Point Crosshair Reticle Marker
    const probeMarker = new THREE.Group();
    const probeRing = new THREE.Mesh(
      new THREE.RingGeometry(0.04, 0.05, 24),
      new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })
    );
    probeRing.rotation.x = -Math.PI / 2;
    probeMarker.add(probeRing);
    const probeDot = new THREE.Mesh(
      new THREE.SphereGeometry(0.015, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xff4d4d })
    );
    probeMarker.add(probeDot);
    probeMarker.visible = false;
    scene.add(probeMarker);

    // Gold-standard demand-driven rendering with smooth OrbitControls inertia damping
    let frameId = 0;
    let disposed = false;

    const animate = () => {
      frameId = 0;
      if (disposed) return;
      const unsettled = controls.update();
      renderer.render(scene, camera);
      if (unsettled) {
        frameId = requestAnimationFrame(animate);
      }
    };

    const wake = () => {
      if (!frameId && !disposed) {
        frameId = requestAnimationFrame(animate);
      }
    };

    controls.addEventListener("change", wake);

    // Interactive Point Raycaster Probe & Floor Click Navigation
    const raycaster = new THREE.Raycaster();
    raycaster.params.Points = { threshold: 0.12 };
    const pointer = new THREE.Vector2();
    let downX = 0, downY = 0;
    let isInteracting = false;
    let hoverRaf = 0;

    const handlePointerDown = (e: PointerEvent) => {
      downX = e.clientX;
      downY = e.clientY;
      isInteracting = true;
    };

    const handlePointerUp = (e: PointerEvent) => {
      isInteracting = false;
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > 5) return; // ignore drags/orbits
      if (!onRoverMoveRef.current) return;

      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);
      const floorHits = raycaster.intersectObject(floorMesh);
      if (floorHits.length > 0) {
        const pt = floorHits[0].point;
        const clampedX = Math.max(-roomWidth / 2 + 0.35, Math.min(roomWidth / 2 - 0.35, pt.x));
        const clampedZ = Math.max(-roomDepth / 2 + 0.35, Math.min(roomDepth / 2 - 0.35, pt.z));
        onRoverMoveRef.current({
          x: Number(clampedX.toFixed(2)),
          z: Number(clampedZ.toFixed(2)),
          heading: roverPose.heading
        });
        wake();
      }
    };

    // Throttled probe hover: NEVER raycasts during camera orbit or dragging
    const handlePointerMove = (e: PointerEvent) => {
      if (isInteracting || !onPointInspectRef.current) return;

      if (!hoverRaf) {
        hoverRaf = requestAnimationFrame(() => {
          hoverRaf = 0;
          if (disposed || isInteracting || !onPointInspectRef.current) return;

          const rect = renderer.domElement.getBoundingClientRect();
          pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
          pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

          raycaster.setFromCamera(pointer, camera);
          const intersects = raycaster.intersectObject(pointsMesh);

          if (intersects.length > 0 && intersects[0].point) {
            const pt = intersects[0].point;
            const dist = Math.hypot(pt.x - roverPose.x, pt.y - 0.5, pt.z - roverPose.z);
            probeMarker.position.copy(pt);
            probeMarker.visible = true;
            onPointInspectRef.current({ x: pt.x, y: pt.y, z: pt.z, distance: dist });
            wake();
          } else {
            if (probeMarker.visible) {
              probeMarker.visible = false;
              onPointInspectRef.current(null);
              wake();
            }
          }
        });
      }
    };

    renderer.domElement.addEventListener("pointerdown", handlePointerDown);
    renderer.domElement.addEventListener("pointerup", handlePointerUp);
    renderer.domElement.addEventListener("pointermove", handlePointerMove);

    // Handle responsive container resize
    const resizeObserver = new ResizeObserver(() => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
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
      roomGroup,
      gapsGroup,
      obstaclesGroup,
      pathGroup,
      roverGroup,
      wheels,
      tiltHead,
      laserFan,
      fanMesh,
      laserBeam,
      probeMarker,
      floorMesh,
      render: () => renderer.render(scene, camera),
      wake
    };

    wake();

    return () => {
      disposed = true;
      if (frameId) cancelAnimationFrame(frameId);
      if (hoverRaf) cancelAnimationFrame(hoverRaf);
      resizeObserver.disconnect();
      controls.removeEventListener("change", wake);
      controls.dispose();
      renderer.domElement.removeEventListener("pointerdown", handlePointerDown);
      renderer.domElement.removeEventListener("pointerup", handlePointerUp);
      renderer.domElement.removeEventListener("pointermove", handlePointerMove);

      // Clean scene
      scene.traverse((obj) => disposeObject(obj));
      renderer.dispose();
      renderer.domElement.remove();
      runtimeRef.current = null;
    };
  }, []);

  // Update room bounds, grid, and obstacle geometries
  useEffect(() => {
    const rt = runtimeRef.current;
    if (!rt) return;

    const { roomGroup, gapsGroup, obstaclesGroup, floorMesh, wake } = rt;
    roomGroup.clear();
    gapsGroup.clear();
    obstaclesGroup.clear();

    const halfW = roomWidth / 2;
    const halfD = roomDepth / 2;

    floorMesh.geometry.dispose();
    floorMesh.geometry = new THREE.PlaneGeometry(roomWidth + 0.4, roomDepth + 0.4);

    // High precision engineering grid
    const grid = new THREE.GridHelper(Math.max(roomWidth, roomDepth), 20, 0x991f1f, 0x1f222a);
    grid.position.y = 0;
    roomGroup.add(grid);

    if (showRoomBounds) {
      // Synthetic room boundary cage
      const boxGeo = new THREE.BoxGeometry(roomWidth, roomHeight, roomDepth);
      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(boxGeo),
        new THREE.LineBasicMaterial({ color: 0x484c56, transparent: true, opacity: 0.6 })
      );
      edges.position.y = roomHeight / 2;
      roomGroup.add(edges);

      // Floor corner boundary ticks
      const tickMat = new THREE.LineBasicMaterial({ color: 0x991f1f, transparent: true, opacity: 0.8 });
      const cornerTicks = [
        [halfW, -halfD],
        [halfW, halfD],
        [-halfW, -halfD],
        [-halfW, halfD]
      ];
      cornerTicks.forEach(([cx, cz]) => {
        const tickGeo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(cx, 0, cz),
          new THREE.Vector3(cx, 0.25, cz)
        ]);
        roomGroup.add(new THREE.Line(tickGeo, tickMat));
      });
    }

    // Render physical 3D obstacles
    const obsMat = new THREE.MeshStandardMaterial({
      color: 0x1e2026,
      roughness: 0.75,
      metalness: 0.35
    });
    const obsEdgeMat = new THREE.LineBasicMaterial({ color: 0x686c78, transparent: true, opacity: 0.85 });

    for (const obs of obstacles) {
      const obsGeo = new THREE.BoxGeometry(obs.width, obs.height, obs.depth);
      const obsMesh = new THREE.Mesh(obsGeo, obsMat);
      obsMesh.position.set(obs.x, obs.height / 2, obs.z);

      const obsEdges = new THREE.LineSegments(new THREE.EdgesGeometry(obsGeo), obsEdgeMat);
      obsMesh.add(obsEdges);

      obstaclesGroup.add(obsMesh);
    }

    // Render unmapped shadow gaps along perimeter walls (dashed amber lines)
    if (unmappedGaps.length > 0) {
      const gapMat = new THREE.LineDashedMaterial({
        color: 0xa87914,
        dashSize: 0.15,
        gapSize: 0.08,
        linewidth: 2
      });

      for (const gap of unmappedGaps) {
        const [gx, gz] = gap.center;
        const halfSpan = gap.spanM / 2;
        let p1: THREE.Vector3;
        let p2: THREE.Vector3;

        if (gap.wall === "north" || gap.wall === "south") {
          p1 = new THREE.Vector3(gx - halfSpan, 0.02, gz);
          p2 = new THREE.Vector3(gx + halfSpan, 0.02, gz);
        } else {
          p1 = new THREE.Vector3(gx, 0.02, gz - halfSpan);
          p2 = new THREE.Vector3(gx, 0.02, gz + halfSpan);
        }

        const geo = new THREE.BufferGeometry().setFromPoints([p1, p2]);
        const line = new THREE.Line(geo, gapMat);
        line.computeLineDistances();
        gapsGroup.add(line);
      }
    }

    wake();
  }, [roomWidth, roomDepth, roomHeight, showRoomBounds, obstacles, unmappedGaps]);

  // Render navigation trajectory path (warm amber breadcrumb line)
  useEffect(() => {
    const rt = runtimeRef.current;
    if (!rt) return;

    const { pathGroup, wake } = rt;
    pathGroup.clear();

    if (navPath.length > 1) {
      const points3D = navPath.map(([x, z]) => new THREE.Vector3(x, 0.015, z));
      const pathGeo = new THREE.BufferGeometry().setFromPoints(points3D);
      const pathMat = new THREE.LineBasicMaterial({ color: 0xd49520, linewidth: 2 });
      const pathLine = new THREE.Line(pathGeo, pathMat);
      pathGroup.add(pathLine);

      // Waypoint node marker dots
      const dotMat = new THREE.MeshBasicMaterial({ color: 0xffd166 });
      const dotGeo = new THREE.CircleGeometry(0.04, 16);
      dotGeo.rotateX(-Math.PI / 2);

      for (const [x, z] of navPath) {
        const dot = new THREE.Mesh(dotGeo, dotMat);
        dot.position.set(x, 0.02, z);
        pathGroup.add(dot);
      }
    }

    wake();
  }, [navPath]);

  // Update Rover Mecanum Pose & Spinning Wheels
  useEffect(() => {
    const rt = runtimeRef.current;
    if (!rt) return;

    const { tiltHead, laserFan, fanMesh, laserBeam, roverGroup, wheels, wake } = rt;

    // Mecanum position on floor and yaw rotation
    roverGroup.position.set(roverPose.x, 0, roverPose.z);
    roverGroup.rotation.y = (-roverPose.heading * Math.PI) / 180;

    // Spin individual mecanum wheels on axle proportional to inverse kinematics
    if (isNavigating) {
      wheels.forEach((w, i) => {
        const rpm = wheelRPMs?.[i] ?? 0;
        w.rotation.x += rpm !== 0 ? (rpm / 60) * 0.4 : 0.25;
      });
    }

    // Fixed mast sensor elevation (0.50m)
    tiltHead.position.set(0, 0.50, 0);

    // Physical tilt rotation: RPLIDAR rotates around local X-axis
    // Level-only interlock: In transit, head is held strictly level (0°) to feed 2D SLAM
    const effectiveTilt = isNavigating ? 0 : tiltDeg;
    const rad = (-effectiveTilt * Math.PI) / 180;
    tiltHead.rotation.x = rad;

    // Laser fan visibility & interlock color
    laserFan.visible = showLaserFan;
    if (showLaserFan) {
      const fanMat = fanMesh.material as THREE.MeshBasicMaterial;
      fanMat.opacity = isSweeping ? 0.26 : 0.16;
      fanMat.color.setHex(isNavigating ? 0x1da67a : 0xa87914);
      laserBeam.visible = showSpinningBeam;
      if (showSpinningBeam && (isSweeping || isNavigating)) {
        laserBeam.rotation.y += 0.45; // 10 Hz mirror rotation
      }
    }

    wake();
  }, [roverPose.x, roverPose.z, roverPose.heading, tiltDeg, showLaserFan, showSpinningBeam, isSweeping, isNavigating]);

  // Update Point Cloud buffer data and vertex coloring
  useEffect(() => {
    const rt = runtimeRef.current;
    if (!rt) return;

    const { pointsMesh, latestMesh, wake } = rt;

    (pointsMesh.material as THREE.PointsMaterial).size = pointSize;
    (latestMesh.material as THREE.PointsMaterial).size = pointSize * 1.5;

    const [minY, maxY] = heightFilter;
    const filteredPoints: ScanPoint[] = [];

    const totalCount = points.length;
    for (let i = 0; i < totalCount; i++) {
      const p = points[i];
      if (p.y < minY || p.y > maxY) continue;

      if (isolatedPlane !== "all") {
        const planeIdx = Math.floor(i / raysPerPlane);
        if (planeIdx !== isolatedPlane) continue;
      }

      filteredPoints.push(p);
    }

    const count = filteredPoints.length;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    const tempColor = new THREE.Color();
    const deepWine = new THREE.Color("#8A1C1C");
    const warmAmber = new THREE.Color("#C89228");
    const lightTitanium = new THREE.Color("#E5E1D8");
    const laserRed = new THREE.Color("#E34242");

    for (let i = 0; i < count; i++) {
      const p = filteredPoints[i];
      const i3 = i * 3;
      positions[i3] = p.x;
      positions[i3 + 1] = p.y;
      positions[i3 + 2] = p.z;

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
        const planeIdx = Math.floor(i / raysPerPlane) % PLANE_PALETTE.length;
        tempColor.copy(PLANE_PALETTE[planeIdx]);
      }

      colors[i3] = tempColor.r;
      colors[i3 + 1] = tempColor.g;
      colors[i3 + 2] = tempColor.b;
    }

    // High performance in-place buffer update eliminates GPU allocation stalls
    let posAttr = pointsMesh.geometry.getAttribute("position") as THREE.BufferAttribute | undefined;
    let colAttr = pointsMesh.geometry.getAttribute("color") as THREE.BufferAttribute | undefined;

    if (!posAttr || !colAttr || posAttr.count < count) {
      const capacity = Math.max(12000, Math.ceil(count * 1.5));
      const posArray = new Float32Array(capacity * 3);
      const colArray = new Float32Array(capacity * 3);
      pointsMesh.geometry.dispose();
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(posArray, 3));
      geo.setAttribute("color", new THREE.BufferAttribute(colArray, 3));
      pointsMesh.geometry = geo;
      posAttr = geo.getAttribute("position") as THREE.BufferAttribute;
      colAttr = geo.getAttribute("color") as THREE.BufferAttribute;
    }

    const posArray = posAttr!.array as Float32Array;
    const colArray = colAttr!.array as Float32Array;
    posArray.set(positions);
    colArray.set(colors);
    posAttr!.needsUpdate = true;
    colAttr!.needsUpdate = true;
    pointsMesh.geometry.setDrawRange(0, count);
    pointsMesh.geometry.computeBoundingSphere();

    // Latest slice highlight buffer
    const latestFiltered = latestPoints.filter((p) => p.y >= minY && p.y <= maxY);
    const latestCount = latestFiltered.length;
    let lPosAttr = latestMesh.geometry.getAttribute("position") as THREE.BufferAttribute | undefined;
    if (!lPosAttr || lPosAttr.count < latestCount) {
      const cap = Math.max(1200, latestCount * 2);
      latestMesh.geometry.dispose();
      const lGeo = new THREE.BufferGeometry();
      lGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(cap * 3), 3));
      latestMesh.geometry = lGeo;
      lPosAttr = lGeo.getAttribute("position") as THREE.BufferAttribute;
    }
    const lPosArray = lPosAttr!.array as Float32Array;
    for (let j = 0; j < latestCount; j++) {
      const j3 = j * 3;
      lPosArray[j3] = latestFiltered[j].x;
      lPosArray[j3 + 1] = latestFiltered[j].y;
      lPosArray[j3 + 2] = latestFiltered[j].z;
    }
    lPosAttr!.needsUpdate = true;
    latestMesh.geometry.setDrawRange(0, latestCount);
    latestMesh.geometry.computeBoundingSphere();

    wake();
  }, [points, latestPoints, pointSize, colorMode, roomHeight, heightFilter, isolatedPlane, raysPerPlane]);

  // Handle Camera view presets
  useEffect(() => {
    const rt = runtimeRef.current;
    if (!rt) return;

    const { camera, controls, wake } = rt;
    if (view === "isometric") {
      camera.position.set(4.8, 3.8, 5.2);
      controls.target.set(0, 0.8, 0);
    } else if (view === "top") {
      camera.position.set(0.001, 7.5, 0);
      controls.target.set(0, 0, 0);
    } else if (view === "front") {
      camera.position.set(0, 1.4, 6.2);
      controls.target.set(0, 0.8, 0);
    }
    controls.update();
    wake();
  }, [view]);

  if (webglError) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#050507] p-6 text-center font-mono text-[11px] text-[#A87914]">
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
