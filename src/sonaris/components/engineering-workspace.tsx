"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Download,
  Upload,
  Maximize2,
  Save,
  RotateCcw,
  Play,
  Square,
  Plus,
  Trash2
} from "lucide-react";
import EngineeringViewport from "./engineering-viewport";
import {
  createProject,
  powerEstimate,
  wheelSpeeds,
  printFit,
  validateConnection,
  scanRoom,
  collisionPairs,
  assessTrial,
  coverageStats,
  suggestViewpoint,
  compareTrials,
  type Component,
  type Connection,
  type Project,
  type ScanPoint
} from "@/sonaris/lib/sonaris-engine";
import { parseSnapshot, validateSnapshot } from "@/sonaris/lib/sonaris-workspace-state";
import ConnectionDiagram from "./connection-diagram";
import ScanPlot from "./scan-plot";
import {
  batteryCircuit,
  converter,
  thermal,
  beamDeflection,
  assemblyMassProperties
} from "@/sonaris/lib/sonaris-analysis";
import styles from "./engineering-workspace.module.css";

const storageKey = "sonaris-engineering-v1";
const tabs = [
  "Components",
  "Connections",
  "Power",
  "Motion",
  "Mapping",
  "Fabrication",
  "Structure",
  "Records",
  "Validation"
] as const;
type Tab = (typeof tabs)[number];
type Obstacle = { id: string; x: number; z: number; width: number; depth: number; height: number };
const timestamp = () => new Date().toISOString();
const uid = () => crypto.randomUUID();
const fmt = (n: number | null, unit = "") =>
  n === null || !Number.isFinite(n) ? "Unresolved" : `${Number(n.toFixed(3))}${unit}`;
