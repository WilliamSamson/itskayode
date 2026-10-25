import { validateProject, type Project } from "./sonaris-engine";

export interface WorkspaceSnapshot {
  project: Project;
  settings: Record<string, unknown>;
}

type SnapshotInput = { project: Project; settings?: Record<string, unknown> };
const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const positive = (value: unknown) => finite(value) && value > 0;
const nonnegative = (value: unknown) => finite(value) && value >= 0;
const within = (value: unknown, min: number, max: number) => finite(value) && value >= min && value <= max;
const numericRules: Record<string, (value: unknown) => boolean> = {
  batteryV: positive,
  capacity: positive,
  efficiency: (value) => within(value, 0, 1),
  duty: (value) => within(value, 0, 1),
  roomW: (value) => positive(value) && Number(value) <= 100,
  roomD: (value) => positive(value) && Number(value) <= 100,
  tilt: (value) => within(value, -30, 60),
  height: positive,
  noise: (value) => within(value, 0, 1),
  range: (value) => positive(value) && Number(value) <= 30,
  bedZ: positive,
  vx: (value) => within(value, -1, 1),
  vy: (value) => within(value, -1, 1),
  yaw: (value) => within(value, -2, 2),
  radius: positive,
  halfLength: positive,
  halfWidth: positive,
  slip: (value) => within(value, 0, 1),
  decel: positive,
  density: positive,
  costKg: nonnegative,
  volume: nonnegative,
  flow: positive
};
const isoDate = (value: unknown) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) return false;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString() === value;
};
const limitedArray = (value: unknown, max: number, check: (entry: unknown) => boolean) =>
  Array.isArray(value) && value.length <= max && value.every(check);

/** Validate saved UI assumptions as well as the engineering project before restoring either. */
export function validateSnapshot(value: unknown): value is SnapshotInput {
  if (!record(value) || !validateProject(value.project)) return false;
  if (!("settings" in value)) return true;
  if (!record(value.settings)) return false;
  for (const [key, entry] of Object.entries(value.settings)) {
    if (Object.hasOwn(numericRules, key)) {
      if (entry !== null && !numericRules[key](entry)) return false;
    } else if (key === "analysis") {
      const analysisKeys = ["rInternal", "ambient", "theta", "maxTemp", "converterV", "converterA", "converterLimit", "force", "span", "elasticity", "inertia"];
      if (!record(entry) || !Object.entries(entry).every(([name, value]) => analysisKeys.includes(name) &&
        (value === null || (name === "ambient" || name === "maxTemp" ? finite(value) : nonnegative(value))))) return false;
    } else if (key === "confirmedPlacementIds") {
      if (!limitedArray(entry, 1000, (id) => typeof id === "string")) return false;
    } else if (key === "obstacles") {
      if (!limitedArray(entry, 100, (obstacle) => record(obstacle) &&
        typeof obstacle.id === "string" && obstacle.id.trim().length > 0 &&
        finite(obstacle.x) && finite(obstacle.z) && positive(obstacle.width) &&
        positive(obstacle.depth) && positive(obstacle.height))) return false;
    } else if (key === "waypoints") {
      if (!limitedArray(entry, 1000, (point) => record(point) && finite(point.x) && finite(point.z))) return false;
    } else if (key === "scenarioRecords") {
      if (!limitedArray(entry, 1000, (scenario) => record(scenario) && typeof scenario.name === "string" &&
        (scenario.watts === null || nonnegative(scenario.watts)) &&
        (scenario.runtime === null || nonnegative(scenario.runtime)) && isoDate(scenario.date))) return false;
    } else return false;
  }
  return true;
}

/** Legacy project-only wrappers restore with empty settings; malformed saves never partially restore. */
export function parseSnapshot(raw: string): WorkspaceSnapshot | null {
  try {
    const value: unknown = JSON.parse(raw);
    if (!validateSnapshot(value)) return null;
    return { project: value.project, settings: value.settings ?? {} };
  } catch {
    return null;
  }
}
