"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { AssemblyPart } from "@/sonaris/lib/sonaris-assembly";
import { createAssemblyModel, createStudioEnvMap } from "./assembly-models";

type Position = [number, number, number];

export interface AssemblyStageProps {
  parts: AssemblyPart[];
  positions: Record<string, Position>;
  connections: { id: string; fromPart: string; fromPort: string; toPart: string; toPort: string }[];
  selectedId: string;
  onSelect: (id: string) => void;
  onMove: (id: string, position: Position) => void;
  onPort: (partId: string, portId: string) => void;
  exploded: boolean;
  explodeAmount?: number;
  view: "top" | "isometric" | "front";
  mode: "orbit" | "move" | "connect";
  activeGroup: "all" | "drive" | "sensing" | "power" | "safety" | "compute" | "structure";
  running: boolean;
  pendingPort?: { partId: string; portId: string } | null;
  onDropPart?: (id: string, position: Position) => void;
  /** Parts hidden independently of the subsystem filter (e.g. the removable body shell). */
  hiddenPartIds?: string[];
  /** Optional custom hex color for the body shell & deck ivory finish. */
  shellColor?: number;
}

interface PartEntry {
  part: AssemblyPart;
  group: THREE.Group;
  model: THREE.Group;
  target: THREE.Vector3;
  explodeVec: THREE.Vector3;
  materials: THREE.MeshStandardMaterial[];
  ports: Map<string, THREE.Mesh>;
}

interface WireEntry {
  line: THREE.Line;
  from: THREE.Object3D;
  to: THREE.Object3D;
}

interface KineticNode {
  object: THREE.Object3D;
  type: "wheel" | "scanner" | "tilt";
}

interface SceneState {
  scene: THREE.Scene;
  renderer: THREE.WebGLRenderer;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  content: THREE.Group;
  wires: THREE.Group;
  entries: Map<string, PartEntry>;
  wireEntries: WireEntry[];
  kineticNodes: KineticNode[];
  wiresDirty: boolean;
  wake: () => void;
  reduced: MediaQueryList;
}

function dispose(root: THREE.Object3D) {
  const materials = new Set<THREE.Material>();
  root.traverse((object) => {
    if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Points) {
      object.geometry.dispose();
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        if (material) materials.add(material);
      }
    }
  });
  for (const material of materials) {
    for (const value of Object.values(material)) {
      if (value instanceof THREE.Texture) value.dispose();
    }
    material.dispose();
  }
}

function updateSelectionEmissive(state: SceneState, selectedId: string) {
  for (const entry of state.entries.values()) {
    const isSelected = entry.part.id === selectedId;
    for (let i = 0; i < entry.materials.length; i++) {
      const m = entry.materials[i];
      m.emissive.setHex(isSelected ? 0x3d2810 : 0);
      m.emissiveIntensity = isSelected ? 0.25 : 0;
    }
  }
}

function setCameraPreset(state: SceneState, view: "top" | "isometric" | "front") {
  const directions = {
    top: [0, 1600, 1],
    isometric: [1100, 900, 1100],
    front: [1500, 300, 0]
  } as const;
  state.controls.target.set(0, 120, 0);
  const direction = directions[view];
  state.camera.position.set(direction[0], direction[1], direction[2]);
  state.controls.update();
}

