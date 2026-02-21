"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface TerraForgeProps {
    onCollect?: () => void;
}

interface Point {
    x: number;
    y: number;
}

type MineralType = "common" | "rare";

interface Mineral extends Point {
    id: string;
    value: number;
    type: MineralType;
    pulsePhase: number;
}

interface Robot extends Point {
    id: string;
    hp: number;
    maxHp: number;
    speed: number;
    rotation: number;
    radius: number;
    pulsePhase: number;
    isHitTimer: number; // For a white hit flash
}

type WeaponProjectileVariant = "slug" | "burst" | "rail" | "beam" | "prism";

interface Projectile extends Point {
    id: string;
    vx: number;
    vy: number;
    life: number;
    damage: number;
    type: "TURRET" | "LASER";
    rotation: number;
    radius: number;
    remainingHits: number;
    trail: number;
    glow: string;
    core: string;
    variant: WeaponProjectileVariant;
    hitBots: string[];
}

type DriveProfile = "precision" | "rally" | "race";

interface Telemetry {
    x: number;
    y: number;
    speed: number;
    range: number;
    score: number;
    minerals: number;
    hp: number;
    maxHp: number;
    boost: number;
    drift: number;
    boostActive: boolean;
    handbrake: boolean;
    driveProfile: DriveProfile;
    stabilityAssist: boolean;
    shieldActive: boolean;
}

const WORLD_HALF = 1800;
const TARGET_MINERALS = 24;
const SIM_FPS = 60;
const SHIELD_DURATION_SECONDS = 14;

