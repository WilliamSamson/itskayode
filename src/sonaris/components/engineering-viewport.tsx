"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export interface ViewportProps {
  components: {
    id: string;
    name: string;
    dimensions: [number, number, number] | null;
    position: [number, number, number];
    rotation: number;
  }[];
  selectedId: string;
  onSelect: (id: string) => void;
  view: "isometric" | "top" | "front" | "side" | "bottom";
  exploded: boolean;
  points: { x: number; y: number; z: number }[];
  room: { width: number; depth: number };
  rover: { x: number; z: number; heading: number };
  mode: "assembly" | "mapping" | "fabrication";
  modelUrl?: string;
  obstacles?: { id: string; x: number; z: number; width: number; depth: number; height: number }[];
  showPoints?: boolean;
  showRoom?: boolean;
  path?: { x: number; z: number }[];
  sectioned?: boolean;
  driveGeometry?: { radius: number; halfLength: number; halfWidth: number; wheelAngles: [number, number, number, number] };
}

type Runtime = {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  content: THREE.Group;
  cloud?: THREE.Points;
  trail?: THREE.Line;
  roverMarker?: THREE.Group;
  wheels?: THREE.Group[];
  render: () => void;
};

function disposeTree(root: THREE.Object3D) {
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    mesh.geometry?.dispose();
    const materials = Array.isArray(mesh.material)
      ? mesh.material
      : mesh.material
        ? [mesh.material]
        : [];
    for (const material of materials) {
      for (const value of Object.values(material))
        if (value instanceof THREE.Texture) value.dispose();
      material.dispose();
    }
  });
}

function label(text: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 64;
  const context = canvas.getContext("2d")!;
  context.font = "24px sans-serif";
  context.fillStyle = "#e5e5e5";
  context.textAlign = "center";
  context.fillText(text, 256, 40, 500);
  const texture = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: texture, depthTest: false, transparent: true })
  );
  sprite.scale.set(0.24, 0.03, 1);
  return sprite;
}

