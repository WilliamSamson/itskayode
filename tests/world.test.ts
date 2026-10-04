import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { OrraScene } from "@/world/engine/scene";
import { WORLD_SCALE } from "@/world/engine/world-scale";
import { STUDIO_ISLAND_BOUND } from "@/world/studio/island";

describe("OrraScene", () => {
  it("initializes without throwing", () => {
    const scene = new OrraScene(800, 600);
    expect(scene).toBeDefined();
    expect(scene.camera).toBeDefined();
    expect(scene.scene).toBeDefined();
  });

  it("runs initializeWorld progressively reporting terrain, structures, atmosphere, and ready phases", async () => {
    const scene = new OrraScene(800, 600);
    const phases: string[] = [];
    await scene.initializeWorld((p) => phases.push(p));
    expect(phases).toEqual([
      "forming terrain",
      "placing structures",
      "synthesizing atmosphere",
      "ready",
    ]);
  });

  it("pan correctly tracks terrain left/right and advances forward with positive deltaY", () => {
    const scene = new OrraScene(800, 600);
    scene.enterImmediately();
    scene.nav.currentSpherical.theta = 0;
    const initialTarget = scene.nav.desiredTarget.clone();

    // Dragging right (deltaX = 50, deltaY = 0) tracks terrain right / moves camera left
    scene.pan(50, 0);
    expect(scene.nav.desiredTarget.x).toBeLessThan(initialTarget.x);

    // Dragging left (deltaX = -50, deltaY = 0) moves camera right
    const leftDragTarget = scene.nav.desiredTarget.clone();
    scene.pan(-50, 0);
    expect(scene.nav.desiredTarget.x).toBeGreaterThan(leftDragTarget.x);

    // Pan forward / advance into scene (deltaX = 0, deltaY = 50)
    const midTarget = scene.nav.desiredTarget.clone();
    scene.pan(0, 50);
    expect(scene.nav.desiredTarget.z).toBeLessThan(midTarget.z);
  });

  it("exports calibrated environmental color tokens", async () => {
    const { ORRA_COLORS } = await import("@/world/engine/scene");
    expect(ORRA_COLORS.sunriseCoral).toBe(0xff6b4a);
    expect(ORRA_COLORS.solarYellow).toBe(0xffd84d);
    expect(ORRA_COLORS.hotAmber).toBe(0xffb21a);
    expect(ORRA_COLORS.crimson).toBe(0x8d2635);
    expect(ORRA_COLORS.violet).toBe(0x7654a8);
    expect(ORRA_COLORS.mountainBlue).toBe(0x46577c);
    expect(ORRA_COLORS.emerald).toBe(0x1f6b45);
    expect(ORRA_COLORS.moss).toBe(0x607a3a);
    expect(ORRA_COLORS.ochre).toBe(0xc68b2c);
    expect(ORRA_COLORS.burntOrange).toBe(0xc9572e);
  });

  it("triggers camera transition from establishing to transitioning", () => {
    const scene = new OrraScene(800, 600);
    expect(scene.mode).toBe("establishing");
    scene.triggerEnterTransition();
    expect(scene.mode).toBe("transitioning");
  });

  it("adapts camera framing for mobile portrait and narrow windows", () => {
    const desktopScene = new OrraScene(1920, 1080); // 16:9 widescreen
    expect(desktopScene.camera.fov).toBe(34);

    const mobileScene = new OrraScene(390, 844); // Mobile portrait
    expect(mobileScene.camera.fov).toBeGreaterThan(34);
    // Camera is pulled back further on mobile to keep all design assets in frame
    expect(mobileScene.currentEstablishingPos.z).toBeGreaterThan(desktopScene.currentEstablishingPos.z);
  });

});

describe("WorldNavigationController", () => {
  it("executes direct manipulation panning with correct coordinate translation", async () => {
    const { WorldNavigationController } = await import("@/world/navigation/world-navigation");
    const nav = new WorldNavigationController();
    nav.resetToDefault();

    const initialX = nav.desiredTarget.x;
    const initialZ = nav.desiredTarget.z;

    // Dragging left (deltaX = -100) should shift desiredTarget along -camRight
    nav.pan(-100, 0, 800);
    expect(nav.desiredTarget.x).not.toBe(initialX);

    // Reset and test vertical pan: dragging down (deltaY = 100) shifts desiredTarget along camForward
    nav.resetToDefault();
    nav.pan(0, 100, 800);
    expect(nav.desiredTarget.z).not.toBe(initialZ);
  });

  it("strictly constrains orbit pitch bounds preventing terrain inversion", async () => {
    const { WorldNavigationController, PITCH_BOUNDS } = await import("@/world/navigation/world-navigation");
    const nav = new WorldNavigationController();
    nav.resetToDefault();

    // Try to rotate pitch far below the ground (large negative deltaY)
    for (let i = 0; i < 20; i++) {
      nav.orbit(0, -500);
    }
    expect(nav.desiredSpherical.phi).toBeGreaterThanOrEqual(PITCH_BOUNDS.min);

    // Try to rotate pitch past vertical flip (large positive deltaY)
    for (let i = 0; i < 20; i++) {
      nav.orbit(0, 500);
    }
    expect(nav.desiredSpherical.phi).toBeLessThanOrEqual(PITCH_BOUNDS.max);
  });

  it("smoothly restores designed 3/4 oblique view", async () => {
    const { WorldNavigationController, DEFAULT_THREE_QUARTER } = await import(
      "@/world/navigation/world-navigation"
    );
    const nav = new WorldNavigationController();
    nav.desiredSpherical.theta = 2.5;
    nav.desiredSpherical.phi = 1.3;
    nav.desiredSpherical.radius = 400;

    nav.setThreeQuarterView();
    expect(Math.abs(nav.desiredSpherical.theta - DEFAULT_THREE_QUARTER.theta)).toBeLessThan(0.001);
    expect(Math.abs(nav.desiredSpherical.phi - DEFAULT_THREE_QUARTER.phi)).toBeLessThan(0.001);
    expect(nav.desiredSpherical.radius).toBe(DEFAULT_THREE_QUARTER.radius);
  });

  it("classifies and steps through 5 behavioral zoom ranges", async () => {
    const { WorldNavigationController } = await import("@/world/navigation/world-navigation");
    const nav = new WorldNavigationController();

    nav.currentSpherical.radius = 10;
    expect(nav.getCurrentZoomRange()).toBe("ground");

    nav.currentSpherical.radius = 22;
    expect(nav.getCurrentZoomRange()).toBe("local");

    nav.currentSpherical.radius = 46;
    expect(nav.getCurrentZoomRange()).toBe("district");

    nav.currentSpherical.radius = 160;
    expect(nav.getCurrentZoomRange()).toBe("regional");

    nav.currentSpherical.radius = 350;
    expect(nav.getCurrentZoomRange()).toBe("world");

    // Discrete step zoom out
    nav.desiredSpherical.radius = 22; // local
    nav.currentSpherical.radius = 22;
    nav.stepZoom("out");
    expect(nav.desiredSpherical.radius).toBe(80); // district default
  });

  it("glides camera focus smoothly on focusAt", async () => {
    const { WorldNavigationController } = await import("@/world/navigation/world-navigation");
    const THREE = await import("three");
    const nav = new WorldNavigationController();

    const focusPoint = new THREE.Vector3(-45, 12, 88);
    nav.focusAt(focusPoint);
    expect(nav.desiredTarget.x).toBe(-45);
    expect(nav.desiredTarget.y).toBe(12);
    expect(nav.desiredTarget.z).toBe(88);

    // Update simulation
    const camPos = nav.update(0.05);
    expect(camPos).toBeDefined();
    expect(nav.currentTarget.distanceTo(nav.desiredTarget)).toBeLessThan(nav.desiredTarget.length());
  });

  it("resets view to origin and default oblique camera on resetView", async () => {
    const { WorldNavigationController, DEFAULT_THREE_QUARTER } = await import(
      "@/world/navigation/world-navigation"
    );
    const nav = new WorldNavigationController();
    nav.desiredTarget.set(20, 3, -30);
    nav.desiredSpherical.radius = 300;

    nav.resetView(false);
    const home = DEFAULT_THREE_QUARTER.target!;
    expect(nav.desiredTarget.x).toBe(home.x);
    expect(nav.desiredTarget.y).toBe(home.y);
    expect(nav.desiredTarget.z).toBe(home.z);
    expect(nav.currentTarget.equals(nav.desiredTarget)).toBe(true);
    expect(nav.desiredSpherical.radius).toBe(DEFAULT_THREE_QUARTER.radius);
    expect(nav.desiredSpherical.phi).toBe(DEFAULT_THREE_QUARTER.phi);
  });

  it("exposes resetView function on OrraScene instance", () => {
    const scene = new OrraScene(800, 600);
    expect(typeof scene.resetView).toBe("function");
    scene.nav.desiredTarget.set(20, 3, -30);
    scene.resetView();
    const home = scene.nav.desiredTarget;
    expect([home.x, home.y, home.z]).toEqual([-2.6, 0.8, 1.4]);
  });
});

