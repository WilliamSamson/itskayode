"use client";

import { useEffect, useRef, useState, type MutableRefObject } from "react";
import { type ScanPoint } from "@/sonaris/lib/sonaris-engine";
import { PowerWorkbench } from "./power-workbench";
import { ScanWorkbench } from "./scan-workbench";
import { FabricationWorkbench } from "./fabrication-workbench";

export type NumericInput =
  | "voltage"
  | "capacity"
  | "load"
  | "efficiency"
  | "resistance"
  | "outputV"
  | "outputA"
  | "limit"
  | "tilt"
  | "height"
  | "length"
  | "width"
  | "partHeight"
  | "bedHeight";

export type CaseCache = Record<NumericInput, number | null> & {
  points: ScanPoint[];
  latest: ScanPoint[];
  steps: number;
  projection: boolean;
  scanMessage: string;
  rotated: boolean;
};

export function WorkspaceCases({
  tab,
  onPointCount,
  cache
}: {
  tab: "power" | "scan" | "fabrication";
  onPointCount: (count: number) => void;
  cache?: MutableRefObject<CaseCache | null>;
}) {
  const initial = useRef(cache?.current).current;
  const [voltage] = useState<number | null>(() => (initial ? initial.voltage : 12.8));
  const [capacity] = useState<number | null>(() => (initial ? initial.capacity : 12));
  const [load] = useState<number | null>(() => (initial ? initial.load : null));
  const [efficiency] = useState<number | null>(() =>
    initial ? initial.efficiency : 0.85
  );
  const [resistance] = useState<number | null>(() =>
    initial ? initial.resistance : null
  );
  const [outputV] = useState<number | null>(() => (initial ? initial.outputV : null));
  const [outputA] = useState<number | null>(() => (initial ? initial.outputA : null));
  const [limit] = useState<number | null>(() => (initial ? initial.limit : null));
  const [tilt] = useState<number | null>(() => (initial ? initial.tilt : 0));
  const [height] = useState<number | null>(() => (initial ? initial.height : 0.5));
  const [points] = useState<ScanPoint[]>(() => initial?.points ?? []);
  const [latest] = useState<ScanPoint[]>(() => initial?.latest ?? []);
  const [steps] = useState(initial?.steps ?? 0);
  const [projection] = useState(initial?.projection ?? false);
  const [scanMessage] = useState(initial?.scanMessage ?? "Ready.");
  const [length] = useState<number | null>(() => (initial ? initial.length : null));
  const [width] = useState<number | null>(() => (initial ? initial.width : null));
  const [partHeight] = useState<number | null>(() =>
    initial ? initial.partHeight : null
  );
  const [bedHeight] = useState<number | null>(() =>
    initial ? initial.bedHeight : null
  );
  const [rotated] = useState(initial?.rotated ?? false);

  useEffect(() => {
    if (cache)
      cache.current = {
        voltage,
        capacity,
        load,
        efficiency,
        resistance,
        outputV,
        outputA,
        limit,
        tilt,
        height,
        points,
        latest,
        steps,
        projection,
        scanMessage,
        length,
        width,
        partHeight,
        bedHeight,
        rotated
      };
  }, [
    cache,
    voltage,
    capacity,
    load,
    efficiency,
    resistance,
    outputV,
    outputA,
    limit,
    tilt,
    height,
    points,
    latest,
    steps,
    projection,
    scanMessage,
    length,
    width,
    partHeight,
    bedHeight,
    rotated
  ]);

  if (tab === "power") {
    return <PowerWorkbench />;
  }

  if (tab === "scan") {
    return <ScanWorkbench onPointCount={onPointCount} cache={cache} />;
  }

  return <FabricationWorkbench />;
}

export default WorkspaceCases;
