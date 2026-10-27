# SONARIS Rover Autonomous Architecture: World-Agnostic Adaptation Engine

> "We do not build the rover to fit the world; we build the rover to perceive, understand, and adapt to any arbitrary world it enters."

The SONARIS autonomous rover operates under the fundamental robotics principle of **zero prior assumptions**. The rover does not cheat by reading hardcoded room boundaries or ground-truth obstacle arrays. Instead, it enters an unmapped void, senses physical geometry through its sensor payload, models traversability constraints, and navigates deterministically.

---

## 1. Environmental Factors Considered & Managed

When placed in an arbitrary terrain, the rover continuously classifies and adapts to the following physical factors:

| Physical Factor | Rover Classification | Sensor Interpretation & Action |
|---|---|---|
| **Negative Obstacles (Pits / Voids / Floor Drops)** | Lethal Hazard | Measured via $-16^\circ$ downward S2 LiDAR pitch. If ground intercept drop $> 35\,\text{mm}$ (wheel climb threshold), flagged as non-traversable void. |
| **Ground Incline & Slope** | Traversable Ramp vs Tipping Risk | IMU attitude + elevation gradient. Slopes $< 18^\circ$ are navigated with pitch/roll attitude compensation; steeper inclines trigger detours. |
| **Low-Step Obstacles (< 35mm)** | Rollable Step | Climbed directly by $100\,\text{mm}$ Mecanum wheels without invoking global replanning. |
| **Rigid Vertical Obstacles (> 35mm)** | Lethal Inscribed Obstacle | Ingested into 2D Costmap layer; inflated by safety footprint radius ($0.28\,\text{m}$) for collision-free Theta* bypass. |
| **High Overhangs / Shelves (> 0.65m)** | Free Ground / Elevated Feature | S2 LiDAR at 3D tilt maps the geometry into vertical height bins, but costmap projects clear ground for chassis clearance. |
| **Low Overhangs (0.28m - 0.65m)** | Clearance Hazard | S2 LiDAR detects collision with rover mast/chassis; flagged as lethal obstacle. |
| **Wheel Slip & Surface Friction** | Kinematic Anisotropy | Anisotropic roller friction ($\eta_{\text{lateral}} \approx 0.78$) compensated in body-frame velocity feedforward. |

---

## 2. Rover Subsystem Pipeline

```
          [ Environment: Physical World (Unknown) ]
                             │
                             ▼
             [ S2 2D LiDAR (32 kHz DToF) ]
             [ ST3215 Actuator (Tilting) ]
             [ BNO085 9-DOF IMU (Attitude) ]
                             │
     ┌───────────────────────┴───────────────────────┐
     ▼                                               ▼
[ 0° Level In-Motion Mode ]              [ -30°..+60° Stationary Sweep ]
  │                                               │
  ▼                                               ▼
[ 2D Cartographer Scan Match ]           [ 3D Voxel Occupancy Cloud ]
[ Layered Costmap Engine ]               [ 16 Vertical Height Bins ]
  ├── Static Map Layer                   [ Frontier Gap Analysis ]
  ├── Observed Obstacle Layer
  ├── Hazard / Pit Drop Layer
  └── Inflation Layer (Cost Decay)
                 │
                 ▼
     [ Theta* Any-Angle Planner ]
     (Euclidean Shortest Path via Line-of-Sight)
                 │
                 ▼
     [ Regulated Pure Pursuit Controller ]
     (Adaptive lookahead + Arc collision guard)
                 │
                 ▼
     [ Mecanum Kinematic Decoupling ]
     (Body twist [Vx, Vy, ω] -> 4-wheel RPM vectors)
```

---

## 3. Directory Layout

```
src/sonaris/rover/
├── README.md               # Autonomy & world-adaptation architectural philosophy
├── index.ts                # Unified barrel exports
├── types.ts                # Core types (Pose, Twist, Costmap, Hazard, Traversability)
├── kinematics/             # Mecanum kinematics & roller slip compensation
│   └── mecanum-drive.ts
├── perception/             # S2 LiDAR interpretation, voxelization, hazard classification
│   └── hazard-analyzer.ts
├── costmap/                # Layered 2D costmap with exponential inflation decay
│   └── layered-costmap.ts
├── planning/               # Theta* any-angle global planner
│   └── theta-star-planner.ts
├── control/                # Regulated pure pursuit tracking controller
│   └── regulated-pure-pursuit.ts
└── mission/                # Mission state orchestrator & behavior flow
    └── mission-orchestrator.ts
```