describe("Continuous Weather World State Engine", () => {
  it("initializes with clear preset and transitions continuously", async () => {
    const { WeatherStateManager, WEATHER_PRESETS } = await import(
      "@/world/weather/weather-world-state"
    );
    const mgr = new WeatherStateManager("clear");

    expect(mgr.current.visibility).toBe(1.0);
    expect(mgr.current.precipitation).toBe(0.0);
    expect(mgr.current.sunExposure).toBe(WEATHER_PRESETS.clear.sunExposure);

    // Transition to rain storm front
    mgr.setPreset("rain");
    expect(mgr.activePreset).toBe("rain");
    expect(mgr.target.precipitation).toBe(WEATHER_PRESETS.rain.precipitation);

    // Advance 1 second
    mgr.update(1.0);
    // Precipitation must increase continuously
    expect(mgr.current.precipitation).toBeGreaterThan(0.2);
    expect(mgr.current.sunExposure).toBeLessThan(WEATHER_PRESETS.clear.sunExposure);
    expect(mgr.current.surfaceWetness).toBeGreaterThan(WEATHER_PRESETS.clear.surfaceWetness);
  });

  it("transitions into dense fog and contracts visibility", async () => {
    const { WeatherStateManager, WEATHER_PRESETS } = await import(
      "@/world/weather/weather-world-state"
    );
    const mgr = new WeatherStateManager("fog");
    // Run several ticks
    for (let i = 0; i < 10; i++) {
      mgr.update(0.5);
    }
    expect(mgr.current.visibility).toBeLessThan(0.35);
    expect(mgr.current.humidity).toBeGreaterThan(0.9);
  });

});

describe("ORRA Living Rain Simulation Engine (1 km² Floating Mass)", () => {
  it("initializes with pressure_change and cycles through all 9 lifecycle phases", async () => {
    const { LivingRainEngine, RAIN_PHASES } = await import(
      "@/world/weather/living-rain-engine"
    );
    const rain = new LivingRainEngine("pressure_change");

    expect(rain.currentPhase).toBe("pressure_change");
    expect(RAIN_PHASES.length).toBe(9);

    // Step through each phase
    for (let i = 0; i < RAIN_PHASES.length; i++) {
      rain.setPhase(RAIN_PHASES[i]);
      expect(rain.currentPhase).toBe(RAIN_PHASES[i]);
    }
  });

  it("models non-uniform traveling rain cells across 1 km² landmass", async () => {
    const { LivingRainEngine } = await import(
      "@/world/weather/living-rain-engine"
    );
    const rain = new LivingRainEngine("rainfall");

    // Position cell at center (0, 0) for test
    rain.cell.x = 0;
    rain.cell.z = 0;
    rain.cell.intensity = 0.9;
    rain.cell.radius = 400;

    // Rain at cell epicenter
    const rainCenter = rain.evaluateRainAt(0, 0);
    expect(rainCenter).toBeCloseTo(0.9, 1);

    // Rain at 200m should be lower due to smooth falloff
    const rainMid = rain.evaluateRainAt(200, 0);
    expect(rainMid).toBeLessThan(rainCenter);
    expect(rainMid).toBeGreaterThan(0.0);

    // Rain outside cell radius (> 400m) should be 0 (dry part of the island)
    const rainOutside = rain.evaluateRainAt(450, 0);
    expect(rainOutside).toBe(0.0);
  });

  it("simulates canopy interception and throughfall dripping persisting after storm", async () => {
    const { LivingRainEngine } = await import(
      "@/world/weather/living-rain-engine"
    );
    const THREE = await import("three");
    const rain = new LivingRainEngine("heavy_storm");
    const camPos = new THREE.Vector3(0, 20, 50);

    // Put cell over camera
    rain.cell.x = 0;
    rain.cell.z = 50;

    // Run heavy rain for 10 ticks
    for (let i = 0; i < 10; i++) {
      rain.update(1.0, camPos);
    }

    // Canopy should have intercepted water
    expect(rain.canopy.waterStored).toBeGreaterThan(0.3);
    expect(rain.canopy.dripRate).toBeGreaterThan(0.1);

    // Switch to after_rain phase (rain stops falling, but branches keep dripping)
    rain.setPhase("after_rain");
    rain.cell.intensity = 0.0;
    rain.update(0.5, camPos);

    expect(rain.evaluateRainAt(0, 50)).toBe(0.0);
    // Tree canopy retains water memory and continues dripping under boughs!
    expect(rain.canopy.waterStored).toBeGreaterThan(0.2);
    expect(rain.canopy.isDripping).toBe(true);
  });

  it("accumulates water in depressions, darkens terrain, and feeds 4 cliff waterfalls", async () => {
    const { LivingRainEngine } = await import(
      "@/world/weather/living-rain-engine"
    );
    const THREE = await import("three");
    const rain = new LivingRainEngine("heavy_storm");
    const camPos = new THREE.Vector3(0, 20, 0);
    rain.cell.x = 0;
    rain.cell.z = 0;

    // Simulate sustained downpour
    for (let i = 0; i < 20; i++) {
      rain.update(1.0, camPos);
    }

    const tele = rain.getTelemetry(camPos);
    expect(tele.surfaceWetness).toBeGreaterThan(0.6);
    expect(tele.puddleDepth).toBeGreaterThan(0.3);
    expect(tele.runoffRate).toBeGreaterThan(0.2);
    expect(tele.waterfallFlow).toBeGreaterThan(0.15);
    expect(rain.chutes.length).toBe(4);
  });

  it("culls individual hero and volume rain droplets once zoomed out past district range", async () => {
    const { LivingRainEngine } = await import(
      "@/world/weather/living-rain-engine"
    );
    const { CameraRainRenderer } = await import(
      "@/world/weather/camera-rain-renderer"
    );
    const THREE = await import("three");

    const rain = new LivingRainEngine("rainfall");
    rain.cell.x = 0;
    rain.cell.z = 0;
    rain.cell.intensity = 0.8;

    const renderer = new CameraRainRenderer(rain);
    const camera = new THREE.PerspectiveCamera(45, 16 / 9, 0.5, 3000);
    camera.position.set(0, 20, 0); // rain is now local to the island footprint

    // 1. Close zoom (local range): Hero droplets and volume streaks are active
    renderer.update(camera, 0.016, 22);
    expect(renderer.heroMesh.visible).toBe(true);
    expect(renderer.volumeMesh.visible).toBe(true);

    // 2. Regional zoom: individual droplets are culled to make weather cheaper at distance.
    renderer.update(camera, 0.016, 160);
    expect(renderer.heroMesh.visible).toBe(false);
    expect(renderer.volumeMesh.visible).toBe(false);
    // But macroscopic rain curtains and haze remain visible across the valley
    expect(renderer.curtainsGroup.visible).toBe(true);

    renderer.dispose();
  });

});

