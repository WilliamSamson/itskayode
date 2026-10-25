# SONARIS Movement Dynamics & Studio Workspace Redesign Plan

**Goal:** Ground the SONARIS Scan Reconstruction workbench in the project's genuine engineering proposal and mathematical research (`14_SCAN_PERFORMANCE_MATHS_ALGORITHMS.md`, `01_PROJECT_DEFINITION.md`, `concept/anim/step-settle.html`, `anim/gap-aware.html`), removing unnecessary boilerplate (CSV exports, Iso/Top/Front buttons), and establishing fully synchronized 4-wheel holonomic mecanum dynamics with the 4-phase Step-and-Settle acquisition cycle and 15 cm vertical wall bin gap resolution.

---

## 1. Research & First Principles (from `/home/kayode-olalere/Codes/SONARIS`)

1. **Four-Wheel Mecanum Kinematics (X-Roller Configuration)**:
   - Wheels: $100\text{ mm}$ ($r = 0.05\text{ m}$), half-wheelbase $L_x = 0.17\text{ m}$, half-trackwidth $L_z = 0.14\text{ m}$.
   - Inverse Kinematics for forward velocity $v_x$, lateral strafe $v_z$, and yaw rate $\omega_y$:
     $$\omega_{\text{FL}} = \frac{1}{r}[v_x - v_z - (L_x + L_z)\omega_y]$$
     $$\omega_{\text{FR}} = \frac{1}{r}[v_x + v_z + (L_x + L_z)\omega_y]$$
     $$\omega_{\text{RL}} = \frac{1}{r}[v_x + v_z - (L_x + L_z)\omega_y]$$
     $$\omega_{\text{RR}} = \frac{1}{r}[v_x - v_z + (L_x + L_z)\omega_y]$$
   - In 3D stage: Each wheel model spins according to its exact signed $\omega$ RPM during transit.

2. **Step-and-Settle Operational Lifecycle**:
   - **`TRANSIT`**: Base in motion ($v \approx 0.25\text{ m/s}$), navigating around room obstacles. **LiDAR locked strictly horizontal ($\theta = 0^\circ$)** as an interlock, pulsing a planar green navigation slice for 2D SLAM.
   - **`SETTLE`**: Base reaches viewpoint; translational and rotational velocities drop to zero. Settle timer ($\sim 400\text{ ms}$) models chassis dampening before recording to eliminate motion blur.
   - **`TILT_RECORD`**: Base still ($v = 0$). Actuator tilts $-30^\circ \to +60^\circ$. Full 360° laser sweeps projected into 3D world space ($p_W = T_{WB} \cdot T_{BH} \cdot R_y(\theta) \cdot p_L$).
   - **`GAP_EVALUATE`**: System evaluates vertical wall height coverage ($16 \times 15\text{ cm}$ bins up to $2.4\text{ m}$) and occluded shadow cones cast by room obstacles. Solves for next-best-view pose $(x, z, \psi)$ and plans the next collision-free detour.

3. **Decluttering & Removal of Secondary Boilerplate**:
   - Remove `Download Point Cloud CSV` button from `scan-workbench.tsx`.
   - Remove `Iso`, `Top`, `Front` preset buttons from `assembly-workbench.tsx` and `scan-workbench.tsx`/`scan-stage.tsx`. OrbitControls handle 3D perspective naturally.
   - Match the calm Studio visual language of 3D Architecture and Power Rails.

---

## 2. File Decomposition & Responsibilities

| File | Changes |
|---|---|
| `src/lib/sonaris-coverage.ts` | Refine mecanum trajectory generator, 16-bin vertical wall height quantization ($15\text{ cm}$ bins), obstacle shadow ray tracing, and step-and-settle state machine transitions. |
| `src/components/sonaris/workspace/scan-stage.tsx` | Synchronize 4-wheel mecanum rotation, enforce horizontal-only laser during transit, render obstacle shadow cones on floor, remove redundant `view` presets. |
| `src/components/sonaris/workspace/scan-workbench.tsx` | Declutter top toolbar, purge CSV download button and camera presets, integrate 4-phase step-and-settle sequence with live 15 cm bin wall telemetry and obstacle shadow advisor. |
| `src/components/sonaris/workspace/assembly-workbench.tsx` | Remove `Iso / Top / Front` camera buttons, preserving OrbitControls. |
| `tests/sonaris-scan-workbench.test.ts` | Update tests to assert removal of CSV export / camera presets and verify the step-and-settle lifecycle and 15 cm vertical binning. |
| `tests/sonaris-coverage.test.ts` | Add unit tests for 15 cm height bin evaluation and 4-wheel mecanum kinematics. |

---

## 3. Step-by-Step Implementation Tasks

### Task 1: Kinematics & Vertical Height Binning in `src/lib/sonaris-coverage.ts`
- Implement 16 wall height bins of $15\text{ cm}$ ($0\text{ to }2.4\text{ m}$) matching `anim/gap-aware.html`.
- Compute per-wall height bin coverage percentage and flag out-of-reach vs captured bins.
- Enforce accurate 4-wheel RPM calculation ($r=0.05\text{ m}, L_x=0.17\text{ m}, L_z=0.14\text{ m}$).
- Verify with tests in `tests/sonaris-coverage.test.ts`.

### Task 2: Declutter `assembly-workbench.tsx`
- Remove the `Iso / Top / Front` button group in `src/components/sonaris/workspace/assembly-workbench.tsx`.
- Keep OrbitControls as the natural inspection method.

### Task 3: Refactor `scan-stage.tsx` for Synchronized Movements
- Remove `view` prop (`isometric`, `top`, `front`) and let OrbitControls manage the viewport.
- Synchronize 4-wheel individual rotation during transit using `wheelRPMs`.
- When in `transit`, clamp tilt head to $0^\circ$ level and show green 2D SLAM slice.
- When in `tilt_record`, tilt head through actual angle $\theta$ and show 3D point cloud slices.

### Task 4: Declutter & Redesign `scan-workbench.tsx`
- Remove CSV download button and camera angle presets.
- Top toolbar: Clean room selector (`Benchmark Chamber`, `Logistics Depot`, `Divided Lab`), display mode (`3D Cloud`, `Split Twin`), and action button (`Autonomous Survey` / `Halt` / `Reset`).
- Inspector Tabs:
  - Tab 1: **Acquisition Dynamics** (4-phase Step-and-Settle state indicator, 4-wheel mecanum RPM gauges, tilt position).
  - Tab 2: **Gap & Shadow Analysis** (16 wall height bins diagram matching `gap-aware.html`, obstacle shadow cones, next-best-view advisor).
  - Tab 3: **Subsystem Specifications** (Slamtec S2 DTOF specs, ST3215 actuator).

### Task 5: Verification & Tests
- Update `tests/sonaris-scan-workbench.test.ts` to reflect removed CSV/camera buttons and added vertical binning.
- Run `npx vitest run tests/sonaris-*` to ensure all tests pass.
- Run `npm run typecheck` to verify strict TypeScript compliance.
