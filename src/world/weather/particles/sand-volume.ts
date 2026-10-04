import * as THREE from "three";
import { STUDIO_ISLAND_BOUND } from "../../studio/island";
import {
  cameraInIslandWeather,
  inIslandRainVolume,
  isInsideBuilding,
  overIsland,
  sampleIslandGround,
} from "../weather-domain";
import type { WeatherWorldState } from "../weather-world-state";

export class CameraSandVolume {
  public group: THREE.Group;
  public sandMesh: THREE.InstancedMesh;

  private readonly SAND_COUNT = 850;

  private sandPositions: Float32Array;
  private sandSpeeds: Float32Array;
  private sandDummy = new THREE.Object3D();

  constructor() {
    this.group = new THREE.Group();
    this.group.name = "ORRA_SandGroup";

    const sandGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.45, 3);
    sandGeo.computeVertexNormals();

    const sandMat = new THREE.MeshBasicMaterial({
      color: 0xc89852,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
    });

    this.sandMesh = new THREE.InstancedMesh(sandGeo, sandMat, this.SAND_COUNT);
    this.sandMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.group.add(this.sandMesh);

    this.sandPositions = new Float32Array(this.SAND_COUNT * 3);
    this.sandSpeeds = new Float32Array(this.SAND_COUNT);
    this.initPositions();
  }

  private initPositions(): void {
    for (let i = 0; i < this.SAND_COUNT; i++) {
      const pt = sampleIslandGround(i, this.SAND_COUNT, STUDIO_ISLAND_BOUND);
      this.sandPositions[i * 3 + 0] = pt.x;
      this.sandPositions[i * 3 + 1] = Math.random() * 20.0 + 0.5;
      this.sandPositions[i * 3 + 2] = pt.z;
      this.sandSpeeds[i] = 20.0 + Math.random() * 15.0;
    }
  }

  public update(dt: number, state: WeatherWorldState, cameraPos: THREE.Vector3): void {
    const isSandActive =
      state.precipitationType === "sand" &&
      state.precipitation > 0.04 &&
      cameraInIslandWeather(cameraPos.x, cameraPos.y, cameraPos.z);

    if (isSandActive) {
      this.sandMesh.visible = true;
      const activeSandCount = Math.floor(this.SAND_COUNT * Math.min(1.0, state.precipitation * 1.2));
      const windAngleX = state.wind * 0.45;
      const sandDirX = Math.cos(state.windAngle);
      const sandDirZ = Math.sin(state.windAngle);

      for (let i = 0; i < this.SAND_COUNT; i++) {
        if (i >= activeSandCount) {
          this.sandDummy.position.set(0, -9999, 0);
          this.sandDummy.updateMatrix();
          this.sandMesh.setMatrixAt(i, this.sandDummy.matrix);
          continue;
        }

        const speed = this.sandSpeeds[i] * (0.8 + state.wind * 0.8);
        this.sandPositions[i * 3 + 0] += sandDirX * speed * dt;
        this.sandPositions[i * 3 + 1] -= (1.5 + state.wind * 2.5) * dt;
        this.sandPositions[i * 3 + 2] += sandDirZ * speed * dt;

        // When sand particle hits ground (y < 0.2), enters building footprint, or drifts outside island:
        const currentX = this.sandPositions[i * 3 + 0];
        const currentZ = this.sandPositions[i * 3 + 2];
        if (this.sandPositions[i * 3 + 1] < 0.2 || !overIsland(currentX, currentZ, 2.0) || isInsideBuilding(currentX, currentZ)) {
          this.sandPositions[i * 3 + 1] = 12.0 + Math.random() * 8.0;
          const pt = sampleIslandGround(i, this.SAND_COUNT, STUDIO_ISLAND_BOUND);
          this.sandPositions[i * 3 + 0] = pt.x - sandDirX * (Math.random() * 12.0);
          this.sandPositions[i * 3 + 2] = pt.z - sandDirZ * (Math.random() * 12.0);
          if (!overIsland(this.sandPositions[i * 3 + 0], this.sandPositions[i * 3 + 2], 1.0) || isInsideBuilding(this.sandPositions[i * 3 + 0], this.sandPositions[i * 3 + 2])) {
            this.sandPositions[i * 3 + 0] = pt.x;
            this.sandPositions[i * 3 + 2] = pt.z;
          }
        }

        const wx = this.sandPositions[i * 3 + 0];
        const wy = this.sandPositions[i * 3 + 1];
        const wz = this.sandPositions[i * 3 + 2];

        this.sandDummy.position.set(wx, wy, wz);
        if (!inIslandRainVolume(wx, wy, wz) || isInsideBuilding(wx, wz)) {
          this.sandDummy.position.set(0, -9999, 0);
        }
        this.sandDummy.rotation.set(0, state.windAngle, -windAngleX);
        this.sandDummy.updateMatrix();
        this.sandMesh.setMatrixAt(i, this.sandDummy.matrix);
      }

      this.sandMesh.instanceMatrix.needsUpdate = true;
      (this.sandMesh.material as THREE.MeshBasicMaterial).opacity =
        Math.min(0.85, 0.4 + state.precipitation * 0.5);
    } else {
      this.sandMesh.visible = false;
    }
  }

  public dispose(): void {
    this.sandMesh.geometry.dispose();
    (this.sandMesh.material as THREE.Material).dispose();
  }
}