describe("ORRA Cosmic Space Environment & 1 km² Boundary Enforcement", () => {
  it("mounts the orbital environment without restoring off-island terrain", () => {
    const scene = new OrraScene(800, 600);
    scene.initializeWorld();
    scene.enterImmediately();

    expect(scene.scene.children.some((child) => child.name === "ORRA_SpaceEnvironment")).toBe(true);
    expect(scene.spaceEnvironment?.rootGroup.visible).toBe(true);
    expect(scene.camera.layers.isEnabled(1)).toBe(true);
    expect((scene.scene.background as THREE.Color).getHex()).toBe(0x000000);
    scene.setWorldTheme("light");
    expect((scene.scene.background as THREE.Color).getHex()).toBe(0x000000);
    expect(scene.spaceEnvironment?.rootGroup.visible).toBe(true);
    expect(scene.weatherSystem?.cloudFormations.every((cloud) => cloud.domain === "island")).toBe(true);
    // Asteroids and stars are proportions of the island rim, so they are scaled with it.
    expect(scene.spaceEnvironment?.rootGroup.scale.x).toBeCloseTo(WORLD_SCALE, 10);
  });

  it("initializes 3D starfield with 2800+ stars outside the 1 km² landmass", async () => {
    const { SpaceEnvironment } = await import("@/world/space/space-environment");
    const space = new SpaceEnvironment();
    expect(space.starPoints).toBeDefined();
    expect(space.STAR_COUNT).toBe(2800);

    const pos = space.starPoints.geometry.attributes.position;
    expect(pos.count).toBe(2800);

    // Verify all stars are strictly in deep space outside the 1 km² landmass (radius >= 540m)
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const r = Math.hypot(x, y, z);
      expect(r).toBeGreaterThanOrEqual(540);
    }

    space.dispose();
  });

  it("updates orbiting asteroid belt and zero-gravity tumbling shards", async () => {
    const { SpaceEnvironment } = await import("@/world/space/space-environment");
    const space = new SpaceEnvironment();
    expect(space.asteroidMesh).toBeDefined();
    expect(space.ASTEROID_COUNT).toBe(48);
    expect(space.dustMesh.count).toBe(960);
    expect(space.mediumMesh.count).toBe(240);
    expect(space.heroMesh.count).toBe(12);
    expect(space.heroMesh.geometry.attributes.position.count).toBeGreaterThan(space.asteroidMesh.geometry.attributes.position.count);
    expect(space.heroMesh.geometry.attributes.color.count).toBe(space.heroMesh.geometry.attributes.position.count);
    expect(space.satellites).toHaveLength(4);
    expect(space.orbitalKey.layers.isEnabled(1)).toBe(true);
    expect(space.orbitalKey.layers.isEnabled(0)).toBe(false);
    expect(space.heroMesh.layers.isEnabled(1)).toBe(true);
    for (const satellite of space.satellites) {
      expect(satellite.children.length).toBeLessThanOrEqual(12);
      const tiledWings = satellite.children.filter((child) => child.name === "ORRA_SolarArray") as THREE.Mesh[];
      expect(tiledWings).toHaveLength(2);
      expect(tiledWings.every((wing) => wing.geometry.attributes.color.count === 12 * 7 * 4)).toBe(true);
      const dish = satellite.getObjectByName("ORRA_Dish") as THREE.Mesh;
      expect(dish.geometry.attributes.position.count).toBeGreaterThan(250);
    }
    expect(space.rootGroup.children.some((child) => child instanceof THREE.LineSegments)).toBe(false);
    const before = new THREE.Matrix4();
    space.asteroidMesh.getMatrixAt(0, before);

    // Step one full round-robin cycle so every rock takes its turn.
    for (let k = 0; k < space.updateStride; k++) space.update(0.016);
    expect(space.rootGroup.children.length).toBeGreaterThan(0);
    const after = new THREE.Matrix4();
    space.asteroidMesh.getMatrixAt(0, after);
    expect(after.equals(before)).toBe(false);
    const second = new SpaceEnvironment();
    expect(Array.from(space.starPoints.geometry.attributes.position.array)).toEqual(
      Array.from(second.starPoints.geometry.attributes.position.array)
    );
    second.dispose();
    space.dispose();
  });

  it("keeps all orbiting rocks and satellites clear of the real island rim", async () => {
    // In the environment's own units the island rim is LANDMASS_OUTER_BOUND; the
    // scene scales the whole group so that bound lands on the studio island rim.
    const { SpaceEnvironment, MIN_ORBIT_CLEARANCE, LANDMASS_OUTER_BOUND } = await import("@/world/space/space-environment");
    const getLandmassPerimeterRadius = (_angle: number) => LANDMASS_OUTER_BOUND;
    const space = new SpaceEnvironment();
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const scale = new THREE.Vector3();
    const rotation = new THREE.Quaternion();
    for (const dt of [0, 1000, 1000, 1000, 1000]) {
      space.update(dt);
      for (const mesh of [space.heroMesh, space.asteroidMesh, space.mediumMesh, space.dustMesh]) {
        for (let i = 0; i < mesh.count; i++) {
          mesh.getMatrixAt(i, matrix);
          matrix.decompose(position, rotation, scale);
          const angle = Math.atan2(position.z, position.x);
          const rim = getLandmassPerimeterRadius(angle);
          const rockRadius = mesh.geometry.boundingSphere!.radius * Math.max(scale.x, scale.y, scale.z);
          const clearance = Math.hypot(position.x, position.z) - rim - rockRadius;
          expect(clearance).toBeGreaterThanOrEqual(MIN_ORBIT_CLEARANCE);
        }
      }
      for (const satellite of space.satellites) {
        const angle = Math.atan2(satellite.position.z, satellite.position.x);
        const clearance = Math.hypot(satellite.position.x, satellite.position.z) - getLandmassPerimeterRadius(angle) - 190 * satellite.scale.x;
        expect(clearance).toBeGreaterThanOrEqual(MIN_ORBIT_CLEARANCE);
      }
    }
    space.dispose();
  });

  it("clamps navigation panning focus target to the 1 km² landmass extent", async () => {
    const { WorldNavigationController } = await import("@/world/navigation/world-navigation");
    const nav = new WorldNavigationController();

    // Pan camera aggressively towards outer space (+50,000 pixels)
    nav.pan(50000, 50000, 800);
    nav.update(0.016);

    const targetDist = Math.hypot(nav.desiredTarget.x, nav.desiredTarget.z);
    expect(targetDist).toBeLessThanOrEqual(WorldNavigationController.MAX_TARGET_RADIUS + 1e-9);
  });

  it("defaults navigation to a regional overview of the expanded island", async () => {
    const { WorldNavigationController, DEFAULT_THREE_QUARTER } = await import(
      "@/world/navigation/world-navigation"
    );
    const nav = new WorldNavigationController();
    expect(DEFAULT_THREE_QUARTER.phi).toBeCloseTo((48 * Math.PI) / 180);
    expect(DEFAULT_THREE_QUARTER.radius).toBe(150);
    expect(nav.desiredSpherical.radius).toBe(150);
    expect(nav.getCurrentZoomRange()).toBe("regional");
  });

});

describe("ORRA World Theme (Light & Dark Mode)", () => {
  it("initializes with default theme and switches between dark and light modes", () => {
    const scene = new OrraScene(800, 600);
    scene.initializeWorld();
    scene.enterImmediately();

    expect(scene.worldTheme).toBe("dark");
    expect(scene.spaceEnvironment?.rootGroup.visible).toBe(true);
    const darkSky = (scene as any).hemiLight.intensity;

    // Daylight theme brightens the sky fill; space stays visible in both themes.
    scene.setWorldTheme("light");
    expect(scene.worldTheme).toBe("light");
    expect(scene.spaceEnvironment?.rootGroup.visible).toBe(true);
    expect((scene as any).hemiLight.intensity).toBeGreaterThan(darkSky);

    const toggled = scene.toggleWorldTheme();
    expect(toggled).toBe("dark");
    expect(scene.worldTheme).toBe("dark");
    expect((scene as any).hemiLight.intensity).toBe(darkSky);
  });
});