function buildParts(state: SceneState, props: AssemblyStageProps) {
  dispose(state.content);
  state.content.clear();
  state.entries.clear();
  state.kineticNodes = [];

  const eAmount =
    props.explodeAmount !== undefined
      ? props.explodeAmount
      : props.exploded
        ? 1
        : 0;

  const portCylinder = new THREE.CylinderGeometry(3, 3, 3.5, 10);

  for (const part of props.parts) {
    const group = new THREE.Group();
    const model = createAssemblyModel(part, props.shellColor ?? 0xded8ca);
    group.userData.partId = part.id;
    group.rotation.set(...(part.rotation.map(THREE.MathUtils.degToRad) as Position));
    group.add(model);

    const materials: THREE.MeshStandardMaterial[] = [];
    const seenMat = new Set<THREE.Material>();

    model.traverse((node) => {
      if (node.userData.motion === "wheel") {
        state.kineticNodes.push({ object: node, type: "wheel" });
      } else if (node.userData.motion === "scanner") {
        state.kineticNodes.push({ object: node, type: "scanner" });
      } else if (node.userData.motion === "tilt") {
        state.kineticNodes.push({ object: node, type: "tilt" });
      }
      if (node instanceof THREE.Mesh && node.material instanceof THREE.MeshStandardMaterial) {
        if (!seenMat.has(node.material)) {
          seenMat.add(node.material);
          materials.push(node.material);
        }
      }
    });

    const ports = new Map<string, THREE.Mesh>();
    for (const port of part.ports) {
      const portColor =
        port.kind === "power" ? 0x991f1f : port.kind === "drive" ? 0xa87914 : 0x1f6b42;
      const sphere = new THREE.Mesh(
        portCylinder.clone(),
        new THREE.MeshStandardMaterial({
          color: portColor,
          roughness: 0.35,
          metalness: 0.75
        })
      );
      sphere.position.set(...port.position);
      sphere.userData.partId = part.id;
      sphere.userData.portId = port.id;
      sphere.visible = props.mode === "connect" || props.connections.length > 0;
      group.add(sphere);
      ports.set(port.id, sphere);
    }

    const position = props.positions[part.id] ?? part.home;
    const explodeVec = new THREE.Vector3(...part.explode);
    const target = new THREE.Vector3(...position);
    if (eAmount > 0) {
      target.addScaledVector(explodeVec, eAmount);
    }
    group.position.copy(target);
    group.visible =
      (props.activeGroup === "all" || props.activeGroup === part.group) &&
      !props.hiddenPartIds?.includes(part.id);

    state.content.add(group);
    state.entries.set(part.id, {
      part,
      group,
      model,
      ports,
      target,
      explodeVec,
      materials
    });
  }

  portCylinder.dispose();
  updateSelectionEmissive(state, props.selectedId);
  state.wiresDirty = true;
  state.renderer.shadowMap.needsUpdate = true;
}

function buildWires(state: SceneState, connections: AssemblyStageProps["connections"]) {
  dispose(state.wires);
  state.wires.clear();
  state.wireEntries = [];

  for (const connection of connections) {
    const from = state.entries.get(connection.fromPart)?.ports.get(connection.fromPort);
    const to = state.entries.get(connection.toPart)?.ports.get(connection.toPort);
    if (!from || !to) continue;

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(75), 3));

    const isPower =
      connection.fromPort.includes("power") ||
      connection.toPort.includes("power") ||
      connection.fromPort.includes("supply");
    const isDrive =
      connection.fromPort.includes("motor") || connection.toPort.includes("drive");
    const wireColor = isPower ? 0x991f1f : isDrive ? 0xa87914 : 0x1f6b42;

    const line = new THREE.Line(
      geometry,
      new THREE.LineBasicMaterial({ color: wireColor, linewidth: 2 })
    );
    line.frustumCulled = false;
    state.wires.add(line);
    state.wireEntries.push({ line, from, to });
  }

  state.wiresDirty = true;
}

