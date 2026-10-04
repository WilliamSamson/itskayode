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

export class CameraSnowVolume {
  public group: THREE.Group;
  public snowMesh: THREE.InstancedMesh;

  private readonly SNOW_COUNT = 600;

  private snowPositions: Float32Array;
  private snowVelocities: Float32Array;
  private snowSwirlPhases: Float32Array;
  private snowDummy = new THREE.Object3D();

  constructor() {
    this.group = new THREE.Group();
    this.group.name = "ORRA_SnowGroup";

    const snowGeo = new THREE.DodecahedronGeometry(0.045, 0);
    const snowMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });

    this.snowMesh = new THREE.InstancedMesh(snowGeo, snowMat, this.SNOW_COUNT);
    this.snowMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.group.add(this.snowMesh);

    this.snowPositions = new Float32Array(this.SNOW_COUNT * 3);
    this.snowVelocities = new Float32Array(this.SNOW_COUNT);
    this.snowSwirlPhases = new Float32Array(this.SNOW_COUNT);
    this.initPositions();
  }

  private initPositions(): void {
    for (let i = 0; i < this.SNOW_COUNT; i++) {
      const pt = sampleIslandGround(i, this.SNOW_COUNT, STUDIO_ISLAND_BOUND);
      this.snowPositions[i * 3 + 0] = pt.x;
      this.snowPositions[i * 3 + 1] = Math.random() * 42.0 + 1.0;
      this.snowPositions[i * 3 + 2] = pt.z;
      this.snowVelocities[i] = 2.0 + Math.random() * 2.2;
      this.snowSwirlPhases[i] = Math.random() * Math.PI * 2;
    }
  }

  public update(dt: number, state: WeatherWorldState, cameraPos: THREE.Vector3): void {
    const isSnowActive =
      (state.precipitationType === "snow" || (!state.precipitationType && (state.temperature ?? 20) <= 0)) &&
      state.precipitation > 0.04 &&
      cameraInIslandWeather(cameraPos.x, cameraPos.y, cameraPos.z);

    if (isSnowActive) {
      this.snowMesh.visible = true;
      const activeSnowCount = Math.floor(this.SNOW_COUNT * Math.min(1.0, state.precipitation * 1.3));
      const windDriftX = Math.cos(state.windAngle) * (1.5 + state.wind * 5.0);
      const windDriftZ = Math.sin(state.windAngle) * (1.5 + state.wind * 5.0);

      for (let i = 0; i < this.SNOW_COUNT; i++) {
        if (i >= activeSnowCount) {
          this.snowDummy.position.set(0, -9999, 0);
          this.snowDummy.updateMatrix();
          this.snowMesh.setMatrixAt(i, this.snowDummy.matrix);
          continue;
        }

        this.snowPositions[i * 3 + 1] -= this.snowVelocities[i] * dt;
        this.snowPositions[i * 3 + 0] += (windDriftX + Math.sin(this.snowSwirlPhases[i] + dt * 2) * 0.8) * dt;
        this.snowPositions[i * 3 + 2] += (windDriftZ + Math.cos(this.snowSwirlPhases[i] + dt * 2) * 0.8) * dt;
        this.snowSwirlPhases[i] += dt * 1.5;

        // When snow flake reaches ground (y < 0.2) or enters building footprint, respawn up in cloud space (y ~ 42)
        if (this.snowPositions[i * 3 + 1] < 0.2 || isInsideBuilding(this.snowPositions[i * 3 + 0], this.snowPositions[i * 3 + 2])) {
          this.snowPositions[i * 3 + 1] = 40.0 + Math.random() * 4.0;
          if (i < 240 && cameraInIslandWeather(cameraPos.x, cameraPos.y, cameraPos.z)) {
            const r = Math.random() * 24.0;
            const theta = Math.random() * Math.PI * 2;
            const candX = cameraPos.x + r * Math.cos(theta);
            const candZ = cameraPos.z + r * Math.sin(theta);
            if (overIsland(candX, candZ, 1.5) && !isInsideBuilding(candX, candZ)) {
              this.snowPositions[i * 3 + 0] = candX;
              this.snowPositions[i * 3 + 2] = candZ;
            } else {
              const pt = sampleIslandGround(i, this.SNOW_COUNT, STUDIO_ISLAND_BOUND);
              this.snowPositions[i * 3 + 0] = pt.x;
              this.snowPositions[i * 3 + 2] = pt.z;
            }
          } else {
            const pt = sampleIslandGround(i, this.SNOW_COUNT, STUDIO_ISLAND_BOUND);
            this.snowPositions[i * 3 + 0] = pt.x;
            this.snowPositions[i * 3 + 2] = pt.z;
          }
        }

        const wx = this.snowPositions[i * 3 + 0];
        const wy = this.snowPositions[i * 3 + 1];
        const wz = this.snowPositions[i * 3 + 2];

        this.snowDummy.position.set(wx, wy, wz);
        if (!inIslandRainVolume(wx, wy, wz) || isInsideBuilding(wx, wz)) {
          this.snowDummy.position.set(0, -9999, 0);
        }
        this.snowDummy.rotation.set(
          this.snowSwirlPhases[i] * 0.5,
          this.snowSwirlPhases[i],
          this.snowSwirlPhases[i] * 0.3
        );
        this.snowDummy.updateMatrix();
        this.snowMesh.setMatrixAt(i, this.snowDummy.matrix);
      }

      this.snowMesh.instanceMatrix.needsUpdate = true;
      (this.snowMesh.material as THREE.MeshBasicMaterial).opacity =
        Math.min(0.9, 0.45 + state.precipitation * 0.5);
    } else {
      this.snowMesh.visible = false;
    }
  }

  public dispose(): void {
    this.snowMesh.geometry.dispose();
    (this.snowMesh.material as THREE.Material).dispose();
  }
}