describe("ORRA Generative Weather & Holistic World Interaction", () => {
  it("initializes valley inversion mist planes and crepuscular sunbeams", async () => {
    const { WeatherStateManager } = await import("@/world/weather/weather-world-state");
    const { WeatherSystem } = await import("@/world/weather/weather-system");
    const THREE = await import("three");

    const scene = new THREE.Scene();
    const mgr = new WeatherStateManager("fog");
    const ws = new WeatherSystem(scene, mgr);

    const camera = new THREE.PerspectiveCamera(45, 16 / 9, 0.5, 3000);
    camera.position.set(0, 100, 200);

    ws.update(camera, 0.016);
    expect(ws.rootGroup.children.length).toBeGreaterThanOrEqual(8);

    ws.dispose();
  });

});



describe("Weather Authority & Atmosphere Sync", () => {
  it("produces no rain, lightning or wetness while the preset is clear", async () => {
    const { LivingRainEngine } = await import("@/world/weather/living-rain-engine");
    const THREE = await import("three");

    // Park the engine mid-storm, then revoke authority as "clear" would.
    const engine = new LivingRainEngine("heavy_storm");
    const cam = new THREE.Vector3(0, 40, 0);
    engine.cell.x = 0;
    engine.cell.z = 0;

    // With full authority a storm cell overhead must actually rain,
    // otherwise this test would pass for the wrong reason.
    engine.setAuthority(1);
    engine.update(0.5, cam);
    expect(engine.evaluateRainAt(0, 0)).toBeGreaterThan(0.1);

    // Clear revokes authority: no rain anywhere, regardless of internal phase.
    engine.setAuthority(0);
    expect(engine.isDormant).toBe(true);
    expect(engine.evaluateRainAt(0, 0)).toBe(0);
    expect(engine.getLightningIntensity()).toBe(0);

    // And the lifecycle parks rather than cycling invisibly behind a clear sky.
    const phaseBefore = engine.currentPhase;
    for (let i = 0; i < 400; i++) engine.update(0.5, cam);
    expect(engine.currentPhase).toBe(phaseBefore);

    // Ground dries out instead of staying wet forever.
    expect(engine.accumulation.puddleDepth).toBeLessThan(0.02);
    expect(engine.accumulation.surfaceWetness).toBeLessThan(0.1);
  });

  it("scales rain continuously with authority rather than switching on and off", async () => {
    const { LivingRainEngine } = await import("@/world/weather/living-rain-engine");
    const THREE = await import("three");
    const engine = new LivingRainEngine("heavy_storm");
    engine.cell.x = 0;
    engine.cell.z = 0;
    engine.update(0.1, new THREE.Vector3(0, 40, 0));

    engine.setAuthority(1.0);
    const full = engine.evaluateRainAt(0, 0);
    engine.setAuthority(0.5);
    const half = engine.evaluateRainAt(0, 0);

    expect(half).toBeGreaterThan(0);
    expect(half).toBeLessThan(full);
    expect(half).toBeCloseTo(full * 0.5, 4);
  });

  it("contracts fog depth monotonically with visibility", async () => {
    // Guards the dead-clamp bug: Math.max floors once pinned fog to one range
    // in every preset, so clear, rain and fog looked identical. This exercises
    // the scene's real fog function, not a copy of it.
    const { WEATHER_PRESETS } = await import("@/world/weather/weather-world-state");
    const { DEFAULT_THREE_QUARTER } = await import("@/world/navigation/world-navigation");
    const radius = DEFAULT_THREE_QUARTER.radius;
    const clear = OrraScene.fogRange(WEATHER_PRESETS.clear.visibility, radius);
    const rain = OrraScene.fogRange(WEATHER_PRESETS.rain.visibility, radius);
    const fog = OrraScene.fogRange(WEATHER_PRESETS.fog.visibility, radius);

    // Each preset must render visibly different atmosphere.
    expect(fog.far).toBeLessThan(rain.far);
    expect(rain.far).toBeLessThan(clear.far);
    expect(fog.near).toBeLessThan(rain.near);

    // Dense fog must close before the island's far rim (orbit radius + island
    // bound from the camera), or the rim never dissolves...
    expect(fog.far).toBeLessThan(radius + STUDIO_ISLAND_BOUND);
    // ...but must not veil the desks right in front of the camera (permeability).
    expect(fog.near).toBeGreaterThan(8);
    expect(fog.far).toBeGreaterThan(radius);
    // Clear air must reach past the starfield so there is effectively no fog.
    expect(clear.far).toBeGreaterThan(2400);

    // And the whole range is monotonic in visibility.
    let prev = OrraScene.fogRange(0, radius).far;
    for (let v = 0.05; v <= 1.0001; v += 0.05) {
      const far = OrraScene.fogRange(v, radius).far;
      expect(far).toBeGreaterThanOrEqual(prev);
      prev = far;
    }
  });
});

describe("Fog Permeability & Valley Inversion", () => {
  it("clears as the camera climbs above the inversion ceiling", async () => {
    const { OrraScene } = await import("@/world/engine/scene");
    const THREE = await import("three");

    // Mirrors the inversion term in scene.ts: fog is a layer with a ceiling,
    // not a uniform wash, so altitude must change what you can see.
    const effectiveVis = (rawVis: number, camY: number) => {
      const aboveLayer = THREE.MathUtils.clamp(
        (camY - OrraScene.FOG_INVERSION_TOP) / OrraScene.FOG_INVERSION_FALLOFF,
        0,
        1
      );
      const breakout = aboveLayer * aboveLayer * (3 - 2 * aboveLayer);
      return THREE.MathUtils.clamp(
        THREE.MathUtils.lerp(rawVis, 1.0, breakout * 0.88),
        0,
        1
      );
    };

    const denseFog = 0.22;
    const inBasin = effectiveVis(denseFog, 4);
    const atCeiling = effectiveVis(denseFog, OrraScene.FOG_INVERSION_TOP);
    const aboveLayer = effectiveVis(denseFog, 200);

    // Down in the basin the fog is full strength.
    expect(inBasin).toBeCloseTo(denseFog, 5);
    expect(atCeiling).toBeCloseTo(denseFog, 5);
    // Climbing out of the inversion must genuinely break into clear air,
    // otherwise the "layer" is still just a uniform wash.
    expect(aboveLayer).toBeGreaterThan(0.85);

    // And it must be monotonic through the transition band, not a hard cut.
    let prev = -1;
    for (let y = 0; y <= 260; y += 20) {
      const v = effectiveVis(denseFog, y);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });
});

describe("Crepuscular God Rays", () => {
  it("keeps every shaft parallel to the sun direction", async () => {
    const { GodRaySystem } = await import("@/world/weather/god-ray-system");
    const THREE = await import("three");

    const sys = new GodRaySystem();
    const sunDir = new THREE.Vector3(0.3, 0.8, -0.5).normalize();
    sys.setSunDirection(sunDir);

    // Crepuscular rays are parallel: the sun is effectively at infinity and the
    // apparent fan is perspective. Independently-aimed shafts read as props.
    const axis = new THREE.Vector3();
    for (const child of sys.group.children) {
      axis.set(0, 1, 0).applyQuaternion(child.quaternion);
      // Each shaft's local +Y axis must land on the sun direction.
      expect(axis.dot(sunDir)).toBeCloseTo(1, 5);
    }
    expect(sys.group.children.length).toBeGreaterThan(1);

    sys.dispose();
  });

  it("re-aims when the key light moves, and costs nothing when unlit", async () => {
    const { GodRaySystem } = await import("@/world/weather/god-ray-system");
    const THREE = await import("three");

    const sys = new GodRaySystem();
    const camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.5, 4000);
    camera.position.set(0, 60, 200);

    const first = new THREE.Vector3(0.2, 0.7, -0.6).normalize();
    sys.setSunDirection(first);
    const axis = new THREE.Vector3(0, 1, 0).applyQuaternion(sys.group.children[0].quaternion);
    expect(axis.dot(first)).toBeCloseTo(1, 5);

    // Moving the light must actually re-orient the shafts, not just the uniform.
    const second = new THREE.Vector3(-0.7, 0.5, 0.5).normalize();
    sys.setSunDirection(second);
    const axis2 = new THREE.Vector3(0, 1, 0).applyQuaternion(sys.group.children[0].quaternion);
    expect(axis2.dot(second)).toBeCloseTo(1, 5);
    expect(axis2.dot(first)).toBeLessThan(0.99);

    // Zero gain (overcast / night) must skip the group entirely rather than
    // drawing shafts that resolve to nothing.
    sys.update(camera, 0.016, 0);
    expect(sys.group.visible).toBe(false);

    sys.update(camera, 0.016, 0.8);
    expect(sys.group.visible).toBe(true);

    sys.dispose();
  });
});