export function AssemblyStage(props: AssemblyStageProps) {
  const host = useRef<HTMLDivElement>(null);
  const latest = useRef(props);
  const runtime = useRef<SceneState | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    latest.current = props;
  }, [props]);

  useEffect(() => {
    const element = host.current;
    if (!element) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    } catch {
      setError("WebGL is unavailable. Use the component inspector to view specifications.");
      return;
    }

    renderer.setClearColor(0xe5e1d8);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.needsUpdate = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.06;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.style.touchAction = "none";
    renderer.domElement.style.cursor = "grab";
    renderer.domElement.setAttribute(
      "aria-label",
      "Interactive 3D assembly. Drag to orbit; scroll to zoom; click part to inspect; Shift-drag or Slide mode to translate part."
    );
    element.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const envMap = createStudioEnvMap(renderer);
    if (envMap) {
      scene.environment = envMap;
    }
    const camera = new THREE.PerspectiveCamera(32, 1, 1, 10000);
    camera.position.set(1100, 900, 1100);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 120, 0);
    controls.minDistance = 200;
    controls.maxDistance = 3500;
    controls.maxPolarAngle = Math.PI * 0.49;
    controls.enableDamping = true;
    controls.dampingFactor = 0.09;
    controls.rotateSpeed = 0.85;

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0xa09686, 2.8);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 3.4);
    keyLight.position.set(400, 1200, 500);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    Object.assign(keyLight.shadow.camera, {
      left: -900,
      right: 900,
      top: 900,
      bottom: -900,
      near: 50,
      far: 2800
    });
    keyLight.shadow.camera.updateProjectionMatrix();
    keyLight.shadow.bias = -0.0004;
    keyLight.shadow.normalBias = 1.2;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xe8edf2, 1.4);
    fillLight.position.set(-600, 500, -600);
    scene.add(fillLight);

    const gridHelper = new THREE.GridHelper(2400, 48, 0xb8b2a4, 0xd0cbc0);
    gridHelper.position.y = -2;
    scene.add(gridHelper);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(4000, 4000),
      new THREE.ShadowMaterial({ opacity: 0.22 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -2.5;
    ground.receiveShadow = true;
    scene.add(ground);

    const content = new THREE.Group();
    const wires = new THREE.Group();
    scene.add(content, wires);

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let inAnimate = false;
    let last = 0;
    let disposed = false;
    let hoverRaf = 0;
    let wasPartsMoving = false;
    const tmpA = new THREE.Vector3();
    const tmpB = new THREE.Vector3();
    const lastCamPos = new THREE.Vector3().copy(camera.position);
    const lastTargetPos = new THREE.Vector3().copy(controls.target);

    let drag: {
      entry: PartEntry;
      offset: THREE.Vector3;
      startX: number;
      startY: number;
      moved: boolean;
    } | null = null;
    let clickStart: { x: number; y: number } | null = null;

    const animate = (now: number) => {
      if (disposed) {
        frame = 0;
        return;
      }
      // Guard against synchronous controls.update() -> "change" -> wake() spawning duplicate rAF loops!
      inAnimate = true;
      const dt = Math.min((now - (last || now)) / 1000, 0.05);
      last = now;
      const state = runtime.current;
      if (!state) {
        inAnimate = false;
        frame = 0;
        return;
      }

      controls.update();
      const camMoved =
        lastCamPos.distanceToSquared(camera.position) > 0.01 ||
        lastTargetPos.distanceToSquared(controls.target) > 0.01;
      lastCamPos.copy(camera.position);
      lastTargetPos.copy(controls.target);

      let partsMoving = false;
      for (const entry of state.entries.values()) {
        if (drag?.entry !== entry) {
          if (entry.group.position.distanceToSquared(entry.target) > 0.01) {
            entry.group.position.lerp(
              entry.target,
              reduced.matches ? 1 : 1 - Math.exp(-dt * 28)
            );
            partsMoving = true;
          } else if (!entry.group.position.equals(entry.target)) {
            entry.group.position.copy(entry.target);
            state.renderer.shadowMap.needsUpdate = true;
          }
        }
      }

      if (wasPartsMoving && !partsMoving) {
        state.renderer.shadowMap.needsUpdate = true;
      }
      wasPartsMoving = partsMoving;

      const unsettled = camMoved || partsMoving;

      if (latest.current.running && !reduced.matches) {
        for (let i = 0; i < state.kineticNodes.length; i++) {
          const k = state.kineticNodes[i];
          if (k.type === "wheel") {
            k.object.rotation.z -= dt * 2.0;
          } else if (k.type === "scanner") {
            k.object.rotation.y += dt * 4.5;
          } else if (k.type === "tilt") {
            k.object.rotation.z = Math.sin(now * 0.0018) * 0.36;
          }
        }
      }

      if (state.wireEntries.length > 0 && (partsMoving || drag || state.wiresDirty)) {
        content.updateMatrixWorld(true);
        for (let w = 0; w < state.wireEntries.length; w++) {
          const wire = state.wireEntries[w];
          wire.from.getWorldPosition(tmpA);
          wire.to.getWorldPosition(tmpB);
          const attribute = wire.line.geometry.getAttribute("position") as THREE.BufferAttribute;
          const dist = tmpA.distanceTo(tmpB);
          const sagAmount = Math.min(dist * 0.1, 38);

          for (let i = 0; i < 25; i++) {
            const t = i / 24;
            const sag = -Math.sin(t * Math.PI) * sagAmount;
            attribute.setXYZ(
              i,
              THREE.MathUtils.lerp(tmpA.x, tmpB.x, t),
              Math.max(1, THREE.MathUtils.lerp(tmpA.y, tmpB.y, t) + sag),
              THREE.MathUtils.lerp(tmpA.z, tmpB.z, t)
            );
          }
          attribute.needsUpdate = true;
          wire.line.visible =
            wire.from.parent?.visible !== false && wire.to.parent?.visible !== false;
        }
        state.wiresDirty = false;
      }

      renderer.render(scene, camera);
      inAnimate = false;

      if (unsettled || (latest.current.running && !reduced.matches)) {
        frame = requestAnimationFrame(animate);
      } else {
        frame = 0;
        last = 0;
      }
    };

    const wake = () => {
      if (!frame && !inAnimate && !disposed) {
        frame = requestAnimationFrame(animate);
      }
    };

    const stateInstance: SceneState = {
      scene,
      renderer,
      camera,
      controls,
      content,
      wires,
      entries: new Map(),
      wireEntries: [],
      kineticNodes: [],
      wiresDirty: true,
      wake,
      reduced
    };
    runtime.current = stateInstance;

    buildParts(stateInstance, latest.current);
    buildWires(stateInstance, latest.current.connections);
    setCameraPreset(stateInstance, latest.current.view);

    controls.addEventListener("change", wake);
    controls.addEventListener("start", () => {
      if (!drag) renderer.domElement.style.cursor = "grabbing";
      wake();
    });
    controls.addEventListener("end", () => {
      if (!drag) renderer.domElement.style.cursor = "grab";
      wake();
    });
    reduced.addEventListener("change", wake);

    const resize = new ResizeObserver(() => {
      if (!element.clientWidth || !element.clientHeight) return;
      const aspect = element.clientWidth / element.clientHeight;
      renderer.setSize(element.clientWidth, element.clientHeight);
      camera.aspect = aspect;
      // Scale zoom smoothly on square/portrait tablet viewports (iPad Pro 4:3, Tab S8+ split/portrait) so exploded parts never clip
      camera.zoom = Math.min(1.06, Math.max(0.74, aspect / 1.12));
      camera.updateProjectionMatrix();
      renderer.shadowMap.needsUpdate = true;
      wake();
    });
    resize.observe(element);

    const visibilityObserver = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) {
        if (frame) {
          cancelAnimationFrame(frame);
          frame = 0;
        }
      } else {
        wake();
      }
    });
    visibilityObserver.observe(element);

    const ray = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const plane = new THREE.Plane();
    const hitPoint = new THREE.Vector3();
    const upAxis = new THREE.Vector3(0, 1, 0);

    const cast = (x: number, y: number) => {
      const bounds = renderer.domElement.getBoundingClientRect();
      pointer.set(
        ((x - bounds.left) / bounds.width) * 2 - 1,
        -((y - bounds.top) / bounds.height) * 2 + 1
      );
      ray.setFromCamera(pointer, camera);
    };

    const hits = () =>
      ray.intersectObjects(content.children, true).filter((hit) => {
        let node: THREE.Object3D | null = hit.object;
        while (node) {
          if (!node.visible) return false;
          node = node.parent;
        }
        return true;
      });

    const identify = (object: THREE.Object3D) => {
      let node: THREE.Object3D | null = object;
      while (node) {
        if (typeof node.userData.partId === "string") return node.userData.partId as string;
        node = node.parent;
      }
      return null;
    };

    const down = (event: PointerEvent) => {
      const wantMove = latest.current.mode === "move" || event.shiftKey;

      // Fast path for normal Orbit mode: ZERO raycasting on pointerdown so camera rotation starts with 0ms latency!
      if (latest.current.mode === "orbit" && !wantMove) {
        clickStart = { x: event.clientX, y: event.clientY };
        return;
      }

      cast(event.clientX, event.clientY);
      const hit = hits()[0];
      if (!hit) return;

      const id = identify(hit.object);
      if (!id) return;

      if (latest.current.mode === "connect") {
        const port = hits().find((candidate) => typeof candidate.object.userData.portId === "string");
        if (port) {
          controls.enabled = false;
          latest.current.onPort(identify(port.object)!, port.object.userData.portId);
        }
        return;
      }

      // Slide / Move part along datum plane
      latest.current.onSelect(id);
      const entry = runtime.current?.entries.get(id);
      if (!entry) return;

      plane.set(upAxis, -entry.group.position.y);
      if (!ray.ray.intersectPlane(plane, hitPoint)) return;

      drag = {
        entry,
        offset: entry.group.position.clone().sub(hitPoint),
        startX: event.clientX,
        startY: event.clientY,
        moved: false
      };
      controls.enabled = false;
      renderer.domElement.style.cursor = "grabbing";
      renderer.domElement.setPointerCapture(event.pointerId);
    };

    const move = (event: PointerEvent) => {
      if (drag) {
        cast(event.clientX, event.clientY);
        if (ray.ray.intersectPlane(plane, hitPoint)) {
          drag.entry.group.position.copy(hitPoint).add(drag.offset);
          drag.moved ||=
            Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 3;
          if (runtime.current) {
            runtime.current.wiresDirty = true;
          }
          wake();
        }
        return;
      }

      // In orbit mode (no Shift), never raycast on pointermove—keep 100% of CPU/GPU for smooth 60fps orbit!
      if (
        event.buttons !== 0 ||
        (latest.current.mode === "orbit" && !event.shiftKey)
      ) {
        return;
      }

      if (!hoverRaf) {
        const cx = event.clientX;
        const cy = event.clientY;
        hoverRaf = requestAnimationFrame(() => {
          hoverRaf = 0;
          if (disposed) return;
          cast(cx, cy);
          const hasHits = hits().length > 0;
          renderer.domElement.style.cursor = hasHits
            ? latest.current.mode === "connect"
              ? "crosshair"
              : "move"
            : "grab";
        });
      }
    };

    const up = (event: PointerEvent) => {
      // Stationary click in orbit mode: raycast once on click release to select & inspect part
      if (clickStart) {
        const dist = Math.hypot(event.clientX - clickStart.x, event.clientY - clickStart.y);
        clickStart = null;
        if (dist < 5) {
          cast(event.clientX, event.clientY);
          const hit = hits()[0];
          const id = hit ? identify(hit.object) : null;
          if (id) latest.current.onSelect(id);
        }
      }

      if (drag?.moved) {
        const entry = drag.entry;
        const p = entry.group.position;
        const eAmount =
          latest.current.explodeAmount !== undefined
            ? latest.current.explodeAmount
            : latest.current.exploded
              ? 1
              : 0;
        latest.current.onMove(entry.part.id, [
          p.x - entry.explodeVec.x * eAmount,
          p.y - entry.explodeVec.y * eAmount,
          p.z - entry.explodeVec.z * eAmount
        ]);
        entry.target.copy(p);
      }
      if (drag && runtime.current) {
        runtime.current.wiresDirty = true;
        runtime.current.renderer.shadowMap.needsUpdate = true;
      }
      drag = null;
      controls.enabled = true;
      renderer.domElement.style.cursor = "grab";
      if (renderer.domElement.hasPointerCapture(event.pointerId)) {
        renderer.domElement.releasePointerCapture(event.pointerId);
      }
      wake();
    };

    const cancel = () => {
      clickStart = null;
      drag = null;
      controls.enabled = true;
      renderer.domElement.style.cursor = "grab";
      wake();
    };

    const dragover = (event: DragEvent) => {
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
    };

    const drop = (event: DragEvent) => {
      event.preventDefault();
      const id = event.dataTransfer?.getData("text/sonaris-part");
      if (!id) return;
      cast(event.clientX, event.clientY);
      plane.set(upAxis, 0);
      if (ray.ray.intersectPlane(plane, hitPoint)) {
        latest.current.onDropPart?.(id, [hitPoint.x, 0, hitPoint.z]);
      }
    };

    renderer.domElement.addEventListener("pointerdown", down, true);
    renderer.domElement.addEventListener("pointermove", move);
    renderer.domElement.addEventListener("pointerup", up);
    renderer.domElement.addEventListener("pointercancel", cancel);
    renderer.domElement.addEventListener("dragover", dragover);
    renderer.domElement.addEventListener("drop", drop);

    if (element.clientWidth && element.clientHeight) {
      renderer.setSize(element.clientWidth, element.clientHeight);
      camera.aspect = element.clientWidth / element.clientHeight;
      camera.updateProjectionMatrix();
    }
    renderer.render(scene, camera);

    setReady(true);
    wake();

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      if (hoverRaf) cancelAnimationFrame(hoverRaf);
      resize.disconnect();
      visibilityObserver.disconnect();
      controls.removeEventListener("change", wake);
      controls.dispose();
      reduced.removeEventListener("change", wake);
      renderer.domElement.removeEventListener("pointerdown", down, true);
      renderer.domElement.removeEventListener("pointermove", move);
      renderer.domElement.removeEventListener("pointerup", up);
      renderer.domElement.removeEventListener("pointercancel", cancel);
      renderer.domElement.removeEventListener("dragover", dragover);
      renderer.domElement.removeEventListener("drop", drop);
      dispose(scene);
      renderer.dispose();
      renderer.domElement.remove();
      runtime.current = null;
    };
  }, []);

  useEffect(() => {
    const state = runtime.current;
    if (!state || !ready) return;
    buildParts(state, props);
    buildWires(state, props.connections);
    state.wake();
  }, [ready, props.parts, props.shellColor]);

  useEffect(() => {
    const state = runtime.current;
    if (!state || !ready) return;

    const eAmount =
      props.explodeAmount !== undefined
        ? props.explodeAmount
        : props.exploded
          ? 1
          : 0;

    let visibilityChanged = false;
    for (const entry of state.entries.values()) {
      const position = props.positions[entry.part.id] ?? entry.part.home;
      entry.target.set(...position);
      if (eAmount > 0) {
        entry.target.addScaledVector(entry.explodeVec, eAmount);
      }
      const nextVisible =
        (props.activeGroup === "all" || props.activeGroup === entry.part.group) &&
        !props.hiddenPartIds?.includes(entry.part.id);
      if (entry.group.visible !== nextVisible) {
        entry.group.visible = nextVisible;
        visibilityChanged = true;
      }
    }

    state.wiresDirty = true;
    if (visibilityChanged) {
      state.renderer.shadowMap.needsUpdate = true;
    }
    state.wake();
  }, [
    ready,
    props.positions,
    props.exploded,
    props.explodeAmount,
    props.activeGroup,
    props.hiddenPartIds
  ]);

  useEffect(() => {
    const state = runtime.current;
    if (!state || !ready) return;
    updateSelectionEmissive(state, props.selectedId);
    state.wake();
  }, [ready, props.selectedId]);

  useEffect(() => {
    const state = runtime.current;
    if (!state || !ready) return;

    const showPorts = props.mode === "connect" || props.connections.length > 0;
    for (const entry of state.entries.values()) {
      for (const [id, sphere] of entry.ports) {
        sphere.visible = showPorts;
        const pending =
          props.pendingPort?.partId === entry.part.id && props.pendingPort.portId === id;
        sphere.scale.setScalar(pending ? 1.8 : 1);
      }
    }
    state.wake();
  }, [ready, props.mode, props.pendingPort, props.connections.length]);

  useEffect(() => {
    const state = runtime.current;
    if (!state || !ready) return;
    buildWires(state, props.connections);
    state.wake();
  }, [ready, props.connections]);

  useEffect(() => {
    const state = runtime.current;
    if (!state || !ready) return;
    setCameraPreset(state, props.view);
    state.wake();
  }, [ready, props.view]);

  useEffect(() => {
    const state = runtime.current;
    if (!state || !ready) return;
    if (props.running) state.wake();
  }, [ready, props.running]);

  return (
    <div className="relative h-full min-h-[300px] w-full overflow-hidden bg-[var(--sonaris-deck)]">
      <div ref={host} className="absolute inset-0" />

      {!ready && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-[var(--sonaris-deck)] p-6 font-mono text-[11px] text-[var(--sonaris-studio-muted)] select-none">
          <div className="flex items-center gap-2.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-[var(--sonaris-red)] animate-pulse" />
            <strong className="tracking-wider uppercase text-[var(--sonaris-studio-ink)] text-[12px]">
              SONARIS · 3D Spatial Twin
            </strong>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-[var(--sonaris-studio-muted)]">
            <span className="inline-block h-1.5 w-24 overflow-hidden rounded-full bg-[var(--sonaris-track)]">
              <span className="block h-full w-2/3 animate-pulse rounded-full bg-[var(--sonaris-red)]" />
            </span>
            <span>Initializing Kinematics</span>
          </div>
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="absolute inset-x-4 top-4 rounded-xl border border-[var(--sonaris-red)] bg-[var(--sonaris-card)] p-4 font-mono text-[13px] text-[var(--sonaris-red)]"
        >
          {error}
        </p>
      )}
    </div>
  );
}

export default AssemblyStage;