export default function EngineeringViewport(props: ViewportProps) {
  const host = useRef<HTMLDivElement>(null);
  const runtime = useRef<Runtime | null>(null);
  const select = useRef(props.onSelect);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const hasStaging = props.components.some((component) => !component.dimensions);
  useEffect(() => {
    setError((current) => (current.startsWith("The imported GLB") ? "" : current));
  }, [props.modelUrl]);
  useEffect(() => {
    select.current = props.onSelect;
  }, [props.onSelect]);

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    } catch {
      setError("WebGL is unavailable. Component placement remains editable in the inspector.");
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000);
    renderer.localClippingEnabled = true;
    renderer.domElement.style.touchAction = "none";
    renderer.domElement.setAttribute(
      "aria-label",
      "Interactive engineering viewport. Drag to orbit, scroll to zoom, click a component to select."
    );
    renderer.domElement.setAttribute("role", "img");
    element.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.001, 1000);
    camera.position.set(0.6, 0.5, 0.6);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = false;
    controls.minDistance = 0.02;
    controls.maxDistance = 100;
    const content = new THREE.Group();
    scene.add(content, new THREE.HemisphereLight(0xffffff, 0x555555, 2));
    const light = new THREE.DirectionalLight(0xffffff, 3);
    light.position.set(2, 4, 3);
    scene.add(light);
    const render = () => renderer.render(scene, camera);
    controls.addEventListener("change", render);
    const resize = new ResizeObserver(() => {
      const width = element.clientWidth,
        height = element.clientHeight;
      if (!width || !height) return;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      render();
    });
    resize.observe(element);
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let downX = 0,
      downY = 0;
    const down = (event: PointerEvent) => {
      downX = event.clientX;
      downY = event.clientY;
    };
    const up = (event: PointerEvent) => {
      if (Math.hypot(event.clientX - downX, event.clientY - downY) > 5) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        (-(event.clientY - rect.top) / rect.height) * 2 + 1
      );
      raycaster.setFromCamera(pointer, camera);
      for (const hit of raycaster.intersectObjects(content.children, true)) {
        let object: THREE.Object3D | null = hit.object;
        while (object) {
          if (typeof object.userData.componentId === "string") {
            select.current(object.userData.componentId);
            return;
          }
          object = object.parent;
        }
      }
    };
    const lost = (event: Event) => {
      event.preventDefault();
      setError("The WebGL context was lost. Reload to restore the viewport.");
    };
    renderer.domElement.addEventListener("pointerdown", down);
    renderer.domElement.addEventListener("pointerup", up);
    renderer.domElement.addEventListener("webglcontextlost", lost);
    runtime.current = { renderer, scene, camera, controls, content, render };
    setReady(true);
    return () => {
      runtime.current = null;
      resize.disconnect();
      controls.removeEventListener("change", render);
      controls.dispose();
      renderer.domElement.removeEventListener("pointerdown", down);
      renderer.domElement.removeEventListener("pointerup", up);
      renderer.domElement.removeEventListener("webglcontextlost", lost);
      disposeTree(content);
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  useEffect(() => {
    const state = runtime.current;
    if (!state || !ready) return;
    const { content, render } = state;
    disposeTree(content);
    content.clear();
    state.cloud = undefined;
    state.trail = undefined;
    state.roverMarker = undefined;
    state.wheels = undefined;
    const mapping = props.mode === "mapping";
    const width = mapping
      ? Math.max(0.1, props.room.width)
      : props.mode === "fabrication"
        ? 0.3
        : 0.8;
    const depth = mapping
      ? Math.max(0.1, props.room.depth)
      : props.mode === "fabrication"
        ? 0.3
        : 0.8;
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(width, depth),
      new THREE.MeshBasicMaterial({ color: 0x101010, side: THREE.DoubleSide })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.002;
    floor.visible = !mapping || props.showRoom !== false;
    content.add(floor);
    const grid = new THREE.GridHelper(Math.max(width, depth), 20, 0x6b1724, 0x242424);
    grid.visible = !mapping || props.showRoom !== false;
    content.add(grid);
    if (mapping) {
      // Same explicit 3 m ceiling assumption as scanRoom; edges do not occlude returns.
      const roomGeometry = new THREE.BoxGeometry(width, 3, depth);
      const wallEdges = new THREE.LineSegments(
        new THREE.EdgesGeometry(roomGeometry),
        new THREE.LineBasicMaterial({ color: 0x555555, transparent: true, opacity: 0.65 })
      );
      roomGeometry.dispose();
      wallEdges.position.y = 1.5;
      wallEdges.visible = props.showRoom !== false;
      content.add(wallEdges);
      for (const obstacle of props.obstacles ?? []) {
        const box = new THREE.Mesh(
          new THREE.BoxGeometry(obstacle.width, obstacle.height, obstacle.depth),
          new THREE.MeshStandardMaterial({
            color: 0x555555,
            roughness: 0.9,
            transparent: true,
            opacity: 0.45
          })
        );
        box.position.set(obstacle.x, obstacle.height / 2, obstacle.z);
        box.visible = props.showRoom !== false;
        content.add(box);
      }
      const cloud = new THREE.Points(
        new THREE.BufferGeometry(),
        new THREE.PointsMaterial({ color: 0xe34242, size: 0.035, sizeAttenuation: true })
      );
      const trail = new THREE.Line(
        new THREE.BufferGeometry(),
        new THREE.LineBasicMaterial({ color: 0xc7a26a })
      );
      const marker = new THREE.Group();
      marker.add(
        new THREE.ArrowHelper(
          new THREE.Vector3(1, 0, 0),
          new THREE.Vector3(),
          0.3,
          0xffffff,
          0.12,
          0.08
        )
      );
      const drive = props.driveGeometry;
      if (drive && [drive.radius, drive.halfLength, drive.halfWidth].every((value) => Number.isFinite(value) && value > 0)) {
        // Schematic rolling circles only: entered radius and axle offsets, no invented widths/body.
        state.wheels = [[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([front, side]) => {
          const wheel = new THREE.Group();
          wheel.position.set(front * drive.halfLength, drive.radius - 0.035, side * drive.halfWidth);
          const ring = Array.from({ length: 48 }, (_, index) => {
            const angle = index / 48 * Math.PI * 2;
            return new THREE.Vector3(Math.cos(angle) * drive.radius, Math.sin(angle) * drive.radius, 0);
          });
          const outline = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(ring), new THREE.LineBasicMaterial({ color: 0xd4d4d4 }));
          const spoke = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(drive.radius, 0, 0)]), new THREE.LineBasicMaterial({ color: 0xef4444 }));
          wheel.add(outline, spoke);
          marker.add(wheel);
          return wheel;
        });
      }
      state.cloud = cloud;
      state.trail = trail;
      state.roverMarker = marker;
      content.add(cloud, trail, marker);
    } else {
      let stagedIndex = 0;
      const unknownCount = props.components.filter((component) => !component.dimensions).length;
      if (unknownCount) {
        const stagingGeometry = new THREE.PlaneGeometry(
          0.82,
          Math.max(0.3, Math.ceil(unknownCount / 6) * 0.13 + 0.1)
        );
        const tray = new THREE.LineSegments(
          new THREE.EdgesGeometry(stagingGeometry),
          new THREE.LineBasicMaterial({ color: 0x6b1724 })
        );
        stagingGeometry.dispose();
        tray.rotation.x = -Math.PI / 2;
        tray.position.set(0.95, 0, 0);
        content.add(tray);
        const trayLabel = label("Inventory staging (not placement)");
        trayLabel.scale.set(0.65, 0.065, 1);
        trayLabel.position.set(
          0.95,
          0.08,
          -Math.max(0.2, Math.ceil(unknownCount / 6) * 0.065 + 0.1)
        );
        content.add(trayLabel);
      }
      props.components.forEach((component, index) => {
        const selected = component.id === props.selectedId;
        const geometry = component.dimensions
          ? new THREE.BoxGeometry(
              Math.max(component.dimensions[0] / 1000, 0.0001),
              Math.max(component.dimensions[2] / 1000, 0.0001),
              Math.max(component.dimensions[1] / 1000, 0.0001)
            )
          : new THREE.SphereGeometry(0.012, 16, 12);
        const mesh = new THREE.Mesh(
          geometry,
          new THREE.MeshStandardMaterial({
            color: selected ? 0xef4444 : component.dimensions ? 0x737373 : 0x9f2537,
            roughness: 0.65,
            wireframe: !component.dimensions,
            clippingPlanes:
              props.sectioned && component.dimensions
                ? [new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0)]
                : []
          })
        );
        if (component.dimensions) {
          mesh.position.set(
            component.position[0],
            component.position[1] + (props.exploded ? index * 0.055 : 0),
            component.position[2]
          );
        } else {
          // Deterministic inventory slots are deliberately unrelated to saved physical placements.
          const rows = Math.ceil(unknownCount / 6);
          mesh.position.set(
            0.625 + (stagedIndex % 6) * 0.13,
            0.025,
            (Math.floor(stagedIndex / 6) - (rows - 1) / 2) * 0.13
          );
          stagedIndex++;
        }
        mesh.rotation.y = -THREE.MathUtils.degToRad(component.rotation);
        mesh.userData.componentId = component.id;
        content.add(mesh);
        const caption = label(component.name);
        if (!component.dimensions) caption.scale.set(0.125, 0.018, 1);
        caption.position.copy(mesh.position);
        caption.position.y += (component.dimensions?.[2] ?? 24) / 2000 + 0.025;
        caption.userData.componentId = component.id;
        content.add(caption);
      });
    }
    let cancelled = false;
    if (props.modelUrl && !mapping) {
      new GLTFLoader().load(
        props.modelUrl,
        (gltf) => {
          if (cancelled) {
            disposeTree(gltf.scene);
            return;
          }
          content.add(gltf.scene);
          render();
        },
        undefined,
        () => {
          if (!cancelled)
            setError("The imported GLB could not be loaded. Check the file and try again.");
        }
      );
    }
    render();
    return () => {
      cancelled = true;
    };
  }, [
    ready,
    props.components,
    props.selectedId,
    props.exploded,
    props.room.width,
    props.room.depth,
    props.mode,
    props.modelUrl,
    props.obstacles,
    props.showRoom,
    props.sectioned,
    props.driveGeometry?.radius,
    props.driveGeometry?.halfLength,
    props.driveGeometry?.halfWidth
  ]);

  // Live mapping updates mutate only their own drawables; they preserve camera and static room resources.
  useEffect(() => {
    const state = runtime.current;
    if (!state || props.mode !== "mapping") return;
    if (state.cloud) {
      const positions = new Float32Array(props.points.length * 3);
      props.points.forEach((point, index) => positions.set([point.x, point.y, point.z], index * 3));
      state.cloud.geometry.dispose();
      state.cloud.geometry = new THREE.BufferGeometry();
      state.cloud.geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      state.cloud.geometry.computeBoundingSphere();
      state.cloud.visible = props.showPoints !== false;
    }
    if (state.trail) {
      const positions = new Float32Array((props.path?.length ?? 0) * 3);
      props.path?.forEach((point, index) => positions.set([point.x, 0.01, point.z], index * 3));
      state.trail.geometry.dispose();
      state.trail.geometry = new THREE.BufferGeometry();
      state.trail.geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    }
    state.render();
  }, [
    ready,
    props.points,
    props.path,
    props.showPoints,
    props.mode,
    props.room.width,
    props.room.depth,
    props.obstacles,
    props.showRoom,
    props.components,
    props.selectedId,
    props.exploded,
    props.modelUrl,
    props.sectioned,
    props.driveGeometry?.radius,
    props.driveGeometry?.halfLength,
    props.driveGeometry?.halfWidth
  ]);

  useEffect(() => {
    const state = runtime.current;
    if (!state?.roverMarker || props.mode !== "mapping") return;
    state.roverMarker.position.set(props.rover.x, 0.035, props.rover.z);
    state.roverMarker.rotation.y = -THREE.MathUtils.degToRad(props.rover.heading);
    state.render();
  }, [
    ready,
    props.rover.x,
    props.rover.z,
    props.rover.heading,
    props.mode,
    props.room.width,
    props.room.depth,
    props.obstacles,
    props.showRoom,
    props.components,
    props.selectedId,
    props.exploded,
    props.modelUrl,
    props.sectioned,
    props.driveGeometry?.radius,
    props.driveGeometry?.halfLength,
    props.driveGeometry?.halfWidth
  ]);

  useEffect(() => {
    const state = runtime.current;
    if (!state || !ready) return;
    const span =
      props.mode === "mapping"
        ? Math.max(props.room.width, props.room.depth, 1)
        : hasStaging
          ? 1.25
          : props.mode === "fabrication"
            ? 0.4
            : 0.8;
    const directions = {
      isometric: [1, 0.85, 1],
      top: [0, 1.5, 0.001],
      front: [0, 0.15, 1.5],
      side: [1.5, 0.15, 0],
      bottom: [0, -1.5, 0.001]
    } as const;
    const direction = directions[props.view];
    const targetX = props.mode !== "mapping" && hasStaging ? 0.4 : 0;
    const targetY = props.mode === "mapping" ? 1 : 0;
    state.controls.target.set(targetX, targetY, 0);
    state.camera.up.set(0, 1, 0);
    state.camera.position.set(
      targetX + direction[0] * span,
      targetY + direction[1] * span,
      direction[2] * span
    );
    state.controls.update();
    state.render();
  }, [ready, props.view, props.mode, props.room.width, props.room.depth, hasStaging]);

  useEffect(() => {
    const state = runtime.current;
    const angles = props.driveGeometry?.wheelAngles;
    if (!state?.wheels || !angles) return;
    state.wheels.forEach((wheel, index) => { wheel.rotation.z = Number.isFinite(angles[index]) ? angles[index] : 0; });
    state.render();
  }, [ready, props.driveGeometry?.wheelAngles, props.driveGeometry?.radius, props.driveGeometry?.halfLength, props.driveGeometry?.halfWidth, props.mode, props.components, props.selectedId, props.exploded, props.room.width, props.room.depth, props.modelUrl, props.obstacles, props.showRoom, props.sectioned]);

  const assemblyBounds = useMemo(() => {
    const bounds = new THREE.Box3();
    for (const component of props.components) {
      if (!component.dimensions) continue;
      const [length, width, height] = component.dimensions.map((value) => value / 1000);
      const angle = THREE.MathUtils.degToRad(component.rotation);
      const halfX = (Math.abs(Math.cos(angle)) * length + Math.abs(Math.sin(angle)) * width) / 2;
      const halfZ = (Math.abs(Math.sin(angle)) * length + Math.abs(Math.cos(angle)) * width) / 2;
      const [x, y, z] = component.position;
      bounds.expandByPoint(new THREE.Vector3(x - halfX, y - height / 2, z - halfZ));
      bounds.expandByPoint(new THREE.Vector3(x + halfX, y + height / 2, z + halfZ));
    }
    if (bounds.isEmpty()) return "Assembly bounds unknown";
    const size = bounds.getSize(new THREE.Vector3());
    return `Known-envelope bounds: ${(size.x * 1000).toFixed(1)} × ${(size.z * 1000).toFixed(1)} × ${(size.y * 1000).toFixed(1)} mm (L × W × H)`;
  }, [props.components]);

  return (
    <div className="relative h-full min-h-[380px] w-full overflow-hidden bg-black">
      <div ref={host} className="absolute inset-0" />
      <div className="pointer-events-none absolute bottom-4 left-4 right-4 flex flex-wrap justify-between gap-2 text-[11px] text-neutral-400">
        <span>Drag to orbit · Scroll to zoom · Click to select</span>
        <span>
          {props.mode === "mapping"
            ? "Room, obstacles and 3 m ceiling: simulation assumptions · metres"
            : props.mode === "fabrication"
              ? "300 × 300 mm bed"
              : "Positions in metres · dimensions in millimetres"}
        </span>
        {props.mode === "mapping" && props.driveGeometry && [props.driveGeometry.radius, props.driveGeometry.halfLength, props.driveGeometry.halfWidth].every((value) => Number.isFinite(value) && value > 0) && <span className="w-full">Schematic wheel outlines from entered geometry · body envelope unknown</span>}
        {props.mode !== "mapping" && (
          <span className="w-full">
            {assemblyBounds}
            {props.sectioned ? " · Section at x = 0 m" : ""}
          </span>
        )}
        {props.mode !== "mapping" &&
          props.components.some((component) => !component.dimensions) && (
            <span className="w-full">
              Unknown envelopes are markers, not dimensioned parts. Inventory staging is not
              placement; one marker per component row, not per physical unit.
            </span>
          )}
      </div>
      {props.modelUrl && props.mode !== "mapping" && (
        <span className="pointer-events-none absolute left-4 top-4 text-[11px] text-neutral-400">
          Imported visual reference · not authoritative CAD
        </span>
      )}
      {error && (
        <p
          role="alert"
          className="absolute left-4 right-4 top-4 border border-red-900 bg-black p-3 text-sm text-red-300"
        >
          {error}
        </p>
      )}
    </div>
  );
}