describe("Volumetric Fluffy Cloud Dynamics", () => {
  it("generates composite volumetric cloud formations at true sky level with dedicated over-island fleet", async () => {
    const { WeatherSystem } = await import("@/world/weather/weather-system");
    const { WeatherStateManager } = await import("@/world/weather/weather-world-state");
    const THREE = await import("three");
    const threeScene = new THREE.Scene();
    const weatherManager = new WeatherStateManager();
    const ws = new WeatherSystem(threeScene, weatherManager);

    expect(ws.cloudFormations.length).toBe(7);

    // Formations must be strictly at sky level (lowest center >= 190m, max >= 460m)
    const altitudes = ws.cloudFormations.map((f) => f.group.position.y);
    const minAlt = Math.min(...altitudes);
    const maxAlt = Math.max(...altitudes);
    expect(minAlt).toBeGreaterThanOrEqual(190); // Sky level: lowest cumulus >= 195m
    expect(maxAlt).toBeGreaterThanOrEqual(450); // Island zenith cloud

    // Mathematical zero-tree-collision check:
    // With max terrain peak at 65m and highest tree at 25m, the tree canopy ceiling is 90m.
    // Every cloud formation's bottom boundary (y - h/2) must strictly clear 90m with a safety buffer >= 40m.
    for (const formation of ws.cloudFormations) {
      const bottomBound = formation.baseY - (formation.width * 0.22);
      expect(bottomBound).toBeGreaterThan(90 + 40); // Base strictly >= 130m
    }

    // Verify dedicated over-island fleet: 7 formations situated directly over the island landmass
    const islandClouds = ws.cloudFormations.filter((f) => f.domain === "island");
    expect(islandClouds.length).toBe(7);
    for (const c of islandClouds) {
      const distFromOrigin = Math.hypot(c.group.position.x, c.group.position.z);
      expect(distFromOrigin).toBeLessThanOrEqual(800);
    }

    // Renewed clouds stay in a bounded atmospheric corridor without reversing.
    const before = islandClouds.map((c) => c.progress);
    ws.update(new THREE.PerspectiveCamera(60, 1.33, 0.1, 5000), 0.016);
    islandClouds.forEach((c, i) => {
      expect(c.progress).toBeGreaterThan(before[i]);
      expect(Math.hypot(c.group.position.x, c.group.position.z)).toBeLessThanOrEqual(800);
    });

    // Each formation must consist of multiple cross-angled billow lobes for genuine 3D volume
    for (const formation of ws.cloudFormations) {
      expect(formation.lobes.length).toBeGreaterThanOrEqual(3);
      for (const lobe of formation.lobes) {
        expect(lobe.mesh).toBeDefined();
        expect(lobe.baseScale.x).toBeGreaterThan(0);
      }
    }

    ws.dispose();
  });

  it("modulates cloud deck altitude and opacity in sync with perspective views", async () => {
    const { WeatherSystem } = await import("@/world/weather/weather-system");
    const { WeatherStateManager } = await import("@/world/weather/weather-world-state");
    const THREE = await import("three");
    const threeScene = new THREE.Scene();
    const weatherManager = new WeatherStateManager();
    const ws = new WeatherSystem(threeScene, weatherManager);

    const cam = new THREE.PerspectiveCamera(50, 16 / 9, 0.5, 3000);

    // 1. Oblique perspective
    cam.position.set(336, 428, 336);
    ws.update(cam, 0.016, "dark", "oblique");
    const obliqueY = ws.cloudFormations[0].group.position.y;

    // 2. Horizon eye-level perspective: cloud deck lifts (+35m) so horizon views are expansive
    cam.position.set(0, 169, 260);
    ws.update(cam, 0.016, "dark", "horizon");
    const horizonY = ws.cloudFormations[0].group.position.y;
    expect(horizonY).toBeGreaterThan(obliqueY + 20);

    // 3. Overhead perspective: opacity softens slightly so island terrain is clearly visible
    cam.position.set(0, 876, 10);
    ws.update(cam, 0.016, "dark", "overhead");
    const overheadY = ws.cloudFormations[0].group.position.y;
    expect(overheadY).toBeLessThan(horizonY);

    ws.dispose();
  });

  it("advects clouds smoothly under wind vectors with horizontal shear", async () => {
    const { WeatherSystem } = await import("@/world/weather/weather-system");
    const { WeatherStateManager } = await import("@/world/weather/weather-world-state");
    const THREE = await import("three");
    const threeScene = new THREE.Scene();
    const weatherManager = new WeatherStateManager();
    const ws = new WeatherSystem(threeScene, weatherManager);

    const initialX = ws.cloudFormations[0].group.position.x;
    const dummyCam = new THREE.PerspectiveCamera(50, 16 / 9, 0.5, 3000);
    dummyCam.position.set(0, 50, 300);

    // Set strong wind on the manager
    weatherManager.current.wind = 0.85;
    weatherManager.current.windAngle = 0.0;

    ws.update(dummyCam, 1.0);
    const movedX = ws.cloudFormations[0].group.position.x;
    expect(movedX).not.toBe(initialX);

    ws.dispose();
  });
});

describe("Camera Perspective Navigation Presets", () => {
  it("correctly sets and switches between oblique, overhead, and horizon perspectives", async () => {
    const { WorldNavigationController } = await import("@/world/navigation/world-navigation");
    const nav = new WorldNavigationController();

    // Initial state is oblique
    expect(nav.activePerspective).toBe("oblique");

    // Switch to overhead (planar overview)
    nav.setPerspective("overhead");
    expect(nav.activePerspective).toBe("overhead");
    expect(nav.desiredSpherical.radius).toBe(350);
    expect(nav.desiredSpherical.phi).toBeCloseTo(0.418879, 3); // 24 deg

    // Switch to horizon (eye-level ground view)
    nav.setPerspective("horizon");
    expect(nav.activePerspective).toBe("horizon");
    expect(nav.desiredSpherical.radius).toBe(90);
    expect(nav.desiredSpherical.phi).toBeCloseTo((74 * Math.PI) / 180, 3); // restored eye-level pitch

    // Switch back to oblique
    nav.setPerspective("oblique");
    expect(nav.activePerspective).toBe("oblique");
    expect(nav.desiredSpherical.radius).toBe(150);
  });

  it("cycles smoothly through perspectives in sequence", async () => {
    const { WorldNavigationController } = await import("@/world/navigation/world-navigation");
    const nav = new WorldNavigationController();

    expect(nav.activePerspective).toBe("oblique");

    const p1 = nav.cyclePerspective();
    expect(p1).toBe("office");
    expect(nav.activePerspective).toBe("office");

    const p2 = nav.cyclePerspective();
    expect(p2).toBe("boardroom");
    expect(nav.activePerspective).toBe("boardroom");

    const p3 = nav.cyclePerspective();
    expect(p3).toBe("overhead");
    expect(nav.activePerspective).toBe("overhead");

    const p4 = nav.cyclePerspective();
    expect(p4).toBe("horizon");
    expect(nav.activePerspective).toBe("horizon");

    const p5 = nav.cyclePerspective();
    expect(p5).toBe("satellite");
    expect(nav.activePerspective).toBe("satellite");

    const p6 = nav.cyclePerspective();
    expect(p6).toBe("oblique");
    expect(nav.activePerspective).toBe("oblique");
  });

  it("delegates perspective commands from OrraScene", () => {
    const scene = new OrraScene(800, 600);
    scene.setPerspective("office");
    expect(scene.nav.activePerspective).toBe("office");

    const next = scene.cyclePerspective();
    expect(next).toBe("boardroom");
    expect(scene.nav.activePerspective).toBe("boardroom");
  });
});