const inputClass = "engineering-input";
function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = 0.01
}: {
  label: string;
  value: number | null;
  onChange: (n: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <label>
      {label}
      <input
        className={inputClass}
        type="number"
        value={value ?? ""}
        placeholder="Unknown"
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          const n = e.target.value === "" ? null : Number(e.target.value);
          if (
            n === null ||
            (Number.isFinite(n) &&
              (min === undefined || n >= min) &&
              (max === undefined || n <= max))
          )
            onChange(n);
        }}
      />
    </label>
  );
}
function TextField({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
}) {
  return (
    <label>
      {label}
      <input value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
function download(name: string, content: string, type = "application/json") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const scenarios = [
  "Powered off / charging",
  "Standby",
  "Startup",
  "Sensor acquisition",
  "Tilt movement",
  "Forward drive",
  "Reverse drive",
  "Lateral drive",
  "Rotation",
  "Combined drive + sensing",
  "Stationary scan",
  "Maximum load",
  "Motor stall",
  "Converter overload",
  "Emergency stop",
  "Low battery",
  "Communication loss"
];
const acceptance = [
  ["Dimensional error", "≤5% median", "%"],
  ["Surface coverage", "Declare reference area", "%"],
  ["Data age p95", "≤1 s", "s"],
  ["Watchdog initiation", "≤200 ms", "ms"],
  ["Rail voltage", "Within verified component limits", "V"],
  ["Runtime", "≥2 h nominal", "h"],
  ["Finished mass", "≤20 kg", "kg"]
];

export default function EngineeringWorkspace() {
  const [project, setProject] = useState<Project>(createProject);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("Local project; no hardware connected.");
  const [tab, setTab] = useState<Tab>("Components");
  const [selectedId, setSelectedId] = useState("main-computer");
  const [view, setView] = useState<"isometric" | "top" | "front" | "side" | "bottom">("isometric");
  const [exploded, setExploded] = useState(false);
  const [sectioned, setSectioned] = useState(false);
  const [present, setPresent] = useState(false);
  const [search, setSearch] = useState("");
  const [dimensionDraft, setDimensionDraft] = useState<Record<string, (number | null)[]>>({});
  const [printRotated, setPrintRotated] = useState(false);
  const autoSaveAllowed = useRef(false);
  const [modelUrl, setModelUrl] = useState<string>();
  const [modelName, setModelName] = useState("");
  const importRef = useRef<HTMLInputElement>(null);
  const selected = project.components.find((c) => c.id === selectedId) ?? project.components[0];
  const update = useCallback(
    (patch: Partial<Component>) =>
      setProject((p) => ({
        ...p,
        components: p.components.map((c) =>
          c.id === selectedId
            ? {
                ...c,
                ...patch,
                status:
                  patch.status ??
                  (Object.keys(patch).some((k) =>
                    [
                      "dimensions",
                      "position",
                      "rotation",
                      "massKg",
                      "model",
                      "voltage",
                      "current",
                      "peakCurrent",
                      "quantity"
                    ].includes(k)
                  )
                    ? "concept"
                    : c.status)
              }
            : c
        )
      })),
    [selectedId]
  );
  const [batteryV, setBatteryV] = useState<number | null>(12);
  const [capacity, setCapacity] = useState<number | null>(12);
  const [efficiency, setEfficiency] = useState<number | null>(0.85);
  const [duty, setDuty] = useState<number | null>(1);
  const [scenario, setScenario] = useState("Standby");
  const [usePeak, setUsePeak] = useState(false);
  const [scenarioRecords, setScenarioRecords] = useState<
    { name: string; watts: number | null; runtime: number | null; date: string }[]
  >([]);
  const [vx, setVx] = useState<number | null>(0.15),
    [vy, setVy] = useState<number | null>(0),
    [yaw, setYaw] = useState<number | null>(0);
  const [radius, setRadius] = useState<number | null>(0.0635),
    [halfLength, setHalfLength] = useState<number | null>(null),
    [halfWidth, setHalfWidth] = useState<number | null>(null);
  const [slip, setSlip] = useState<number | null>(0),
    [decel, setDecel] = useState<number | null>(0.5);
  const [running, setRunning] = useState(false),
    [connected, setConnected] = useState(true);
  const [rover, setRover] = useState({ x: 0, z: 0, heading: 0 });
  const [wheelAngles,setWheelAngles]=useState<[number,number,number,number]>([0,0,0,0]);
  const [commanded,setCommanded]=useState({x:0,z:0,heading:0});
  const commandedRef=useRef(commanded);
  const [path, setPath] = useState<{ x: number; z: number }[]>([]);
  const [waypoints, setWaypoints] = useState<{ x: number; z: number }[]>([]);
  const [pointX, setPointX] = useState<number | null>(1),
    [pointZ, setPointZ] = useState<number | null>(0);
  const [roomW, setRoomW] = useState<number | null>(6),
    [roomD, setRoomD] = useState<number | null>(5);
  const [tilt, setTilt] = useState<number | null>(0),
    [height, setHeight] = useState<number | null>(0.5),
    [noise, setNoise] = useState<number | null>(0.01),
    [range, setRange] = useState<number | null>(30);
  const [points, setPoints] = useState<ScanPoint[]>([]),
    [lastScan, setLastScan] = useState("");
  const [showPoints, setShowPoints] = useState(true),
    [showRoom, setShowRoom] = useState(true);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [bedZ, setBedZ] = useState<number | null>(null),
    [density, setDensity] = useState<number | null>(null),
    [costKg, setCostKg] = useState<number | null>(null),
    [volume, setVolume] = useState<number | null>(null),
    [flow, setFlow] = useState<number | null>(null);
  const [recordKind, setRecordKind] = useState<"decisions" | "risks" | "revisions">("decisions");
  const [recordTitle, setRecordTitle] = useState(""),
    [recordDetail, setRecordDetail] = useState("");
  const [metric, setMetric] = useState("Dimensional error"),
    [trialValue, setTrialValue] = useState<number | null>(null),
    [uncertainty, setUncertainty] = useState<number | null>(null),
    [protocol, setProtocol] = useState("");
  const [from, setFrom] = useState("battery"),
    [to, setTo] = useState("main-computer");
  const [wireV, setWireV] = useState<number | null>(null),
    [wireI, setWireI] = useState<number | null>(null),
    [wireRating, setWireRating] = useState<number | null>(null),
    [connector, setConnector] = useState(""),
    [protection, setProtection] = useState("");
  const [analysis, setAnalysis] = useState<Record<string, number | null>>({
    rInternal: null,
    ambient: null,
    theta: null,
    maxTemp: null,
    converterV: null,
    converterA: null,
    converterLimit: null,
    force: null,
    span: null,
    elasticity: null,
    inertia: null
  });
  const [confirmedPlacementIds, setConfirmedPlacementIds] = useState<string[]>([]);
  const [slice, setSlice] = useState<ScanPoint[]>([]);
  const [showSlice, setShowSlice] = useState(false);
  const snapshotRef = useRef<() => unknown>(() => project);
  snapshotRef.current = () => ({
    project,
    settings: {
      batteryV,
      capacity,
      efficiency,
      duty,
      roomW,
      roomD,
      tilt,
      height,
      noise,
      range,
      bedZ,
      obstacles,
      waypoints,
      scenarioRecords,
      vx,
      vy,
      yaw,
      radius,
      halfLength,
      halfWidth,
      slip,
      decel,
      density,
      costKg,
      volume,
      flow,
      analysis,
      confirmedPlacementIds
    }
  });
  const restoreSettings = (settings: Record<string, unknown>) => {
    const numeric: Record<string, (v: number | null) => void> = {
      vx: setVx,
      vy: setVy,
      yaw: setYaw,
      radius: setRadius,
      halfLength: setHalfLength,
      halfWidth: setHalfWidth,
      slip: setSlip,
      decel: setDecel,
      density: setDensity,
      costKg: setCostKg,
      volume: setVolume,
      flow: setFlow,
      batteryV: setBatteryV,
      capacity: setCapacity,
      efficiency: setEfficiency,
      duty: setDuty,
      roomW: setRoomW,
      roomD: setRoomD,
      tilt: setTilt,
      height: setHeight,
      noise: setNoise,
      range: setRange,
      bedZ: setBedZ
    };
    const defaults: Record<string, number | null> = {
      vx: 0.15,
      vy: 0,
      yaw: 0,
      radius: 0.0635,
      halfLength: null,
      halfWidth: null,
      slip: 0,
      decel: 0.5,
      density: null,
      costKg: null,
      volume: null,
      flow: null,
      batteryV: 12,
      capacity: 12,
      efficiency: 0.85,
      duty: 1,
      roomW: 6,
      roomD: 5,
      tilt: 0,
      height: 0.5,
      noise: 0.01,
      range: 30,
      bedZ: null
    };
    for (const [key, setter] of Object.entries(numeric))
      setter(Object.hasOwn(settings, key) ? (settings[key] as number | null) : defaults[key]);
    const emptyAnalysis = {
      rInternal: null,
      ambient: null,
      theta: null,
      maxTemp: null,
      converterV: null,
      converterA: null,
      converterLimit: null,
      force: null,
      span: null,
      elasticity: null,
      inertia: null
    };
    setAnalysis({
      ...emptyAnalysis,
      ...((settings.analysis as Record<string, number | null>) ?? {})
    });
    setConfirmedPlacementIds((settings.confirmedPlacementIds as string[]) ?? []);
    setObstacles((settings.obstacles as Obstacle[]) ?? []);
    setWaypoints((settings.waypoints as { x: number; z: number }[]) ?? []);
    setScenarioRecords((settings.scenarioRecords as typeof scenarioRecords) ?? []);
    setRunning(false);
    const origin={x:0,z:0,heading:0};setCommanded(origin);commandedRef.current=origin;setWheelAngles([0,0,0,0]);
    setRover({ x: 0, z: 0, heading: 0 });
    setPath([]);
    setPoints([]);
    setSlice([]);
    setLastScan("");
    setModelUrl(undefined);
    setModelName("");
  };
  const restoreProject = (p: Project) => {
    setProject(p);
    setSelectedId(p.components[0]?.id ?? "");
    setFrom(p.components.find((c) => c.id === "battery")?.id ?? p.components[0]?.id ?? "");
    setTo(p.components.find((c) => c.id === "main-computer")?.id ?? p.components[1]?.id ?? "");
    setDimensionDraft({});
  };
  const persist = useCallback(() => {
    try {
      const snapshot = snapshotRef.current();
      if (!validateSnapshot(snapshot)) {
        setMessage(
          "Project has incomplete or invalid entries. Correct them before saving; stored data was preserved."
        );
        return false;
      }
      localStorage.setItem(storageKey, JSON.stringify(snapshot));
      autoSaveAllowed.current = true;
      return true;
    } catch {
      setMessage("Local storage is full or unavailable. Export your project to keep it.");
      return false;
    }
  }, []);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const saved = parseSnapshot(raw);
        if (saved) {
          restoreProject(saved.project);
          restoreSettings(saved.settings);
          autoSaveAllowed.current = true;
          setMessage("Saved local project and scenario assumptions restored.");
        } else
          setMessage(
            "Saved project is invalid; stored data was preserved. Explicit Save replaces it."
          );
      } else autoSaveAllowed.current = true;
    } catch {
      setMessage("Saved data could not be read. Export your work before saving.");
    }
    setReady(true);
    // State setters are stable; restore runs once after mounting.
  }, []);
  useEffect(() => {
    const save = () => {
      if (ready && autoSaveAllowed.current) persist();
    };
    window.addEventListener("pagehide", save);
    return () => window.removeEventListener("pagehide", save);
  }, [ready, persist]);
  useEffect(() => {
    if (!ready || !autoSaveAllowed.current) return;
    const timer = setTimeout(persist, 600);
    return () => clearTimeout(timer);
  }, [
    ready,
    persist,
    project,
    batteryV,
    capacity,
    efficiency,
    duty,
    roomW,
    roomD,
    tilt,
    height,
    noise,
    range,
    bedZ,
    obstacles,
    waypoints,
    scenarioRecords,
    vx,
    vy,
    yaw,
    radius,
    halfLength,
    halfWidth,
    slip,
    decel,
    density,
    costKg,
    volume,
    flow,
    analysis,
    confirmedPlacementIds
  ]);
  useEffect(
    () => () => {
      if (modelUrl) URL.revokeObjectURL(modelUrl);
    },
    [modelUrl]
  );
  const roverRef = useRef(rover);
  useEffect(() => {
    roverRef.current = rover;
  }, [rover]);
  useEffect(() => {
    if (!running || !connected) return;
    let frame = 0,
      last = performance.now(),
      elapsed = 0;
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      elapsed += dt;
      const p = roverRef.current,
        h = (p.heading * Math.PI) / 180,
        k = 1 - (slip ?? 0);
      const next = {
        x: p.x + ((vx ?? 0) * Math.cos(h) - (vy ?? 0) * Math.sin(h)) * dt * k,
        z: p.z + ((vx ?? 0) * Math.sin(h) + (vy ?? 0) * Math.cos(h)) * dt * k,
        heading: p.heading + (((yaw ?? 0) * 180) / Math.PI) * dt * k
      };
      if (
        Math.abs(next.x) >= (roomW ?? 6) / 2 ||
        Math.abs(next.z) >= (roomD ?? 5) / 2 ||
        obstacles.some(
          (o) => Math.abs(next.x - o.x) <= o.width / 2 && Math.abs(next.z - o.z) <= o.depth / 2
        )
      ) {
        setRunning(false);
        setMessage(
          "Simulation paused at a point-model obstacle/room boundary. This does not establish clearance for the unknown rover footprint."
        );
        return;
      }
      const cmd=commandedRef.current,ch=cmd.heading*Math.PI/180;
      const nextCmd={x:cmd.x+((vx??0)*Math.cos(ch)-(vy??0)*Math.sin(ch))*dt,z:cmd.z+((vx??0)*Math.sin(ch)+(vy??0)*Math.cos(ch))*dt,heading:cmd.heading+(yaw??0)*180/Math.PI*dt};
      commandedRef.current=nextCmd;setCommanded(nextCmd);
      if(radius&&halfLength&&halfWidth){const speed=wheelSpeeds(vx??0,vy??0,yaw??0,radius,halfLength,halfWidth);setWheelAngles(old=>old.map((a,i)=>a+speed[i]*dt) as [number,number,number,number]);}
      roverRef.current = next;
      setRover(next);
      if (elapsed > 0.15) {
        elapsed = 0;
        setPath((old) => [...old.slice(-599), { x: next.x, z: next.z }]);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running, connected, vx, vy, yaw, slip, roomW, roomD, obstacles,radius,halfLength,halfWidth]);
  useEffect(() => {
    if (!connected) setRunning(false);
  }, [connected]);
  useEffect(() => {
    const hidden = () => {
      if (document.hidden) setRunning(false);
    };
    document.addEventListener("visibilitychange", hidden);
    return () => document.removeEventListener("visibilitychange", hidden);
  }, []);
  useEffect(() => {
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPresent(false);
        setRunning(false);
      }
    };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, []);
  const power = powerEstimate(
    project.components.map((c) => ({ ...c, current: usePeak ? c.peakCurrent : c.current })),
    batteryV ?? 0,
    capacity ?? 0,
    efficiency ?? 0,
    duty ?? 0
  );
  let speeds: number[] | null = null;
  try {
    speeds = wheelSpeeds(vx ?? 0, vy ?? 0, yaw ?? 0, radius ?? 0, halfLength ?? 0, halfWidth ?? 0);
  } catch {
    /* Geometry intentionally unresolved. */
  }
  const scan = (at = rover, angle = tilt ?? 0) =>
    scanRoom(
      roomW ?? 0,
      roomD ?? 0,
      at.x,
      at.z,
      at.heading,
      angle,
      360,
      range ?? 0,
      noise ?? 0,
      height ?? 0.5,
      obstacles
    );
  const capture = (sweep = false) => {
    const next = sweep
      ? Array.from({ length: 10 }, (_, i) => scan(rover, -30 + i * 10)).flat()
      : scan();
    if (!next.length) {
      setMessage("No valid returns: check room, pose, range and tilt.");
      return;
    }
    setPoints((p) => [...p, ...next].slice(-50000));
    setSlice(sweep ? scan(rover, 60) : next);
    setLastScan(timestamp());
    setMessage(
      `${next.length} synthetic returns added. Analytical room/obstacle scan; not sensor measurements.`
    );
  };
  const addRecord = () => {
    if (!recordTitle.trim()) return;
    setProject((p) => ({
      ...p,
      [recordKind]: [
        ...p[recordKind],
        { id: uid(), title: recordTitle.trim(), detail: recordDetail, date: timestamp() }
      ]
    }));
    setRecordTitle("");
    setRecordDetail("");
  };
  const addConnection = () => {
    if (from === to) {
      setMessage("Choose two different components.");
      return;
    }
    const c: Connection = {
      id: uid(),
      from,
      to,
      voltage: wireV,
      current: wireI,
      rating: wireRating,
      connector,
      protection,
      status: "Unresolved"
    };
    setProject((p) => ({ ...p, connections: [...p.connections, c] }));
  };
  const mass = project.components.every((c) => c.massKg !== null && c.quantity > 0)
    ? project.components.reduce((n, c) => n + c.massKg! * c.quantity, 0)
    : null;
  const totalCost = project.components.every((c) => c.cost !== null && c.quantity > 0)
    ? project.components.reduce((n, c) => n + c.cost! * c.quantity, 0)
    : null;
  const fit = selected?.dimensions
    ? printFit(
        printRotated
          ? [selected.dimensions[1], selected.dimensions[0], selected.dimensions[2]]
          : selected.dimensions,
        bedZ
      )
    : null;
  const clashes = useMemo(() => collisionPairs(project.components), [project.components]);
  const coverage = useMemo(
    () => coverageStats(points, roomW ?? 0, roomD ?? 0),
    [points, roomW, roomD]
  );
  const comparison = compareTrials(project.trials, metric, protocol);
  useEffect(() => {
    setPoints([]);
    setSlice([]);
    setLastScan("");
  }, [roomW, roomD, obstacles, height, noise, range]);
  const sag =
    power.watts !== null && batteryV !== null && analysis.rInternal !== null
      ? batteryCircuit(batteryV, analysis.rInternal, power.watts / (efficiency || 1))
      : null;
  const converted =
    batteryV !== null &&
    analysis.converterV !== null &&
    analysis.converterA !== null &&
    analysis.converterLimit !== null &&
    efficiency !== null
      ? converter(
          batteryV,
          analysis.converterV,
          analysis.converterA,
          efficiency,
          analysis.converterLimit
        )
      : null;
  const heat =
    converted && analysis.ambient !== null && analysis.theta !== null && analysis.maxTemp !== null
      ? thermal(analysis.ambient, converted.lossW, analysis.theta, analysis.maxTemp)
      : null;
  const bending = [analysis.force, analysis.span, analysis.elasticity, analysis.inertia].every(
    (v) => v !== null
  )
    ? beamDeflection(analysis.force!, analysis.span!, analysis.elasticity!, analysis.inertia!)
    : null;
  const massProps = assemblyMassProperties(project.components, confirmedPlacementIds);
  const analysisField = (key: string, label: string, min?: number) => (
    <NumberField
      key={key}
      label={label}
      value={analysis[key] ?? null}
      min={min}
      step={key === "inertia" ? 0.000000001 : 0.01}
      onChange={(n) => setAnalysis((a) => ({ ...a, [key]: n }))}
    />
  );
  const saveAnalysis = (title: string, detail: unknown) => {
    setProject((p) => ({
      ...p,
      decisions: [
        ...p.decisions,
        { id: uid(), title, detail: JSON.stringify(detail, null, 2), date: timestamp() }
      ]
    }));
    setMessage("Analytical scenario and inputs saved in Decisions.");
  };
  const compareMapping = () => {
    const fixed = Array.from({ length: 10 }, (_, i) =>
      scan({ x: 0, z: 0, heading: 0 }, -30 + i * 10)
    ).flat();
    const next = suggestViewpoint(fixed, roomW ?? 0, roomD ?? 0, obstacles);
    const guided = Array.from({ length: 10 }, (_, i) =>
      scan({ ...next, heading: 0 }, -30 + i * 10)
    ).flat();
    const result = {
      source: "simulated",
      roomW,
      roomD,
      height,
      noise,
      range,
      obstacles,
      fixed: coverageStats(fixed, roomW ?? 0, roomD ?? 0),
      guidedCombined: coverageStats([...fixed, ...guided], roomW ?? 0, roomD ?? 0),
      viewpoint: next,
      assumptions:
        "Guided adds a second viewpoint, not equal scan-time or a validated protocol comparison."
    };
    saveAnalysis("Exploratory fixed + guided scan coverage", result);
    setPoints([...fixed, ...guided]);
    setSlice(guided.slice(-360));
    setLastScan(timestamp());
  };
  const evidence = () =>
    download(
      "sonaris-evidence.html",
      `<!doctype html><meta charset="utf-8"><title>SONARIS engineering evidence</title><h1>SONARIS engineering evidence</h1><p>Exported ${timestamp()}. Concept and analytical results only unless individual evidence states otherwise.</p><pre>${JSON.stringify(snapshotRef.current(), null, 2).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")}</pre>`,
      "text/html"
    );
  const panelHeading = (
    <>
      <p className={styles.eyebrow}>Engineering workspace</p>
      <h1>{tab}</h1>
      <p className={styles.muted}>Concept → Simulated → Verified → Physical test</p>
    </>
  );
  return (
    <div className={`${styles.workspace} ${present ? styles.presentation : ""}`}>
      <header className={styles.header}>
        <Link href="/sonaris/" aria-label="Return to SONARIS">
          <ArrowLeft size={18} />
        </Link>
        <Image
          src="/sonaris/brand/wordmark.png"
          alt="SONARIS"
          width={150}
          height={50}
          className={styles.logo}
        />
        <span className={styles.status}>Concept workspace · No hardware</span>
        <div className={styles.actions}>
          <button
            onClick={() => {
              if (persist()) setMessage(`Saved locally ${new Date().toLocaleTimeString()}.`);
            }}
          >
            <Save size={15} />
            Save
          </button>
          <button
            onClick={() =>
              download("sonaris-project.json", JSON.stringify(snapshotRef.current(), null, 2))
            }
          >
            <Download size={15} />
            Export
          </button>
          <button onClick={() => importRef.current?.click()}>
            <Upload size={15} />
            Import
          </button>
          <button onClick={() => setPresent((v) => !v)} aria-pressed={present}>
            <Maximize2 size={15} />
            {present ? "Exit presentation" : "Present"}
          </button>
        </div>
        <input
          ref={importRef}
          hidden
          type="file"
          accept=".json,application/json"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            if (f.size > 5e6) {
              setMessage("Project file exceeds 5 MB.");
              return;
            }
            try {
              const data = parseSnapshot(await f.text());
              if (!data) throw Error("invalid");
              autoSaveAllowed.current = false;
              restoreProject(data.project);
              restoreSettings(data.settings);
              setMessage("Project and assumptions imported. Review and Save to keep locally.");
            } catch {
              setMessage("Invalid project file; current work was preserved.");
            }
          }}
        />
      </header>
      <div className={styles.notice} role="status">
        {message}
      </div>
      <div className={styles.body}>
        <nav className={styles.navigation} aria-label="Engineering tools">
          {tabs.map((t) => (
            <button key={t} className={tab === t ? styles.active : ""} onClick={() => setTab(t)}>
              {t}
            </button>
          ))}
        </nav>
        <section className={styles.stage} aria-label="Engineering view">
          <div className={styles.toolbar}>
            <select
              aria-label="Camera view"
              value={view}
              onChange={(e) => setView(e.target.value as typeof view)}
            >
              {["isometric", "top", "front", "side", "bottom"].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
            <button onClick={() => setExploded((v) => !v)} aria-pressed={exploded}>
              Explode
            </button>
            <button onClick={() => setSectioned((v) => !v)} aria-pressed={sectioned}>
              Section
            </button>
            <button
              onClick={() => {
                setRover({ x: 0, z: 0, heading: 0 });
                setPath([]);
                const origin={x:0,z:0,heading:0};setCommanded(origin);commandedRef.current=origin;setWheelAngles([0,0,0,0]);
                setRunning(false);
              }}
            >
              <RotateCcw size={14} />
              Reset pose
            </button>
          </div>
          <EngineeringViewport
            components={project.components}
            selectedId={selectedId}
            onSelect={(id) => {
              setSelectedId(id);
              if (tab !== "Fabrication") setTab("Components");
            }}
            view={view}
            exploded={exploded}
            sectioned={sectioned}
            points={showPoints ? points : []}
            room={{ width: roomW ?? 6, depth: roomD ?? 5 }}
            rover={rover}
            mode={
              tab === "Mapping" || tab === "Motion"
                ? "mapping"
                : tab === "Fabrication"
                  ? "fabrication"
                  : "assembly"
            }
            modelUrl={modelUrl}
            obstacles={obstacles}
            showRoom={showRoom}
            path={path}
            driveGeometry={radius&&halfLength&&halfWidth?{radius,halfLength,halfWidth,wheelAngles}:undefined}
          />
          <div className={styles.stageFooter}>
            <span>Orbit: drag · Zoom: scroll · Select: click</span>
            <span>{points.length.toLocaleString()} simulated points</span>
          </div>
        </section>
        <aside className={styles.panel}>
          {panelHeading}
          {tab === "Components" && selected && (
            <>
              <label>
                Find component
                <input
                  value={search}
                  onChange={(e) => {
                    const term = e.target.value;
                    setSearch(term);
                    const found = project.components.find((c) =>
                      `${c.name} ${c.model}`.toLowerCase().includes(term.toLowerCase())
                    );
                    if (found) setSelectedId(found.id);
                  }}
                  placeholder="Search inventory"
                />
              </label>
              <select
                aria-label="Component"
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
              >
                {project.components
                  .filter(
                    (c) =>
                      c.id === selectedId ||
                      `${c.name} ${c.model}`.toLowerCase().includes(search.toLowerCase())
                  )
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ×{c.quantity || "?"}
                    </option>
                  ))}
              </select>
              <h2>{selected.name}</h2>
              <div className={styles.actions}>
                <button
                  onClick={() => {
                    const quote = (v: unknown) =>
                      `"${String(v ?? "Unresolved").replaceAll('"', '""')}"`;
                    download(
                      "sonaris-bom.csv",
                      "Name,Model,Quantity,Unit cost,Mass kg,Procurement,Evidence\n" +
                        project.components
                          .map((c) =>
                            [c.name, c.model, c.quantity, c.cost, c.massKg, c.procurement, c.source]
                              .map(quote)
                              .join(",")
                          )
                          .join("\n"),
                      "text/csv"
                    );
                  }}
                >
                  Export BOM
                </button>
                <button
                  disabled={
                    selected.quantity < 2 ||
                    selected.quantity > 100 ||
                    project.components.length + selected.quantity > 1000
                  }
                  onClick={() => {
                    const units = Array.from({ length: selected.quantity }, (_, i) => ({
                      ...selected,
                      id: `${selected.id}-${uid()}`,
                      name: `${selected.name} ${i + 1}`,
                      quantity: 1,
                      dimensions: selected.dimensions
                        ? ([...selected.dimensions] as [number, number, number])
                        : null,
                      position: [...selected.position] as [number, number, number]
                    }));
                    setProject((p) => ({
                      ...p,
                      components: [...p.components.filter((c) => c.id !== selected.id), ...units],
                      connections: p.connections.map((c) => ({
                        ...c,
                        from: c.from === selected.id ? units[0].id : c.from,
                        to: c.to === selected.id ? units[0].id : c.to
                      }))
                    }));
                    setConfirmedPlacementIds((ids) => ids.filter((id) => id !== selected.id));
                    setSelectedId(units[0].id);
                    setMessage(
                      "Instances separated. Existing group connections now point to the first instance only; wire each instance explicitly. Placements remain unapproved."
                    );
                  }}
                >
                  Split quantity into instances
                </button>
              </div>
              <TextField
                label="Manufacturer / exact model"
                value={selected.model}
                onChange={(model) => update({ model })}
              />
              <div className={styles.fields}>
                <NumberField
                  label="Quantity (0 = unresolved)"
                  value={selected.quantity}
                  min={0}
                  max={100}
                  step={1}
                  onChange={(n) => update({ quantity: Math.floor(n ?? 0) })}
                />
                <NumberField
                  label="Mass per item (kg)"
                  value={selected.massKg}
                  min={0}
                  onChange={(massKg) => update({ massKg })}
                />
              </div>
              <label>
                Evidence state
                <select
                  value={selected.status}
                  onChange={(e) => {
                    if (
                      ["verified", "physical"].includes(e.target.value) &&
                      (!selected.source.trim() || selected.source.startsWith("Approved proposal"))
                    ) {
                      setMessage(
                        "Add a specific datasheet or physical test reference before assigning verified status."
                      );
                      return;
                    }
                    update({ status: e.target.value as Component["status"] });
                  }}
                >
                  {["concept", "simulated", "verified", "physical"].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label>
                Origin
                <select
                  value={selected.kind}
                  onChange={(e) => update({ kind: e.target.value as Component["kind"] })}
                >
                  <option value="purchased">Purchased component</option>
                  <option value="fabricated">Custom fabricated</option>
                </select>
              </label>
              <h3>Envelope (mm)</h3>
              <p className={styles.muted}>
                Only enter sourced dimensions. Full model accuracy is not implied by an envelope.
              </p>
              <div className={styles.fields}>
                {["Length X", "Width Z", "Height Y"].map((label, i) => (
                  <NumberField
                    key={label}
                    label={label}
                    value={dimensionDraft[selected.id]?.[i] ?? selected.dimensions?.[i] ?? null}
                    min={0.01}
                    onChange={(n) => {
                      const d = [
                        ...(dimensionDraft[selected.id] ??
                          selected.dimensions ?? [null, null, null])
                      ];
                      d[i] = n;
                      setDimensionDraft((old) => ({ ...old, [selected.id]: d }));
                      if (d.every((v) => v !== null && v > 0))
                        update({ dimensions: d as [number, number, number] });
                      else if (n === null) update({ dimensions: null });
                    }}
                  />
                ))}
              </div>
              <button
                onClick={() => {
                  update({ dimensions: null });
                  setDimensionDraft((d) => ({ ...d, [selected.id]: [null, null, null] }));
                }}
              >
                Clear envelope
              </button>
              <h3>Envelope interference</h3>
              <p>
                {clashes.length
                  ? `${clashes.length} potential collision pairs`
                  : "No known-envelope collisions; unknown parts are excluded."}
              </p>
              {clashes.slice(0, 10).map(([a, b]) => (
                <p key={`${a}-${b}`} className={styles.muted}>
                  {a} ↔ {b}
                </p>
              ))}
              <label className={styles.check}>
                <input
                  type="checkbox"
                  checked={confirmedPlacementIds.includes(selected.id)}
                  onChange={(e) =>
                    setConfirmedPlacementIds((ids) =>
                      e.target.checked
                        ? [...ids, selected.id]
                        : ids.filter((id) => id !== selected.id)
                    )
                  }
                />
                Placement is explicitly reviewed (group centroid)
              </label>
              <h3>Placement (m)</h3>
              <div className={styles.fields}>
                {["X", "Y", "Z"].map((label, i) => (
                  <NumberField
                    key={label}
                    label={label}
                    value={selected.position[i]}
                    onChange={(n) => {
                      const p = [...selected.position] as [number, number, number];
                      p[i] = n ?? 0;
                      update({ position: p });
                    }}
                  />
                ))}
              </div>
              <NumberField
                label="Yaw orientation (°)"
                value={selected.rotation}
                onChange={(rotation) => update({ rotation: rotation ?? 0 })}
              />
              <h3>Electrical inputs, per item</h3>
              <div className={styles.fields}>
                <NumberField
                  label="Rail voltage (V)"
                  value={selected.voltage}
                  min={0}
                  onChange={(voltage) => update({ voltage })}
                />
                <NumberField
                  label="Nominal current (A)"
                  value={selected.current}
                  min={0}
                  onChange={(current) => update({ current })}
                />
                <NumberField
                  label="Peak current (A)"
                  value={selected.peakCurrent}
                  min={0}
                  onChange={(peakCurrent) => update({ peakCurrent })}
                />
              </div>
              <NumberField
                label="Unit cost (project currency)"
                value={selected.cost}
                min={0}
                onChange={(cost) => update({ cost })}
              />
              <TextField
                label="Procurement status"
                value={selected.procurement}
                onChange={(procurement) => update({ procurement })}
              />
              <TextField
                label="Datasheet / test evidence reference"
                value={selected.source}
                onChange={(source) => update({ source })}
              />
              <label>
                Mounts, pinout, connectors, keep-outs and thermal notes
                <textarea
                  value={selected.notes}
                  onChange={(e) => update({ notes: e.target.value })}
                />
              </label>
              <p className={styles.muted}>
                Mounting holes, shafts, thermal limits and pinouts need manufacturer drawings. They
                are not inferred from renders.
              </p>
            </>
          )}
          {tab === "Connections" && (
            <>
              <p>Connection register</p>
              <ConnectionDiagram
                components={project.components}
                connections={project.connections}
                onSelect={(id) => {
                  setSelectedId(id);
                  setTab("Components");
                }}
              />
              <p className={styles.muted}>
                Nominal screening only. Pinouts, polarity, logic levels, fault protection and wire
                derating still need engineering evidence.
              </p>
              <label>
                Source
                <select value={from} onChange={(e) => setFrom(e.target.value)}>
                  {project.components.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Destination
                <select value={to} onChange={(e) => setTo(e.target.value)}>
                  {project.components.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className={styles.fields}>
                <NumberField label="Voltage (V)" value={wireV} min={0} onChange={setWireV} />
                <NumberField
                  label="Expected current (A)"
                  value={wireI}
                  min={0}
                  onChange={setWireI}
                />
                <NumberField
                  label="Wire rating (A)"
                  value={wireRating}
                  min={0}
                  onChange={setWireRating}
                />
              </div>
              <TextField
                label="Connector and pins / polarity"
                value={connector}
                onChange={setConnector}
              />
              <TextField
                label="Fuse / protection reference"
                value={protection}
                onChange={setProtection}
              />
              <button onClick={addConnection}>
                <Plus size={14} />
                Add connection
              </button>
              {project.connections.length === 0 && (
                <p className={styles.muted}>
                  No connections declared. Unverified wires are not drawn as a valid circuit.
                </p>
              )}
              {project.connections.map((c) => (
                <article key={c.id}>
                  <strong>
                    {project.components.find((p) => p.id === c.from)?.name} →{" "}
                    {project.components.find((p) => p.id === c.to)?.name}
                  </strong>
                  <p>{validateConnection(c, project.components)}</p>
                  <p className={styles.muted}>
                    {fmt(c.voltage, " V")} · {fmt(c.current, " A")} ·{" "}
                    {c.connector || "Connector unresolved"}
                  </p>
                  <button
                    aria-label="Remove connection"
                    onClick={() =>
                      setProject((p) => ({
                        ...p,
                        connections: p.connections.filter((w) => w.id !== c.id)
                      }))
                    }
                  >
                    <Trash2 size={14} />
                  </button>
                </article>
              ))}
            </>
          )}
          {tab === "Power" && (
            <>
              <p className={styles.muted}>
                Analytical load model, not live telemetry. Battery 12 V-class / 12 Ah is a proposal
                input; efficiency and duty are editable assumptions.
              </p>
              <label>
                Scenario
                <select value={scenario} onChange={(e) => setScenario(e.target.value)}>
                  {scenarios.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label className={styles.check}>
                <input
                  type="checkbox"
                  checked={usePeak}
                  onChange={(e) => setUsePeak(e.target.checked)}
                />
                Use entered peak currents
              </label>
              <p className={styles.muted}>
                Scenario names label saved runs. They do not automatically invent load profiles:
                enter each component&apos;s current for the chosen condition.
              </p>
              <div className={styles.fields}>
                <NumberField
                  label="Battery voltage (V)"
                  value={batteryV}
                  min={0.01}
                  onChange={setBatteryV}
                />
                <NumberField
                  label="Capacity (Ah)"
                  value={capacity}
                  min={0.01}
                  onChange={setCapacity}
                />
                <NumberField
                  label="Efficiency (0–1)"
                  value={efficiency}
                  min={0.01}
                  max={1}
                  onChange={setEfficiency}
                />
                <NumberField
                  label="Duty fraction (0–1)"
                  value={duty}
                  min={0.01}
                  max={1}
                  onChange={setDuty}
                />
              </div>
              <dl>
                <dt>Total load</dt>
                <dd>{fmt(power.watts, " W")}</dd>
                <dt>Predicted runtime</dt>
                <dd>{fmt(power.runtimeHours, " h")}</dd>
                <dt>Two-hour target</dt>
                <dd>
                  {power.runtimeHours === null
                    ? "Unresolved"
                    : power.runtimeHours >= 2
                      ? "Model meets target"
                      : "Model falls short"}
                </dd>
              </dl>
              <p className={styles.muted}>{power.reason}</p>
              {power.missing.length > 0 && (
                <details>
                  <summary>{power.missing.length} unresolved loads</summary>
                  {power.missing.map((s) => (
                    <p key={s}>{s}</p>
                  ))}
                </details>
              )}
              <button
                onClick={() => {
                  const run = {
                    name: scenario,
                    watts: power.watts,
                    runtime: power.runtimeHours,
                    date: timestamp()
                  };
                  setScenarioRecords((r) => [...r, run]);
                  setProject((p) => ({
                    ...p,
                    decisions: [
                      ...p.decisions,
                      {
                        id: uid(),
                        title: `Power scenario: ${scenario}`,
                        detail: JSON.stringify({
                          ...run,
                          batteryV,
                          capacity,
                          efficiency,
                          duty,
                          usePeak,
                          loads: project.components.map((c) => ({
                            id: c.id,
                            quantity: c.quantity,
                            voltage: c.voltage,
                            current: c.current,
                            peakCurrent: c.peakCurrent
                          }))
                        }),
                        date: run.date
                      }
                    ]
                  }));
                }}
              >
                Save scenario result
              </button>
              {scenarioRecords.map((r, i) => (
                <article key={i}>
                  <strong>{r.name}</strong>
                  <p>
                    {fmt(r.watts, " W")} · {fmt(r.runtime, " h")}
                  </p>
                  <small>{r.date}</small>
                </article>
              ))}
              <p className={styles.muted}>
                Voltage sag, inrush, thermal margin and stall torque remain unresolved until
                battery, converter and motor curves are supplied. A constant-load model does not
                validate rail stability.
              </p>
            </>
          )}
          {tab === "Power" && (
            <>
              <h3>Source, converter and thermal models</h3>
              <p className={styles.muted}>
                Steady-state analytical checks. Supply actual resistance, continuous output limit
                and thermal resistance; these do not model inrush or protection response.
              </p>
              <div className={styles.fields}>
                {analysisField("rInternal", "Source resistance (Ω)", 0)}
                {analysisField("converterV", "Converter output (V)", 0)}
                {analysisField("converterA", "Converter output (A)", 0)}
                {analysisField("converterLimit", "Continuous output limit (A)", 0)}
                {analysisField("ambient", "Ambient temperature (°C)")}
                {analysisField("theta", "Thermal resistance (°C/W)", 0)}
                {analysisField("maxTemp", "Maximum temperature (°C)")}
              </div>
              <dl>
                <dt>Loaded source voltage</dt>
                <dd>{fmt(sag?.loadedV ?? null, " V")}</dd>
                <dt>Source current / internal loss</dt>
                <dd>
                  {fmt(sag?.currentA ?? null, " A")} / {fmt(sag?.lossW ?? null, " W")}
                </dd>
                <dt>Converter input current / loss</dt>
                <dd>
                  {fmt(converted?.inputA ?? null, " A")} / {fmt(converted?.lossW ?? null, " W")}
                </dd>
                <dt>Converter output overload</dt>
                <dd>
                  {converted
                    ? converted.overloaded
                      ? "Exceeds supplied limit"
                      : "Within supplied continuous limit"
                    : "Unresolved"}
                </dd>
                <dt>Lumped temperature / margin</dt>
                <dd>
                  {fmt(heat?.estimatedTemp ?? null, " °C")} / {fmt(heat?.margin ?? null, " °C")}
                </dd>
              </dl>
              <button
                onClick={() =>
                  saveAnalysis("Electrical analytical checks", {
                    analysis,
                    batteryV,
                    efficiency,
                    power,
                    sag,
                    converted,
                    heat
                  })
                }
              >
                Save electrical analysis
              </button>
            </>
          )}
          {tab === "Motion" && (
            <>
              <p className={styles.muted}>
                Ideal mecanum kinematics with user-set slip; no dynamics or validated torque/current
                model. Wheel diameter 127 mm comes from the proposal.
              </p>
              <div className={styles.fields}>
                <NumberField label="Forward (m/s)" value={vx} min={-1} max={1} onChange={setVx} />
                <NumberField label="Left (m/s)" value={vy} min={-1} max={1} onChange={setVy} />
                <NumberField label="Yaw (rad/s)" value={yaw} min={-2} max={2} onChange={setYaw} />
                <NumberField
                  label="Wheel radius (m)"
                  value={radius}
                  min={0.001}
                  onChange={setRadius}
                />
                <NumberField
                  label="Half wheelbase (m)"
                  value={halfLength}
                  min={0.001}
                  onChange={setHalfLength}
                />
                <NumberField
                  label="Half track (m)"
                  value={halfWidth}
                  min={0.001}
                  onChange={setHalfWidth}
                />
                <NumberField
                  label="Slip fraction"
                  value={slip}
                  min={0}
                  max={1}
                  onChange={setSlip}
                />
                <NumberField
                  label="Deceleration (m/s²)"
                  value={decel}
                  min={0.001}
                  onChange={setDecel}
                />
              </div>
              <div className={styles.actions}>
                <button disabled={!connected} onClick={() => setRunning((v) => !v)}>
                  {running ? <Square size={14} /> : <Play size={14} />}{" "}
                  {running ? "Pause" : "Run simulation"}
                </button>
                <button
                  onClick={() => {
                    setRunning(false);
                    setMessage(
                      "Simulated emergency stop: integration paused. This does not operate physical hardware."
                    );
                  }}
                >
                  Emergency stop
                </button>
              </div>
              <label className={styles.check}>
                <input
                  type="checkbox"
                  checked={connected}
                  onChange={(e) => setConnected(e.target.checked)}
                />
                Simulated communications available
              </label>
              <dl>
                <dt>Commanded pose (no slip)</dt><dd>{fmt(commanded.x,' m')}, {fmt(commanded.z,' m')}, {fmt(commanded.heading,'°')}</dd><dt>Predicted pose with assumed slip</dt>
                <dd>
                  {fmt(rover.x, " m")}, {fmt(rover.z, " m")}, {fmt(rover.heading, "°")}
                </dd>
                <dt>Wheel RPM (FL, FR, RL, RR)</dt>
                <dd>
                  {speeds
                    ? speeds.map((w) => fmt((w * 60) / (2 * Math.PI))).join(" / ")
                    : "Enter measured geometry"}
                </dd>
                <dt>Predicted travel speed</dt>
                <dd>{fmt(Math.hypot(vx ?? 0, vy ?? 0) * (1 - (slip ?? 0)), " m/s")}</dd>
                <dt>Analytical stopping distance</dt>
                <dd>
                  {decel
                    ? fmt((Math.hypot(vx ?? 0, vy ?? 0)*(1-(slip??0))) ** 2 / (2 * decel), " m")
                    : "Unresolved"}
                </dd>
              </dl>
              <h3>Viewpoints / manual path</h3>
              <div className={styles.fields}>
                <NumberField label="Waypoint X (m)" value={pointX} onChange={setPointX} />
                <NumberField label="Waypoint Z (m)" value={pointZ} onChange={setPointZ} />
              </div>
              <button
                onClick={() => setWaypoints((w) => [...w, { x: pointX ?? 0, z: pointZ ?? 0 }])}
              >
                Add waypoint
              </button>
              {waypoints.map((w, i) => (
                <div key={i} className={styles.row}>
                  <span>
                    {i + 1}. {w.x} m, {w.z} m
                  </span>
                  <button
                    onClick={() => {
                      setRunning(false);
                      setRover((r) => ({ ...r, ...w }));
                    }}
                  >
                    Place at viewpoint
                  </button>
                  <button
                    aria-label={`Remove waypoint ${i + 1}`}
                    onClick={() => setWaypoints((p) => p.filter((_, j) => i !== j))}
                  >
                    ×
                  </button>
                </div>
              ))}
              <p className={styles.muted}>
                Viewpoint placement is not autonomous path following. A physical watchdog needs
                measured stop initiation and three-trial evidence.
              </p>
            </>
          )}
          {tab === "Mapping" && (
            <>
              <p className={styles.muted}>
                Deterministic synthetic ray intersections. Room, height and noise are scenario
                assumptions. No connected LiDAR.
              </p>
              <div className={styles.fields}>
                <NumberField
                  label="Room width (m)"
                  value={roomW}
                  min={0.5}
                  max={100}
                  onChange={setRoomW}
                />
                <NumberField
                  label="Room depth (m)"
                  value={roomD}
                  min={0.5}
                  max={100}
                  onChange={setRoomD}
                />
                <NumberField
                  label="Sensor elevation (m)"
                  value={height}
                  min={0.01}
                  onChange={setHeight}
                />
                <NumberField
                  label="Tilt (°)"
                  value={tilt}
                  min={-30}
                  max={60}
                  step={1}
                  onChange={setTilt}
                />
                <NumberField
                  label="Range cap (m)"
                  value={range}
                  min={0.1}
                  max={30}
                  onChange={setRange}
                />
                <NumberField
                  label="Noise envelope (m)"
                  value={noise}
                  min={0}
                  max={1}
                  onChange={setNoise}
                />
                <NumberField
                  label="Rover X (m)"
                  value={rover.x}
                  onChange={(n) => setRover((r) => ({ ...r, x: n ?? 0 }))}
                />
                <NumberField
                  label="Rover Z (m)"
                  value={rover.z}
                  onChange={(n) => setRover((r) => ({ ...r, z: n ?? 0 }))}
                />
                <NumberField
                  label="Heading (°)"
                  value={rover.heading}
                  onChange={(n) => setRover((r) => ({ ...r, heading: n ?? 0 }))}
                />
              </div>
              <div className={styles.actions}>
                <button onClick={() => capture()}>Capture 2D slice</button>
                <button onClick={() => capture(true)}>Sweep −30° to +60°</button>
                <button
                  onClick={() => {
                    setPoints([]);
                    setSlice([]);
                    setLastScan("");
                  }}
                >
                  Clear points
                </button>
              </div>
              <label className={styles.check}>
                <input
                  type="checkbox"
                  checked={showPoints}
                  onChange={(e) => setShowPoints(e.target.checked)}
                />
                Point cloud
              </label>
              <label className={styles.check}>
                <input
                  type="checkbox"
                  checked={showRoom}
                  onChange={(e) => setShowRoom(e.target.checked)}
                />
                Reference room
              </label>
              <p className={styles.muted}>
                Last synthetic capture: {lastScan || "None"}. At most 50,000 points retained.
              </p>
              <button
                disabled={!points.length}
                onClick={() =>
                  download(
                    "sonaris-simulated-cloud.csv",
                    "x_m,y_m,z_m,source\n" +
                      points.map((p) => `${p.x},${p.y},${p.z},simulated`).join("\n"),
                    "text/csv"
                  )
                }
              >
                Export simulated points
              </button>
              <h3>Reference coverage</h3>
              <p>
                {fmt(coverage.percent, "%")} of declared wall cells ({coverage.observedCells}/
                {coverage.totalCells}). This is synthetic coverage, not measured completeness.
              </p>
              <button
                onClick={() => {
                  const next = suggestViewpoint(points, roomW ?? 0, roomD ?? 0, obstacles);
                  setWaypoints((w) => [...w, { x: next.x, z: next.z }]);
                  setMessage(
                    next.reason +
                      " Scorer assumes a 0.5 m sensor height, 30 m range and zero noise; custom captures use your entered inputs."
                  );
                }}
              >
                Suggest next viewpoint
              </button>
              <button onClick={compareMapping}>Compare fixed + additional guided viewpoint</button>
              <label className={styles.check}>
                <input
                  type="checkbox"
                  checked={showSlice}
                  onChange={(e) => setShowSlice(e.target.checked)}
                />
                Inspect last scan top projection
              </label>
              {showSlice && (
                <ScanPlot points={slice} rover={rover} width={roomW ?? 6} depth={roomD ?? 5} />
              )}
              <h3>Environment objects</h3>
              <button
                onClick={() =>
                  setObstacles((o) => [
                    ...o,
                    { id: uid(), x: 0, z: 1, width: 1, depth: 0.5, height: 1 }
                  ])
                }
              >
                Add scenario obstacle
              </button>
              {obstacles.map((o) => (
                <article key={o.id}>
                  <div className={styles.fields}>
                    {(["x", "z", "width", "depth", "height"] as const).map((k) => (
                      <NumberField
                        key={k}
                        label={`${k} (m)`}
                        value={o[k]}
                        min={["x", "z"].includes(k) ? undefined : 0.01}
                        onChange={(n) =>
                          setObstacles((a) =>
                            a.map((v) => (v.id === o.id ? { ...v, [k]: n ?? o[k] } : v))
                          )
                        }
                      />
                    ))}
                  </div>
                  <button onClick={() => setObstacles((a) => a.filter((v) => v.id !== o.id))}>
                    Remove obstacle
                  </button>
                </article>
              ))}
              <p className={styles.muted}>
                Coverage, registration uncertainty and guided-viewpoint optimisation require a
                declared reference and pose-error model; visual point density is not an accuracy
                score.
              </p>
            </>
          )}
          {tab === "Fabrication" && (
            <>
              <p>
                Verified bed footprint: 300 × 300 mm. Z and process tolerances remain unverified.
              </p>
              <label>
                Part
                <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
                  {project.components.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <NumberField
                label="Usable printer Z (mm), once verified"
                value={bedZ}
                min={1}
                onChange={setBedZ}
              />
              <p>
                {fit
                  ? `${fit.fitsXY ? "Fits XY footprint" : "Requires reorientation or subdivision"} · ${fit.zStatus}`
                  : "Enter sourced part dimensions in Components first."}
              </p>
              {selected?.dimensions && (
                <button onClick={() => setPrintRotated((v) => !v)}>
                  {printRotated ? "Reset print orientation" : "Rotate print footprint 90°"}
                </button>
              )}
              <h3>Print estimate inputs</h3>
              <div className={styles.fields}>
                <NumberField
                  label="Slicer material volume (cm³)"
                  value={volume}
                  min={0}
                  onChange={setVolume}
                />
                <NumberField
                  label="Material density (g/cm³)"
                  value={density}
                  min={0.01}
                  onChange={setDensity}
                />
                <NumberField
                  label="Material cost per kg"
                  value={costKg}
                  min={0}
                  onChange={setCostKg}
                />
                <NumberField
                  label="Effective deposition (cm³/h)"
                  value={flow}
                  min={0.01}
                  onChange={setFlow}
                />
              </div>
              <dl>
                <dt>Estimated material mass</dt>
                <dd>
                  {volume !== null && density !== null ? fmt(volume * density, " g") : "Unresolved"}
                </dd>
                <dt>Estimated material cost</dt>
                <dd>
                  {volume !== null && density !== null && costKg !== null
                    ? fmt(((volume * density) / 1000) * costKg)
                    : "Unresolved"}
                </dd>
                <dt>Ideal deposition time</dt>
                <dd>{volume !== null && flow ? fmt(volume / flow, " h") : "Unresolved"}</dd>
              </dl>
              <p className={styles.muted}>
                Not a slicer prediction; excludes supports, travel, heating and finishing. Do not
                use envelope volume as filament volume.
              </p>
              <h3>CAD reference</h3>
              <label>
                Import GLB reference (local only)
                <input
                  type="file"
                  accept=".glb"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    if (f.size > 25e6) {
                      setMessage("GLB reference exceeds 25 MB.");
                      return;
                    }
                    setModelUrl(URL.createObjectURL(f));
                    setModelName(f.name);
                  }}
                />
              </label>
              <p className={styles.muted}>
                {modelName || "No model loaded"}. Imported visualization is not authoritative
                Onshape CAD. Save document/revision links in Records; local model files must be
                re-imported after reload.
              </p>
              <button
                disabled={!modelUrl}
                onClick={() => {
                  setModelUrl(undefined);
                  setModelName("");
                }}
              >
                Remove model reference
              </button>
            </>
          )}
          {tab === "Structure" && (
            <>
              <h3>Mass and stability</h3>
              <p className={styles.muted}>
                Requires complete masses and explicit centroid placement confirmation for every
                group. Split physically separated instances before treating group centroids as a
                full assembly.
              </p>
              <dl>
                <dt>Mass</dt>
                <dd>{fmt(massProps?.massKg ?? null, " kg")}</dd>
                <dt>Centre of mass X / Y / Z</dt>
                <dd>
                  {massProps
                    ? massProps.centerOfMass.map((v) => fmt(v, " m")).join(" / ")
                    : "Unresolved"}
                </dd>
                <dt>Static projection within support rectangle</dt>
                <dd>
                  {massProps && halfLength && halfWidth
                    ? Math.abs(massProps.centerOfMass[0]) < halfLength &&
                      Math.abs(massProps.centerOfMass[2]) < halfWidth
                      ? "Inside assumed support rectangle"
                      : "Outside assumed support rectangle"
                    : "Enter wheelbase/track in Motion and complete mass data"}
                </dd>
              </dl>
              <h3>Beam approximation</h3>
              <p className={styles.muted}>
                Simply supported beam, central point load, linear elastic small deflection. Not
                chassis FEA or a strength/fatigue certification.
              </p>
              <div className={styles.fields}>
                {analysisField("force", "Central force (N)", 0)}
                {analysisField("span", "Beam span (m)", 0)}
                {analysisField("elasticity", "Young’s modulus (Pa)", 0)}
                {analysisField("inertia", "Second moment of area (m⁴)", 0)}
              </div>
              <p>Predicted deflection: {fmt(bending === null ? null : bending * 1000, " mm")}</p>
              <button
                onClick={() =>
                  saveAnalysis("Mechanical analytical checks", {
                    analysis,
                    massProps,
                    components: project.components,
                    confirmedPlacementIds,
                    halfLength,
                    halfWidth,
                    bending
                  })
                }
              >
                Save mechanical analysis
              </button>
              <p className={styles.muted}>
                Vibration, fastener accessibility, bend radii, cooling airflow, mount strength and
                dynamic rollover remain engineering checks; envelope overlap alone does not validate
                an assembly.
              </p>
            </>
          )}
          {tab === "Records" && (
            <>
              <label>
                Record type
                <select
                  value={recordKind}
                  onChange={(e) => setRecordKind(e.target.value as typeof recordKind)}
                >
                  <option value="decisions">Decisions / milestones / assignments</option>
                  <option value="risks">Risks / unresolved assumptions</option>
                  <option value="revisions">CAD / Onshape revisions</option>
                </select>
              </label>
              <TextField label="Title" value={recordTitle} onChange={setRecordTitle} />
              <label>
                Evidence, owner, date, revision link and rationale
                <textarea value={recordDetail} onChange={(e) => setRecordDetail(e.target.value)} />
              </label>
              <button disabled={!recordTitle.trim()} onClick={addRecord}>
                Save record
              </button>
              {project[recordKind].length === 0 && <p className={styles.muted}>No records yet.</p>}
              {project[recordKind].map((r) => (
                <article key={r.id}>
                  <strong>{r.title}</strong>
                  <p className={styles.pre}>{r.detail}</p>
                  <small>{r.date}</small>
                  <button
                    onClick={() =>
                      setProject((p) => ({
                        ...p,
                        [recordKind]: p[recordKind].filter((v) => v.id !== r.id)
                      }))
                    }
                  >
                    Remove record
                  </button>
                </article>
              ))}
              <p className={styles.muted}>
                Onshape synchronization is not connected. Record authoritative document, element and
                version references here; a browser model is not a manufacturing release.
              </p>
              <button onClick={evidence}>Export evidence report</button>
            </>
          )}
          {tab === "Validation" && (
            <>
              <h3>Proposal acceptance criteria</h3>
              <p className={styles.muted}>
                No acceptance criterion is marked passed by this workspace.
              </p>
              {acceptance.map(([name, target]) => (
                <div className={styles.row} key={name}>
                  <span>{name}</span>
                  <strong>{target}</strong>
                </div>
              ))}
              <dl>
                <dt>Total mass</dt>
                <dd>{fmt(mass, " kg")}</dd>
                <dt>Complete BOM cost</dt>
                <dd>{fmt(totalCost)}</dd>
                <dt>Manufacturer-verified envelopes</dt>
                <dd>
                  {
                    project.components.filter(
                      (c) => c.dimensions && ["verified", "physical"].includes(c.status)
                    ).length
                  }{" "}
                  / {project.components.length}
                </dd>
              </dl>
              <h3>Record a user-declared test result</h3>
              <p className={styles.muted}>
                Only enter a real test result with its protocol and evidence reference. Browser
                simulation is not a physical trial.
              </p>
              <label>
                Metric
                <select value={metric} onChange={(e) => setMetric(e.target.value)}>
                  {acceptance.map(([name]) => (
                    <option key={name}>{name}</option>
                  ))}
                </select>
              </label>
              <NumberField
                label={`Measured value (${acceptance.find((a) => a[0] === metric)?.[2]})`}
                value={trialValue}
                min={0}
                onChange={setTrialValue}
              />
              <NumberField
                label="Measurement uncertainty ± (same unit)"
                value={uncertainty}
                min={0}
                onChange={setUncertainty}
              />
              <TextField
                label="Protocol group and evidence reference (same group for repeated trials)"
                value={protocol}
                onChange={setProtocol}
              />
              <button
                disabled={trialValue === null || !protocol.trim()}
                onClick={() => {
                  if (trialValue === null) return;
                  setProject((p) => ({
                    ...p,
                    trials: [
                      ...p.trials,
                      {
                        id: uid(),
                        metric,
                        value: trialValue,
                        uncertainty,
                        unit: acceptance.find((a) => a[0] === metric)?.[2] ?? "",
                        date: timestamp(),
                        protocol
                      }
                    ]
                  }));
                  setTrialValue(null);
                }}
              >
                Save unverified test record
              </button>
              {project.trials.map((t) => (
                <article key={t.id}>
                  <strong>
                    {t.metric}: {t.value} {t.unit}
                  </strong>
                  <p>{t.protocol}</p>
                  <p className={styles.muted}>
                    User-declared, not independently verified. Uncertainty ±
                    {fmt(t.uncertainty ?? null, t.unit)}. {assessTrial(t.metric, t.value)}
                  </p>
                  <small>{t.date}</small>
                  <button
                    onClick={() =>
                      setProject((p) => ({ ...p, trials: p.trials.filter((v) => v.id !== t.id) }))
                    }
                  >
                    Remove trial
                  </button>
                </article>
              ))}
              <p className={styles.muted}>
                {comparison.count} records in selected protocol; median{" "}
                {fmt(comparison.median, comparison.unit ?? "")}. {comparison.status}. Three repeated
                mapping trials per protocol are required. A single value does not establish a
                median, a p95 distribution or full-system acceptance.
              </p>
              <button onClick={evidence}>Export evidence report</button>
            </>
          )}
        </aside>
      </div>
      <footer className={styles.footer}>
        SONARIS · Local engineering notebook · Last capture {lastScan || "none"} · No
        manufacturer-verified assembly yet
      </footer>
    </div>
  );
}
