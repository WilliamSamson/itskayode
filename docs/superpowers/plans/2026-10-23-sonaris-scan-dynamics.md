# SONARIS Scan Reconstruction & Mecanum Dynamics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the Scan Reconstruction workbench into a high-agency, visually stunning autonomous robotics mission simulator featuring real 4-wheel mecanum kinematics, synchronized obstacle-avoiding navigation, automated shadow gap-fill scanning, and zero UI bloat.

**Architecture:** Combine a pure mathematical mecanum kinematic solver and A* obstacle-free pathfinder with a synchronized Three.js 3D diorama. The rover executes coordinated multi-phase missions (`Drive -> Settle -> Tilt Sweep -> Map Fusion -> Evaluate`) with live wheel RPM, spinning laser optics, dynamic shadow detection, and room environments.

**Tech Stack:** Next.js 15, React 19, Three.js, Vitest, TypeScript.

**Spec:** SONARIS Autonomous Reconnaissance Rover Proposal (RPLIDAR S2 Tilting 2D LiDAR Mount, 127 mm Mecanum Quad, 12.8V LiFePO4 Bus).

## Global Constraints
- **NO LIVE DEPLOYMENTS**: Live deployments paused per explicit directive.
- **TARGETED TESTS ONLY**: Strictly run `npx vitest run tests/sonaris-*`, never whole-repo tests.
- **NO AI VIBE TROPES**: No Lucide icons, no emojis, no em-dashes, no double slashes `//`, no generic filler buttons (`Export CSV`, `Iso/Top/Front`).
- **LABORATORY PALETTE**: OLED Black `#000000`, Titanium `#2E3138`, Warm Stone `#E5E1D8`, Dark Ink `#111319`, Deep Red `#991F1F`, Warm Amber `#A87914`, Forest Green `#1F6B42`.
- **DEMAND-DRIVEN EFFICIENCY**: 0% idle GPU burn; wake render loop only during active animation or user interaction.

---

### Task 1: Mecanum Dynamics & Holonomic Motion Engine

**Files:**
- Modify: `src/lib/sonaris-coverage.ts`
- Test: `tests/sonaris-coverage.test.ts`

**Interfaces:**
- Consumes: `wheelSpeeds(vx, vy, yaw, radius, halfLength, halfWidth)` from `@/lib/sonaris-engine`.
- Produces: `MecanumKinematicState`, `calculateMecanumTrajectory(start, goal, obstacles, roomW, roomD)` returning parameterized time-series waypoints with position, heading, velocity, and individual 4-wheel RPMs.

- [ ] **Step 1: Write failing tests for kinematic trajectory generation**
- [ ] **Step 2: Implement collision-free trajectory with 4-wheel inverse kinematics**
- [ ] **Step 3: Run targeted vitest suite and verify tests pass**

---

### Task 2: Synchronized 3D Stage with Real Wheel Spin & Shadow Gap Cones

**Files:**
- Modify: `src/components/sonaris/workspace/scan-stage.tsx`
- Test: `tests/sonaris-scan-workbench.test.ts`

**Interfaces:**
- Consumes: `RoverPose`, `ScanObstacle[]`, `unmappedGaps`, `activeTrajectory`.
- Produces: 3D scene with:
  1. 4 individual mecanum wheel rotation about axles proportional to instantaneous wheel velocity.
  2. Chamfered matte titanium obstacle geometry casting real optical ray shadow cones.
  3. Continuous smooth path breadcrumb ribbon with waypoint nodes.
  4. 10 Hz spinning laser beam within tilting S2 optical head.
  5. Floor-click navigation raycaster with real-time waypoint route generation.

- [ ] **Step 1: Write failing tests asserting mecanum wheel mesh tracking and trajectory ribbon**
- [ ] **Step 2: Update `scan-stage.tsx` with wheel rotation, obstacle meshes, and interactive floor click**
- [ ] **Step 3: Verify with vitest and typecheck**

---

### Task 3: Decluttered, High-Agency Autonomous Mission HUD & Workbench

**Files:**
- Modify: `src/components/sonaris/workspace/scan-workbench.tsx`
- Modify: `src/components/sonaris/workspace/scan-workbench.module.css`
- Test: `tests/sonaris-scan-workbench.test.ts`

**Interfaces:**
- Consumes: Room presets (`Chamber`, `Depot`, `Divided Lab`), coverage analytics, trajectory solver.
- Produces:
  1. Clean 64px top bar: Room Environment Switcher (`Chamber` · `Depot` · `Divided Lab`), Display Toggle (`3D Diorama` · `Orthographic Slice`), and Primary Mission Controller (`Run Autonomous Survey` · `Single Sweep` · `Reset`).
  2. Elimination of bloat: removed "Export CSV", removed "Iso/Top/Front", removed manual clipping sliders.
  3. Live Telemetry HUD: Real-time 4-wheel RPM (`FL / FR / RL / RR`), perimeter coverage %, active mission state (`Transit Mecanum Nav` $\to$ `S2 Pitch Sweep` $\to$ `Map Merging`).
  4. Inspector HUD: Coverage Radar with shadow breakdown, Mecanum Actuation Telemetry, and RPLIDAR S2 Optical Specs.

- [ ] **Step 1: Write failing tests asserting removal of bloat and presence of coordinated mission telemetry**
- [ ] **Step 2: Implement unified workbench and CSS styling**
- [ ] **Step 3: Verify all 80+ tests pass with `npx vitest run tests/sonaris-*` and `npm run typecheck`**