describe("World Time & Ecosystem", () => {
  it("runs on its own clock, independent of wall time", async () => {
    const { WorldClock, REAL_SECONDS_PER_DAY, evaluateWorldTime } = await import(
      "@/world/life/world-clock"
    );

    const clock = new WorldClock(0);
    const startDay = clock.getTime().day;

    // Advance of REAL_SECONDS_PER_DAY at 1x is one world day.
    clock.timeScale = 1;
    clock.advance(REAL_SECONDS_PER_DAY);
    expect(clock.getTime().day).toBe(startDay + 1);

    // Time scale must actually change the rate, or the control is dead UI.
    clock.timeScale = 60;
    clock.advance(REAL_SECONDS_PER_DAY / 60);
    expect(clock.getTime().day).toBe(startDay + 2);

    // Pausing holds the world still.
    clock.paused = true;
    const held = clock.getTime().worldSeconds;
    for (let i = 0; i < 100; i++) clock.advance(1);
    expect(clock.getTime().worldSeconds).toBe(held);

    // Resetting time restores the canonical initial world seconds and 1x speed.
    clock.paused = false;
    clock.timeScale = 30;
    clock.advance(500);
    expect(clock.getTime().worldSeconds).toBeGreaterThan(held);
    clock.resetTime();
    expect(clock.getTime().worldSeconds).toBe(clock.defaultStartSeconds);
    expect(clock.timeScale).toBe(1);
    expect(clock.paused).toBe(false);

    // Evaluation is pure: same input, same world.
    const a = evaluateWorldTime(REAL_SECONDS_PER_DAY * 12.25);
    const b = evaluateWorldTime(REAL_SECONDS_PER_DAY * 12.25);
    expect(a).toEqual(b);
  });

});

describe("ORRA Living World Continuum (Phases 1-4)", () => {
  describe("WorldClock Continuum", () => {
    it("derives correct diurnal phases and sun angles across 24h day", async () => {
      const { WorldClock } = await import("@/world/life/world-clock");
      const clock = new WorldClock(0); // Start at midnight (dayFraction = 0)

      // Midnight
      let time = clock.getTime();
      expect(time.diurnalPhase).toBe("night");
      expect(time.isDaylight).toBe(false);
      expect(time.sunElevation).toBeLessThan(0);

      // Dawn: dayFraction ~ 0.28 (6:43 AM)
      clock.scrubToDayFraction(0.28);
      time = clock.getTime();
      expect(time.diurnalPhase).toBe("dawn");
      expect(time.isDaylight).toBe(true);
      expect(time.sunElevation).toBeGreaterThan(0);

      // Noon: dayFraction ~ 0.50 (12 PM)
      clock.scrubToDayFraction(0.5);
      time = clock.getTime();
      expect(time.diurnalPhase).toBe("noon");
      expect(time.isDaylight).toBe(true);
      expect(time.sunElevation).toBeCloseTo(1.0, 1);

      // Dusk: dayFraction ~ 0.72 (5:15 PM)
      clock.scrubToDayFraction(0.72);
      time = clock.getTime();
      expect(time.diurnalPhase).toBe("dusk");
      expect(time.isDaylight).toBe(true);

      // Night again: dayFraction ~ 0.85 (8:24 PM)
      clock.scrubToDayFraction(0.85);
      time = clock.getTime();
      expect(time.diurnalPhase).toBe("night");
      expect(time.isDaylight).toBe(false);
    });

    it("supports pause, timescale switching, and canonical reset", async () => {
      const { WorldClock } = await import("@/world/life/world-clock");
      const clock = new WorldClock(100);

      // Advance at 1x
      clock.advance(10);
      expect(clock.worldSeconds).toBe(110);

      // Pause halts advance
      const isPaused = clock.togglePause();
      expect(isPaused).toBe(true);
      expect(clock.paused).toBe(true);
      clock.advance(10);
      expect(clock.worldSeconds).toBe(110);

      // Unpause resumes
      clock.togglePause();
      expect(clock.paused).toBe(false);
      clock.advance(10);
      expect(clock.worldSeconds).toBe(120);

      // Cycle time scales: 1 -> 5 -> 30 -> 120 -> 1
      expect(clock.timeScale).toBe(1);
      expect(clock.cycleTimeScale()).toBe(5);
      expect(clock.cycleTimeScale()).toBe(30);
      expect(clock.cycleTimeScale()).toBe(120);
      expect(clock.cycleTimeScale()).toBe(1);

      // Explicit setTimeScale
      clock.setTimeScale(5);
      expect(clock.timeScale).toBe(5);
      clock.advance(2);
      expect(clock.worldSeconds).toBe(130); // 120 + 2 * 5

      // Reset restores canonical defaults
      clock.resetTime();
      expect(clock.worldSeconds).toBe(clock.defaultStartSeconds);
      expect(clock.timeScale).toBe(1);
      expect(clock.paused).toBe(false);
    });

    it("scrubs seamlessly to arbitrary day and season fractions", async () => {
      const { WorldClock } = await import("@/world/life/world-clock");
      const clock = new WorldClock();

      clock.scrubToSeasonPhase(2.5); // Autumn midpoint
      const tAutumn = clock.getTime();
      expect(tAutumn.season).toBe("autumn");
      expect(tAutumn.seasonPhase).toBeCloseTo(2.5, 2);

      clock.scrubToSeasonPhase(3.5); // Winter midpoint
      const tWinter = clock.getTime();
      expect(tWinter.season).toBe("winter");

      clock.scrubToDayFraction(0.5);
      const tNoon = clock.getTime();
      expect(tNoon.dayFraction).toBeCloseTo(0.5, 2);
    });

    it("runs independently across browser clients using local device time", async () => {
      const { WorldClock, initialWorldSeconds, REAL_SECONDS_PER_DAY } = await import(
        "@/world/life/world-clock"
      );
      // Fallback in headless environment evaluates correctly
      const initialSec = initialWorldSeconds();
      expect(initialSec).toBeGreaterThan(0);

      // Default clock instantiation without hardcoded fixed Day 4
      const clock = new WorldClock();
      expect(clock.worldSeconds).toBeGreaterThan(0);

      // Explicit custom epoch remains fully supported
      const customClock = new WorldClock(12 * REAL_SECONDS_PER_DAY + 0.5 * REAL_SECONDS_PER_DAY);
      expect(customClock.getTime().day).toBe(12);
      expect(customClock.getTime().dayFraction).toBeCloseTo(0.5, 2);
    });
  });

  describe("CelestialSystem", () => {
    it("computes 3D solar trajectory and diurnal color temperature", async () => {
      const { CelestialSystem } = await import("@/world/environment/celestial-system");
      const { WorldClock } = await import("@/world/life/world-clock");
      const celestial = new CelestialSystem();
      const clock = new WorldClock();

      // Noon state: high intensity, crisp solar white
      clock.scrubToDayFraction(0.5);
      let state = celestial.update(clock.getTime(), { precipitation: 0, visibility: 1, surfaceWetness: 0 });
      expect(state.sunPosition.y).toBeGreaterThan(400);
      expect(state.sunIntensity).toBeGreaterThan(2.0);
      expect(state.sunColor.r).toBeGreaterThan(0.9);
      expect(state.sunColor.g).toBeGreaterThan(0.9);

      // Dawn state: warm coral/sunrise red-shift
      clock.scrubToDayFraction(0.24);
      state = celestial.update(clock.getTime(), { precipitation: 0, visibility: 1, surfaceWetness: 0 });
      expect(state.sunColor.r).toBeGreaterThan(state.sunColor.b); // Red shifted
      expect(state.crepuscularIntensity).toBeGreaterThan(0.3); // Sun shafts

      // Night state: cool celestial moonlight & starlight
      clock.scrubToDayFraction(0.9);
      state = celestial.update(clock.getTime(), { precipitation: 0, visibility: 1, surfaceWetness: 0 });
      expect(state.sunIntensity).toBeLessThan(0.8);
      expect(state.starVisibility).toBeGreaterThan(0.7);

      // Storm occlusion suppresses sunlight
      clock.scrubToDayFraction(0.5);
      const clearState = celestial.update(clock.getTime(), { precipitation: 0, visibility: 1, surfaceWetness: 0 }, 0.2);
      const stormState = celestial.update(clock.getTime(), { precipitation: 0.9, visibility: 0.2, surfaceWetness: 0.8 }, 0.9);
      expect(stormState.sunIntensity).toBeLessThan(clearState.sunIntensity * 0.5);
      expect(stormState.cloudOcclusion).toBeGreaterThan(0.7);
    });
  });

  describe("OrraScene Continuum Integration", () => {
    it("exposes celestial and time scrubbing APIs", async () => {
      const scene = new OrraScene(800, 600);
      await scene.initializeWorld();

      expect(scene.worldClock).toBeDefined();
      expect(scene.celestialSystem).toBeDefined();

      // Pause toggle
      expect(scene.worldClock.paused).toBe(false);
      const isPaused = scene.togglePauseTime();
      expect(isPaused).toBe(true);
      expect(scene.worldClock.paused).toBe(true);
      scene.togglePauseTime();
      expect(scene.worldClock.paused).toBe(false);

      // Time scrub
      scene.scrubWorldTime(0.5);
      expect(scene.getWorldTime().dayFraction).toBeCloseTo(0.5, 2);

      scene.scrubSeasonPhase(2.0);
      expect(scene.getWorldTime().season).toBe("autumn");
    });

    it("supports high-resolution preview postcard capture directly from WebGL", async () => {
      const scene = new OrraScene(800, 600);
      await scene.initializeWorld();
      expect(typeof scene.captureHighResPreview).toBe("function");
    });
  });

  describe("ORRA Standalone Identity & Product Hardening", () => {
    it("exports authoritative standalone metadata with absolute title", async () => {
      const { metadata, viewport } = await import("@/app/orra/page");
      expect(viewport.themeColor).toBe("#020106");
      expect(metadata.title).toEqual({ absolute: "ORRA: A Living World" });
      expect(metadata.description).toBe(
        "A living world shaped by time, weather, climate and its environment. Built and maintained by Kayode."
      );
      expect(metadata.creator).toBe("Kayode");
      expect(metadata.openGraph?.title).toBe("ORRA: A Living World");
      expect(metadata.openGraph?.siteName).toBe("ORRA");
      expect((metadata.twitter as { card?: string })?.card).toBe("summary_large_image");
    });

    it("deploys standalone brand icons and photographic postcard preview assets", async () => {
      const fs = await import("fs");
      expect(fs.existsSync("public/orra/icon.svg")).toBe(true);
      expect(fs.existsSync("public/orra/icon.png")).toBe(true);
      expect(fs.existsSync("public/orra/apple-touch-icon.png")).toBe(true);
      expect(fs.existsSync("public/orra/og-orra.png")).toBe(true);
    });
  });

});

