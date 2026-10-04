import * as THREE from "three";

/**
 * Three.js compiles every visible light into every lit shader and shades each
 * one per fragment, regardless of range or intensity. The island placed 61
 * local lights, which produced 131 KB fragment shaders and paid for all of them
 * on every pixel.
 *
 * The pool keeps a fixed number of live lights and moves them onto the source
 * lights nearest the focus point. Source lights stay in the scene graph but
 * hidden, so code that animates their intensity keeps working: each frame the
 * pool copies transform, colour and intensity from its assigned source. The
 * live light count never changes, so no material ever recompiles.
 */
export class LightPool {
  static readonly RESELECT_SECONDS = 0.25;
  static readonly FADE_PER_SECOND = 4;

  private readonly slots: Slot[] = [];
  private readonly points: THREE.PointLight[];
  private readonly spots: THREE.SpotLight[];
  private sinceReselect = Infinity;
  private readonly tmp = new THREE.Vector3();
  /** Set when a spot slot swaps source; its shadow map must be re-rendered. */
  public spotMoved = false;

  constructor(parent: THREE.Object3D, sources: THREE.Light[], pointSlots = 6, spotSlots = 2) {
    this.points = sources.filter((l): l is THREE.PointLight => l instanceof THREE.PointLight);
    this.spots = sources.filter((l): l is THREE.SpotLight => l instanceof THREE.SpotLight);
    for (const s of [...this.points, ...this.spots]) s.visible = false;

    for (let i = 0; i < pointSlots; i++) this.addSlot(parent, new THREE.PointLight(0xffffff, 0), this.points);
    for (let i = 0; i < spotSlots; i++) {
      const light = new THREE.SpotLight(0xffffff, 0);
      parent.add(light.target);
      this.addSlot(parent, light, this.spots);
    }
  }

  private addSlot(parent: THREE.Object3D, light: THREE.PointLight | THREE.SpotLight, pool: THREE.Light[]) {
    light.name = "light-pool-slot";
    parent.add(light);
    this.slots.push({ light, pool, source: null, weight: 0, wanted: new Set() });
  }

  /** Spot slots that may cast shadows (the scene decides by quality tier). */
  get spotSlots(): THREE.SpotLight[] {
    return this.slots.map((s) => s.light).filter((l): l is THREE.SpotLight => l instanceof THREE.SpotLight);
  }

  update(focus: THREE.Vector3, dt: number): void {
    this.sinceReselect += dt;
    if (this.sinceReselect >= LightPool.RESELECT_SECONDS) {
      this.sinceReselect = 0;
      const wantedPoints = this.nearest(this.points, focus, this.slots.filter((s) => s.pool === this.points).length);
      const wantedSpots = this.nearest(this.spots, focus, this.slots.filter((s) => s.pool === this.spots).length);
      for (const slot of this.slots) slot.wanted = slot.pool === this.points ? wantedPoints : wantedSpots;
    }

    const step = Math.min(1, dt * LightPool.FADE_PER_SECOND);
    for (const slot of this.slots) {
      const keep = slot.source !== null && slot.wanted.has(slot.source);
      slot.weight = keep ? Math.min(1, slot.weight + step) : Math.max(0, slot.weight - step);
      // Swap only once faded out, so a reassignment never pops.
      if (slot.weight === 0) {
        const held = new Set(this.slots.filter((s) => s.pool === slot.pool).map((s) => s.source));
        const next = [...slot.wanted].find((l) => !held.has(l)) ?? null;
        if (next !== slot.source) {
          slot.source = next;
          if (slot.light instanceof THREE.SpotLight) this.spotMoved = true;
        }
      }
      this.apply(slot);
    }
  }

  private apply(slot: Slot): void {
    const { light, source } = slot;
    if (!source) {
      light.intensity = 0;
      return;
    }
    source.getWorldPosition(light.position);
    light.color.copy(source.color);
    light.intensity = source.intensity * slot.weight;
    const src = source as THREE.PointLight | THREE.SpotLight;
    light.distance = src.distance;
    light.decay = src.decay;
    if (light instanceof THREE.SpotLight && src instanceof THREE.SpotLight) {
      light.angle = src.angle;
      light.penumbra = src.penumbra;
      src.target.getWorldPosition(light.target.position);
      light.target.updateMatrixWorld();
    }
  }

  /** Lit, effectively visible sources ranked by how close their reach comes to the focus. */
  private nearest(pool: THREE.Light[], focus: THREE.Vector3, count: number): Set<THREE.Light> {
    const ranked: { light: THREE.Light; score: number }[] = [];
    for (const light of pool) {
      if (light.intensity <= 0 || !ancestorsVisible(light)) continue;
      const reach = (light as THREE.PointLight).distance || 1000;
      ranked.push({ light, score: light.getWorldPosition(this.tmp).distanceTo(focus) - reach });
    }
    ranked.sort((a, b) => a.score - b.score);
    return new Set(ranked.slice(0, count).map((r) => r.light));
  }
}

interface Slot {
  light: THREE.PointLight | THREE.SpotLight;
  pool: THREE.Light[];
  source: THREE.Light | null;
  weight: number;
  wanted: Set<THREE.Light>;
}

/** The source itself is hidden by the pool, so only its ancestors decide. */
function ancestorsVisible(object: THREE.Object3D): boolean {
  for (let node = object.parent; node; node = node.parent) if (!node.visible) return false;
  return true;
}