const PHYSICS = {
    accelerationForward: 0.74,
    accelerationReverse: 0.42,
    maxSpeed: 9.8,
    boostMaxSpeed: 13.2,
    boostForce: 1.34,
    boostDrain: 1.7,
    boostRegen: 0.95,
    coastDrag: 0.986,
    engineDrag: 0.972,
    brakeDrag: 0.84,
    lateralGrip: 0.58,
    lateralGripDrift: 0.86,
    cornerDrag: 0.992,
    turnRate: 0.097,
    steerResponse: 0.22,
    throttleResponse: 0.18,
    collectRadius: 30,
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const wrapDelta = (value: number) => {
    if (value > WORLD_HALF) return value - WORLD_HALF * 2;
    if (value < -WORLD_HALF) return value + WORLD_HALF * 2;
    return value;
};

const DRIVE_PROFILE_ORDER: DriveProfile[] = ["precision", "rally", "race"];

const DRIVE_PROFILE_META: Record<
    DriveProfile,
    {
        code: string;
        label: string;
        maxSpeed: number;
        accel: number;
        grip: number;
        turn: number;
        brake: number;
        boost: number;
    }
> = {
    precision: {
        code: "P1",
        label: "Precision",
        maxSpeed: 0.98,
        accel: 0.94,
        grip: 1.2,
        turn: 0.92,
        brake: 1.05,
        boost: 0.94,
    },
    rally: {
        code: "R2",
        label: "Rally",
        maxSpeed: 1.06,
        accel: 1.02,
        grip: 0.96,
        turn: 1.05,
        brake: 0.97,
        boost: 1,
    },
    race: {
        code: "X3",
        label: "Race",
        maxSpeed: 1.15,
        accel: 1.11,
        grip: 0.88,
        turn: 1.12,
        brake: 0.89,
        boost: 1.14,
    },
};

const wrapWorld = (value: number) => {
    if (value > WORLD_HALF) return -WORLD_HALF;
    if (value < -WORLD_HALF) return WORLD_HALF;
    return value;
};

const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

const createMineral = (id: number): Mineral => {
    const isRare = Math.random() > 0.82;

    return {
        id: `mineral-${id}`,
        x: randomInRange(-WORLD_HALF, WORLD_HALF),
        y: randomInRange(-WORLD_HALF, WORLD_HALF),
        type: isRare ? "rare" : "common",
        value: isRare ? 3 : 1,
        pulsePhase: Math.random() * Math.PI * 2,
    };
};

// --- Upgrade System Types ---

type UpgradeType = "SPEED" | "VISION" | "EFFICIENCY" | "TURRET" | "LASER" | "ARMOR" | "CHASSIS";

interface Upgrade {
    id: string;
    type: UpgradeType;
    name: string;
    description: string;
    rarity: "common" | "rare" | "legendary";
    value: number; // Magnitude of effect (e.g. 0.1 for +10%)
}

type ModuleLevels = Record<UpgradeType, number>;

interface LootCrate extends Point {
    id: string;
    angle: number; // For floating animation
    itemType: "upgrade" | "health" | "shield";
    color: string;
}

interface PlacedModule {
    id: string;
    upgradeId: string;
    type: UpgradeType;
    gridX: number; // 0 to gridSize-1
    gridY: number; // 0 to gridSize-1
    rotation: number; // 0, 90, 180, 270
}

interface RoverStats {
    speedMultiplier: number;
    visionMultiplier: number;
    collectionMultiplier: number;
    efficiencyMultiplier: number;
    maxHp: number;
    turretFireRate: number;
    turretDamage: number;
    laserDamage: number;
}

interface WeaponChannelProfile {
    enabled: boolean;
    level: number;
    tierLabel: string;
    cooldownFrames: number;
    projectileSpeed: number;
    projectileLife: number;
    damage: number;
    volley: number;
    spread: number;
    tracking: number;
    radius: number;
    penetration: number;
}

interface WeaponProfile {
    turret: WeaponChannelProfile;
    laser: WeaponChannelProfile;
}

const AVAILABLE_UPGRADES: Upgrade[] = [
    { id: "speed-1", type: "SPEED", name: "Turbine Injection", description: "+15% Max Speed", rarity: "common", value: 0.15 },
    { id: "speed-2", type: "SPEED", name: "Ion Thrusters", description: "+25% Max Speed", rarity: "rare", value: 0.25 },
    { id: "vision-1", type: "VISION", name: "High-Beams", description: "+20% Vision Range", rarity: "common", value: 0.2 },
    { id: "vision-2", type: "VISION", name: "Lidar Array", description: "+35% Vision Range", rarity: "rare", value: 0.35 },
    { id: "eff-1", type: "EFFICIENCY", name: "Mining Laser", description: "+1 Fragment per node", rarity: "common", value: 1 },
    { id: "eff-2", type: "EFFICIENCY", name: "Auto-Harvester", description: "+2 Fragments per node", rarity: "rare", value: 2 },
    { id: "wpn-t1", type: "TURRET", name: "Auto-Turret Mk I", description: "Precision kinetic cannon with stable cadence.", rarity: "common", value: 1 },
    { id: "wpn-t2", type: "TURRET", name: "Twin-Link Turret", description: "Dual-volley ballistic system with improved tracking.", rarity: "rare", value: 1.5 },
    { id: "wpn-t3", type: "TURRET", name: "Rail Spiker", description: "High-velocity rail darts with penetration capability.", rarity: "legendary", value: 1.8 },
    { id: "wpn-l1", type: "LASER", name: "Phase Laser", description: "Focused energy beam tuned for forward interception.", rarity: "rare", value: 1 },
    { id: "wpn-l2", type: "LASER", name: "Prism Emitter", description: "Split-beam prism lattice with higher throughput and pierce.", rarity: "legendary", value: 1.35 },
    { id: "arm-1", type: "ARMOR", name: "Ablative Plating", description: "+40 Max Hull Integrity", rarity: "common", value: 40 },
    { id: "arm-2", type: "ARMOR", name: "Titanium Chassis", description: "+100 Max Hull Integrity", rarity: "rare", value: 100 },
    { id: "chs-1", type: "CHASSIS", name: "Strut Expander", description: "Increases rover physical dimensions and collision mass.", rarity: "common", value: 1 },
];

const UPGRADE_TYPE_META: Record<UpgradeType, { code: string; label: string; frame: string; glow: string }> = {
    SPEED: {
        code: "DYN",
        label: "Propulsion",
        frame: "border-primary/50 text-primary",
        glow: "from-primary/18",
    },
    VISION: {
        code: "VIS",
        label: "Sensorics",
        frame: "border-cyan-400/55 text-cyan-300",
        glow: "from-cyan-400/18",
    },
    EFFICIENCY: {
        code: "SYS",
        label: "Extraction",
        frame: "border-amber-400/60 text-amber-300",
        glow: "from-amber-400/18",
    },
    TURRET: {
        code: "WPN",
        label: "Ballistics",
        frame: "border-red-500/60 text-red-500",
        glow: "from-red-500/18",
    },
    LASER: {
        code: "WPN",
        label: "Directed Energy",
        frame: "border-fuchsia-500/60 text-fuchsia-400",
        glow: "from-fuchsia-500/18",
    },
    ARMOR: {
        code: "DEF",
        label: "Hull Integrity",
        frame: "border-emerald-500/60 text-emerald-400",
        glow: "from-emerald-500/18",
    },
    CHASSIS: {
        code: "BDY",
        label: "Superstructure",
        frame: "border-zinc-500/60 text-zinc-400",
        glow: "from-zinc-500/18",
    },
};

const UPGRADE_RARITY_META: Record<Upgrade["rarity"], { tag: string; color: string; dot: string; ring: string }> = {
    common: {
        tag: "COMMON",
        color: "text-zinc-300",
        dot: "bg-zinc-400",
        ring: "border-zinc-500/45",
    },
    rare: {
        tag: "RARE",
        color: "text-sky-300",
        dot: "bg-sky-400",
        ring: "border-sky-400/45",
    },
    legendary: {
        tag: "LEGENDARY",
        color: "text-amber-300",
        dot: "bg-amber-400",
        ring: "border-amber-400/55",
    },
};

const createModuleLevels = (): ModuleLevels => ({
    SPEED: 0,
    VISION: 0,
    EFFICIENCY: 0,
    TURRET: 0,
    LASER: 0,
    ARMOR: 0,
    CHASSIS: 0,
});

const getModuleLevels = (upgrades: Upgrade[]): ModuleLevels => {
    const levels = createModuleLevels();
    for (const upgrade of upgrades) {
        levels[upgrade.type] += 1;
    }
    return levels;
};

const getConstructionGridSize = (totalModuleLevels: number, chassisLevels: number) => {
    const minimum = 5;
    const densityTarget = 0.34;
    const requiredCells = Math.ceil(Math.max(totalModuleLevels, 1) / densityTarget);
    const moduleDrivenSize = Math.ceil(Math.sqrt(requiredCells));
    const growthFromChassis = Math.floor(chassisLevels / 2);
    return clamp(Math.max(minimum, moduleDrivenSize + growthFromChassis), 5, 9);
};

const getWeaponProfile = (levels: ModuleLevels, liveStats: RoverStats): WeaponProfile => {
    const turretLevel = levels.TURRET;
    const laserLevel = levels.LASER;

    const turretRateFactor = liveStats.turretFireRate * (1 + turretLevel * 0.12);
    const turretVolley = clamp(1 + Math.floor((turretLevel - 1) / 2), 1, 4);
    const turretProfile: WeaponChannelProfile = {
        enabled: turretLevel > 0,
        level: turretLevel,
        tierLabel: turretLevel >= 5 ? "Rail Array" : turretLevel >= 3 ? "Twin-Link" : "Kinetic Mk I",
        cooldownFrames: clamp(50 / Math.max(turretRateFactor, 0.6), 8, 50),
        projectileSpeed: 10.5 + turretLevel * 1.25,
        projectileLife: 52 + turretLevel * 8,
        damage: (0.85 + turretLevel * 0.34) * liveStats.turretDamage * (turretLevel >= 5 ? 1.16 : turretLevel >= 3 ? 1.08 : 1),
        volley: turretVolley,
        spread: clamp(0.12 - turretLevel * 0.012, 0.028, 0.12),
        tracking: clamp(0.64 + turretLevel * 0.06, 0.64, 0.96),
        radius: 4 + Math.min(turretLevel * 0.22, 1.9),
        penetration: turretLevel >= 6 ? 2 : turretLevel >= 4 ? 1 : 0,
    };

    const laserCadenceFactor = (1 + (liveStats.laserDamage - 1) * 0.34) * (1 + laserLevel * 0.08);
    const laserVolley = laserLevel >= 5 ? 3 : laserLevel >= 3 ? 2 : 1;
    const laserProfile: WeaponChannelProfile = {
        enabled: laserLevel > 0,
        level: laserLevel,
        tierLabel: laserLevel >= 5 ? "Prism Cascade" : laserLevel >= 3 ? "Phase Beam" : "Pulse Beam",
        cooldownFrames: clamp((18 - laserLevel * 1.15) / Math.max(laserCadenceFactor, 0.72), 5, 18),
        projectileSpeed: 20 + laserLevel * 2.2,
        projectileLife: 26 + laserLevel * 4.5,
        damage: (0.55 + laserLevel * 0.2) * liveStats.laserDamage,
        volley: laserVolley,
        spread: laserVolley > 1 ? clamp(0.09 - laserLevel * 0.008, 0.028, 0.09) : 0,
        tracking: clamp(0.78 + laserLevel * 0.03, 0.78, 0.95),
        radius: 8 + Math.min(laserLevel * 0.65, 4.5),
        penetration: clamp(Math.floor((laserLevel - 1) / 2), 0, 3),
    };

    return { turret: turretProfile, laser: laserProfile };
};


export function TerraForge({ onCollect }: TerraForgeProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const worldRef = useRef({
        position: { x: 0, y: 0 },
        velocity: { x: 0, y: 0 },
        rotation: 0,
    });

    const mineralsRef = useRef<Mineral[]>([]);
    const lootCratesRef = useRef<LootCrate[]>([]);
    const robotsRef = useRef<Robot[]>([]);
    const projectilesRef = useRef<Projectile[]>([]);
    const keysRef = useRef<Record<string, boolean>>({});
    const joystickInputRef = useRef<Point>({ x: 0, y: 0 });
    const viewportRef = useRef({ width: 0, height: 0, dpr: 1 });

    const rafRef = useRef<number | null>(null);
    const lastFrameTimeRef = useRef(0);
    const hudTickRef = useRef(0);
    const mineralIdRef = useRef(0);
    const robotIdRef = useRef(0);
    const projectileIdRef = useRef(0);
    const scoreRef = useRef(0);
    const robotSpawnTimerRef = useRef(100); // Start spawning soon
    const weaponCooldownsRef = useRef({ turret: 0, laser: 0 });
    const boostEnergyRef = useRef(100);
    const boostActiveRef = useRef(false);
    const handbrakeRef = useRef(false);
    const driftAmountRef = useRef(0);
    const controlStateRef = useRef({ steer: 0, throttle: 0 });
    const driveProfileRef = useRef<DriveProfile>("precision");
    const stabilityAssistRef = useRef(true);
    const touchActionsRef = useRef({ boost: false, brake: false });
    const hpRef = useRef(100);
    const shieldTimerRef = useRef(0);
    const collisionCooldownRef = useRef(0);
    const statsRef = useRef<RoverStats>({
        speedMultiplier: 1,
        visionMultiplier: 1,
        collectionMultiplier: 1,
        efficiencyMultiplier: 1,
        maxHp: 0,
        turretFireRate: 1,
        turretDamage: 1,
        laserDamage: 1,
    });
    const activeUpgradesRef = useRef<Upgrade[]>([]);
    const placedModulesRef = useRef<PlacedModule[]>([]);
    const showUpgradeUIRef = useRef(false);
    const showConstructionUIRef = useRef(false);
    const isPausedRef = useRef(false);

    const [rotationVisual, setRotationVisual] = useState(0);
    const [telemetry, setTelemetry] = useState<Telemetry>({
        x: 0,
        y: 0,
        speed: 0,
        range: 0,
        score: 0,
        minerals: TARGET_MINERALS,
        hp: 100,
        maxHp: 100,
        boost: 100,
        drift: 0,
        boostActive: false,
        handbrake: false,
        driveProfile: "precision",
        stabilityAssist: true,
        shieldActive: false,
    });
    const [stats, setStats] = useState<RoverStats>({
        speedMultiplier: 1,
        visionMultiplier: 1,
        collectionMultiplier: 1,
        efficiencyMultiplier: 1,
        maxHp: 0,
        turretFireRate: 1,
        turretDamage: 1,
        laserDamage: 1,
    });
    const [isGameOver, setIsGameOver] = useState(false);
    const isGameOverRef = useRef(false);
    const [isPaused, setIsPaused] = useState(false);

    // Default loadout
    const [activeUpgrades, setActiveUpgrades] = useState<Upgrade[]>([
        { id: "start-turret", type: "TURRET", name: "Auto-Turret Mk I", description: "Default ballistic defense system.", rarity: "common", value: 1 }
    ]);
    const [showUpgradeUI, setShowUpgradeUI] = useState(false);
    const [upgradeOptions, setUpgradeOptions] = useState<Upgrade[]>([]);
    const [showConstructionUI, setShowConstructionUI] = useState(false);
    const [pendingModule, setPendingModule] = useState<Upgrade | null>(null);
    const [pendingRotation, setPendingRotation] = useState(0); // 0 to 3 (* 90 deg)
    const [placedModules, setPlacedModules] = useState<PlacedModule[]>([
        { id: "mod-start-turret", upgradeId: "start-turret", type: "TURRET", gridX: 2, gridY: 2, rotation: 0 }
    ]);
    const [selectedWeaponModuleId, setSelectedWeaponModuleId] = useState<string | null>(null);

    const [logs, setLogs] = useState<string[]>([
        "> [SYSTEM] Rover_OS_v5.0 online",
        "> [MISSION] Harvest fragments from surface nodes",
    ]);

    const [isTouchDevice, setIsTouchDevice] = useState(false);
    const [isPortrait, setIsPortrait] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [driveProfile, setDriveProfile] = useState<DriveProfile>("precision");
    const [stabilityAssist, setStabilityAssist] = useState(true);
    const [touchActions, setTouchActions] = useState({ boost: false, brake: false });

    const [joystick, setJoystick] = useState({
        active: false,
        origin: { x: 0, y: 0 },
        current: { x: 0, y: 0 },
    });

    useEffect(() => {
        statsRef.current = stats;
    }, [stats]);

    useEffect(() => {
        activeUpgradesRef.current = activeUpgrades;
    }, [activeUpgrades]);

    useEffect(() => {
        placedModulesRef.current = placedModules;
    }, [placedModules]);

    useEffect(() => {
        showUpgradeUIRef.current = showUpgradeUI;
    }, [showUpgradeUI]);

    useEffect(() => {
        showConstructionUIRef.current = showConstructionUI;
    }, [showConstructionUI]);

    useEffect(() => {
        isPausedRef.current = isPaused;
    }, [isPaused]);

    useEffect(() => {
        driveProfileRef.current = driveProfile;
    }, [driveProfile]);

    useEffect(() => {
        stabilityAssistRef.current = stabilityAssist;
    }, [stabilityAssist]);

    useEffect(() => {
        touchActionsRef.current = touchActions;
    }, [touchActions]);

    useEffect(() => {
        if (!showUpgradeUI && !showConstructionUI && !isGameOver && !isPaused) return;
        setTouchActions({ boost: false, brake: false });
    }, [showUpgradeUI, showConstructionUI, isGameOver, isPaused]);

    useEffect(() => {
        const initial = Array.from({ length: TARGET_MINERALS }, () => {
            mineralIdRef.current += 1;
            return createMineral(mineralIdRef.current);
        });
        mineralsRef.current = initial;
    }, []);

    const cycleDriveProfile = () => {
        setDriveProfile((prev) => {
            const currentIndex = DRIVE_PROFILE_ORDER.indexOf(prev);
            const next = DRIVE_PROFILE_ORDER[(currentIndex + 1) % DRIVE_PROFILE_ORDER.length];
            const meta = DRIVE_PROFILE_META[next];
            setLogs((logLines) => [
                `> [DRIVE] Profile set: ${meta.label} // ${meta.code}`,
                ...logLines,
            ].slice(0, 4));
            return next;
        });
    };

    const toggleStabilityAssist = () => {
        setStabilityAssist((prev) => {
            const next = !prev;
            setLogs((logLines) => [
                `> [DRIVE] Stability assist ${next ? "ENGAGED" : "DISENGAGED"}`,
                ...logLines,
            ].slice(0, 4));
            return next;
        });
    };

    const setTouchAction = (action: "boost" | "brake", active: boolean) => {
        setTouchActions((prev) => {
            if (prev[action] === active) return prev;
            return { ...prev, [action]: active };
        });
    };

    const togglePause = () => {
        if (showUpgradeUIRef.current || showConstructionUIRef.current || isGameOverRef.current) return;

        setIsPaused((prev) => {
            const next = !prev;
            isPausedRef.current = next;

            if (next) {
                keysRef.current = {};
                joystickInputRef.current = { x: 0, y: 0 };
                setJoystick({ active: false, origin: { x: 0, y: 0 }, current: { x: 0, y: 0 } });
                setTouchActions({ boost: false, brake: false });
            }

            setLogs((logLines) => [
                `> [SYSTEM] ${next ? "PAUSE MODE ENGAGED" : "PAUSE MODE RELEASED"}`,
                ...logLines,
            ].slice(0, 4));

            return next;
        });
    };

    const triggerUpgradeUI = () => {
        const options: Upgrade[] = [];
        const pool = [...AVAILABLE_UPGRADES];
        for (let i = 0; i < 3; i++) {
            const idx = Math.floor(Math.random() * pool.length);
            const [selected] = pool.splice(idx, 1);
            if (!selected) continue;
            options.push(selected);
        }
        setUpgradeOptions(options);
        setShowUpgradeUI(true);
    };

    const applyUpgrade = (upgrade: Upgrade) => {
        setShowUpgradeUI(false);
        setSelectedWeaponModuleId(null);
        setPendingRotation(0);
        setPendingModule(upgrade);
        setShowConstructionUI(true);
    };

    const rotatePlacedWeaponModule = (moduleId: string) => {
        let rotatedType: UpgradeType | null = null;
        setPlacedModules((prev) => prev.map((mod) => {
            if (mod.id !== moduleId) return mod;
            if (mod.type !== "TURRET" && mod.type !== "LASER") return mod;
            rotatedType = mod.type;
            return { ...mod, rotation: (mod.rotation + 90) % 360 };
        }));

        if (rotatedType) {
            setSelectedWeaponModuleId(moduleId);
            setLogs((prev) => [
                `> [LAYOUT] ${rotatedType} mount rotated +90deg`,
                ...prev,
            ].slice(0, 4));
        }
    };

    const saveConstructionLayout = () => {
        setShowConstructionUI(false);
        setPendingModule(null);
        setPendingRotation(0);
        setSelectedWeaponModuleId(null);
        setLogs((prev) => [
            "> [LAYOUT] Construction blueprint saved. Mission resumed.",
            ...prev,
        ].slice(0, 4));
    };

    const confirmPlacement = (gridX: number, gridY: number, rotation: number) => {
        if (!pendingModule) return;
        if (placedModules.some((mod) => mod.gridX === gridX && mod.gridY === gridY)) return;

        const liveLevels = getModuleLevels(activeUpgradesRef.current);
        const projectedGridSize = getConstructionGridSize(
            Object.values(liveLevels).reduce((sum, level) => sum + level, 0) + 1,
            liveLevels.CHASSIS + (pendingModule.type === "CHASSIS" ? 1 : 0),
        );
        if (gridX < 0 || gridY < 0 || gridX >= projectedGridSize || gridY >= projectedGridSize) return;

        const upgrade = pendingModule;
        const nextModuleLevel = activeUpgradesRef.current.filter((entry) => entry.type === upgrade.type).length + 1;

        setActiveUpgrades((prev) => [...prev, upgrade]);
        setPlacedModules((prev) => [
            ...prev,
            {
                id: `mod-${Date.now()}`,
                upgradeId: upgrade.id,
                type: upgrade.type,
                gridX,
                gridY,
                rotation,
            }
        ]);

        setStats((prev) => {
            const next = { ...prev };
            if (upgrade.type === "SPEED") next.speedMultiplier += upgrade.value;
            if (upgrade.type === "VISION") next.visionMultiplier += upgrade.value;
            if (upgrade.type === "EFFICIENCY") {
                next.efficiencyMultiplier += upgrade.value;
                next.collectionMultiplier += Math.min(upgrade.value * 0.14, 0.35);
            }
            if (upgrade.type === "TURRET") {
                if (upgrade.id === "wpn-t2") {
                    next.turretFireRate += 0.62;
                    next.turretDamage += 0.22;
                } else if (upgrade.id === "wpn-t3") {
                    next.turretFireRate += 0.44;
                    next.turretDamage += 0.48;
                } else {
                    next.turretFireRate += 0.38;
                    next.turretDamage += 0.18;
                }
            }
            if (upgrade.type === "LASER") {
                if (upgrade.id === "wpn-l2") {
                    next.laserDamage += 0.78;
                } else {
                    next.laserDamage += 0.58;
                }
            }
            if (upgrade.type === "ARMOR") {
                next.maxHp += upgrade.value;
                hpRef.current = Math.min((100 + next.maxHp), hpRef.current + upgrade.value * 0.65);
            }
            if (upgrade.type === "CHASSIS") {
                next.maxHp += 18;
                next.collectionMultiplier += 0.06;
            }
            return next;
        });

        setPendingRotation(0);
        setPendingModule(null);
        setSelectedWeaponModuleId(null);

        setLogs((prev) => [
            `> [UPGRADE] Installed: ${upgrade.name} // ${upgrade.type} LV.${nextModuleLevel} // Continue layout edits, then Save.`,
            ...prev,
        ].slice(0, 4));
    };

    const restartGame = () => {
        hpRef.current = 100;
        scoreRef.current = 0;
        worldRef.current = { position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 }, rotation: 0 };
        robotsRef.current = [];
        lootCratesRef.current = [];
        projectilesRef.current = [];
        weaponCooldownsRef.current = { turret: 0, laser: 0 };
        boostEnergyRef.current = 100;
        boostActiveRef.current = false;
        handbrakeRef.current = false;
        shieldTimerRef.current = 0;
        collisionCooldownRef.current = 0;
        driftAmountRef.current = 0;
        controlStateRef.current = { steer: 0, throttle: 0 };
        driveProfileRef.current = "precision";
        stabilityAssistRef.current = true;
        touchActionsRef.current = { boost: false, brake: false };
        robotSpawnTimerRef.current = 100;
        mineralsRef.current = Array.from({ length: TARGET_MINERALS }, () => {
            mineralIdRef.current += 1;
            return createMineral(mineralIdRef.current);
        });
        setActiveUpgrades([
            { id: "start-turret", type: "TURRET", name: "Auto-Turret Mk I", description: "Default ballistic defense system.", rarity: "common", value: 1 }
        ]);
        setPlacedModules([
            { id: "mod-start-turret", upgradeId: "start-turret", type: "TURRET", gridX: 2, gridY: 2, rotation: 0 }
        ]);
        placedModulesRef.current = [{ id: "mod-start-turret", upgradeId: "start-turret", type: "TURRET", gridX: 2, gridY: 2, rotation: 0 }];
        setStats({
            speedMultiplier: 1,
            visionMultiplier: 1,
            collectionMultiplier: 1,
            efficiencyMultiplier: 1,
            maxHp: 0,
            turretFireRate: 1,
            turretDamage: 1,
            laserDamage: 1,
        });
        setLogs(["> [SYSTEM] Reboot complete. Systems online.", "> [MISSION] Harvest fragments from surface nodes"]);
        setDriveProfile("precision");
        setStabilityAssist(true);
        setTouchActions({ boost: false, brake: false });
        setIsPaused(false);
        isPausedRef.current = false;
        setPendingModule(null);
        setPendingRotation(0);
        setSelectedWeaponModuleId(null);
        setShowConstructionUI(false);

        isGameOverRef.current = false;
        setIsGameOver(false);
    };

    useEffect(() => {
        const updateDeviceState = () => {
            setIsTouchDevice(window.matchMedia("(pointer: coarse)").matches);
            setIsPortrait(window.innerHeight > window.innerWidth);
        };

        updateDeviceState();
        window.addEventListener("resize", updateDeviceState);
        return () => window.removeEventListener("resize", updateDeviceState);
    }, []);

    useEffect(() => {
        const onFullscreenChange = () => {
            const active = Boolean(document.fullscreenElement);
            setIsFullscreen(active);

            if (!active) {
                const orientation = window.screen.orientation as ScreenOrientation & {
                    unlock?: () => void;
                };
                orientation.unlock?.();
            }
        };

        document.addEventListener("fullscreenchange", onFullscreenChange);
        return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
    }, []);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "Escape"].includes(event.code)) {
                event.preventDefault();
            }

            if (!event.repeat && (event.code === "KeyP" || event.code === "Escape")) {
                togglePause();
                return;
            }

            if (isPausedRef.current) return;

            if (!event.repeat && event.code === "KeyQ") {
                cycleDriveProfile();
                return;
            }

            if (!event.repeat && event.code === "KeyE") {
                toggleStabilityAssist();
                return;
            }

            keysRef.current[event.code] = true;
        };

        const onKeyUp = (event: KeyboardEvent) => {
            keysRef.current[event.code] = false;
        };

        window.addEventListener("keydown", onKeyDown);
        window.addEventListener("keyup", onKeyUp);

        return () => {
            window.removeEventListener("keydown", onKeyDown);
            window.removeEventListener("keyup", onKeyUp);
        };
    }, []);

    const toggleImmersive = async () => {
        const container = containerRef.current;
        if (!container) return;

        const anyContainer = container as HTMLDivElement & {
            webkitRequestFullscreen?: () => Promise<void> | void;
        };

        const anyDocument = document as Document & {
            webkitExitFullscreen?: () => Promise<void> | void;
        };

        const orientation = window.screen.orientation as ScreenOrientation & {
            lock?: (orientation: "landscape" | "portrait" | "any") => Promise<void>;
            unlock?: () => void;
        };

        try {
            if (!document.fullscreenElement) {
                if (container.requestFullscreen) {
                    await container.requestFullscreen();
                } else if (anyContainer.webkitRequestFullscreen) {
                    await anyContainer.webkitRequestFullscreen();
                } else {
                    setLogs((prev) => [
                        "> [SYSTEM] Fullscreen not supported on this browser",
                        ...prev,
                    ].slice(0, 4));
                    return;
                }

                try {
                    await orientation.lock?.("landscape");
                } catch {
                    setLogs((prev) => [
                        "> [INFO] Landscape lock unavailable, fullscreen enabled",
                        ...prev,
                    ].slice(0, 4));
                }
            } else if (document.exitFullscreen) {
                await document.exitFullscreen();
                orientation.unlock?.();
            } else if (anyDocument.webkitExitFullscreen) {
                await anyDocument.webkitExitFullscreen();
                orientation.unlock?.();
            }
        } catch {
            setLogs((prev) => [
                "> [ERROR] Unable to toggle immersive mode",
                ...prev,
            ].slice(0, 4));
        }
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const resizeCanvas = () => {
            const width = container.clientWidth;
            const height = container.clientHeight;
            const dpr = window.devicePixelRatio || 1;

            canvas.width = Math.floor(width * dpr);
            canvas.height = Math.floor(height * dpr);
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;

            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            viewportRef.current = { width, height, dpr };
        };

        const drawScene = (time: number) => {
            const { width, height } = viewportRef.current;
            const rover = worldRef.current;
            const minerals = mineralsRef.current;

            ctx.clearRect(0, 0, width, height);

            const bgGradient = ctx.createLinearGradient(0, 0, width, height);
            bgGradient.addColorStop(0, "#060606");
            bgGradient.addColorStop(1, "#0f0f0f");
            ctx.fillStyle = bgGradient;
            ctx.fillRect(0, 0, width, height);

            const centerX = width / 2;
            const centerY = height / 2;
            const liveStats = statsRef.current;
            const visionConeRadius = 320 * liveStats.visionMultiplier;
            const visionConeHalfAngle = 0.5 + Math.min((liveStats.visionMultiplier - 1) * 0.18, 0.24);
            const proximityRadius = 80 + Math.min((liveStats.collectionMultiplier - 1) * 26, 24);

            const gridSize = 92;
            const offsetX = ((-rover.position.x % gridSize) + gridSize) % gridSize;
            const offsetY = ((-rover.position.y % gridSize) + gridSize) % gridSize;

            ctx.strokeStyle = "rgba(255,255,255,0.045)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (let x = offsetX; x < width; x += gridSize) {
                ctx.moveTo(x, 0);
                ctx.lineTo(x, height);
            }
            for (let y = offsetY; y < height; y += gridSize) {
                ctx.moveTo(0, y);
                ctx.lineTo(width, y);
            }
            ctx.stroke();

            // Start Lighting Layer
            ctx.save();
            ctx.globalCompositeOperation = "multiply";

            // Fog of War (Darkness)
            ctx.fillStyle = "#0a0a0a";
            ctx.fillRect(0, 0, width, height);

            // Headlamp Vision Cone
            ctx.globalCompositeOperation = "destination-out";
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, visionConeRadius, rover.rotation - visionConeHalfAngle, rover.rotation + visionConeHalfAngle);
            ctx.lineTo(centerX, centerY);

            // Proximity Light (Around rover)
            ctx.arc(centerX, centerY, proximityRadius, 0, Math.PI * 2);
            ctx.fill(); // Cut out darkness

            // Soften edges of light
            ctx.shadowColor = "white";
            ctx.shadowBlur = 40;
            ctx.stroke();
            ctx.restore();

            // Draw Visible Minerals Only
            minerals.forEach((mineral) => {
                const screenX = centerX + (mineral.x - rover.position.x);
                const screenY = centerY + (mineral.y - rover.position.y);

                // Simple culling
                if (screenX < -60 || screenX > width + 60 || screenY < -60 || screenY > height + 60) {
                    return;
                }

                // Check visibility (distance + angle)
                const dx = screenX - centerX;
                const dy = screenY - centerY;
                const dist = Math.hypot(dx, dy);
                const angle = Math.atan2(dy, dx);
                let angleDiff = angle - rover.rotation;
                // Normalize angle
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

                const inCone = dist < visionConeRadius && Math.abs(angleDiff) < (visionConeHalfAngle + 0.1);
                const inProximity = dist < (proximityRadius + 10);

                if (inCone || inProximity) {
                    const pulse = 1 + Math.sin(time * 0.004 + mineral.pulsePhase) * 0.2;
                    const radius = (mineral.type === "rare" ? 4.2 : 2.6) * pulse;

                    ctx.beginPath();
                    ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
                    // Brighter colors when illuminated
                    ctx.fillStyle = mineral.type === "rare" ? "#ff2222" : "#ffffff";
                    ctx.shadowBlur = mineral.type === "rare" ? 8 : 4; // Reduced glow
                    ctx.shadowColor = mineral.type === "rare" ? "#ff0000" : "#aaaaaa";
                    ctx.fill();
                    ctx.shadowBlur = 0;
                }
            });

            // Draw Loot Crates (Always visible / glowing)
            lootCratesRef.current.forEach(crate => {
                const screenX = centerX + (crate.x - rover.position.x);
                const screenY = centerY + (crate.y - rover.position.y);

                if (screenX > -50 && screenX < width + 50 && screenY > -50 && screenY < height + 50) {
                    ctx.save();
                    ctx.translate(screenX, screenY);
                    ctx.rotate(crate.angle + time * 0.002); // Rotate slowly

                    // Glow
                    ctx.shadowColor = crate.color || "#fbbf24";
                    ctx.shadowBlur = 20;

                    // Box
                    ctx.fillStyle = "#18181b"; // Zinc-950
                    ctx.fillRect(-14, -14, 28, 28);

                    // Border/Cross
                    ctx.strokeStyle = crate.color || "#fbbf24";
                    ctx.lineWidth = 2;
                    ctx.strokeRect(-14, -14, 28, 28);
                    ctx.beginPath();
                    ctx.moveTo(-14, -14); ctx.lineTo(14, 14);
                    ctx.moveTo(14, -14); ctx.lineTo(-14, 14);
                    ctx.stroke();

                    ctx.restore();
                }
            });

            // Draw Robots
            robotsRef.current.forEach(bot => {
                const screenX = centerX + (bot.x - rover.position.x);
                const screenY = centerY + (bot.y - rover.position.y);
                if (screenX > -50 && screenX < width + 50 && screenY > -50 && screenY < height + 50) {
                    ctx.save();
                    ctx.translate(screenX, screenY);
                    ctx.rotate(bot.rotation);

                    ctx.shadowColor = bot.isHitTimer > 0 ? "#ffffff" : "#ef4444";
                    ctx.shadowBlur = 15;

                    ctx.fillStyle = bot.isHitTimer > 0 ? "#ffffff" : "#450a0a";
                    ctx.beginPath();
                    // Sharp geometric shape
                    ctx.moveTo(bot.radius, 0);
                    ctx.lineTo(-bot.radius * 0.8, bot.radius * 0.8);
                    ctx.lineTo(-bot.radius * 0.5, 0);
                    ctx.lineTo(-bot.radius * 0.8, -bot.radius * 0.8);
                    ctx.closePath();
                    ctx.fill();

                    // Outline
                    ctx.strokeStyle = bot.isHitTimer > 0 ? "#ffffff" : "#ef4444";
                    ctx.lineWidth = 1.5;
                    ctx.stroke();

                    // HP Bar if damaged
                    if (bot.hp < bot.maxHp) {
                        ctx.rotate(-bot.rotation); // un-rotate for HP bar
                        ctx.fillStyle = "rgba(239, 68, 68, 0.4)"; // background red
                        ctx.fillRect(-12, -bot.radius - 12, 24, 3);
                        ctx.fillStyle = "#22c55e"; // green
                        ctx.fillRect(-12, -bot.radius - 12, 24 * (bot.hp / bot.maxHp), 3);
                    }

                    ctx.restore();
                }
            });

            // Draw Projectiles
            ctx.globalCompositeOperation = "screen";
            projectilesRef.current.forEach(p => {
                const screenX = centerX + (p.x - rover.position.x);
                const screenY = centerY + (p.y - rover.position.y);
                if (screenX > -50 && screenX < width + 50 && screenY > -50 && screenY < height + 50) {
                    ctx.save();
                    ctx.translate(screenX, screenY);
                    ctx.rotate(p.rotation);

                    ctx.shadowColor = p.glow;
                    ctx.shadowBlur = p.type === "LASER" ? 16 : 9;

                    ctx.strokeStyle = p.glow;
                    ctx.lineWidth = p.type === "LASER" ? 1.6 : 1.2;
                    ctx.beginPath();
                    ctx.moveTo(-p.trail, 0);
                    ctx.lineTo(0, 0);
                    ctx.stroke();

                    if (p.type === "TURRET") {
                        ctx.fillStyle = p.core;
                        if (p.variant === "rail") {
                            ctx.fillRect(-2, -p.radius * 0.25, 12, p.radius * 0.5);
                            ctx.fillRect(8, -1, 5, 2);
                        } else if (p.variant === "burst") {
                            ctx.beginPath();
                            ctx.moveTo(8, 0);
                            ctx.lineTo(0, p.radius * 0.9);
                            ctx.lineTo(-3, 0);
                            ctx.lineTo(0, -p.radius * 0.9);
                            ctx.closePath();
                            ctx.fill();
                        } else {
                            ctx.beginPath();
                            ctx.arc(2, 0, p.radius * 0.65, 0, Math.PI * 2);
                            ctx.fill();
                        }
                    } else {
                        if (p.variant === "prism") {
                            ctx.strokeStyle = "rgba(217,70,239,0.95)";
                            ctx.lineWidth = 2.6;
                            ctx.beginPath();
                            ctx.moveTo(-10, -2);
                            ctx.lineTo(12, -2);
                            ctx.moveTo(-10, 2);
                            ctx.lineTo(12, 2);
                            ctx.stroke();
                        }

                        ctx.fillStyle = p.core;
                        ctx.fillRect(-11, -1.4, 22, 2.8);
                        ctx.fillStyle = "rgba(255,255,255,0.92)";
                        ctx.fillRect(-7, -0.7, 14, 1.4);
                    }
                    ctx.restore();
                }
            });
            ctx.globalCompositeOperation = "source-over";

            // HUD / Scan Circle
            ctx.strokeStyle = "rgba(255,255,255,0.05)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(centerX, centerY, PHYSICS.collectRadius * statsRef.current.collectionMultiplier, 0, Math.PI * 2);
            ctx.stroke();

            // Player HP Bar (Bottom Center)
            const maxHp = 100 + statsRef.current.maxHp;
            const currentHp = clamp(hpRef.current, 0, maxHp);
            const barWidth = 160;
            const barHeight = 6;
            const barX = centerX - barWidth / 2;
            const barY = height - 30;

            const drawRoundedBar = (x: number, y: number, width: number, height: number, radius: number) => {
                const r = Math.min(radius, height / 2, width / 2);
                if (r <= 0) {
                    ctx.beginPath();
                    ctx.rect(x, y, width, height);
                    return;
                }
                ctx.beginPath();
                ctx.moveTo(x + r, y);
                ctx.arcTo(x + width, y, x + width, y + height, r);
                ctx.arcTo(x + width, y + height, x, y + height, r);
                ctx.arcTo(x, y + height, x, y, r);
                ctx.arcTo(x, y, x + width, y, r);
                ctx.closePath();
            };

            ctx.fillStyle = "rgba(0, 0, 0, 0.68)";
            ctx.fillRect(barX, barY, barWidth, barHeight);

            const hpPercent = clamp(currentHp / Math.max(maxHp, 1), 0, 1);
            if (hpPercent > 0.6) ctx.fillStyle = "#22c55e";
            else if (hpPercent > 0.3) ctx.fillStyle = "#eab308";
            else ctx.fillStyle = "#ef4444";

            ctx.shadowColor = ctx.fillStyle;
            ctx.shadowBlur = 8;
            ctx.fillRect(barX, barY, barWidth * hpPercent, barHeight);
            ctx.shadowBlur = 0;

            ctx.strokeStyle = "rgba(255,255,255,0.25)";
            ctx.lineWidth = 1;
            ctx.strokeRect(barX, barY, barWidth, barHeight);

            ctx.fillStyle = "rgba(255,255,255,0.88)";
            ctx.font = "8px monospace";
            ctx.textAlign = "center";
            ctx.fillText(`HULL ${Math.round(hpPercent * 100)}%`, centerX, barY - 6);

            // Boost Bar (shorter and centered under hull bar)
            const boostBarY = barY + barHeight + 4;
            const boostBarWidth = Math.floor(barWidth * 0.82);
            const boostBarX = centerX - boostBarWidth / 2;
            const boostPercent = clamp(boostEnergyRef.current / 100, 0, 1);
            const boostFillWidth = boostBarWidth * boostPercent;
            const boostRadius = barHeight / 2;
            const boostColor = boostActiveRef.current ? "#67e8f9" : "#06b6d4";

            ctx.fillStyle = "rgba(0, 0, 0, 0.68)";
            drawRoundedBar(boostBarX, boostBarY, boostBarWidth, barHeight, boostRadius);
            ctx.fill();

            ctx.fillStyle = boostColor;
            ctx.shadowColor = boostColor;
            ctx.shadowBlur = boostActiveRef.current ? 10 : 6;
            if (boostFillWidth > 0.5) {
                drawRoundedBar(boostBarX, boostBarY, boostFillWidth, barHeight, boostRadius);
                ctx.fill();
            }
            ctx.shadowBlur = 0;

            ctx.strokeStyle = "rgba(255,255,255,0.25)";
            drawRoundedBar(boostBarX, boostBarY, boostBarWidth, barHeight, boostRadius);
            ctx.stroke();

            ctx.fillStyle = "rgba(255,255,255,0.88)";
            ctx.fillText(`BOOST ${Math.round(boostPercent * 100)}%`, centerX, boostBarY + 16);
        };

        const loop = (time: number) => {
            const liveStats = statsRef.current;
            const activeUpgradesList = activeUpgradesRef.current;
            const moduleLevelsLive = getModuleLevels(activeUpgradesList);

            if (showUpgradeUIRef.current || showConstructionUIRef.current || isGameOverRef.current || isPausedRef.current) {
                // Pause physics but keep drawing
                lastFrameTimeRef.current = time;
                drawScene(time);
                rafRef.current = window.requestAnimationFrame(loop);
                return;
            }

            if (!lastFrameTimeRef.current) lastFrameTimeRef.current = time;
            const dt = Math.min((time - lastFrameTimeRef.current) / 16.6667, 2.2);
            lastFrameTimeRef.current = time;
            collisionCooldownRef.current = Math.max(0, collisionCooldownRef.current - dt);

            // Combat & Spawning Logic
            robotSpawnTimerRef.current += dt;
            const spawnThreshold = Math.max(80, 250 - (scoreRef.current * 0.5));
            if (robotSpawnTimerRef.current > spawnThreshold && robotsRef.current.length < 15 + Math.floor(scoreRef.current / 20)) {
                robotIdRef.current += 1;
                const angle = Math.random() * Math.PI * 2;
                const dist = 700 + Math.random() * 200;
                const hp = 3 + Math.floor(scoreRef.current / 30);
                robotsRef.current.push({
                    id: `bot-${robotIdRef.current}`,
                    x: wrapWorld(worldRef.current.position.x + Math.cos(angle) * dist),
                    y: wrapWorld(worldRef.current.position.y + Math.sin(angle) * dist),
                    hp,
                    maxHp: hp,
                    speed: 1.5 + Math.random() * 1.5 + (scoreRef.current / 200),
                    rotation: 0,
                    radius: 12 + Math.random() * 6,
                    pulsePhase: Math.random() * Math.PI * 2,
                    isHitTimer: 0
                });
                robotSpawnTimerRef.current = 0;
            }

            const rover = worldRef.current;
            const rawTurnInput = clamp(
                (keysRef.current.ArrowLeft || keysRef.current.KeyA ? 1 : 0) +
                (keysRef.current.ArrowRight || keysRef.current.KeyD ? -1 : 0) +
                (Math.abs(joystickInputRef.current.x) > 0.08 ? -joystickInputRef.current.x : 0),
                -1,
                1,
            );

            const rawThrottleInput = clamp(
                (keysRef.current.ArrowUp || keysRef.current.KeyW ? 1 : 0) +
                (keysRef.current.ArrowDown || keysRef.current.KeyS ? -1 : 0) +
                (Math.abs(joystickInputRef.current.y) > 0.08 ? joystickInputRef.current.y : 0),
                -1,
                1,
            );

            const driveMeta = DRIVE_PROFILE_META[driveProfileRef.current];
            const handbrakeInput = Boolean(keysRef.current.Space || keysRef.current.KeyX || touchActionsRef.current.brake);
            const boostInput = Boolean(keysRef.current.ShiftLeft || keysRef.current.ShiftRight || touchActionsRef.current.boost);
            handbrakeRef.current = handbrakeInput;

            const controls = controlStateRef.current;
            const steerLerp = 1 - Math.pow(1 - PHYSICS.steerResponse, dt);
            const throttleLerp = 1 - Math.pow(1 - PHYSICS.throttleResponse, dt);
            controls.steer += (rawTurnInput - controls.steer) * steerLerp;
            controls.throttle += (rawThrottleInput - controls.throttle) * throttleLerp;

            const boostActive = boostInput && controls.throttle > 0.12 && boostEnergyRef.current > 1 && !handbrakeInput;
            boostActiveRef.current = boostActive;

            if (boostActive) {
                boostEnergyRef.current = Math.max(0, boostEnergyRef.current - (PHYSICS.boostDrain * driveMeta.boost) * dt);
            } else {
                const regenRate = PHYSICS.boostRegen * (driveMeta.maxSpeed > 1 ? 0.96 : 1.08);
                boostEnergyRef.current = Math.min(100, boostEnergyRef.current + regenRate * dt);
            }

            const headingX = Math.sin(rover.rotation);
            const headingY = -Math.cos(rover.rotation);
            const rightX = Math.cos(rover.rotation);
            const rightY = Math.sin(rover.rotation);

            let forwardSpeed = rover.velocity.x * headingX + rover.velocity.y * headingY;
            let lateralSpeed = rover.velocity.x * rightX + rover.velocity.y * rightY;

            const maxCruiseSpeed = PHYSICS.maxSpeed * liveStats.speedMultiplier * driveMeta.maxSpeed;
            const maxSpeedWithBoost = PHYSICS.boostMaxSpeed * liveStats.speedMultiplier * driveMeta.maxSpeed;

            const throttleAccel = (controls.throttle >= 0 ? PHYSICS.accelerationForward : PHYSICS.accelerationReverse) * liveStats.speedMultiplier * driveMeta.accel;
            forwardSpeed += controls.throttle * throttleAccel * (boostActive ? PHYSICS.boostForce * driveMeta.boost : 1) * dt;

            if (Math.abs(controls.throttle) < 0.04) {
                forwardSpeed *= Math.pow(PHYSICS.coastDrag, dt);
            } else {
                forwardSpeed *= Math.pow(clamp(PHYSICS.engineDrag + (driveMeta.accel - 1) * 0.004, 0.94, 0.994), dt);
            }

            if (handbrakeInput) {
                forwardSpeed *= Math.pow(clamp(PHYSICS.brakeDrag * driveMeta.brake, 0.72, 0.96), dt);
            }

            const gripBase = handbrakeInput ? PHYSICS.lateralGripDrift : PHYSICS.lateralGrip;
            const assistGripFactor = stabilityAssistRef.current ? 1.12 : 0.9;
            const chassisGripFactor = 1 + Math.min(moduleLevelsLive.CHASSIS * 0.04, 0.16);
            const gripValue = clamp(gripBase * driveMeta.grip * assistGripFactor * chassisGripFactor, 0.38, 0.97);
            lateralSpeed *= Math.pow(gripValue, dt);

            const speedRatio = clamp(Math.abs(forwardSpeed) / Math.max(maxCruiseSpeed, 0.001), 0, 1);
            const steerAuthority = (1 - speedRatio * (stabilityAssistRef.current ? 0.52 : 0.36)) + (handbrakeInput ? 0.24 : 0);
            rover.rotation += controls.steer * PHYSICS.turnRate * driveMeta.turn * steerAuthority * dt * (forwardSpeed >= 0 ? -1 : -0.72);

            if (handbrakeInput && Math.abs(controls.steer) > 0.2 && Math.abs(forwardSpeed) > 1.2) {
                const driftInjection = 0.2 + ((1 - driveMeta.grip) * 0.25) + (stabilityAssistRef.current ? -0.04 : 0.08);
                lateralSpeed += controls.steer * driftInjection * dt * Math.sign(forwardSpeed || 1);
            }

            if (!handbrakeInput && stabilityAssistRef.current && Math.abs(forwardSpeed) > 1.5) {
                lateralSpeed *= Math.pow(0.9, dt * clamp(Math.abs(forwardSpeed) / 3, 0.8, 2.2));
            }

            if (!handbrakeInput && !stabilityAssistRef.current && Math.abs(controls.steer) > 0.42 && Math.abs(forwardSpeed) > 2) {
                lateralSpeed += controls.steer * 0.09 * dt * Math.sign(forwardSpeed || 1);
            }

            if (!handbrakeInput && Math.abs(controls.steer) > 0.08 && Math.abs(forwardSpeed) > 0.6) {
                const cornerDrag = stabilityAssistRef.current ? PHYSICS.cornerDrag + 0.001 : PHYSICS.cornerDrag - 0.001;
                forwardSpeed *= Math.pow(cornerDrag, dt);
            }

            const activeMaxSpeed = boostActive ? maxSpeedWithBoost : maxCruiseSpeed;
            forwardSpeed = clamp(forwardSpeed, -activeMaxSpeed * 0.55, activeMaxSpeed);
            const combinedSpeed = Math.hypot(forwardSpeed, lateralSpeed);
            if (combinedSpeed > activeMaxSpeed * 1.06) {
                const ratio = (activeMaxSpeed * 1.06) / combinedSpeed;
                forwardSpeed *= ratio;
                lateralSpeed *= ratio;
            }

            rover.velocity.x = headingX * forwardSpeed + rightX * lateralSpeed;
            rover.velocity.y = headingY * forwardSpeed + rightY * lateralSpeed;

            const currentSpeed = Math.hypot(rover.velocity.x, rover.velocity.y);
            driftAmountRef.current = clamp(
                Math.abs(lateralSpeed) / (Math.max(Math.abs(forwardSpeed), 0.35) + 0.7),
                0,
                1
            );

            rover.position.x = wrapWorld(rover.position.x + rover.velocity.x * dt);
            rover.position.y = wrapWorld(rover.position.y + rover.velocity.y * dt);

            let collected = 0;
            let scoreGain = 0;
            let rareHits = 0;

            const collectRadius = (PHYSICS.collectRadius * liveStats.collectionMultiplier) + Math.min(currentSpeed * 0.9, 7);
            mineralsRef.current = mineralsRef.current.filter((mineral) => {
                const dx = mineral.x - rover.position.x;
                const dy = mineral.y - rover.position.y;
                const distance = Math.hypot(dx, dy);

                if (distance < collectRadius) {
                    collected += 1;
                    scoreGain += mineral.value * liveStats.efficiencyMultiplier; // Efficiency boosts score? Or separate? 
                    // Let's say efficiency boosts score for now.
                    if (mineral.type === "rare") rareHits += 1;
                    return false;
                }

                return true;
            });

            // Crate Collision
            lootCratesRef.current = lootCratesRef.current.filter(crate => {
                const dx = crate.x - rover.position.x;
                const dy = crate.y - rover.position.y;
                const dist = Math.hypot(dx, dy);
                if (dist < 40) { // Crate collect radius
                    if (crate.itemType === "health") {
                        const maxHull = 100 + liveStats.maxHp;
                        hpRef.current = Math.min(maxHull, hpRef.current + 30);
                        scoreRef.current += 10;
                        setLogs(prev => [`> [SYSTEM] Hull integrity repaired (+30).`, ...prev].slice(0, 4));
                    } else if (crate.itemType === "shield") {
                        shieldTimerRef.current = SHIELD_DURATION_SECONDS * SIM_FPS;
                        scoreRef.current += 10;
                        setLogs(prev => [`> [SYSTEM] Deflector shield engaged (${SHIELD_DURATION_SECONDS}s).`, ...prev].slice(0, 4));
                    } else {
                        triggerUpgradeUI();
                    }
                    return false;
                }
                return true;
            });

            const shieldIsActive = shieldTimerRef.current > 0;

            // Robot AI & Player Collision
            let playerDamageTaken = 0;
            let boostRamKills = 0;
            robotsRef.current = robotsRef.current.filter((bot) => {
                if (bot.hp <= 0) {
                    if (Math.random() > 0.7 || bot.maxHp > 6) {
                        const dropRoll = Math.random();
                        let itemType: "upgrade" | "health" | "shield" = "upgrade";
                        let color = "#fbbf24"; // amber-400

                        if (dropRoll > 0.8) {
                            itemType = "shield";
                            color = "#22d3ee"; // cyan-400
                        } else if (dropRoll > 0.6) {
                            itemType = "health";
                            color = "#4ade80"; // green-400
                        }

                        lootCratesRef.current.push({
                            id: `crate-${bot.id}`,
                            x: bot.x,
                            y: bot.y,
                            angle: Math.random() * Math.PI * 2,
                            itemType,
                            color
                        });
                        setLogs(prev => [`> [COMBAT] Hostile neutralised. Supply drop recovered.`, ...prev].slice(0, 4));
                    } else {
                        scoreRef.current += 5;
                    }
                    return false;
                }

                // Move towards player
                let dx = rover.position.x - bot.x;
                let dy = rover.position.y - bot.y;
                if (dx > WORLD_HALF) dx -= WORLD_HALF * 2;
                if (dx < -WORLD_HALF) dx += WORLD_HALF * 2;
                if (dy > WORLD_HALF) dy -= WORLD_HALF * 2;
                if (dy < -WORLD_HALF) dy += WORLD_HALF * 2;

                const dist = Math.hypot(dx, dy);

                if (dist > 15) {
                    bot.rotation = Math.atan2(dy, dx);
                    bot.x = wrapWorld(bot.x + Math.cos(bot.rotation) * bot.speed * dt);
                    bot.y = wrapWorld(bot.y + Math.sin(bot.rotation) * bot.speed * dt);
                }

                if (bot.isHitTimer > 0) bot.isHitTimer -= dt;

                // Player Collision
                if (dist < bot.radius + 18 + (moduleLevelsLive.CHASSIS * 2)) {
                    const isBoostRam = boostActiveRef.current;
                    if (isBoostRam) {
                        boostRamKills += 1;
                        if (collisionCooldownRef.current <= 0.01 && !shieldIsActive) {
                            const boostSelfDamage = clamp(2.4 - moduleLevelsLive.CHASSIS * 0.24, 1, 2.4);
                            playerDamageTaken += boostSelfDamage;
                            collisionCooldownRef.current = 10;
                        }
                        scoreRef.current += 8;

                        if (Math.random() > 0.45 || bot.maxHp > 6) {
                            const dropRoll = Math.random();
                            let itemType: "upgrade" | "health" | "shield" = "upgrade";
                            let color = "#fbbf24"; // amber-400

                            if (dropRoll > 0.8) {
                                itemType = "shield";
                                color = "#22d3ee"; // cyan-400
                            } else if (dropRoll > 0.6) {
                                itemType = "health";
                                color = "#4ade80"; // green-400
                            }

                            lootCratesRef.current.push({
                                id: `crate-${bot.id}-ram-${Date.now()}`,
                                x: bot.x,
                                y: bot.y,
                                angle: Math.random() * Math.PI * 2,
                                itemType,
                                color
                            });
                        }
                        return false;
                    }

                    if (collisionCooldownRef.current <= 0.01 && !shieldIsActive) {
                        const baseCollisionDamage = 6 + (bot.maxHp * 0.45) + (currentSpeed * 0.28);
                        const chassisDamping = 1 - Math.min(moduleLevelsLive.CHASSIS * 0.08, 0.35);
                        playerDamageTaken += clamp(baseCollisionDamage * chassisDamping, 5, 11);
                        collisionCooldownRef.current = 18;
                    }
                    bot.x = wrapWorld(bot.x - Math.cos(bot.rotation) * 40);
                    bot.y = wrapWorld(bot.y - Math.sin(bot.rotation) * 40);
                }

                return true;
            });

            if (boostRamKills > 0) {
                setLogs((prev) => [
                    `> [COMBAT] Boost impact: ${boostRamKills} hostile${boostRamKills > 1 ? "s" : ""} neutralised`,
                    ...prev,
                ].slice(0, 4));
            }

            if (shieldTimerRef.current > 0) {
                shieldTimerRef.current = Math.max(0, shieldTimerRef.current - dt);
                playerDamageTaken = 0; // Shield blocks all hull damage
            }

            if (playerDamageTaken > 0) {
                const appliedDamage = Math.round(playerDamageTaken);
                hpRef.current -= appliedDamage;
                setLogs(prev => [`> [WARNING] HULL INTEGRITY COMPROMISED: -${appliedDamage} HP`, ...prev].slice(0, 4));
                if (hpRef.current <= 0 && !isGameOverRef.current) {
                    setLogs(prev => [`> [CRITICAL] SYSTEMS FAILING. OFFLINE.`, ...prev].slice(0, 4));
                    hpRef.current = 0;
                    isGameOverRef.current = true;
                    setIsGameOver(true);
                }
            }

            // Weapon Systems
            const weaponProfile = getWeaponProfile(moduleLevelsLive, liveStats);
            weaponCooldownsRef.current.turret -= dt;
            weaponCooldownsRef.current.laser -= dt;

            const visualRange = 560 * liveStats.visionMultiplier;
            const weaponHeadingX = Math.sin(rover.rotation);
            const weaponHeadingY = -Math.cos(rover.rotation);

            const visibleTargets = robotsRef.current
                .map((bot) => {
                    const dx = wrapDelta(bot.x - rover.position.x);
                    const dy = wrapDelta(bot.y - rover.position.y);
                    const dist = Math.hypot(dx, dy);
                    const alignment = (dx * weaponHeadingX + dy * weaponHeadingY) / Math.max(dist, 0.0001);
                    const inSight = dist < visualRange;
                    const botVx = Math.cos(bot.rotation) * bot.speed;
                    const botVy = Math.sin(bot.rotation) * bot.speed;
                    const threat = dist + bot.hp * 7;
                    return { bot, dx, dy, dist, alignment, inSight, botVx, botVy, threat };
                })
                .filter((target) => target.inSight);

            const liveGridSize = getConstructionGridSize(activeUpgradesList.length, moduleLevelsLive.CHASSIS);
            const chassisWidth = 30 + moduleLevelsLive.CHASSIS * 3.6;
            const chassisLength = 38 + moduleLevelsLive.CHASSIS * 4.4;
            const forwardAngle = Math.atan2(-Math.cos(rover.rotation), Math.sin(rover.rotation));

            const createMount = (module: PlacedModule) => {
                const nx = ((module.gridX + 0.5) / liveGridSize) - 0.5;
                const ny = ((module.gridY + 0.5) / liveGridSize) - 0.5;
                const offsetRight = nx * chassisWidth;
                const offsetForward = -ny * chassisLength;
                const x = rover.position.x + rightX * offsetRight + headingX * offsetForward;
                const y = rover.position.y + rightY * offsetRight + headingY * offsetForward;
                const angle = forwardAngle + ((module.rotation * Math.PI) / 180);
                return { x, y, angle, module };
            };

            const fallbackMount = {
                x: rover.position.x + headingX * 18,
                y: rover.position.y + headingY * 18,
                angle: forwardAngle,
                module: null as PlacedModule | null,
            };

            const turretModules = placedModulesRef.current.filter((module) => module.type === "TURRET");
            const laserModules = placedModulesRef.current.filter((module) => module.type === "LASER");
            const turretMounts = turretModules.length > 0 ? turretModules.map(createMount) : [fallbackMount];
            const laserMounts = laserModules.length > 0 ? laserModules.map(createMount) : [fallbackMount];

            if (weaponProfile.turret.enabled && weaponCooldownsRef.current.turret <= 0 && visibleTargets.length > 0) {
                const turretVariant: WeaponProjectileVariant = weaponProfile.turret.level >= 5
                    ? "rail"
                    : weaponProfile.turret.level >= 3
                        ? "burst"
                        : "slug";
                const fireMounts = turretMounts;
                const mountConeGate = Math.cos(0.62 - Math.min((weaponProfile.turret.tracking - 0.64) * 0.2, 0.18));
                let firedAnyTurret = false;

                for (const mount of fireMounts) {
                    const mountDirX = Math.cos(mount.angle);
                    const mountDirY = Math.sin(mount.angle);
                    const target = visibleTargets
                        .map((entry) => {
                            const dx = wrapDelta(entry.bot.x - mount.x);
                            const dy = wrapDelta(entry.bot.y - mount.y);
                            const dist = Math.hypot(dx, dy);
                            const alignment = (dx * mountDirX + dy * mountDirY) / Math.max(dist, 0.0001);
                            const threat = dist * (1.06 - alignment * 0.2) + entry.bot.hp * 7;
                            return { ...entry, dx, dy, dist, alignment, threat };
                        })
                        .filter((entry) => entry.alignment >= mountConeGate)
                        .sort((a, b) => a.threat - b.threat)[0];

                    if (!target) continue;

                    const leadTime = clamp(
                        (target.dist / Math.max(weaponProfile.turret.projectileSpeed, 0.001)) * weaponProfile.turret.tracking,
                        0.05,
                        1.2,
                    );
                    const baseAngle = Math.atan2(
                        target.dy + target.botVy * leadTime,
                        target.dx + target.botVx * leadTime,
                    );
                    for (let i = 0; i < weaponProfile.turret.volley; i++) {
                        const spreadOffset = weaponProfile.turret.volley === 1
                            ? 0
                            : (i - (weaponProfile.turret.volley - 1) / 2) * weaponProfile.turret.spread;
                        const shotAngle = baseAngle + spreadOffset;

                        projectileIdRef.current++;
                        projectilesRef.current.push({
                            id: `proj-t-${projectileIdRef.current}`,
                            x: mount.x,
                            y: mount.y,
                            vx: Math.cos(shotAngle) * weaponProfile.turret.projectileSpeed,
                            vy: Math.sin(shotAngle) * weaponProfile.turret.projectileSpeed,
                            rotation: shotAngle,
                            life: weaponProfile.turret.projectileLife,
                            damage: weaponProfile.turret.damage,
                            type: "TURRET",
                            radius: weaponProfile.turret.radius,
                            remainingHits: 1 + weaponProfile.turret.penetration,
                            trail: 10 + weaponProfile.turret.level * 1.8,
                            glow: weaponProfile.turret.level >= 5 ? "rgba(248,113,113,0.95)" : "rgba(251,191,36,0.9)",
                            core: weaponProfile.turret.level >= 5 ? "#fecaca" : "#fef08a",
                            variant: turretVariant,
                            hitBots: [],
                        });
                    }
                    firedAnyTurret = true;
                }

                if (firedAnyTurret) {
                    weaponCooldownsRef.current.turret = weaponProfile.turret.cooldownFrames;
                }
            }

            if (weaponProfile.laser.enabled && weaponCooldownsRef.current.laser <= 0 && visibleTargets.length > 0) {
                const laserVariant: WeaponProjectileVariant = weaponProfile.laser.level >= 4 ? "prism" : "beam";
                const fireMounts = laserMounts;
                const forwardGate = Math.cos(0.54 - Math.min((weaponProfile.laser.tracking - 0.78) * 0.24, 0.16));
                let firedAnyLaser = false;

                for (const mount of fireMounts) {
                    const mountDirX = Math.cos(mount.angle);
                    const mountDirY = Math.sin(mount.angle);
                    const target = visibleTargets
                        .map((entry) => {
                            const dx = wrapDelta(entry.bot.x - mount.x);
                            const dy = wrapDelta(entry.bot.y - mount.y);
                            const dist = Math.hypot(dx, dy);
                            const alignment = (dx * mountDirX + dy * mountDirY) / Math.max(dist, 0.0001);
                            return { ...entry, dx, dy, dist, alignment };
                        })
                        .filter((entry) => entry.alignment >= forwardGate)
                        .sort((a, b) => (b.alignment - a.alignment) || (a.dist - b.dist))[0];

                    if (!target) continue;

                    const targetAngle = Math.atan2(target.dy, target.dx);
                    const headingDelta = Math.atan2(
                        Math.sin(targetAngle - mount.angle),
                        Math.cos(targetAngle - mount.angle),
                    );
                    const baseAngle = mount.angle + clamp(headingDelta * weaponProfile.laser.tracking, -0.36, 0.36);
                    for (let i = 0; i < weaponProfile.laser.volley; i++) {
                        const spreadOffset = weaponProfile.laser.volley === 1
                            ? 0
                            : (i - (weaponProfile.laser.volley - 1) / 2) * weaponProfile.laser.spread;
                        const shotAngle = baseAngle + spreadOffset;

                        projectileIdRef.current++;
                        projectilesRef.current.push({
                            id: `proj-l-${projectileIdRef.current}`,
                            x: mount.x,
                            y: mount.y,
                            vx: Math.cos(shotAngle) * weaponProfile.laser.projectileSpeed,
                            vy: Math.sin(shotAngle) * weaponProfile.laser.projectileSpeed,
                            rotation: shotAngle,
                            life: weaponProfile.laser.projectileLife,
                            damage: weaponProfile.laser.damage,
                            type: "LASER",
                            radius: weaponProfile.laser.radius,
                            remainingHits: 1 + weaponProfile.laser.penetration,
                            trail: 16 + weaponProfile.laser.level * 2.4,
                            glow: weaponProfile.laser.level >= 4 ? "rgba(217,70,239,0.95)" : "rgba(232,121,249,0.9)",
                            core: weaponProfile.laser.level >= 4 ? "rgba(244,114,182,0.95)" : "rgba(253,242,248,0.95)",
                            variant: laserVariant,
                            hitBots: [],
                        });
                    }
                    firedAnyLaser = true;
                }

                if (firedAnyLaser) {
                    weaponCooldownsRef.current.laser = weaponProfile.laser.cooldownFrames;
                }
            }

            // Projectile Movement & Collision
            projectilesRef.current = projectilesRef.current.filter((p) => {
                p.life -= dt;
                if (p.life <= 0) return false;

                p.x = wrapWorld(p.x + p.vx * dt);
                p.y = wrapWorld(p.y + p.vy * dt);

                let shouldRemove = false;
                for (const bot of robotsRef.current) {
                    if (p.hitBots.includes(bot.id)) continue;

                    const dx = wrapDelta(bot.x - p.x);
                    const dy = wrapDelta(bot.y - p.y);
                    if (Math.hypot(dx, dy) < bot.radius + p.radius) {
                        bot.hp -= p.damage;
                        bot.isHitTimer = p.type === "LASER" ? 6 : 4;
                        p.hitBots.push(bot.id);
                        p.remainingHits -= 1;
                        p.damage *= p.type === "LASER" ? 0.82 : 0.9;

                        if (p.remainingHits <= 0) {
                            shouldRemove = true;
                        }
                        break;
                    }
                }

                if (p.hitBots.length > 12) {
                    p.hitBots.splice(0, p.hitBots.length - 12);
                }

                return !shouldRemove;
            });

            if (collected > 0) {
                scoreRef.current += scoreGain;

                while (mineralsRef.current.length < TARGET_MINERALS) {
                    mineralIdRef.current += 1;
                    mineralsRef.current.push(createMineral(mineralIdRef.current));
                }

                const rareTag = rareHits > 0 ? ` // rare:${rareHits}` : "";
                setLogs((prev) => [
                    `> [EXTRACT] +${scoreGain} data (${collected} nodes${rareTag})`,
                    ...prev,
                ].slice(0, 4));

                for (let i = 0; i < collected; i++) onCollect?.();
            }

            drawScene(time);

            hudTickRef.current += dt;
            if (hudTickRef.current >= 2) {
                hudTickRef.current = 0;
                const speedNow = Math.hypot(rover.velocity.x, rover.velocity.y);
                const rangeNow = Math.hypot(rover.position.x, rover.position.y);

                setRotationVisual(rover.rotation);
                setTelemetry({
                    x: rover.position.x,
                    y: rover.position.y,
                    speed: speedNow,
                    range: rangeNow,
                    score: scoreRef.current,
                    minerals: mineralsRef.current.length,
                    hp: hpRef.current,
                    maxHp: 100 + liveStats.maxHp,
                    boost: boostEnergyRef.current,
                    drift: driftAmountRef.current,
                    boostActive: boostActiveRef.current,
                    handbrake: handbrakeRef.current,
                    driveProfile: driveProfileRef.current,
                    stabilityAssist: stabilityAssistRef.current,
                    shieldActive: shieldTimerRef.current > 0,
                });
            }

            rafRef.current = window.requestAnimationFrame(loop);
        };

        resizeCanvas();
        window.addEventListener("resize", resizeCanvas);

        rafRef.current = window.requestAnimationFrame(loop);

        return () => {
            window.removeEventListener("resize", resizeCanvas);
            if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current);
        };
    }, [onCollect]);

    const headingDegrees = ((rotationVisual * 180 / Math.PI) % 360 + 360) % 360;
    const activeDriveMeta = DRIVE_PROFILE_META[telemetry.driveProfile];
    const moduleLevels = getModuleLevels(activeUpgrades);
    const totalModuleLevels = Object.values(moduleLevels).reduce((total, level) => total + level, 0);
    const roverGridSize = getConstructionGridSize(totalModuleLevels, moduleLevels.CHASSIS);
    const constructionGridSize = getConstructionGridSize(
        totalModuleLevels + (pendingModule ? 1 : 0),
        moduleLevels.CHASSIS + (pendingModule?.type === "CHASSIS" ? 1 : 0)
    );
    const roverCellPercent = 100 / roverGridSize;
    const constructionCellPercent = 100 / constructionGridSize;
    const weaponProfileDisplay = getWeaponProfile(moduleLevels, stats);
    const turretMountCount = weaponProfileDisplay.turret.enabled
        ? Math.max(1, placedModules.filter((module) => module.type === "TURRET").length)
        : 0;
    const laserMountCount = weaponProfileDisplay.laser.enabled
        ? Math.max(1, placedModules.filter((module) => module.type === "LASER").length)
        : 0;
    const turretCadence = weaponProfileDisplay.turret.enabled ? SIM_FPS / weaponProfileDisplay.turret.cooldownFrames : 0;
    const laserCadence = weaponProfileDisplay.laser.enabled ? SIM_FPS / weaponProfileDisplay.laser.cooldownFrames : 0;
    const turretDps = weaponProfileDisplay.turret.enabled
        ? turretCadence * weaponProfileDisplay.turret.damage * weaponProfileDisplay.turret.volley * turretMountCount
        : 0;
    const laserDps = weaponProfileDisplay.laser.enabled
        ? laserCadence * weaponProfileDisplay.laser.damage * weaponProfileDisplay.laser.volley * laserMountCount
        : 0;
    const speedKph = telemetry.speed * 18;
    const radarRange = 680;
    const roverPoint = worldRef.current.position;
    const radarBlips: Array<{ id: string; x: number; y: number; type: "crate" | "enemy" }> = [];

    for (const crate of lootCratesRef.current) {
        let dx = crate.x - roverPoint.x;
        let dy = crate.y - roverPoint.y;
        if (dx > WORLD_HALF) dx -= WORLD_HALF * 2;
        if (dx < -WORLD_HALF) dx += WORLD_HALF * 2;
        if (dy > WORLD_HALF) dy -= WORLD_HALF * 2;
        if (dy < -WORLD_HALF) dy += WORLD_HALF * 2;
        const dist = Math.hypot(dx, dy);
        if (dist > radarRange) continue;
        radarBlips.push({
            id: crate.id,
            x: clamp(dx / radarRange, -1, 1),
            y: clamp(dy / radarRange, -1, 1),
            type: "crate",
        });
    }

    for (const bot of robotsRef.current) {
        let dx = bot.x - roverPoint.x;
        let dy = bot.y - roverPoint.y;
        if (dx > WORLD_HALF) dx -= WORLD_HALF * 2;
        if (dx < -WORLD_HALF) dx += WORLD_HALF * 2;
        if (dy > WORLD_HALF) dy -= WORLD_HALF * 2;
        if (dy < -WORLD_HALF) dy += WORLD_HALF * 2;
        const dist = Math.hypot(dx, dy);
        if (dist > radarRange) continue;
        radarBlips.push({
            id: bot.id,
            x: clamp(dx / radarRange, -1, 1),
            y: clamp(dy / radarRange, -1, 1),
            type: "enemy",
        });
    }

    return (
        <div className="flex w-full flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                    <h3 className="text-xl font-heading font-black uppercase tracking-tighter text-white">
                        Terra Forge
                    </h3>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/35">
                        WASD steer // Shift boost // Space brake // Q profile // E assist // P or ESC pause
                    </p>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2">
                    <button
                        type="button"
                        onClick={toggleImmersive}
                        className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-[9px] font-black uppercase tracking-[0.2em] text-white/65 transition-all hover:border-primary/50 hover:text-white"
                    >
                        {isFullscreen ? "Exit Immersive" : "Immersive Landscape"}
                    </button>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-[9px] font-black uppercase tracking-[0.2em] text-white/50 md:gap-6 md:text-[10px]">
                <span className={telemetry.hp < 40 ? "text-red-400" : ""}>Hull {Math.ceil(telemetry.hp)}/{telemetry.maxHp}</span>
                <span>Range {Math.floor(telemetry.range)}m</span>
                <span>Speed {Math.round(speedKph)} km/h</span>
                <span>Score {telemetry.score.toString().padStart(3, "0")}</span>
                <span>Nodes {telemetry.minerals.toString().padStart(2, "0")}</span>
                <span>Modules L{totalModuleLevels.toString().padStart(2, "0")}</span>
                <span>Weapons T{moduleLevels.TURRET.toString().padStart(2, "0")} L{moduleLevels.LASER.toString().padStart(2, "0")}</span>
                <span className={isPaused ? "text-amber-300" : "text-white/45"}>{isPaused ? "Paused" : "Live"}</span>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="rounded-xl border border-amber-300/20 bg-amber-500/5 px-3 py-2">
                    <p className="text-[9px] font-black uppercase tracking-[0.22em] text-amber-200/90">
                        Ballistics · {weaponProfileDisplay.turret.enabled ? weaponProfileDisplay.turret.tierLabel : "Offline"}
                    </p>
                    <p className="mt-1 text-[9px] font-mono uppercase tracking-[0.16em] text-white/75">
                        DPS {turretDps.toFixed(1)} · MOUNTS {turretMountCount} · VOLLEY x{weaponProfileDisplay.turret.volley} · RATE {turretCadence.toFixed(2)}/s · PIERCE {1 + weaponProfileDisplay.turret.penetration}
                    </p>
                </div>
                <div className="rounded-xl border border-fuchsia-300/20 bg-fuchsia-500/5 px-3 py-2">
                    <p className="text-[9px] font-black uppercase tracking-[0.22em] text-fuchsia-200/90">
                        Energy · {weaponProfileDisplay.laser.enabled ? weaponProfileDisplay.laser.tierLabel : "Offline"}
                    </p>
                    <p className="mt-1 text-[9px] font-mono uppercase tracking-[0.16em] text-white/75">
                        DPS {laserDps.toFixed(1)} · MOUNTS {laserMountCount} · BEAMS x{weaponProfileDisplay.laser.volley} · RATE {laserCadence.toFixed(2)}/s · PIERCE {1 + weaponProfileDisplay.laser.penetration}
                    </p>
                </div>
            </div>

            <div
                ref={containerRef}
                className={cn(
                    "relative h-[360px] w-full overflow-hidden rounded-[2.5rem] border border-white/10 bg-black md:h-[460px]",
                    isTouchDevice ? "cursor-default" : "cursor-none"
                )}
            >
                <canvas
                    ref={canvasRef}
                    className="absolute inset-0 block h-full w-full"
                />

                <button
                    type="button"
                    aria-label={isPaused ? "Resume game" : "Pause game"}
                    onClick={togglePause}
                    className={cn(
                        "absolute right-4 top-4 z-30 flex h-9 w-9 items-center justify-center rounded-full border bg-black/60 backdrop-blur-sm transition-all md:right-6 md:top-6",
                        isPaused
                            ? "border-amber-300/65 text-amber-200 hover:border-amber-200"
                            : "border-white/20 text-white/75 hover:border-white/45 hover:text-white"
                    )}
                >
                    {isPaused ? (
                        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
                            <path d="M8 6v12l10-6z" />
                        </svg>
                    ) : (
                        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
                            <rect x="6" y="5" width="4" height="14" rx="1" />
                            <rect x="14" y="5" width="4" height="14" rx="1" />
                        </svg>
                    )}
                </button>

                <div
                    className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 perspective-[800px]"
                    style={{ transform: `translate(-50%, -50%) rotate(${rotationVisual}rad)` }}
                >
                    <div
                        className="relative transition-all duration-700 ease-out"
                        style={{
                            width: 48 + (moduleLevels.CHASSIS * 12),
                            height: 64 + (moduleLevels.CHASSIS * 16),
                            transformStyle: "preserve-3d",
                        }}
                    >
                        {/* SHIELD BUBBLE */}
                        {telemetry.shieldActive && (
                            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-300/60 bg-cyan-400/20 shadow-[0_0_40px_rgba(34,211,238,0.4)]"
                                style={{
                                    width: 140 + (moduleLevels.CHASSIS * 16),
                                    height: 140 + (moduleLevels.CHASSIS * 16),
                                    transform: "translate(-50%, -50%) translateZ(20px)"
                                }}
                            />
                        )}

                        {/* ROVER CHASSIS - 3D Box Construction */}

                        {/* Main Body Elevation Group */}
                        <div className="absolute inset-0" style={{ transform: "translateZ(10px)", transformStyle: "preserve-3d" }}>

                            {/* Top Deck */}
                            <div className={cn(
                                "absolute inset-0 z-20 rounded-md border border-white/10 transition-colors duration-500",
                                activeUpgrades.some(u => u.type === 'ARMOR') ? "bg-emerald-950 border-emerald-500/30" :
                                    activeUpgrades.length > 4 ? "bg-amber-900" :
                                        activeUpgrades.length > 2 ? "bg-blue-900" : "bg-zinc-900"
                            )}
                                style={{ transform: "translateZ(10px)", transformStyle: "preserve-3d" }}>

                                {/* Front Bumper & Grill */}
                                <div className="absolute top-[-2px] left-1/2 w-[85%] h-4 -translate-x-1/2 bg-zinc-950 rounded-t-lg border-x border-white/5" />

                                {/* Headlights */}
                                <div className="absolute top-0 left-[10%] w-[15%] h-2 bg-amber-100 rounded-sm shadow-[0_0_15px_rgba(253,230,138,0.8)] blur-[0.5px]" />
                                <div className="absolute top-0 right-[10%] w-[15%] h-2 bg-amber-100 rounded-sm shadow-[0_0_15px_rgba(253,230,138,0.8)] blur-[0.5px]" />

                                {/* Windshield */}
                                <div className="absolute top-3 left-1/2 w-[60%] h-6 -translate-x-1/2 bg-cyan-950/80 border border-cyan-400/30 rounded flex items-end justify-center pb-1 shadow-[0_0_10px_rgba(34,211,238,0.15)] backdrop-blur-sm">
                                    <div className="w-[80%] h-[1px] bg-cyan-400/20" />
                                </div>

                                {/* Engine/Rear Box */}
                                <div className="absolute bottom-2 left-1/2 w-8 h-5 -translate-x-1/2 bg-zinc-950 rounded border border-white/5 shadow-inner" />

                                {/* VISUAL UPGRADES: Placed Modules */}
                                {placedModules.map((mod) => (
                                    <div
                                        key={`game-mod-${mod.id}`}
                                        className="absolute flex items-center justify-center"
                                        style={{
                                            left: `${(mod.gridX / roverGridSize) * 100}%`,
                                            top: `${(mod.gridY / roverGridSize) * 100}%`,
                                            width: `${roverCellPercent}%`,
                                            height: `${roverCellPercent}%`,
                                            transform: `rotateZ(${mod.rotation}deg) translateZ(5px)`
                                        }}
                                    >
                                        {mod.type === "TURRET" && (
                                            <div className="flex h-4 w-4 items-center justify-center rounded-full border border-red-500/50 bg-zinc-950 shadow-[0_0_10px_rgba(239,68,68,0.3)]">
                                                <div className="absolute left-1/2 top-[-3px] h-3 w-1 -translate-x-1/2 border border-white/10 bg-zinc-700">
                                                    <div className="absolute left-0 top-0 h-[1px] w-full bg-red-400" />
                                                </div>
                                            </div>
                                        )}
                                        {mod.type === "LASER" && (
                                            <div className="flex h-2 w-4 items-center justify-center rounded-full border border-fuchsia-500/50 bg-zinc-950 shadow-[0_0_15px_rgba(217,70,239,0.5)]">
                                                <div className="absolute left-1/2 top-0 h-[120%] w-[1px] -translate-x-1/2 bg-fuchsia-400" />
                                                <div className="h-1 w-2 rounded-full bg-fuchsia-400" />
                                            </div>
                                        )}
                                        {mod.type === "VISION" && (
                                            <div className="relative h-3 w-3 animate-[spin_4s_linear_infinite] rounded-full border border-sky-400/50 bg-sky-900/80">
                                                <div className="absolute left-1/2 top-0 h-[60%] w-[1px] -translate-x-1/2 bg-sky-400/50" />
                                            </div>
                                        )}
                                        {mod.type === "ARMOR" && (
                                            <div className="h-full w-full rounded-sm border-2 border-emerald-500/40 bg-emerald-950/80" />
                                        )}
                                        {mod.type === "EFFICIENCY" && (
                                            <div className="h-1 w-[80%] rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
                                        )}
                                        {mod.type === "SPEED" && (
                                            <div className="h-2 w-3 rounded-sm border border-blue-400/60 bg-blue-500/70 shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
                                        )}
                                        {mod.type === "CHASSIS" && (
                                            <div className="h-3 w-3 rounded-sm border border-zinc-300/60 bg-zinc-500/60 shadow-[0_0_8px_rgba(161,161,170,0.45)]" />
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Sides (Simulated 3D Extrusion) */}
                            {/* Left Wall */}
                            <div className={cn(
                                "absolute left-0 top-0 bottom-0 w-[10px] origin-left border-y border-white/5 transition-colors duration-500",
                                activeUpgrades.some(u => u.type === 'ARMOR') ? "bg-emerald-900 border-emerald-500/30" :
                                    activeUpgrades.length > 4 ? "bg-amber-800" :
                                        activeUpgrades.length > 2 ? "bg-blue-800" : "bg-zinc-800"
                            )} style={{ transform: "rotateY(-90deg)" }}>
                            </div>
                            {/* Right Wall */}
                            <div className={cn(
                                "absolute right-0 top-0 bottom-0 w-[10px] origin-right border-y border-white/5 transition-colors duration-500",
                                activeUpgrades.some(u => u.type === 'ARMOR') ? "bg-emerald-900 border-emerald-500/30" :
                                    activeUpgrades.length > 4 ? "bg-amber-800" :
                                        activeUpgrades.length > 2 ? "bg-blue-800" : "bg-zinc-800"
                            )} style={{ transform: "rotateY(90deg)" }}>
                            </div>

                            {/* Rear Wall */}
                            <div className={cn(
                                "absolute bottom-0 left-0 right-0 h-[10px] origin-bottom flex items-center justify-center gap-1 border-x border-white/5 transition-colors duration-500",
                                activeUpgrades.some(u => u.type === 'ARMOR') ? "bg-emerald-900 border-emerald-500/30" :
                                    activeUpgrades.length > 4 ? "bg-amber-800" :
                                        activeUpgrades.length > 2 ? "bg-blue-800" : "bg-zinc-800"
                            )} style={{ transform: "rotateX(-90deg)" }}>
                                {activeUpgrades.some(u => u.type === "SPEED") ? (
                                    // Speed Thrusters
                                    <>
                                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
                                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse delay-75 shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
                                    </>
                                ) : (
                                    // Standard
                                    <>
                                        <div className="w-1.5 h-1.5 bg-orange-600 rounded-full animate-pulse" />
                                        <div className="w-1.5 h-1.5 bg-orange-600 rounded-full animate-pulse delay-75" />
                                    </>
                                )}
                            </div>
                            {/* Front Wall */}
                            <div className={cn(
                                "absolute top-0 left-0 right-0 h-[10px] origin-top flex items-center justify-center border-x border-white/5 transition-colors duration-500",
                                activeUpgrades.some(u => u.type === 'ARMOR') ? "bg-emerald-900 border-emerald-500/30" :
                                    activeUpgrades.length > 4 ? "bg-amber-800" :
                                        activeUpgrades.length > 2 ? "bg-blue-800" : "bg-zinc-800"
                            )} style={{ transform: "rotateX(90deg)" }}>
                            </div>

                            {/* VISUAL UPGRADE: Spoiler (Speed Level 2) */}
                            {activeUpgrades.filter(u => u.type === "SPEED").length > 1 && (
                                <div className="absolute -bottom-2 left-0 right-0 h-4 bg-zinc-900 border border-white/10"
                                    style={{ transform: "translateZ(12px) rotateX(-20deg)", transformOrigin: "bottom" }} />
                            )}
                        </div>


                        {/* Tracks / Wheels (Base Layer) */}
                        <div className="absolute -left-2 top-0 bottom-0 w-3 bg-zinc-900 border border-white/10"
                            style={{ transform: "translateZ(4px)" }}>
                            <div className="w-full h-full bg-[repeating-linear-gradient(0deg,transparent,transparent_3px,#000_4px)] opacity-50" />
                        </div>
                        <div className="absolute -right-2 top-0 bottom-0 w-3 bg-zinc-900 border border-white/10"
                            style={{ transform: "translateZ(4px)" }}>
                            <div className="w-full h-full bg-[repeating-linear-gradient(0deg,transparent,transparent_3px,#000_4px)] opacity-50" />
                        </div>

                        {/* Shadow */}
                        <div className="absolute inset-0 bg-black/60 blur-md rounded-full scale-125" style={{ transform: "translateZ(0px)" }} />
                    </div>
                </div>

                <div className="pointer-events-none absolute left-4 top-4 z-20 flex flex-col gap-1 drop-shadow-md md:left-6 md:top-6">
                    <div className="flex items-center gap-2">
                        <p className="text-[8px] font-black uppercase tracking-[0.28em] text-white/40">NAV</p>
                        <span className="text-[8px] font-mono text-primary/80">{headingDegrees.toFixed(0).padStart(3, "0")}°</span>
                    </div>
                    <div className="flex gap-3 text-[8px] uppercase tracking-[0.18em]">
                        <span className="font-mono text-white/70">X {Math.floor(telemetry.x).toString().padStart(5, "0")}</span>
                        <span className="font-mono text-white/70">Y {Math.floor(telemetry.y).toString().padStart(5, "0")}</span>
                    </div>
                </div>

                <div className="pointer-events-none absolute right-14 top-4 z-20 flex flex-col items-end gap-1 drop-shadow-md md:right-16 md:top-6">
                    <div className="flex items-center gap-2">
                        <p className="text-[8px] font-black uppercase tracking-[0.28em] text-white/40">VEL</p>
                        <span className="text-[8px] font-mono text-white/85">{Math.round(speedKph)} km/h</span>
                    </div>
                    <div className="flex gap-3 text-[8px] uppercase tracking-[0.18em]">
                        <span className={cn("font-mono", telemetry.boostActive ? "text-cyan-300" : "text-white/70")}>BST {Math.round(telemetry.boost)}%</span>
                        <span className="font-mono text-white/70">TRC {Math.round((1 - telemetry.drift) * 100)}%</span>
                    </div>
                    <div className="flex gap-3 text-[8px] uppercase tracking-[0.18em]">
                        <span className="font-mono text-white/70">{activeDriveMeta.code}</span>
                        <span className={cn("font-mono", telemetry.stabilityAssist ? "text-emerald-300" : "text-white/55")}>
                            {telemetry.stabilityAssist ? "AST ON" : "AST OFF"}
                        </span>
                    </div>
                </div>

                <div className="pointer-events-none absolute bottom-4 left-4 z-20 flex flex-col gap-0.5 md:bottom-6 md:left-6">
                    {logs.map((log, index) => (
                        <motion.p
                            key={index}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1 - index * 0.2, x: 0 }}
                            className="overflow-hidden whitespace-nowrap font-mono text-[8px] text-primary/70 drop-shadow-md"
                        >
                            {log}
                        </motion.p>
                    ))}
                </div>

                <div className="pointer-events-none absolute bottom-4 right-4 z-20 h-32 w-32 overflow-hidden rounded-full border border-primary/20 bg-black/80 shadow-[0_0_30px_rgba(0,0,0,0.6)] backdrop-blur-md md:bottom-6 md:right-6 md:h-40 md:w-40">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,rgba(0,0,0,0.8)_100%)] z-10" />

                    <div className="relative h-full w-full">
                        {/* Grid lines */}
                        <div className="absolute left-1/2 top-0 bottom-0 w-[1px] -translate-x-1/2 bg-primary/10" />
                        <div className="absolute top-1/2 left-0 right-0 h-[1px] -translate-y-1/2 bg-primary/10" />

                        {/* Rings */}
                        <div className="absolute inset-[15%] rounded-full border border-primary/15" />
                        <div className="absolute inset-[35%] rounded-full border border-primary/15" />

                        <motion.div
                            className="absolute inset-0 rounded-full"
                            style={{
                                background: "conic-gradient(from 0deg, transparent 65%, rgba(255, 255, 255, 0.25) 100%)"
                            }}
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 2.8, ease: "linear" }}
                        />

                        {/* Center Rover Dot */}
                        <div className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_8px_white]" />

                        {/* Blips */}
                        {radarBlips.slice(0, 20).map((blip) => (
                            <span
                                key={blip.id}
                                className={cn(
                                    "absolute h-[5px] w-[5px] -translate-x-1/2 -translate-y-1/2 rounded-full",
                                    blip.type === "crate"
                                        ? "bg-amber-400 shadow-[0_0_6px_#fbbf24] animate-pulse"
                                        : "bg-red-500 shadow-[0_0_8px_#ef4444]"
                                )}
                                style={{
                                    left: `${50 + blip.x * 45}%`,
                                    top: `${50 + blip.y * 45}%`,
                                }}
                            />
                        ))}
                    </div>
                </div>

                <AnimatePresence>
                    {isFullscreen && isPortrait && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 z-30 flex items-center justify-center bg-black/85 px-6 text-center"
                        >
                            <div className="space-y-3">
                                <p className="text-[10px] font-black uppercase tracking-[0.35em] text-primary">
                                    Landscape Recommended
                                </p>
                                <p className="text-sm text-white/70">
                                    Rotate your device for full cockpit visibility.
                                </p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div
                    className={cn(
                        "absolute inset-0 z-20 touch-none",
                        isTouchDevice && !showUpgradeUI && !showConstructionUI && !isGameOver && !isPaused ? "block" : "hidden"
                    )}
                    onTouchStart={(event) => {
                        const touch = event.touches[0];
                        const rect = event.currentTarget.getBoundingClientRect();
                        const x = touch.clientX - rect.left;
                        const y = touch.clientY - rect.top;

                        setJoystick({ active: true, origin: { x, y }, current: { x, y } });
                        joystickInputRef.current = { x: 0, y: 0 };
                    }}
                    onTouchMove={(event) => {
                        if (!joystick.active) return;

                        const touch = event.touches[0];
                        const rect = event.currentTarget.getBoundingClientRect();
                        const x = touch.clientX - rect.left;
                        const y = touch.clientY - rect.top;

                        setJoystick((prev) => ({ ...prev, current: { x, y } }));

                        const dx = x - joystick.origin.x;
                        const dy = y - joystick.origin.y;

                        joystickInputRef.current = {
                            x: clamp(dx / 48, -1, 1),
                            y: clamp(-dy / 48, -1, 1),
                        };
                    }}
                    onTouchEnd={() => {
                        setJoystick({ active: false, origin: { x: 0, y: 0 }, current: { x: 0, y: 0 } });
                        joystickInputRef.current = { x: 0, y: 0 };
                    }}
                >
                    <AnimatePresence>
                        {joystick.active && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0 }}
                                className="pointer-events-none absolute"
                                style={{ left: joystick.origin.x, top: joystick.origin.y, x: "-50%", y: "-50%" }}
                            >
                                <div className="h-24 w-24 rounded-full border border-white/20 bg-white/5 backdrop-blur-sm" />
                                <div
                                    className="absolute h-12 w-12 rounded-full bg-primary/50 shadow-[0_0_14px_rgba(255,255,255,0.35)]"
                                    style={{
                                        left: "50%",
                                        top: "50%",
                                        x: clamp(joystick.current.x - joystick.origin.x, -38, 38) - 24,
                                        y: clamp(joystick.current.y - joystick.origin.y, -38, 38) - 24,
                                    }}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div
                    className={cn(
                        "absolute bottom-4 left-1/2 z-30 flex -translate-x-1/2 items-center gap-3 md:hidden",
                        isTouchDevice && !showUpgradeUI && !showConstructionUI && !isGameOver && !isPaused ? "flex" : "hidden"
                    )}
                >
                    <button
                        type="button"
                        onPointerDown={(event) => {
                            event.preventDefault();
                            setTouchAction("brake", true);
                        }}
                        onPointerUp={() => setTouchAction("brake", false)}
                        onPointerCancel={() => setTouchAction("brake", false)}
                        onPointerLeave={() => setTouchAction("brake", false)}
                        className={cn(
                            "rounded-xl border px-4 py-2 text-[10px] font-black uppercase tracking-[0.26em] backdrop-blur-md transition-all",
                            touchActions.brake
                                ? "border-amber-300/70 bg-amber-400/20 text-amber-300"
                                : "border-white/20 bg-black/55 text-white/75"
                        )}
                    >
                        Brake
                    </button>
                    <button
                        type="button"
                        onPointerDown={(event) => {
                            event.preventDefault();
                            setTouchAction("boost", true);
                        }}
                        onPointerUp={() => setTouchAction("boost", false)}
                        onPointerCancel={() => setTouchAction("boost", false)}
                        onPointerLeave={() => setTouchAction("boost", false)}
                        className={cn(
                            "rounded-xl border px-4 py-2 text-[10px] font-black uppercase tracking-[0.26em] backdrop-blur-md transition-all",
                            touchActions.boost
                                ? "border-cyan-300/70 bg-cyan-400/20 text-cyan-300"
                                : "border-white/20 bg-black/55 text-white/75"
                        )}
                    >
                        Boost
                    </button>
                </div>

                <AnimatePresence>
                    {isPaused && !showUpgradeUI && !isGameOver && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 z-40 flex items-center justify-center bg-black/88 backdrop-blur-sm p-5"
                            onClick={togglePause}
                        >
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.2 }}
                                className="w-full max-w-sm overflow-hidden rounded-[2rem] border border-red-500/20 bg-gradient-to-br from-zinc-950 via-black to-zinc-950 p-6 shadow-[0_0_50px_rgba(239,68,68,0.15)] text-center text-white"
                                onClick={(event) => event.stopPropagation()}
                            >
                                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 mb-6 border border-red-500/20">
                                    <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <h3 className="text-2xl font-heading font-black uppercase tracking-tight text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]">
                                    Simulation Paused
                                </h3>

                                <div className="my-6 space-y-3 rounded-xl border border-white/5 bg-zinc-900/50 p-4 text-left">
                                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Mode</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-mono text-red-200">{activeDriveMeta.code} {activeDriveMeta.label}</span>
                                            <button
                                                type="button"
                                                onClick={cycleDriveProfile}
                                                className="rounded border border-white/20 px-2 py-1 text-[8px] font-black uppercase tracking-[0.16em] text-white/70 hover:border-red-400 hover:text-red-400 transition-colors"
                                            >
                                                Next
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Assist</span>
                                        <button
                                            type="button"
                                            onClick={toggleStabilityAssist}
                                            className={cn(
                                                "rounded border px-2 py-1 text-[8px] font-black uppercase tracking-[0.16em] transition-colors",
                                                telemetry.stabilityAssist
                                                    ? "border-emerald-400/45 text-emerald-300 hover:border-emerald-300"
                                                    : "border-white/20 text-white/70 hover:border-white/45 hover:text-white"
                                            )}
                                        >
                                            {telemetry.stabilityAssist ? "Active" : "Disabled"}
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 pt-2">
                                        <div className="text-center">
                                            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-500">Cruise</p>
                                            <p className={cn("mt-1 text-[10px] font-mono", telemetry.boostActive ? "text-red-400" : "text-white/70")}>
                                                {telemetry.boostActive ? "BOOSTING" : "NORMAL"}
                                            </p>
                                        </div>
                                        <div className="text-center border-l border-white/5">
                                            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-500">Grip</p>
                                            <p className={cn("mt-1 text-[10px] font-mono", telemetry.handbrake ? "text-amber-300" : "text-white/70")}>
                                                {telemetry.handbrake ? "BRAKING" : "ACTIVE"}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={restartGame}
                                        className="flex-1 rounded-xl bg-zinc-800 py-3 text-xs font-black uppercase tracking-widest text-white hover:bg-zinc-700 hover:scale-[1.02] transition-all"
                                    >
                                        Restart
                                    </button>
                                    <button
                                        type="button"
                                        onClick={togglePause}
                                        className="flex-1 rounded-xl bg-red-600 shadow-[0_0_15px_rgba(220,38,38,0.4)] py-3 text-xs font-black uppercase tracking-widest text-white hover:bg-red-500 hover:scale-[1.02] transition-all"
                                    >
                                        Resume
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {showUpgradeUI && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 z-50 flex items-center justify-center bg-black/88 p-5 backdrop-blur-sm"
                        >
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                                className="w-full max-w-3xl overflow-hidden rounded-[2rem] border border-red-500/20 bg-gradient-to-br from-zinc-950 via-black to-zinc-950 p-6 shadow-[0_0_50px_rgba(239,68,68,0.15)] text-center text-white md:p-8"
                            >
                                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 mb-6 border border-red-500/20">
                                    <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                                    </svg>
                                </div>
                                <h3 className="text-2xl md:text-3xl font-heading font-black uppercase tracking-tight text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]">
                                    System Upgrade Interface
                                </h3>
                                <p className="mt-2 text-sm text-zinc-400">
                                    Rover control is paused. Choose one upgrade path to continue the mission.
                                </p>

                                <div className="my-6 rounded-xl border border-white/5 bg-zinc-900/50 p-4">
                                    <p className="text-[10px] uppercase tracking-widest text-zinc-500">Current Module Levels</p>
                                    <p className="mt-1 font-mono text-3xl font-black text-white">{totalModuleLevels.toString().padStart(2, "0")}</p>
                                </div>

                                <div className="relative grid grid-cols-1 gap-4 md:grid-cols-3">
                                    {upgradeOptions.map((upgrade, index) => {
                                        const typeMeta = UPGRADE_TYPE_META[upgrade.type];
                                        const rarityMeta = UPGRADE_RARITY_META[upgrade.rarity];
                                        const currentLevel = moduleLevels[upgrade.type];
                                        const nextLevel = currentLevel + 1;

                                        return (
                                            <motion.button
                                                key={`${upgrade.id}-${index}`}
                                                type="button"
                                                onClick={() => applyUpgrade(upgrade)}
                                                whileHover={{ y: -4 }}
                                                whileTap={{ scale: 0.98 }}
                                                transition={{ duration: 0.16 }}
                                                className={cn(
                                                    "group relative overflow-hidden rounded-2xl border bg-zinc-950/90 p-4 text-left transition-all",
                                                    "hover:border-white/35 hover:bg-zinc-900/95 shadow-lg",
                                                    rarityMeta.ring
                                                )}
                                            >
                                                <div className={cn(
                                                    "pointer-events-none absolute inset-0 bg-gradient-to-br to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100",
                                                    typeMeta.glow
                                                )} />
                                                <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-white/55 to-transparent opacity-0 group-hover:opacity-100" />

                                                <div className="relative space-y-4">
                                                    <div className="flex items-start justify-between">
                                                        <div className={cn(
                                                            "rounded-md border px-2 py-1 text-[8px] font-black uppercase tracking-[0.22em]",
                                                            typeMeta.frame
                                                        )}>
                                                            {typeMeta.code}
                                                        </div>

                                                        <div className="text-right">
                                                            <p className={cn("text-[8px] font-black uppercase tracking-[0.2em]", rarityMeta.color)}>
                                                                {rarityMeta.tag}
                                                            </p>
                                                            <span className={cn("ml-auto mt-1 block h-1.5 w-1.5 rounded-full", rarityMeta.dot)} />
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/35">
                                                            Module {String(index + 1).padStart(2, "0")} · {typeMeta.label}
                                                        </p>
                                                        <h4 className="mt-1 text-lg font-heading font-black uppercase tracking-tight text-white transition-colors group-hover:text-primary">
                                                            {upgrade.name}
                                                        </h4>
                                                        <p className="mt-2 text-[11px] leading-relaxed text-white/65">
                                                            {upgrade.description}
                                                        </p>
                                                        <p className="mt-1 text-[9px] font-mono uppercase tracking-[0.16em] text-white/45">
                                                            Level {currentLevel.toString().padStart(2, "0")} to {nextLevel.toString().padStart(2, "0")}
                                                        </p>
                                                    </div>

                                                    <div className="flex items-center justify-between border-t border-white/10 pt-3">
                                                        <p className="text-[8px] font-black uppercase tracking-[0.24em] text-white/45">
                                                            Install Module
                                                        </p>
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="h-[2px] w-5 bg-white/35" />
                                                            <span className={cn("h-2 w-2 rounded-sm border", typeMeta.frame)} />
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.button>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {showConstructionUI && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 z-[60] flex flex-col items-center justify-center bg-zinc-950/95 p-5 backdrop-blur-md"
                        >
                            <div className="absolute top-10 flex flex-col items-center text-center">
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-red-400">Construction Phase</p>
                                <h3 className="mt-2 font-heading text-2xl font-black uppercase text-white shadow-red-500/50 drop-shadow-lg">
                                    {pendingModule ? pendingModule.name : "Layout Editor"}
                                </h3>
                                <p className="mt-1 text-[9px] font-mono uppercase tracking-[0.22em] text-white/60">
                                    Adaptive Rack {constructionGridSize}x{constructionGridSize}
                                </p>
                                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                                    {pendingModule && (
                                        <button
                                            type="button"
                                            onClick={() => setPendingRotation((r) => (r + 1) % 4)}
                                            className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-950/30 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-red-200 transition-all hover:border-red-400 hover:bg-red-900/50 active:scale-95"
                                        >
                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                            </svg>
                                            Rotate New {(pendingRotation * 90)}&deg;
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={saveConstructionLayout}
                                        disabled={Boolean(pendingModule)}
                                        className={cn(
                                            "rounded-lg border px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all",
                                            pendingModule
                                                ? "cursor-not-allowed border-emerald-900/35 bg-emerald-950/20 text-emerald-400/45"
                                                : "border-emerald-500/35 bg-emerald-950/35 text-emerald-200 hover:border-emerald-300 hover:bg-emerald-900/45 active:scale-95"
                                        )}
                                    >
                                        Save & Resume
                                    </button>
                                </div>
                                <p className="mt-2 text-[9px] font-mono uppercase tracking-[0.16em] text-white/45">
                                    {pendingModule
                                        ? "Place the new module. Then rotate mounted weapons and save."
                                        : "Click mounted weapons to rotate firing direction, then Save & Resume."}
                                </p>
                            </div>

                            {/* Interactive 3D Spinning Rover Grid */}
                            <div className="relative mt-8 flex h-[60vh] w-full max-w-[400px] items-center justify-center perspective-[1200px]">
                                <motion.div
                                    animate={{ rotateZ: 0 }} // Keep rover base stationary so the user can easily click the grid
                                    transition={{ duration: 0 }}
                                    className="relative mt-12 h-64 w-48 preserve-3d"
                                    style={{ transformStyle: "preserve-3d", transform: "rotateX(55deg)" }}
                                >
                                    {/* Rotating Base Plate for Visual Flare (underneath rover) */}
                                    <motion.div
                                        animate={{ rotateZ: 360 }}
                                        transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
                                        className="absolute left-1/2 top-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/5 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03)_0%,transparent_70%)]"
                                        style={{ transform: "translateZ(-30px)" }}
                                    />
                                    {/* Rover Body Underneath */}
                                    <div className="absolute inset-x-0 inset-y-0 rounded-xl border border-white/10 bg-zinc-900 shadow-[0_0_50px_rgba(0,0,0,0.8)]" style={{ transform: "translateZ(-10px)" }}>
                                        {/* Front Cab area */}
                                        <div className="absolute top-0 inset-x-0 h-[20%] bg-zinc-800 rounded-t-xl border-b border-black/50" />
                                        {/* Windshield */}
                                        <div className="absolute top-4 left-1/2 w-[60%] h-6 -translate-x-1/2 bg-cyan-950 border border-cyan-400/30 rounded-md shadow-[0_0_15px_rgba(34,211,238,0.2)_inset]" />
                                        {/* Headlights */}
                                        <div className="absolute top-[-2px] left-6 w-8 h-3 bg-amber-100 rounded-sm shadow-[0_0_20px_rgba(253,230,138,0.8)] filter blur-[1px]" />
                                        <div className="absolute top-[-2px] right-6 w-8 h-3 bg-amber-100 rounded-sm shadow-[0_0_20px_rgba(253,230,138,0.8)] filter blur-[1px]" />

                                        {/* Engine glow */}
                                        <div className="absolute bottom-[-10px] left-1/2 h-4 w-24 -translate-x-1/2 rounded-full bg-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.6)] blur-md" />
                                    </div>

                                    {/* Placed Modules Visualization */}
                                    {placedModules.map((mod) => (
                                        <div
                                            key={`placed-${mod.id}`}
                                            className={cn(
                                                "absolute z-10 flex items-center justify-center rounded border bg-zinc-800 shadow-lg",
                                                selectedWeaponModuleId === mod.id ? "border-cyan-300/75 shadow-[0_0_18px_rgba(34,211,238,0.45)]" : "border-white/10"
                                            )}
                                            style={{
                                                left: `${(mod.gridX / constructionGridSize) * 100}%`,
                                                top: `${(mod.gridY / constructionGridSize) * 100}%`,
                                                width: `${constructionCellPercent}%`,
                                                height: `${constructionCellPercent}%`,
                                                transform: `rotateZ(${mod.rotation}deg) translateZ(4px)`,
                                            }}
                                        >
                                            {mod.type === "TURRET" && (
                                                <div className="flex h-4 w-4 items-center justify-center rounded-full border border-red-500/50 bg-zinc-950 shadow-[0_0_10px_rgba(239,68,68,0.3)]">
                                                    <div className="absolute left-1/2 top-[-3px] h-3 w-1 -translate-x-1/2 border border-white/10 bg-zinc-700">
                                                        <div className="absolute left-0 top-0 h-[1px] w-full bg-red-400" />
                                                    </div>
                                                </div>
                                            )}
                                            {mod.type === "LASER" && (
                                                <div className="flex h-2 w-4 items-center justify-center rounded-full border border-fuchsia-500/50 bg-zinc-950 shadow-[0_0_15px_rgba(217,70,239,0.5)]">
                                                    <div className="absolute left-1/2 top-0 h-[120%] w-[1px] -translate-x-1/2 bg-fuchsia-400" />
                                                    <div className="h-1 w-2 rounded-full bg-fuchsia-400" />
                                                </div>
                                            )}
                                            {mod.type === "VISION" && (
                                                <div className="relative h-3 w-3 animate-[spin_4s_linear_infinite] rounded-full border border-sky-400/50 bg-sky-900/80">
                                                    <div className="absolute left-1/2 top-0 h-[60%] w-[1px] -translate-x-1/2 bg-sky-400/50" />
                                                </div>
                                            )}
                                            {mod.type === "ARMOR" && (
                                                <div className="h-full w-full rounded-sm border-2 border-emerald-500/40 bg-emerald-950/80" />
                                            )}
                                            {mod.type === "SPEED" && (
                                                <div className="h-2 w-3 rounded-sm border border-blue-400/60 bg-blue-500/70 shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
                                            )}
                                            {mod.type === "CHASSIS" && (
                                                <div className="h-3 w-3 rounded-sm border border-zinc-300/60 bg-zinc-500/60 shadow-[0_0_8px_rgba(161,161,170,0.45)]" />
                                            )}
                                        </div>
                                    ))}

                                    {/* Adaptive Snap Grid */}
                                    <div
                                        className="absolute inset-0 z-20 grid gap-0.5 p-1"
                                        style={{
                                            transform: "translateZ(8px)",
                                            gridTemplateColumns: `repeat(${constructionGridSize}, minmax(0, 1fr))`,
                                            gridTemplateRows: `repeat(${constructionGridSize}, minmax(0, 1fr))`,
                                        }}
                                    >
                                        {Array.from({ length: constructionGridSize * constructionGridSize }).map((_, i) => {
                                            const gridX = i % constructionGridSize;
                                            const gridY = Math.floor(i / constructionGridSize);
                                            const cellModule = placedModules.find((m) => m.gridX === gridX && m.gridY === gridY);
                                            const isOccupied = Boolean(cellModule);
                                            const canRotateCellWeapon = Boolean(
                                                !pendingModule &&
                                                cellModule &&
                                                (cellModule.type === "TURRET" || cellModule.type === "LASER")
                                            );

                                            return (
                                                <div key={`cell-wrap-${i}`} className="relative h-full w-full p-0.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            if (pendingModule) {
                                                                if (!isOccupied) confirmPlacement(gridX, gridY, pendingRotation * 90);
                                                                return;
                                                            }

                                                            if (canRotateCellWeapon && cellModule) {
                                                                rotatePlacedWeaponModule(cellModule.id);
                                                            }
                                                        }}
                                                        className={cn(
                                                            "group h-full w-full rounded-sm border transition-all duration-200",
                                                            pendingModule
                                                                ? (
                                                                    isOccupied
                                                                        ? "border-red-500/30 bg-red-500/10 cursor-not-allowed"
                                                                        : "border-white/10 bg-white/5 hover:scale-110 hover:border-red-400 hover:bg-red-400/30 hover:shadow-[0_0_15px_rgba(239,68,68,0.5)] cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500"
                                                                )
                                                                : (
                                                                    canRotateCellWeapon
                                                                        ? "border-cyan-500/30 bg-cyan-500/10 hover:scale-105 hover:border-cyan-300 hover:bg-cyan-400/20 cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                                                        : isOccupied
                                                                            ? "border-white/10 bg-white/5 cursor-default"
                                                                            : "border-white/10 bg-white/5 cursor-default"
                                                                )
                                                        )}
                                                        aria-label={pendingModule
                                                            ? `Place module at column ${gridX + 1}, row ${gridY + 1}`
                                                            : canRotateCellWeapon
                                                                ? `Rotate weapon mount at column ${gridX + 1}, row ${gridY + 1}`
                                                                : `Construction cell ${gridX + 1}, ${gridY + 1}`}
                                                    >
                                                        {/* Hover projection of pending module */}
                                                        {pendingModule && !isOccupied && (
                                                            <div
                                                                className="absolute inset-1 m-auto flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100"
                                                                style={{ transform: `rotateZ(${pendingRotation * 90}deg)` }}
                                                            >
                                                                <div className={cn(
                                                                    "h-2 w-2 rounded-full shadow-[0_0_10px_currentColor]",
                                                                    pendingModule.type === "TURRET" ? "bg-amber-400 text-amber-400" :
                                                                        pendingModule.type === "LASER" ? "bg-fuchsia-500 text-fuchsia-500" :
                                                                            pendingModule.type === "ARMOR" ? "bg-zinc-300 text-zinc-300" :
                                                                                pendingModule.type === "VISION" ? "bg-cyan-400 text-cyan-400" :
                                                                                    pendingModule.type === "SPEED" ? "bg-blue-400 text-blue-400" :
                                                                                        pendingModule.type === "CHASSIS" ? "bg-zinc-400 text-zinc-400" : "bg-emerald-400 text-emerald-400"
                                                                )} />
                                                            </div>
                                                        )}

                                                        {!pendingModule && canRotateCellWeapon && (
                                                            <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 rounded bg-cyan-400/20 px-1 py-[1px] text-[7px] font-black uppercase tracking-[0.12em] text-cyan-200">
                                                                Rotate
                                                            </div>
                                                        )}
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </motion.div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {isGameOver && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 z-50 flex items-center justify-center bg-black/88 p-5 backdrop-blur-sm"
                        >
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="w-full max-w-sm overflow-hidden rounded-[2rem] border border-red-500/20 bg-gradient-to-br from-zinc-950 via-black to-zinc-950 p-6 shadow-[0_0_50px_rgba(239,68,68,0.15)] text-center text-white"
                            >
                                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 mb-6">
                                    <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                </div>
                                <h3 className="text-2xl font-heading font-black uppercase tracking-tight text-red-500">
                                    Hull Integrity Failure
                                </h3>
                                <p className="mt-2 text-sm text-zinc-400">
                                    Your rover was destroyed by hostile units.
                                </p>

                                <div className="my-6 rounded-xl border border-white/5 bg-zinc-900/50 p-4">
                                    <p className="text-[10px] uppercase tracking-widest text-zinc-500">Final Score</p>
                                    <p className="mt-1 font-mono text-3xl font-black text-white">{telemetry.score.toString().padStart(4, "0")}</p>
                                    <p className="mt-2 text-[10px] uppercase text-zinc-400">Module Levels: {totalModuleLevels}</p>
                                </div>

                                <button
                                    type="button"
                                    onClick={restartGame}
                                    className="w-full rounded-xl bg-primary py-3 text-xs font-black uppercase tracking-widest text-primary-foreground hover:bg-primary/90 hover:scale-[1.02] transition-all"
                                >
                                    Reboot Systems
                                </button>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