describe("Climate-Driven Weather", () => {
  it("gives every season its characteristic weather, including summer rain and autumn fog", async () => {
    const { resolveClimateWeather, SPELL_DAYS } = await import("@/world/life/climate-weather");
    const { DAYS_PER_YEAR, SEASON_COUNT } = await import("@/world/life/world-clock");

    const daysPerSeason = DAYS_PER_YEAR / SEASON_COUNT;
    const tally: Record<string, Record<string, number>> = {};
    const names = ["spring", "summer", "autumn", "winter"];

    // Walk 40 world years of spells and tally weather by season.
    for (let d = 0; d < DAYS_PER_YEAR * 40; d += SPELL_DAYS) {
      const seasonPhase = ((d / daysPerSeason) % SEASON_COUNT);
      const si = Math.floor(seasonPhase);
      // Sample at midday so the fog time-of-day veto is exercised.
      const w = resolveClimateWeather(d, seasonPhase, 0.5);
      tally[names[si]] ??= {};
      tally[names[si]][w] = (tally[names[si]][w] ?? 0) + 1;
    }

    // The specific failures reported: summer with no rain, autumn with no fog.
    expect(tally.summer.rain ?? 0).toBeGreaterThan(0);
    expect(tally.autumn.fog ?? 0).toBeGreaterThan(0);
    expect(tally.spring.rain ?? 0).toBeGreaterThan(0);

    // Autumn must be meaningfully foggier than summer, or the seasons do not
    // have distinct climates and the table is decorative.
    const autumnFogRate =
      (tally.autumn.fog ?? 0) / Object.values(tally.autumn).reduce((a, b) => a + b, 0);
    const summerFogRate =
      (tally.summer.fog ?? 0) / Object.values(tally.summer).reduce((a, b) => a + b, 0);
    expect(autumnFogRate).toBeGreaterThan(summerFogRate * 2);

    // Every season must produce more than one kind of weather.
    for (const n of names) {
      expect(Object.keys(tally[n]).length).toBeGreaterThan(1);
    }
  });

  it("is deterministic and reproducible when time is scrubbed", async () => {
    const { resolveClimateWeather } = await import("@/world/life/climate-weather");
    for (const d of [3.2, 17.9, 104.4]) {
      expect(resolveClimateWeather(d, 1.3, 0.5)).toBe(resolveClimateWeather(d, 1.3, 0.5));
    }
  });

});


