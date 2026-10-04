import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { createAdvancedTechLab, LAB_BOUNDS, LAB_Z_SHIFT } from "@/world/studio/advanced-tech-lab";
import { STUDIO_STATIONS } from "@/world/studio/stations";
import { overIsland } from "@/world/weather/weather-domain";
import { SmartGrassExclusionRegistry } from "@/world/studio/terrain/smart-grass-exclusion";

const oldRooms = [
  "product-hub", "organogram-desk", "social-media-desk",
  "business-ops-desk", "growth-desk", "user-research-desk",
];

describe("merged north-wing advanced tech lab", () => {
  it("uses a narrow approach to a detached lab footprint within the island", () => {
    const approachLength = LAB_BOUNDS.corridorStart - LAB_BOUNDS.south;
    const buildingWidth = LAB_BOUNDS.east - LAB_BOUNDS.west;
    expect(approachLength).toBeCloseTo((44 - 2.3) * 0.8 * 0.8, 5);
    expect(LAB_Z_SHIFT).toBeCloseTo(15.012, 5);
    expect(LAB_BOUNDS.corridorWidth).toBeLessThan(buildingWidth / 5);
    expect(LAB_BOUNDS.south).toBeCloseTo(-28.988, 5);
    expect(LAB_BOUNDS.north).toBeLessThan(LAB_BOUNDS.south - 24);
    for (const x of [LAB_BOUNDS.west, LAB_BOUNDS.east]) {
      for (const z of [LAB_BOUNDS.south, LAB_BOUNDS.north]) {
        expect(overIsland(x, z, 1)).toBe(true);
      }
    }
  });

  it("keeps the narrow approach and building clear while lawn remains beside the walk", () => {
    const registry = new SmartGrassExclusionRegistry();
    for (const x of [-20, -3.15, 14]) {
      for (const z of [-32, -42, -52]) expect(registry.isPlantable(x, z)).toBe(false);
    }
    expect(registry.isPlantable(-3.15, -20)).toBe(false);
    expect(registry.isPlantable(8, -25)).toBe(true);
  });

  it("retires the six old stations in favor of one lab station", () => {
    for (const room of oldRooms) expect(room in STUDIO_STATIONS).toBe(false);
    expect(STUDIO_STATIONS["advanced-tech-lab"].label).toBe("Advanced Tech Lab");
    expect(STUDIO_STATIONS["advanced-tech-lab"].worldPosition[2]).toBeCloseTo(-40.988, 5);
  });

  it("features a 3-tier concentric pit with 3 visible heights, 3 magnetic rings, and subtle grid connection", () => {
    const lab = createAdvancedTechLab();
    const names: string[] = [];
    lab.group.traverse((object) => names.push(object.name));

    // Floating ceiling light fixtures are gone
    expect(names).not.toContain("lab-ceiling-linear-light");
    expect(names).not.toContain("light-rail");

    // 3 Concentric Stepped Pit Rings & Heights (visible depth)
    expect(names).toContain("sunken-containment-well");
    expect(names).toContain("pit-containment-bezel");
    expect(names).toContain("pit-telemetry-hazard-ring");
    expect(names).toContain("pit-tier-1-outer-wall");
    expect(names).toContain("pit-tier-1-wall");
    expect(names).toContain("pit-tier-1-shelf");
    expect(names).toContain("pit-tier-2-wall");
    expect(names).toContain("pit-tier-2-shelf");
    expect(names).toContain("pit-tier-3-wall");
    expect(names).toContain("pit-tier-3-floor");
    expect(names).toContain("pit-subterranean-ladder");

    // 3 Distinct Visible Heights across the 3 Pit Tiers (Total 0.70m vertical drop)
    const rim = lab.group.getObjectByName("pit-containment-bezel")!;
    const shelf2 = lab.group.getObjectByName("pit-tier-2-shelf")!;
    const floor3 = lab.group.getObjectByName("pit-tier-3-floor")!;
    expect(rim.position.y).toBeCloseTo(0.55, 2);
    expect(shelf2.position.y).toBeCloseTo(0.12, 2);
    expect(floor3.position.y).toBeCloseTo(-0.15, 2);
    expect(rim.position.y).toBeGreaterThan(shelf2.position.y);
    expect(shelf2.position.y).toBeGreaterThan(floor3.position.y);

    // Year 3036 Cryogenic Quantum Power System with 3 rings at 3 distinct heights
    expect(names).toContain("cryogenic-quantum-power-machine");
    expect(names).toContain("superconducting-cryo-core");
    expect(names).toContain("cryo-vacuum-glass-containment");
    expect(names).toContain("magnetic-confinement-rings");
    expect(names).toContain("magnetic-ring-height-1");
    expect(names).toContain("magnetic-ring-height-2");
    expect(names).toContain("magnetic-ring-height-3");
    expect(names).toContain("corona-discharge-ring");

    const ring1 = lab.group.getObjectByName("magnetic-ring-height-1")!;
    const ring2 = lab.group.getObjectByName("magnetic-ring-height-2")!;
    const ring3 = lab.group.getObjectByName("magnetic-ring-height-3")!;
    expect(ring1.position.y).toBeLessThan(ring2.position.y);
    expect(ring2.position.y).toBeLessThan(ring3.position.y);
    expect(ring1.position.y).toBeCloseTo(0.30, 2);
    expect(ring2.position.y).toBeCloseTo(0.95, 2);
    expect(ring3.position.y).toBeCloseTo(1.60, 2);

    // Subtle, refined subterranean conduit run heading straight East to the wall
    expect(names).toContain("subtle-grid-conduit-run");
    expect(names).toContain("conduit-trace-east");
    expect(names).toContain("conduit-east-wall-interface");
    expect(names).toContain("deep-subterranean-feed-sleeve");

    // Rich Year 3036 Engineering Details & Quantum Flux Particles
    expect(names).toContain("cryo-isolation-damper-1");
    expect(names).toContain("core-central-emitter-filament");
    expect(names).toContain("cryo-coolant-manifold-pipe-1");
    expect(names).toContain("stator-pole-1-1");
    expect(names).toContain("porthole-conduit-east");
    expect(names).toContain("conduit-east-pressure-gauge-1");
    expect(names).toContain("lab-telemetry-console");
    expect(names).toContain("quantum-flux-particles");
    expect(names).toContain("flux-particle-1");

    // Light fixture comes from the glowing core, casting atmospheric illumination
    expect(lab.lights.length).toBe(1);
    const { group, bulb, light } = lab.lights[0];
    expect(bulb.material).toBeDefined();
    expect(light.intensity).toBeGreaterThan(0);
    expect(group.position.z).toBeCloseTo((LAB_BOUNDS.south + LAB_BOUNDS.north) / 2, 2);
  });

  it("updates cryogenic core respiration pulse and cleanly removes obsolete workbench controls", () => {
    const lab = createAdvancedTechLab();
    const light = lab.lights[0].light;
    const initialIntensity = light.intensity;

    const ring1 = lab.group.getObjectByName("magnetic-ring-height-1")!;
    const ring2 = lab.group.getObjectByName("magnetic-ring-height-2")!;

    const particle = lab.group.getObjectByName("flux-particle-1")!;
    const initialPosX = particle.position.x;

    lab.update(1200, 1 / 60);
    expect(light.intensity).not.toBe(initialIntensity);

    // Magnetic rings counter-rotate gracefully
    expect(ring1.rotation.y).toBeGreaterThan(0);
    expect(ring2.rotation.y).toBeLessThan(0);

    // Quantum flux particles orbit dynamically
    expect(particle.position.x).not.toBe(initialPosX);

    // Zero leftover bench controls on lab object
    expect("setBenchHeight" in lab).toBe(false);
  });

  it("houses Keel Gravimetric Stabilizer Mast and High-Vacuum Cryogenic Column with dynamic damping and antiphase respiration", () => {
    const lab = createAdvancedTechLab();
    const names: string[] = [];
    lab.group.traverse((object) => names.push(object.name));

    // 1. Keel Gravimetric Stabilizer Mast (West Architectural Wall)
    expect(names).toContain("keel-gravimetric-stabilizer-mast");
    expect(names).toContain("keel-stabilizer-base-plinth");
    expect(names).toContain("keel-stabilizer-pylon-left");
    expect(names).toContain("keel-stabilizer-pylon-right");
    expect(names).toContain("keel-stabilizer-vacuum-tube");
    expect(names).toContain("keel-stabilizer-reaction-mass");
    expect(names).toContain("keel-stabilizer-vernier-ring-1");
    expect(names).toContain("keel-stabilizer-vernier-ring-2");
    expect(names).toContain("keel-stabilizer-tie-rod-collar");

    const mast = lab.group.getObjectByName("keel-gravimetric-stabilizer-mast")!;
    expect(mast.position.x).toBeCloseTo(-20.0, 1);
    expect(mast.position.z).toBeCloseTo(-42.138, 2);

    const reactionMass = lab.group.getObjectByName("keel-stabilizer-reaction-mass")!;
    const initialMassY = reactionMass.position.y;

    // 2. High-Vacuum Cryogenic Column (Northwest Alcove)
    expect(names).toContain("high-vacuum-cryogenic-column");
    expect(names).toContain("cryo-column-base-stage");
    expect(names).toContain("cryo-column-mid-stage");
    expect(names).toContain("cryo-column-upper-stage");
    expect(names).toContain("cryo-column-iso-flange-1");
    expect(names).toContain("cryo-column-sight-collar");
    expect(names).toContain("cryo-column-luminescent-core");
    expect(names).toContain("cryo-coolant-feed-line-1");
    expect(names).toContain("cryo-coolant-feed-line-2");
    expect(names).toContain("cryo-coolant-floor-fitting");
    expect(names).toContain("cryo-column-bypass-valve");

    const cryoColumn = lab.group.getObjectByName("high-vacuum-cryogenic-column")!;
    expect(cryoColumn.position.x).toBeCloseTo(-13.0, 1);
    expect(cryoColumn.position.z).toBeCloseTo(-53.2, 1);

    // 3. Dynamic micro-motion & pulse test
    lab.update(2400, 1 / 60);
    expect(reactionMass.position.y).not.toBe(initialMassY);
  });

  it("features Dual Cryo-Stasis Pods, 6-DOF Robotic Arm, UAV Rover on Rotating Plinth, and Calibration Tool Station", () => {
    const lab = createAdvancedTechLab();
    const names: string[] = [];
    lab.group.traverse((object) => names.push(object.name));

    // 1. Dual Cryo-Stasis Pods (West Wall Bay)
    expect(names).toContain("twin-cryo-stasis-pods");
    expect(names).toContain("cryo-pod-bulkhead");
    expect(names).toContain("cryo-pod-1");
    expect(names).toContain("cryo-pod-2");
    expect(names).toContain("cryo-pod-canopy-1");
    expect(names).toContain("cryo-pod-canopy-2");
    expect(names).toContain("cryo-pod-glow-1");
    expect(names).toContain("cryo-pod-glow-2");
    expect(names).toContain("cryo-pod-latch-collar-1");
    expect(names).toContain("cryo-pod-umbilical-1");

    // Impressive Detailing & Architectural Sizing
    expect(names).toContain("cryo-subfloor-trench");
    expect(names).toContain("cryo-coolant-manifold");
    expect(names).toContain("cryo-purge-tank-1");
    expect(names).toContain("cryo-purge-tank-2");
    expect(names).toContain("cryo-diagnostic-console-1");
    expect(names).toContain("cryo-diagnostic-console-2");
    expect(names).toContain("cryo-vitals-display-1");
    expect(names).toContain("cryo-vitals-display-2");
    expect(names).toContain("cryo-canopy-defroster-grid-1");
    expect(names).toContain("cryo-cervical-headrest-1");
    expect(names).toContain("cryo-tilt-actuator-1");

    // Cryogenic Medical & Biostasis Pavilion Infrastructure (Quadrant Densification)
    expect(names).toContain("cryo-dewar-silo-1");
    expect(names).toContain("cryo-dewar-silo-2");
    expect(names).toContain("cryo-pumping-skid");
    expect(names).toContain("cryo-medical-console");
    expect(names).toContain("cryo-operator-stool");
    expect(names).toContain("cryo-vitrification-cart");
    expect(names).toContain("cryo-surgical-lamp");
    expect(names).toContain("cryo-reconditioning-chamber");
    expect(names).toContain("cryo-specimen-vault");
    expect(names).toContain("cryo-gantry-crane");
    expect(names).toContain("cryo-safety-station");

    // Verify pavilion extends eastward towards the center of the room (relative X >= 9.0 -> world X >= -10.5)
    const medConsoleObj = lab.group.getObjectByName("cryo-medical-console")!;
    expect(medConsoleObj.position.x).toBeGreaterThanOrEqual(9.0);

    const specimenVaultObj = lab.group.getObjectByName("cryo-specimen-vault")!;
    expect(specimenVaultObj.position.x).toBeGreaterThanOrEqual(7.5);

    const safetyStationObj = lab.group.getObjectByName("cryo-safety-station")!;
    expect(safetyStationObj.position.x).toBeGreaterThanOrEqual(9.0);

    const cryoPods = lab.group.getObjectByName("twin-cryo-stasis-pods")!;
    expect(cryoPods.position.x).toBeCloseTo(-19.5, 1);
    expect(cryoPods.position.z).toBeCloseTo(-34.5, 1);

    // Architectural Bulkhead scale verification (height >= 3.0m, width >= 3.4m)
    const cryoBulkheadMesh = lab.group.getObjectByName("cryo-pod-bulkhead") as THREE.Mesh;
    const cryoBulkheadBox = cryoBulkheadMesh.geometry as THREE.BoxGeometry;
    expect(cryoBulkheadBox.parameters.height).toBeGreaterThanOrEqual(3.0);
    expect(cryoBulkheadBox.parameters.depth).toBeGreaterThanOrEqual(3.4);

    // Pod spacing verification (generous separation >= 1.8m between pods)
    const cryoPod1 = lab.group.getObjectByName("cryo-pod-1")!;
    const cryoPod2 = lab.group.getObjectByName("cryo-pod-2")!;
    expect(Math.abs(cryoPod1.position.z - cryoPod2.position.z)).toBeGreaterThanOrEqual(1.8);

    // 2. Heavy-Duty Industrial 6-DOF Robotic Manipulator Arm (East Edge Gallery)
    expect(names).toContain("six-dof-robotic-arm");
    expect(names).toContain("robot-base-plinth");
    expect(names).toContain("robot-joint-1-turntable");
    expect(names).toContain("robot-joint-1-bearing-ring");
    expect(names).toContain("robot-joint-2-shoulder");
    expect(names).toContain("robot-joint-2-pivot-hub-left");
    expect(names).toContain("robot-counterbalance-cylinder");
    expect(names).toContain("robot-upper-arm");
    expect(names).toContain("robot-joint-3-elbow");
    expect(names).toContain("robot-joint-3-bearing-collar");
    expect(names).toContain("robot-forearm");
    expect(names).toContain("robot-joint-4-wrist-pitch");
    expect(names).toContain("robot-joint-4-trunnion");
    expect(names).toContain("robot-joint-5-wrist-roll");
    expect(names).toContain("robot-joint-5-bearing-flange");
    expect(names).toContain("robot-end-effector");
    expect(names).toContain("robot-gripper-finger-1");
    expect(names).toContain("robot-laser-scanner");
    expect(names).toContain("robot-sky-pointing-sensor");

    // High-End Industrial Detailing on Robotic Arm
    expect(names).toContain("robot-j2-servo-motor");
    expect(names).toContain("robot-j3-servo-motor");
    expect(names).toContain("robot-nitrogen-accumulator-1");
    expect(names).toContain("robot-nitrogen-accumulator-2");
    expect(names).toContain("robot-hydraulic-hardline");
    expect(names).toContain("robot-cylinder-clevis");
    expect(names).toContain("robot-specification-plate");
    expect(names).toContain("robot-gripper-actuator-1");
    expect(names).toContain("robot-wrist-pneumatic-manifold");

    // Curved Beveled Workstation Island around Robotic Arm Outer Ring
    expect(names).toContain("robot-workstation-island");
    expect(names).toContain("robot-workstation-base");
    expect(names).toContain("robot-workstation-countertop");
    expect(names).toContain("robot-workstation-beveled-edge");

    // Workstation Countertop Tools, Workpieces & Project Parts
    expect(names).toContain("workstation-tool-rack");
    expect(names).toContain("tool-module-laser-profilometer");
    expect(names).toContain("tool-module-vacuum-gripper");
    expect(names).toContain("tool-module-micro-spindle");
    expect(names).toContain("workstation-rotary-chuck");
    expect(names).toContain("workpiece-turbomachine-blisk");
    expect(names).toContain("workstation-parts-tray");
    expect(names).toContain("workstation-calibration-step-block");
    expect(names).toContain("workpiece-satellite-manifold");
    expect(names).toContain("workstation-diagnostic-slate");

    // Expanded Dense Workstation Tooling, Projects & Instruments
    expect(names).toContain("workstation-hand-tool-stand");
    expect(names).toContain("tool-digital-caliper");
    expect(names).toContain("workstation-avionics-harness");
    expect(names).toContain("workstation-fastener-carousel");
    expect(names).toContain("workpiece-stator-casing");
    expect(names).toContain("tool-inspection-microscope");
    expect(names).toContain("workpiece-reaction-wheel");
    expect(names).toContain("workstation-bench-power-supply");
    expect(names).toContain("workstation-estop-station");

    // Random ion thruster pedestal, standalone kiosk, and blue laser beam removed
    expect(names).not.toContain("robot-workpiece-pedestal");
    expect(names).not.toContain("workpiece-ion-thruster-core");
    expect(names).not.toContain("robot-control-kiosk");
    expect(names).not.toContain("robot-laser-beam");
    expect(names).not.toContain("robot-sky-beam");

    const robotArm = lab.group.getObjectByName("six-dof-robotic-arm")!;
    expect(robotArm.position.x).toBeCloseTo(10.5, 1);
    expect(robotArm.position.z).toBeCloseTo(-35.5, 1);

    // Elbow bent downwards (rotation.z >= 1.4)
    const elbow = lab.group.getObjectByName("robot-joint-3-elbow")!;
    expect(elbow.rotation.z).toBeGreaterThanOrEqual(1.4);

    // Verify calibrated industrial reach (upper arm height between 2.0m and 2.6m)
    const upperArmMesh = lab.group.getObjectByName("robot-upper-arm") as THREE.Mesh;
    const upperArmBox = upperArmMesh.geometry as THREE.BoxGeometry;
    expect(upperArmBox.parameters.height).toBeGreaterThanOrEqual(2.0);
    expect(upperArmBox.parameters.height).toBeLessThanOrEqual(2.6);

    // 3. Heavy Planetary Exploration Rover (3x Scale "AUTUPO" Architecture on Rotating Display Plinth)
    expect(names).toContain("rover-showcase-plinth");
    expect(names).toContain("rover-turntable");
    expect(names).toContain("rover-chassis");
    expect(names).toContain("rover-nose-cone");
    expect(names).toContain("rover-cockpit-canopy");
    expect(names).toContain("rover-central-hull");
    expect(names).toContain("rover-powertrain-bay");
    expect(names).toContain("rover-avionics-box");

    // 3x Scale chassis dimension verification
    const roverChassisMesh = lab.group.getObjectByName("rover-chassis") as THREE.Mesh;
    const roverChassisBox = roverChassisMesh.geometry as THREE.BoxGeometry;
    expect(roverChassisBox.parameters.width).toBeGreaterThanOrEqual(4.5);
    expect(roverChassisBox.parameters.depth).toBeGreaterThanOrEqual(1.6);

    // Advanced Edge & Subsystem Detailing (AUTUPO Finish)
    expect(names).toContain("rover-floodlights");
    expect(names).toContain("rover-fender-stays");
    expect(names).toContain("rover-hull-ribs");
    expect(names).toContain("rover-turbocharger-1");
    expect(names).toContain("rover-hydraulic-reservoir");
    expect(names).toContain("rover-steering-cylinder-left");

    // 4 Massive Planetary Holographic Wheel Stations
    expect(names).toContain("rover-wheel-1");
    expect(names).toContain("rover-wheel-4");
    expect(names).toContain("rover-wheel-shock-1");
    expect(names).toContain("rover-wheel-inner-bolt-ring-1");
    expect(names).toContain("rover-wheel-holographic-tread-1");
    expect(names).toContain("rover-wheel-holo-emitter-ring-1");
    expect(names).toContain("rover-wheel-mag-hub-1");
    expect(names).toContain("rover-wheel-holo-tread-chevron-1");
    expect(names).toContain("rover-wheel-footprint-field-1");

    // Verify 3x scale wheel tread radius (radius >= 0.7m, diameter >= 1.4m)
    const wheelTreadMesh = lab.group.getObjectByName("rover-wheel-holographic-tread-1") as THREE.Mesh;
    const wheelTreadGeom = wheelTreadMesh.geometry as THREE.CylinderGeometry;
    expect(wheelTreadGeom.parameters.radiusTop).toBeGreaterThanOrEqual(0.70);

    const roverPlinth = lab.group.getObjectByName("rover-showcase-plinth")!;
    expect(roverPlinth.position.x).toBeCloseTo(7.5, 1);
    expect(roverPlinth.position.z).toBeCloseTo(-49.2, 1);

    // 4. High-Tech Calibration Tool Station & Diagnostic Bay
    expect(names).toContain("calibration-tool-station");
    expect(names).toContain("tool-station-plinth");
    expect(names).toContain("tool-station-countertop");
    expect(names).toContain("tool-station-shadow-tray");
    expect(names).toContain("tool-station-diagnostic-screen");
    expect(names).toContain("tool-station-task-bar");

    const toolStation = lab.group.getObjectByName("calibration-tool-station")!;
    expect(toolStation.position.x).toBeCloseTo(-13.0, 1);
    expect(toolStation.position.z).toBeCloseTo(-29.6, 1);

    // 5. Procedural Animation Verification
    const turntable = lab.group.getObjectByName("rover-turntable")!;
    const initialTurntableRot = turntable.rotation.y;

    const shoulder = lab.group.getObjectByName("robot-joint-2-shoulder")!;
    const initialShoulderRot = shoulder.rotation.z;

    const cylinder = lab.group.getObjectByName("robot-counterbalance-cylinder")!;
    const initialCylinderRot = cylinder.rotation.z;

    lab.update(3000, 1 / 60);

    // Turntable rotates smoothly
    expect(turntable.rotation.y).not.toBe(initialTurntableRot);
    // Robot arm executes procedural joint articulation
    expect(shoulder.rotation.z).not.toBe(initialShoulderRot);
    // Counterbalance cylinder articulates dynamically with the shoulder
    expect(cylinder.rotation.z).not.toBe(initialCylinderRot);
  });

  it("features mid-north vehicle service bay and arrival corridor logistics infrastructure approaching center", () => {
    const lab = createAdvancedTechLab();
    const names: string[] = [];
    lab.group.traverse((object) => names.push(object.name));

    // Zone A: Mid-North Planetary Rover Service & Diagnostics Bay
    expect(names).toContain("vehicle-service-bay");
    expect(names).toContain("vehicle-charging-pylon");
    expect(names).toContain("vehicle-charging-boom");
    expect(names).toContain("vehicle-charging-cable");
    expect(names).toContain("vehicle-charging-kiosk");

    const pylon = lab.group.getObjectByName("vehicle-charging-pylon")!;
    expect(pylon.position.x).toBeCloseTo(6.8, 1);
    expect(pylon.position.z).toBeCloseTo(-43.2, 1);

    expect(names).toContain("vehicle-wheel-balancer");
    expect(names).toContain("vehicle-wheel-balancer-spindle");
    expect(names).toContain("vehicle-spare-wheel");
    expect(names).toContain("vehicle-spare-wheel-tread");
    expect(names).toContain("vehicle-balancer-slate");

    const balancer = lab.group.getObjectByName("vehicle-wheel-balancer")!;
    expect(balancer.position.x).toBeCloseTo(5.4, 1);
    expect(balancer.position.z).toBeCloseTo(-39.0, 1);

    expect(names).toContain("vehicle-tool-chests");
    expect(names).toContain("vehicle-work-mat");
    expect(names).toContain("vehicle-impact-wrench");
    expect(names).toContain("vehicle-torque-multiplier");
    expect(names).toContain("vehicle-hose-reel");

    const chests = lab.group.getObjectByName("vehicle-tool-chests")!;
    expect(chests.position.x).toBeCloseTo(6.2, 1);
    expect(chests.position.z).toBeCloseTo(-34.8, 1);

    expect(names).toContain("vehicle-diagnostic-trolley");
    expect(names).toContain("vehicle-diag-screen-upper");
    expect(names).toContain("vehicle-diag-screen-lower");
    expect(names).toContain("vehicle-diag-cable");

    const trolley = lab.group.getObjectByName("vehicle-diagnostic-trolley")!;
    expect(trolley.position.x).toBeCloseTo(3.6, 1);
    expect(trolley.position.z).toBeCloseTo(-36.5, 1);

    expect(names).toContain("vehicle-chassis-jacks");
    expect(names).toContain("vehicle-service-ramp-left");
    expect(names).toContain("vehicle-service-ramp-right");

    const jacks = lab.group.getObjectByName("vehicle-chassis-jacks")!;
    expect(jacks.position.x).toBeCloseTo(3.4, 1);
    expect(jacks.position.z).toBeCloseTo(-41.0, 1);

    expect(names).toContain("vehicle-fluid-service-skid");
    expect(names).toContain("vehicle-nitrogen-cylinders");

    const fluidSkid = lab.group.getObjectByName("vehicle-fluid-service-skid")!;
    expect(fluidSkid.position.x).toBeCloseTo(6.2, 1);
    expect(fluidSkid.position.z).toBeCloseTo(-31.2, 1);

    // Zone B: Glazed Arrival Corridor Infrastructure (Approaching Center)
    expect(names).toContain("corridor-vehicle-infrastructure");
    expect(names).toContain("corridor-guidance-tracks");
    expect(names).toContain("corridor-agv-tug");
    expect(names).toContain("corridor-service-kiosk");

    const agv = lab.group.getObjectByName("corridor-agv-tug")!;
    expect(agv.position.x).toBeCloseTo(LAB_BOUNDS.spineX, 1);
    expect(agv.position.z).toBeCloseTo(-16.5, 1);

    const kiosk = lab.group.getObjectByName("corridor-service-kiosk")!;
    expect(kiosk.position.x).toBeCloseTo(-1.45, 1);
    expect(kiosk.position.z).toBeCloseTo(-22.5, 1);

    // Spindle dynamic animation
    const spindle = lab.group.getObjectByName("vehicle-wheel-balancer-spindle")!;
    const initialRot = spindle.rotation.z;
    lab.update(1000, 1 / 60);
    expect(spindle.rotation.z).not.toBe(initialRot);
  });
});
