import * as THREE from "three";
import { STUDIO_ISLAND_BOUND } from "../../studio/island";
import { isInsideBuilding } from "../weather-domain";
import type { WeatherWorldState } from "../weather-world-state";

export function createGroundMistTexture(): THREE.Texture {
  if (typeof document !== "undefined") {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const grad = ctx.createRadialGradient(128, 128, 10, 128, 128, 128);
      grad.addColorStop(0, "rgba(255, 255, 255, 0.92)");
      grad.addColorStop(0.35, "rgba(255, 255, 255, 0.65)");
      grad.addColorStop(0.7, "rgba(255, 255, 255, 0.25)");
      grad.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(128, 128, 128, 0, Math.PI * 2);
      ctx.fill();

      const texture = new THREE.CanvasTexture(canvas);
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.generateMipmaps = false;
      return texture;
    }
  }

  // Headless fallback
  const size = 64;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const dx = (x - size / 2) / (size / 2);
      const dy = (y - size / 2) / (size / 2);
      const d = Math.sqrt(dx * dx + dy * dy);
      const alpha = Math.max(0, Math.min(255, Math.floor(Math.pow(Math.max(0, 1.0 - d), 1.6) * 235)));
      data[idx] = 255;
      data[idx + 1] = 255;
      data[idx + 2] = 255;
      data[idx + 3] = alpha;
    }
  }
  const fallback = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  fallback.needsUpdate = true;
  return fallback;
}

export interface ValleyMistPlane {
  mesh: THREE.Mesh;
  baseX: number;
  baseY: number;
  baseZ: number;
  phase: number;
  driftSpeed: number;
}

export class ValleyMistSystem {
  public group: THREE.Group;
  public valleyMistPlanes: ValleyMistPlane[] = [];

  constructor() {
    this.group = new THREE.Group();
    this.group.name = "ORRA_ValleyInversionGroup";
    this.buildPlanes();
  }

  private buildPlanes(): void {
    const mistTex = createGroundMistTexture();
    const scaleFactor = STUDIO_ISLAND_BOUND / 120;
    const planeSize = 95 * scaleFactor;
    const planeGeo = new THREE.PlaneGeometry(planeSize, planeSize);
    planeGeo.rotateX(-Math.PI / 2);

    const locations = [
      { x: -28 * scaleFactor, y: 0.20, z: 46 * scaleFactor, s: 0.95 },
      { x: 42 * scaleFactor, y: 0.20, z: 28 * scaleFactor, s: 0.95 },
      { x: -65 * scaleFactor, y: 0.20, z: 12 * scaleFactor, s: 0.90 },
      { x: 108 * scaleFactor, y: 0.20, z: -6 * scaleFactor, s: 0.85 },
      { x: -108 * scaleFactor, y: 0.20, z: 14 * scaleFactor, s: 0.85 },
      { x: 55 * scaleFactor, y: 0.20, z: -35 * scaleFactor, s: 0.90 },
      { x: -50 * scaleFactor, y: 0.20, z: -45 * scaleFactor, s: 0.85 },
      { x: 30 * scaleFactor, y: 0.20, z: 52 * scaleFactor, s: 0.90 },
      { x: -45 * scaleFactor, y: 0.20, z: 38 * scaleFactor, s: 0.90 },
      { x: -18 * scaleFactor, y: 0.20, z: -75 * scaleFactor, s: 0.95 },
    ];

    for (let i = 0; i < locations.length; i++) {
      const loc = locations[i];
      const mat = new THREE.MeshBasicMaterial({
        map: mistTex,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(planeGeo, mat);
      mesh.position.set(loc.x, loc.y, loc.z);
      mesh.scale.setScalar(loc.s);
      this.group.add(mesh);
      this.valleyMistPlanes.push({
        mesh,
        baseX: loc.x,
        baseY: loc.y,
        baseZ: loc.z,
        phase: i * 1.15,
        driftSpeed: 0.4 + (i % 3) * 0.25,
      });
    }
  }

  public update(
    dt: number,
    state: WeatherWorldState,
    worldTheme: "dark" | "light",
    isOverhead: boolean
  ): void {
    const targetMistOpacity =
      ((state.fogDensity ?? 0) * 0.85 + (state.humidity > 0.8 ? (state.humidity - 0.8) * 1.5 : 0)) *
      (isOverhead ? 0.75 : 1.0);

    const mistColor = new THREE.Color();
    if (state.precipitationType === "sand") {
      mistColor.set(0xba8c52);
    } else if (worldTheme === "light") {
      mistColor.set(0xe2edf8);
    } else {
      mistColor.set(0x7688a2);
    }

    if (targetMistOpacity > 0.02) {
      this.group.visible = true;
      for (const vm of this.valleyMistPlanes) {
        vm.phase += dt * vm.driftSpeed;
        const driftX = Math.cos(state.windAngle) * Math.sin(vm.phase * 0.4) * 6.0;
        const driftZ = Math.sin(state.windAngle) * Math.sin(vm.phase * 0.4) * 6.0;
        const liftY = Math.sin(vm.phase * 0.8) * 0.35;
        vm.mesh.position.set(vm.baseX + driftX, vm.baseY + liftY, vm.baseZ + driftZ);

        const mat = vm.mesh.material as THREE.MeshBasicMaterial;
        mat.color.copy(mistColor);
        const planeX = vm.baseX + driftX;
        const planeZ = vm.baseZ + driftZ;
        const isNearBuilding = isInsideBuilding(planeX, planeZ);
        const targetOp = isNearBuilding ? 0 : targetMistOpacity * (0.85 + Math.sin(vm.phase) * 0.15);
        mat.opacity = THREE.MathUtils.lerp(
          mat.opacity,
          targetOp,
          0.12
        );
      }
    } else {
      this.group.visible = false;
      for (const vm of this.valleyMistPlanes) {
        (vm.mesh.material as THREE.MeshBasicMaterial).opacity = 0;
      }
    }
  }

  public dispose(): void {
    for (const vm of this.valleyMistPlanes) {
      vm.mesh.geometry.dispose();
      const mat = vm.mesh.material as THREE.MeshBasicMaterial;
      if (mat.map) mat.map.dispose();
      mat.dispose();
    }
  }
}