describe("Studio Island in ORRA", () => {
  it("keeps the expanded main island in the initial establishing shot", () => {
    const scene = new OrraScene(1280, 720);
    scene.camera.updateMatrixWorld();
    for (let i = 0; i < 16; i++) {
      const angle = i / 16 * Math.PI * 2;
      const point = new THREE.Vector3(100 * Math.cos(angle), 0, 100 * Math.sin(angle));
      const projected = point.project(scene.camera);
      expect(Math.abs(projected.x)).toBeLessThan(1);
      expect(Math.abs(projected.y)).toBeLessThan(1);
    }
  });

  it("expands the main cliff to 100 m and moves companion islets clear of it and the orbital lane", async () => {
    const { STUDIO_MAIN_ISLAND_RADIUS, STUDIO_ISLAND_BOUND } = await import("@/world/studio/island");
    const { MAIN_ISLAND_FOOTPRINT_SCALE, COMPANION_ISLET_CENTERS } = await import("@/world/studio/studio-world");
    const { ORBIT_LANE_RADII } = await import("@/world/space/space-environment");
    expect(STUDIO_MAIN_ISLAND_RADIUS).toBe(100);
    // The old 52 m outer cornice scales to just under the requested radius.
    expect(52 * MAIN_ISLAND_FOOTPRINT_SCALE).toBeGreaterThan(95);
    expect(52 * MAIN_ISLAND_FOOTPRINT_SCALE).toBeLessThanOrEqual(STUDIO_MAIN_ISLAND_RADIUS);
    for (const { x, z } of COMPANION_ISLET_CENTERS) {
      const centerRadius = Math.hypot(x, z);
      const maxIsletRadius = 6; // 4 m base with conservative irregular-rim allowance
      expect(centerRadius - maxIsletRadius).toBeGreaterThan(STUDIO_MAIN_ISLAND_RADIUS);
      expect(centerRadius + maxIsletRadius).toBeLessThan(STUDIO_ISLAND_BOUND);
      const innerRockRadius = (ORBIT_LANE_RADII[0] - 90 - 75) * WORLD_SCALE;
      expect(innerRockRadius - centerRadius - maxIsletRadius).toBeGreaterThan(10);
    }
  });

  it("maps the retired rim onto the studio island with one scale factor", async () => {
    const { LANDMASS_OUTER_BOUND, ORBIT_LANE_RADII, MIN_ORBIT_CLEARANCE } = await import(
      "@/world/space/space-environment"
    );
    // One number carries every calibrated proportion across.
    expect(LANDMASS_OUTER_BOUND * WORLD_SCALE).toBeCloseTo(STUDIO_ISLAND_BOUND, 10);
    // So the innermost asteroid lane still clears the island by the calibrated margin.
    const innerLane = ORBIT_LANE_RADII[0] * WORLD_SCALE;
    expect(innerLane - STUDIO_ISLAND_BOUND).toBeGreaterThan(MIN_ORBIT_CLEARANCE * WORLD_SCALE);
  });

  it("lifts the scaled cloud deck clear of the default overview camera", async () => {
    const { WeatherSystem } = await import("@/world/weather/weather-system");
    const { WeatherStateManager } = await import("@/world/weather/weather-world-state");
    const { WorldNavigationController } = await import("@/world/navigation/world-navigation");
    const scene = new OrraScene(800, 600);
    await scene.initializeWorld();
    const nav = new WorldNavigationController();
    nav.resetToDefault();
    const camY = nav.update(0).y;

    const lowest = Math.min(
      ...scene.weatherSystem!.cloudFormations.map((f) => {
        const p = new THREE.Vector3();
        f.group.getWorldPosition(p);
        return p.y;
      })
    );
    // Scaled but unlifted, the deck sits at the establishing camera's own
    // altitude and a cloud fills the frame. That is the failure this guards.
    const unlifted = new WeatherSystem(new THREE.Scene(), new WeatherStateManager(), WORLD_SCALE);
    const unliftedLowest = Math.min(
      ...unlifted.cloudFormations.map((f) => f.group.position.y * WORLD_SCALE)
    );
    expect(unliftedLowest).toBeLessThan(camY);
    expect(lowest).toBeGreaterThan(camY);
    unlifted.dispose();
  });

  it("derives the landmark views from the stations' designed focus framings", async () => {
    const { PERSPECTIVE_CONFIGS } = await import("@/world/navigation/world-navigation");
    const { STUDIO_STATIONS } = await import("@/world/studio/stations");
    for (const [view, id] of [["office", "command-desk"], ["boardroom", "boardroom"]] as const) {
      const cfg = PERSPECTIVE_CONFIGS[view];
      const station = STUDIO_STATIONS[id];
      const target = new THREE.Vector3(cfg.target!.x, cfg.target!.y, cfg.target!.z);
      const offset = new THREE.Vector3().setFromSphericalCoords(cfg.radius, cfg.phi, cfg.theta);
      const camera = target.clone().add(offset);
      expect(target.toArray()).toEqual(station.focusCameraTarget);
      expect(camera.distanceTo(new THREE.Vector3(...station.focusCameraPosition!))).toBeLessThan(1e-6);
    }
  });

  it("flies to a station's framing and names it, and panning away clears it", async () => {
    const { STUDIO_STATIONS } = await import("@/world/studio/stations");
    const scene = new OrraScene(800, 600);
    scene.enterImmediately();
    scene.focusStation("boardroom");
    expect(scene.getFocusedStation()).toBe("boardroom");
    for (let i = 0; i < 400; i++) scene.nav.update(1 / 60);
    const station = STUDIO_STATIONS.boardroom;
    const cam = scene.nav.update(0);
    // The camera lands on the portal's designed shot, not just near the desk.
    expect(cam.distanceTo(new THREE.Vector3(...station.focusCameraPosition!))).toBeLessThan(0.5);
    expect(scene.nav.currentTarget.distanceTo(new THREE.Vector3(...station.focusCameraTarget!))).toBeLessThan(0.05);

    scene.pan(40, 0);
    expect(scene.getFocusedStation()).toBeNull();
  });

  it("keeps every station inside the island and inside the navigable target radius", async () => {
    const { STUDIO_STATIONS } = await import("@/world/studio/stations");
    const { WorldNavigationController } = await import("@/world/navigation/world-navigation");
    for (const station of Object.values(STUDIO_STATIONS)) {
      const [x, , z] = station.focusCameraTarget ?? station.worldPosition;
      expect(Math.hypot(x, z)).toBeLessThanOrEqual(WorldNavigationController.MAX_TARGET_RADIUS);
    }
  });

  it("never drops the camera below eye height over the plateau, at any pitch or zoom", async () => {
    const { WorldNavigationController, PITCH_BOUNDS, ZOOM_RANGES } = await import(
      "@/world/navigation/world-navigation"
    );
    const nav = new WorldNavigationController();
    nav.setTarget({ x: 0, y: -5, z: 0 }, true); // a target dragged below the floor
    for (let i = 0; i <= 12; i++) {
      const phi = PITCH_BOUNDS.min + (i / 12) * (PITCH_BOUNDS.max - PITCH_BOUNDS.min);
      for (const radius of [ZOOM_RANGES.ground.min, ZOOM_RANGES.local.defaultDistance, 58]) {
        nav.setSpherical({ phi, radius }, true);
        const cam = nav.update(0);
        if (Math.hypot(cam.x, cam.z) <= STUDIO_ISLAND_BOUND) {
          expect(cam.y).toBeGreaterThanOrEqual(WorldNavigationController.CAMERA_GROUND_CLEARANCE);
        }
      }
    }
  });

  it("lets the season choose the weather until the visitor picks one", async () => {
    const { resolveClimateWeather } = await import("@/world/life/climate-weather");
    const { REAL_SECONDS_PER_DAY, DAYS_PER_YEAR } = await import("@/world/life/world-clock");
    const scene = new OrraScene(800, 600);

    // Find a moment where the climate wants something other than clear, so the
    // assertion cannot pass just because the default preset happens to match.
    let t = -1;
    for (let day = 0; day < DAYS_PER_YEAR * 2; day += 0.25) {
      scene.worldClock.worldSeconds = day * REAL_SECONDS_PER_DAY;
      const w = scene.worldClock.getTime();
      if (resolveClimateWeather(day, w.seasonPhase, w.dayFraction) !== "clear") {
        t = day;
        break;
      }
    }
    expect(t).toBeGreaterThanOrEqual(0);
    const time = scene.worldClock.getTime();
    const want = resolveClimateWeather(t, time.seasonPhase, time.dayFraction);

    (scene as any).updateClimateWeather(time);
    expect(scene.getWeatherPresetName()).toBe(want);

    // Manual selection suspends the scheduler: the next tick must not undo it.
    scene.setWeatherPreset("clear");
    (scene as any).updateClimateWeather(time);
    expect(scene.getWeatherPresetName()).toBe("clear");
    expect(scene.isClimateWeatherEnabled()).toBe(false);
  });

  it("builds the same island every time: studio randomness is seeded", async () => {
    const { rand, resetRand } = await import("@/world/studio/rand");
    resetRand();
    const a = Array.from({ length: 64 }, rand);
    resetRand();
    const b = Array.from({ length: 64 }, rand);
    expect(a).toEqual(b);
    expect(new Set(a).size).toBe(64);
    expect(a.every((v) => v >= 0 && v < 1)).toBe(true);
  });
});
