"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { ChassisPartId, FabricationMaterialId } from "./fabrication-models";
import { CHASSIS_COMPONENTS, FABRICATION_MATERIALS } from "./fabrication-models";

export interface FabricationStageProps {
  selectedPartId: ChassisPartId;
  selectedMaterialId: FabricationMaterialId;
  isRotated90: boolean;
  sliceHeightMm?: number;
  explodeAmount?: number; // 0 to 1 for full frame
  showBuildCage?: boolean;
}

function disposeObject(obj: THREE.Object3D) {
  if (obj instanceof THREE.Mesh || obj instanceof THREE.Line || obj instanceof THREE.LineSegments) {
    if (obj.geometry) obj.geometry.dispose();
    if (Array.isArray(obj.material)) {
      obj.material.forEach((m) => m.dispose());
    } else if (obj.material) {
      obj.material.dispose();
    }
  }
}

export function FabricationStage({
  selectedPartId,
  selectedMaterialId,
  isRotated90,
  sliceHeightMm = 350,
  explodeAmount = 0,
  showBuildCage = true
}: FabricationStageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const runtimeRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    partGroup: THREE.Group;
    cageGroup: THREE.Group;
    bedMesh: THREE.Mesh;
    slicePlaneMesh: THREE.Mesh;
    wake: () => void;
  } | null>(null);

  const [webglError, setWebglError] = useState<string | null>(null);

  // Initialize Three.js scene
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    } catch {
      setWebglError("WebGL is unavailable on this device.");
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setClearColor(0xe5e1d8, 1);
    renderer.domElement.style.touchAction = "none";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    renderer.domElement.setAttribute("aria-label", "Interactive 3D Fabrication & Chassis Viewport");
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();

    // Natural camera angle overlooking the 300x300mm build plate
    const camera = new THREE.PerspectiveCamera(34, container.clientWidth / container.clientHeight, 1, 3000);
    camera.position.set(380, 420, 460);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.rotateSpeed = 0.85;
    controls.minDistance = 150;
    controls.maxDistance = 1200;
    controls.maxPolarAngle = Math.PI * 0.49;
    controls.target.set(0, 80, 0);

    // Balanced laboratory illumination
    const ambient = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xfffdfa, 2.2);
    keyLight.position.set(250, 600, 300);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xdde3ed, 1.0);
    fillLight.position.set(-300, 350, -250);
    scene.add(fillLight);

    // 1. Reference 300 x 300 mm Build Plate (Spring Steel PEI Sheet)
    const bedGeo = new THREE.PlaneGeometry(300, 300);
    const bedMat = new THREE.MeshStandardMaterial({
      color: 0x22242a,
      roughness: 0.85,
      metalness: 0.4,
      side: THREE.DoubleSide
    });
    const bedMesh = new THREE.Mesh(bedGeo, bedMat);
    bedMesh.rotation.x = -Math.PI / 2;
    bedMesh.position.y = 0;
    scene.add(bedMesh);

    // Grid markings: 10 mm fine ticks, 50 mm bold lines
    const bedGrid = new THREE.GridHelper(300, 30, 0x991f1f, 0x3d414a);
    bedGrid.position.y = 0.2;
    scene.add(bedGrid);

    // 2. 300 x 300 x 350 mm Build Volume Cage
    const cageGroup = new THREE.Group();
    scene.add(cageGroup);

    const cageGeo = new THREE.BoxGeometry(300, 350, 300);
    const cageEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(cageGeo),
      new THREE.LineBasicMaterial({ color: 0x8a857a, transparent: true, opacity: 0.65 })
    );
    cageEdges.position.y = 175;
    cageGroup.add(cageEdges);

    // Corner boundary ticks on the bed (±150mm)
    const tickMat = new THREE.LineBasicMaterial({ color: 0x991f1f, linewidth: 2 });
    const cornerCoords = [
      [150, -150],
      [150, 150],
      [-150, -150],
      [-150, 150]
    ];
    cornerCoords.forEach(([cx, cz]) => {
      const tickGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(cx, 0.3, cz),
        new THREE.Vector3(cx, 18, cz)
      ]);
      cageGroup.add(new THREE.Line(tickGeo, tickMat));
    });

    // 3. Slicing Layer Plane Indicator
    const sliceGeo = new THREE.PlaneGeometry(320, 320);
    const sliceMat = new THREE.MeshBasicMaterial({
      color: 0x1da67a,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.18,
      depthWrite: false
    });
    const slicePlaneMesh = new THREE.Mesh(sliceGeo, sliceMat);
    slicePlaneMesh.rotation.x = -Math.PI / 2;
    slicePlaneMesh.position.y = 350;
    scene.add(slicePlaneMesh);

    // Group for selected chassis part
    const partGroup = new THREE.Group();
    scene.add(partGroup);

    // Demand-driven rendering with smooth damping loop
    let frameId = 0;
    let inAnimate = false;
    let disposed = false;

    const animate = () => {
      if (disposed) {
        frameId = 0;
        return;
      }
      inAnimate = true;
      const coasting = controls.update();
      renderer.render(scene, camera);
      inAnimate = false;
      frameId = coasting ? requestAnimationFrame(animate) : 0;
    };

    const wake = () => {
      if (!frameId && !inAnimate && !disposed) {
        frameId = requestAnimationFrame(animate);
      }
    };

    controls.addEventListener("change", wake);

    // Responsive container resize observer
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
      partGroup,
      cageGroup,
      bedMesh,
      slicePlaneMesh,
      wake
    };

    wake();

    return () => {
      disposed = true;
      if (frameId) cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      controls.removeEventListener("change", wake);
      controls.dispose();
      scene.traverse((obj) => disposeObject(obj));
      renderer.dispose();
      renderer.domElement.remove();
      runtimeRef.current = null;
    };
  }, []);

  // Update 3D Chassis Component Geometry & Slicing State
  useEffect(() => {
    const rt = runtimeRef.current;
    if (!rt) return;

    const { partGroup, cageGroup, slicePlaneMesh, wake } = rt;
    partGroup.clear();

    cageGroup.visible = showBuildCage;

    const part = CHASSIS_COMPONENTS.find((c) => c.id === selectedPartId) || CHASSIS_COMPONENTS[0];
    const mat = FABRICATION_MATERIALS.find((m) => m.id === selectedMaterialId) || FABRICATION_MATERIALS[0];

    // Determine material visual finish
    let baseColor = 0x22242a; // PETG-CF carbon charcoal
    let roughness = 0.75;
    let metalness = 0.25;

    if (mat.id === "plapro") {
      baseColor = 0x2c3e50; // Deep navy PLA+
      roughness = 0.65;
    } else if (mat.id === "alu-5052") {
      baseColor = 0xd0cbc0; // Milled aluminium
      roughness = 0.35;
      metalness = 0.85;
    } else if (mat.id === "abs-esun") {
      baseColor = 0x991f1f; // Signature dark red ABS
      roughness = 0.7;
    }

    const standardMat = new THREE.MeshStandardMaterial({
      color: baseColor,
      roughness,
      metalness
    });

    const edgeMat = new THREE.LineBasicMaterial({
      color: 0x111319,
      linewidth: 1
    });

    const warnEdgeMat = new THREE.LineBasicMaterial({
      color: 0x991f1f,
      linewidth: 2
    });

    // Effective footprint accounting for 90° rotation
    const effLength = isRotated90 ? part.widthMm : part.lengthMm;
    const effWidth = isRotated90 ? part.lengthMm : part.widthMm;
    const exceedsBed = effLength > 300 || effWidth > 300;

    // Helper to add chamfered mesh with edges
    const addMesh = (geo: THREE.BufferGeometry, yOffset: number, parent: THREE.Group = partGroup) => {
      const mesh = new THREE.Mesh(geo, standardMat);
      mesh.position.y = yOffset;
      const wire = new THREE.LineSegments(
        new THREE.EdgesGeometry(geo),
        exceedsBed ? warnEdgeMat : edgeMat
      );
      mesh.add(wire);
      parent.add(mesh);
      return mesh;
    };

    // -------------------------------------------------------------
    // BUILD 3D COMPONENT GEOMETRY
    // -------------------------------------------------------------
    switch (part.id) {
      case "base-plate": {
        // Main deck (280 x 240 x 8 mm)
        const plateGeo = new THREE.BoxGeometry(280, 8, 240);
        addMesh(plateGeo, 4);

        // 4 Motor bracket mounting flanges
        const earGeo = new THREE.BoxGeometry(45, 12, 35);
        [-115, 115].forEach((x) => {
          [-95, 95].forEach((z) => {
            addMesh(earGeo, 6).position.set(x, 6, z);
          });
        });

        // Battery compartment recess lip (160 x 80 x 4 mm)
        const batRimGeo = new THREE.BoxGeometry(164, 4, 84);
        addMesh(batRimGeo, 10).position.set(0, 10, 0);
        break;
      }

      case "electronics-deck": {
        // Middle deck (260 x 200 x 4 mm)
        const deckGeo = new THREE.BoxGeometry(260, 4, 200);
        addMesh(deckGeo, 2);

        // 4 Corner Standoff Bosses
        const bossGeo = new THREE.CylinderGeometry(6, 6, 8, 16);
        [-110, 110].forEach((x) => {
          [-80, 80].forEach((z) => {
            addMesh(bossGeo, 6).position.set(x, 6, z);
          });
        });

        // Pi 5 mounting bosses (M2.5)
        const piBossGeo = new THREE.CylinderGeometry(4, 4, 6, 12);
        [
          [-58, -49],
          [0, -49],
          [-58, 0],
          [0, 0]
        ].forEach(([px, pz]) => {
          addMesh(piBossGeo, 5).position.set(px, 5, pz);
        });
        break;
      }

      case "sensor-mast": {
        // Base mounting plate
        const baseGeo = new THREE.BoxGeometry(140, 8, 110);
        addMesh(baseGeo, 4);

        // Dual vertical fork arms
        const armGeo = new THREE.BoxGeometry(14, 160, 24);
        [-48, 48].forEach((x) => {
          addMesh(armGeo, 88).position.set(x, 88, 0);
        });

        // ST3215 Servo Mounting Pocket & Top Bridge
        const bridgeGeo = new THREE.BoxGeometry(110, 16, 26);
        addMesh(bridgeGeo, 168).position.set(0, 168, 0);

        // Circular Bearing Pivot Journals
        const journalGeo = new THREE.CylinderGeometry(14, 14, 16, 20);
        journalGeo.rotateZ(Math.PI / 2);
        [-52, 52].forEach((x) => {
          addMesh(journalGeo, 150).position.set(x, 150, 0);
        });
        break;
      }

      case "motor-brackets": {
        // 4 Discrete Motor Brackets arranged symmetrically
        const bracketGeo = new THREE.BoxGeometry(65, 40, 48);
        const offsets = [
          [-80, -70],
          [80, -70],
          [-80, 70],
          [80, 70]
        ];
        offsets.forEach(([bx, bz]) => {
          const b = addMesh(bracketGeo, 20);
          b.position.set(bx, 20, bz);
        });
        break;
      }

      case "full-frame": {
        // Complete Multi-Deck Assembled Frame (340 x 280 x 220 mm)
        const explodeY = explodeAmount * 60;

        // Deck 1: Lower Base Plate
        const d1 = addMesh(new THREE.BoxGeometry(320, 8, 260), 4);
        d1.position.y = 4;

        // 4 Aluminium Standoff Columns
        const standoffGeo = new THREE.CylinderGeometry(5, 5, 45, 12);
        [-120, 120].forEach((x) => {
          [-90, 90].forEach((z) => {
            const st = addMesh(standoffGeo, 26.5 + explodeY * 0.3);
            st.position.set(x, 26.5 + explodeY * 0.3, z);
          });
        });

        // Deck 2: Middle Electronics Deck
        const d2 = addMesh(new THREE.BoxGeometry(260, 4, 200), 51 + explodeY * 0.6);
        d2.position.y = 51 + explodeY * 0.6;

        // Deck 3: Upper Sensor Mast & Fork
        const mastGroup = new THREE.Group();
        mastGroup.position.set(0, 53 + explodeY * 1.2, 0);

        addMesh(new THREE.BoxGeometry(130, 6, 100), 3, mastGroup);
        const mArmL = addMesh(new THREE.BoxGeometry(12, 140, 20), 73, mastGroup);
        mArmL.position.set(-42, 73, 0);
        const mArmR = addMesh(new THREE.BoxGeometry(12, 140, 20), 73, mastGroup);
        mArmR.position.set(42, 73, 0);
        const mBridge = addMesh(new THREE.BoxGeometry(96, 12, 22), 143, mastGroup);
        mBridge.position.set(0, 143, 0);

        partGroup.add(mastGroup);
        break;
      }
    }

    // Apply Bed Rotation (0° or 90°)
    partGroup.rotation.y = isRotated90 ? Math.PI / 2 : 0;

    // Slicing plane position (0 to 350mm)
    const clampedSliceY = Math.max(1, Math.min(350, sliceHeightMm));
    slicePlaneMesh.position.y = clampedSliceY;
    slicePlaneMesh.visible = clampedSliceY < 348;

    wake();
  }, [selectedPartId, selectedMaterialId, isRotated90, sliceHeightMm, explodeAmount, showBuildCage]);

  if (webglError) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#E5E1D8] p-6 text-center font-mono text-[11px] text-[#A87914]">
        {webglError}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden rounded-[20px] bg-[#E5E1D8] select-none cursor-grab active:cursor-grabbing"
    />
  );
}

export default FabricationStage;
