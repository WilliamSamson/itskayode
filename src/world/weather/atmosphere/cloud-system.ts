import * as THREE from "three";
import { hash01 } from "../../math/hash";
import { CLOUD_PATH_LENGTH, cloudFlowPosition, cloudVisibility } from "../cloud-flow";
import type { WeatherWorldState } from "../weather-world-state";
import type { CameraPerspective } from "../../navigation/world-navigation";

/**
 * Creates high-fidelity fluffy volumetric cloud texture directly derived from
 * the user reference photo and the studio spatial engine.
 * Generates an elongated cumulus body with:
 * - Shaded underside / core (creating deep 3D shading and volume)
 * - Dense brilliant white central body puffs
 * - Sunlit puffy crest billows
 * - Feathered translucent flank wisps
 */
export function createFluffyCloudTexture(): THREE.Texture {
  if (typeof document !== "undefined") {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      // Pass 1: Volumetric dark underbelly / core (creates rich 3D shading & depth)
      const basePuffs = [
        { x: 120, y: 155, r: 54, a: 0.68, c: "165, 178, 198" },
        { x: 185, y: 160, r: 64, a: 0.76, c: "160, 174, 195" },
        { x: 256, y: 162, r: 72, a: 0.84, c: "155, 170, 192" },
        { x: 325, y: 158, r: 64, a: 0.76, c: "160, 174, 195" },
        { x: 390, y: 152, r: 52, a: 0.65, c: "165, 178, 198" },
      ];

      // Pass 2: Main dense cloud body
      const bodyPuffs = [
        { x: 95, y: 135, r: 56, a: 0.88, c: "235, 242, 252" },
        { x: 150, y: 126, r: 74, a: 0.96, c: "246, 249, 255" },
        { x: 210, y: 115, r: 88, a: 0.99, c: "255, 255, 255" },
        { x: 275, y: 112, r: 90, a: 0.99, c: "255, 255, 255" },
        { x: 345, y: 120, r: 78, a: 0.96, c: "250, 252, 255" },
        { x: 410, y: 135, r: 58, a: 0.88, c: "235, 242, 252" },
      ];

      // Pass 3: Fluffy crest billows and side wisps (sunlit highlights)
      const crestPuffs = [
        { x: 165, y: 90, r: 48, a: 0.98, c: "255, 255, 255" },
        { x: 228, y: 76, r: 60, a: 1.0, c: "255, 255, 255" },
        { x: 295, y: 78, r: 58, a: 1.0, c: "255, 255, 255" },
        { x: 360, y: 88, r: 50, a: 0.98, c: "255, 255, 255" },
        { x: 120, y: 105, r: 38, a: 0.92, c: "248, 250, 255" },
        { x: 385, y: 108, r: 40, a: 0.92, c: "248, 250, 255" },
      ];

      for (const p of basePuffs) {
        const grad = ctx.createRadialGradient(p.x, p.y, p.r * 0.15, p.x, p.y, p.r);
        grad.addColorStop(0, `rgba(${p.c}, ${p.a})`);
        grad.addColorStop(0.55, `rgba(${p.c}, ${p.a * 0.65})`);
        grad.addColorStop(1, `rgba(${p.c}, 0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      for (const p of bodyPuffs) {
        const grad = ctx.createRadialGradient(p.x, p.y, p.r * 0.2, p.x, p.y, p.r);
        grad.addColorStop(0, `rgba(${p.c}, ${p.a})`);
        grad.addColorStop(0.65, `rgba(${p.c}, ${p.a * 0.75})`);
        grad.addColorStop(0.9, `rgba(${p.c}, ${p.a * 0.25})`);
        grad.addColorStop(1, `rgba(${p.c}, 0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      for (const p of crestPuffs) {
        const grad = ctx.createRadialGradient(p.x, p.y, p.r * 0.1, p.x, p.y, p.r);
        grad.addColorStop(0, `rgba(${p.c}, ${p.a})`);
        grad.addColorStop(0.6, `rgba(${p.c}, ${p.a * 0.85})`);
        grad.addColorStop(0.85, `rgba(${p.c}, ${p.a * 0.25})`);
        grad.addColorStop(1, `rgba(${p.c}, 0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      const texture = new THREE.CanvasTexture(canvas);
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.generateMipmaps = false;
      return texture;
    }
  }

  // Headless fallback for Node/testing environment
  const size = 64;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const dx = (x - size / 2) / (size / 2);
      const dy = (y - size / 2) / (size / 2);
      const d = Math.sqrt(dx * dx + dy * dy);
      const alpha = Math.max(0, Math.min(255, Math.floor((1.0 - Math.min(1.0, d)) * 240)));
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

let sharedCloudTexture: THREE.Texture | null = null;
function getSharedCloudTexture(): THREE.Texture {
  if (!sharedCloudTexture) {
    sharedCloudTexture = createFluffyCloudTexture();
  }
  return sharedCloudTexture;
}

export interface CloudLobe {
  mesh: THREE.Object3D;
  localPos: THREE.Vector3;
  baseScale: THREE.Vector3;
  originalScale: THREE.Vector3;
  phase: number;
  freq: number;
}

export interface CloudFormation {
  group: THREE.Group;
  lobes: CloudLobe[];
  baseY: number;
  speed: number;
  tier: "low" | "mid" | "high";
  domain: "island" | "horizon";
  phase: number;
  width: number;
  material: THREE.SpriteMaterial;
  progress: number;
  lane: number;
  windAngle: number;
  generation: number;
}

export class VolumetricCloudSystem {
  public group: THREE.Group;
  public cloudFormations: CloudFormation[] = [];
  private cloudSpriteMat: THREE.SpriteMaterial | null = null;

  constructor(worldScale: number = 1, cloudLift: number = 0) {
    this.group = new THREE.Group();
    this.group.name = "ORRA_CloudsGroup";
    this.group.scale.setScalar(worldScale);
    this.group.position.y = cloudLift;

    this.buildFormations();
  }

  private buildFormations(): void {
    const formationConfigs = [
      // Fleet of 7 formations hovering over the island landmass
      { y: 270, w: 480, h: 180, speed: 1.8, tier: "low" as const, domain: "island" as const, progress: 0.14, lane: -190, lobeCount: 5 },
      { y: 295, w: 520, h: 195, speed: 2.1, tier: "low" as const, domain: "island" as const, progress: 0.33, lane: 140, lobeCount: 5 },
      { y: 320, w: 540, h: 205, speed: 1.6, tier: "low" as const, domain: "island" as const, progress: 0.56, lane: -70, lobeCount: 5 },
      { y: 350, w: 580, h: 220, speed: 1.5, tier: "mid" as const, domain: "island" as const, progress: 0.76, lane: 200, lobeCount: 6 },
      { y: 380, w: 620, h: 235, speed: 1.9, tier: "mid" as const, domain: "island" as const, progress: 0.91, lane: -210, lobeCount: 6 },
      { y: 410, w: 600, h: 225, speed: 1.7, tier: "mid" as const, domain: "island" as const, progress: 0.48, lane: 40, lobeCount: 5 },
      { y: 450, w: 660, h: 250, speed: 1.4, tier: "mid" as const, domain: "island" as const, progress: 0.67, lane: -15, lobeCount: 6 },
    ];

    const cloudTex = getSharedCloudTexture();

    this.cloudSpriteMat = new THREE.SpriteMaterial({
      map: cloudTex,
      transparent: true,
      opacity: 0.9,
      color: 0xffffff,
      depthWrite: false,
      fog: false,
    });

    for (let i = 0; i < formationConfigs.length; i++) {
      const cfg = formationConfigs[i];
      const formGroup = new THREE.Group();
      formGroup.name = `ORRA_CloudFormation_${cfg.tier}_${i}`;
      const path = cloudFlowPosition(cfg.progress, cfg.lane, i * 0.9, 0.68);
      formGroup.position.set(path.x, cfg.y, path.z);
      const material = this.cloudSpriteMat.clone();
      material.opacity = 0.9 * cloudVisibility(cfg.progress);

      const lobes: CloudLobe[] = [];

      for (let l = 0; l < cfg.lobeCount; l++) {
        let offsetX = 0;
        let offsetY = 0;
        let offsetZ = 0;
        let scaleW = cfg.w;
        let scaleH = cfg.h;

        if (l === 0) {
          scaleW = cfg.w * 0.82;
          scaleH = cfg.h * 0.85;
        } else if (l === 1) {
          offsetX = cfg.w * 0.1;
          offsetY = cfg.h * 0.22;
          offsetZ = -18;
          scaleW = cfg.w * 0.58;
          scaleH = cfg.h * 0.7;
        } else if (l === 2) {
          offsetX = -cfg.w * 0.26;
          offsetY = -cfg.h * 0.08;
          offsetZ = 16;
          scaleW = cfg.w * 0.54;
          scaleH = cfg.h * 0.64;
        } else if (l === 3) {
          offsetX = cfg.w * 0.28;
          offsetY = -cfg.h * 0.05;
          offsetZ = -14;
          scaleW = cfg.w * 0.52;
          scaleH = cfg.h * 0.62;
        } else {
          offsetX = -cfg.w * 0.06;
          offsetY = cfg.h * 0.1;
          offsetZ = 22;
          scaleW = cfg.w * 0.46;
          scaleH = cfg.h * 0.56;
        }

        const shapeJitter = 0.86 + hash01(i * 31 + l, 41) * 0.28;
        const sprite = new THREE.Sprite(material);
        sprite.position.set(
          offsetX + (hash01(i * 31 + l, 42) - 0.5) * cfg.w * 0.06,
          offsetY + (hash01(i * 31 + l, 43) - 0.5) * cfg.h * 0.05,
          offsetZ + (hash01(i * 31 + l, 44) - 0.5) * 12
        );
        sprite.scale.set(scaleW * shapeJitter, scaleH * shapeJitter, 1.0);
        formGroup.add(sprite);

        lobes.push({
          mesh: sprite,
          localPos: sprite.position.clone(),
          baseScale: sprite.scale.clone(),
          originalScale: sprite.scale.clone(),
          phase: i * 1.3 + l * 0.8,
          freq: 0.6 + l * 0.18,
        });
      }

      this.group.add(formGroup);

      this.cloudFormations.push({
        group: formGroup,
        lobes,
        baseY: cfg.y,
        speed: cfg.speed,
        tier: cfg.tier,
        domain: cfg.domain,
        phase: i * 0.9,
        width: cfg.w,
        material,
        progress: cfg.progress,
        lane: cfg.lane,
        windAngle: 0.68,
        generation: 0,
      });
    }
  }

  public update(
    dt: number,
    state: WeatherWorldState,
    worldTheme: "dark" | "light",
    activePerspective: CameraPerspective
  ): void {
    const isOverhead = activePerspective === "overhead";
    const isHorizon = activePerspective === "horizon";

    const perspectiveOpacityMult = isOverhead ? 0.78 : isHorizon ? 1.02 : 1.0;
    const altLift = isHorizon ? 35.0 : isOverhead ? -8.0 : 0.0;

    const cloudColor = new THREE.Color();
    const isSandstorm =
      state.precipitationType === "sand" || ((state.fogDensity ?? 0) > 0.6 && state.humidity < 0.15);
    const isCold = (state.temperature ?? 20) <= 0 || state.precipitationType === "snow";
    const isDenseFog = (state.fogDensity ?? 0) > 0.6 || state.humidity > 0.85;

    if (worldTheme === "light") {
      if (isSandstorm) {
        cloudColor.set(0xb08d5c);
      } else if (state.precipitation > 0.4) {
        cloudColor.set(0x525e73);
      } else if (isCold) {
        cloudColor.set(0xeaf0f8);
      } else if (isDenseFog) {
        cloudColor.set(0xd8e4f0);
      } else {
        cloudColor.set(0xffffff).lerp(new THREE.Color(0xfff5e6), state.sunExposure * 0.35);
      }
    } else {
      if (isSandstorm) {
        cloudColor.set(0x5a3e22);
      } else if (state.precipitation > 0.4) {
        cloudColor.set(0x323c4d);
      } else if (isCold) {
        cloudColor.set(0xc8d8ec);
      } else if (isDenseFog) {
        cloudColor.set(0xbcc8d8);
      } else {
        cloudColor.set(0xffffff).lerp(new THREE.Color(0xfff8ee), state.sunExposure * 0.25);
      }
    }

    const baseTargetOpacity = Math.max(0.72, Math.min(0.95, 0.65 + state.cloudCoverage * 0.3));
    const effectiveOpacity = Math.max(
      0.68,
      Math.min(0.95, baseTargetOpacity * perspectiveOpacityMult)
    );

    const windSpeedMult = 1.0 + state.wind * 4.5;
    for (const f of this.cloudFormations) {
      f.phase += dt * 0.35;
      f.progress += (f.speed * windSpeedMult * dt * 4.0) / CLOUD_PATH_LENGTH;
      while (f.progress >= 1) {
        f.progress -= 1;
        f.generation++;
        f.lane = (hash01(f.generation * 37 + this.cloudFormations.indexOf(f), 51) - 0.5) * 460;
        f.windAngle =
          (state.windAngle || 0.68) +
          (hash01(f.generation * 37 + this.cloudFormations.indexOf(f), 52) - 0.5) * 0.24;
        for (let i = 0; i < f.lobes.length; i++) {
          const lobe = f.lobes[i];
          const variation = 0.82 + hash01(f.generation * 71 + i, 53) * 0.36;
          lobe.baseScale.copy(lobe.originalScale).multiplyScalar(variation);
        }
      }
      const path = cloudFlowPosition(f.progress, f.lane, f.generation * 0.9, f.windAngle);
      f.group.position.x = path.x;
      f.group.position.z = path.z;
      f.group.position.y = f.baseY + altLift + Math.sin(f.phase * 0.6) * 2.2;
      f.material.color.copy(cloudColor);
      f.material.opacity =
        effectiveOpacity * cloudVisibility(f.progress) * (isOverhead ? 0.92 : 1);
      f.group.visible = f.material.opacity > 0.005;

      if (f.group.visible) {
        for (const lobe of f.lobes) {
          lobe.phase += dt * lobe.freq;
          const breathe = 1.0 + Math.sin(lobe.phase) * 0.08;
          lobe.mesh.scale.set(lobe.baseScale.x * breathe, lobe.baseScale.y * breathe, 1.0);
        }
      }
    }
  }

  public dispose(): void {
    for (const f of this.cloudFormations) {
      for (const lobe of f.lobes) {
        if ("geometry" in lobe.mesh && (lobe.mesh as THREE.Mesh).geometry) {
          (lobe.mesh as THREE.Mesh).geometry.dispose();
        }
      }
      f.material.dispose();
    }
    if (this.cloudSpriteMat) {
      if (this.cloudSpriteMat.map) {
        this.cloudSpriteMat.map.dispose();
      }
      this.cloudSpriteMat.dispose();
    }
  }
}
