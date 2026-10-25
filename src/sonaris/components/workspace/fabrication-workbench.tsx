"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  CHASSIS_COMPONENTS,
  FABRICATION_MATERIALS,
  calculatePartFabrication,
  type ChassisPartId,
  type FabricationMaterialId
} from "./fabrication-models";
import styles from "./fabrication-workbench.module.css";

const FabricationStage = dynamic(
  () => import("./fabrication-stage").then((mod) => mod.FabricationStage),
  {
    ssr: false,
    loading: () => (
      <div className="relative h-full min-h-[440px] w-full overflow-hidden rounded-[24px] bg-[#000000] flex flex-col items-center justify-center gap-3 font-mono text-[11px] text-[#A87914] select-none">
        <div className="flex items-center gap-2.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#1F6B42] animate-pulse" />
          <strong className="tracking-wider uppercase text-[#FFFFFF] text-[12px]">
            SONARIS · 3D Fabrication Viewport
          </strong>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-[#A09A8F]">
          <span className="inline-block h-1.5 w-24 overflow-hidden rounded-full bg-[#2A2B33]">
            <span className="block h-full w-2/3 animate-pulse rounded-full bg-[#1F6B42]" />
          </span>
          <span>Mounting 300 × 300 mm Bed Reference Standard</span>
        </div>
      </div>
    )
  }
);

export function FabricationWorkbench() {
  const [selectedPartId, setSelectedPartId] = useState<ChassisPartId>("base-plate");
  const [selectedMaterialId, setSelectedMaterialId] = useState<FabricationMaterialId>("petg-cf");
  const [isRotated90, setIsRotated90] = useState<boolean>(false);
  const [showBuildCage, setShowBuildCage] = useState<boolean>(true);
  const [explodeAmount, setExplodeAmount] = useState<number>(0);
  const [sliceHeightMm, setSliceHeightMm] = useState<number>(350);
  const [infillPercent, setInfillPercent] = useState<number>(25);
  const [wallLoops, setWallLoops] = useState<number>(4);
  const [inspectorTab, setInspectorTab] = useState<"fit" | "slicing" | "hardware">("fit");

  const currentPart = useMemo(
    () => CHASSIS_COMPONENTS.find((p) => p.id === selectedPartId) || CHASSIS_COMPONENTS[0],
    [selectedPartId]
  );

  const currentMaterial = useMemo(
    () => FABRICATION_MATERIALS.find((m) => m.id === selectedMaterialId) || FABRICATION_MATERIALS[0],
    [selectedMaterialId]
  );

  const metrics = useMemo(
    () => calculatePartFabrication(selectedPartId, selectedMaterialId, infillPercent, wallLoops),
    [selectedPartId, selectedMaterialId, infillPercent, wallLoops]
  );

  // Active footprint dimensions accounting for 90° rotation
  const partX = isRotated90 ? currentPart.widthMm : currentPart.lengthMm;
  const partY = isRotated90 ? currentPart.lengthMm : currentPart.widthMm;
  const xyFits = partX <= 300 && partY <= 300;
  const zFits = currentPart.heightMm <= 350;

  return (
    <div className={styles.workbench}>
      {/* ============================================================= */}
      {/* 1. TOP CONTROLS TOOLBAR                                       */}
      {/* ============================================================= */}
      <div className={styles.toolbar}>
        {/* Left tools: Chassis Component Switcher */}
        <div className={styles.tools}>
          <div className={styles.toolGroup}>
            {CHASSIS_COMPONENTS.map((part) => (
              <button
                key={part.id}
                type="button"
                aria-pressed={selectedPartId === part.id}
                onClick={() => {
                  setSelectedPartId(part.id);
                  if (part.id !== "full-frame") setExplodeAmount(0);
                }}
              >
                {part.id === "base-plate"
                  ? "Lower Base"
                  : part.id === "electronics-deck"
                    ? "Middle Deck"
                    : part.id === "sensor-mast"
                      ? "Sensor Mast"
                      : part.id === "motor-brackets"
                        ? "Motor Mounts (4x)"
                        : "Full Assembled Frame"}
              </button>
            ))}
          </div>
        </div>

        {/* Right tools: Material, Orientation & Enclosure Toggles */}
        <div className={styles.tools}>
          {/* Material Selection Group */}
          <div className={styles.toolGroup}>
            {FABRICATION_MATERIALS.map((mat) => (
              <button
                key={mat.id}
                type="button"
                aria-pressed={selectedMaterialId === mat.id}
                onClick={() => setSelectedMaterialId(mat.id)}
              >
                {mat.name.split(" ")[0]}
              </button>
            ))}
          </div>

          {/* Orientation & Cage Toggles */}
          <button
            type="button"
            aria-pressed={isRotated90}
            onClick={() => setIsRotated90((r) => !r)}
            title="Rotate part 90 degrees on bed"
          >
            {isRotated90 ? "Orient: 90°" : "Orient: 0°"}
          </button>

          <button
            type="button"
            aria-pressed={showBuildCage}
            onClick={() => setShowBuildCage((c) => !c)}
            title="Toggle 300×300×350mm build cage wireframe"
          >
            Cage
          </button>
        </div>
      </div>

      {/* ============================================================= */}
      {/* 2. MAIN 3D WORKSPACE STAGE & SIDEBAR                          */}
      {/* ============================================================= */}
      <div className={styles.canvasRow}>
        {/* Center Stage: Interactive Three.js 3D Viewport */}
        <div className={styles.stage}>
          <div className="relative h-full w-full">
            <FabricationStage
              selectedPartId={selectedPartId}
              selectedMaterialId={selectedMaterialId}
              isRotated90={isRotated90}
              sliceHeightMm={sliceHeightMm}
              explodeAmount={explodeAmount}
              showBuildCage={showBuildCage}
            />
          </div>

          {/* Stage Bottom Floating Telemetry Badge */}
          <div className={styles.stageLabel}>
            <div className="flex items-center gap-2 font-mono text-[10px] text-[#68655E]">
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  xyFits && zFits ? "bg-[#1F6B42]" : "bg-[#991F1F]"
                }`}
              />
              <span className="font-semibold text-[#111319]">
                {partX} × {partY} × {currentPart.heightMm} mm
              </span>
              <span>·</span>
              <span>{metrics.bedUtilizationPercent}% PEI Bed Area</span>
            </div>

            <div className="flex items-center gap-2 font-mono text-[10px] text-[#68655E]">
              <span>Infill: {infillPercent}%</span>
              <span>·</span>
              <strong className="text-[#111319] tabular-nums">
                {metrics.massGrams} g · ₦{metrics.costNgn.toLocaleString()}
              </strong>
            </div>
          </div>
        </div>

        {/* Right Inspector: Decluttered & Professional Specifications */}
        <aside className={styles.inspector} aria-label="Chassis fabrication specifications">
          <p className={styles.kicker}>
            CHASSIS FABRICATION · {currentMaterial.name.toUpperCase()}
          </p>
          <h2>{currentPart.name}</h2>
          <p className={styles.model}>{currentPart.subtitle}</p>

          <div className={styles.provenance}>
            {xyFits && zFits ? "CLEARS 300 × 300 × 350 MM ENVELOPE" : "EXCEEDS STANDARD 300 MM BED"}
          </div>

          <p className={styles.note}>{currentPart.description}</p>

          {/* Inspector Navigation Tabs */}
          <div className={styles.inspectorTabs}>
            <button
              type="button"
              aria-pressed={inspectorTab === "fit"}
              onClick={() => setInspectorTab("fit")}
            >
              Bed Fit & Bounds
            </button>
            <button
              type="button"
              aria-pressed={inspectorTab === "slicing"}
              onClick={() => setInspectorTab("slicing")}
            >
              Slicing & Mass
            </button>
            <button
              type="button"
              aria-pressed={inspectorTab === "hardware"}
              onClick={() => setInspectorTab("hardware")}
            >
              Hardware Fasteners
            </button>
          </div>

          {/* TAB 1: BED FIT & BOUNDS */}
          {inspectorTab === "fit" && (
            <div className="flex flex-col gap-2 pt-1">
              <div className={styles.paramCard}>
                <div className={styles.controlRow}>
                  <span className={styles.controlLabel}>Footprint Extent (X × Y)</span>
                  <span className={styles.controlValue}>
                    {partX} × {partY} mm
                  </span>
                </div>
                <div className={styles.controlRow}>
                  <span className="text-[10px] text-[#68655E]">Z-Axis Build Height</span>
                  <span className="font-mono text-[10px]">{currentPart.heightMm} mm</span>
                </div>
                <div className={styles.controlRow}>
                  <span className="text-[10px] text-[#68655E]">300 mm Bed Utilization</span>
                  <span className="font-mono text-[10px]">{metrics.bedUtilizationPercent}%</span>
                </div>
              </div>

              {/* Explode Stack Slider for Full Frame */}
              {selectedPartId === "full-frame" && (
                <div className={styles.paramCard}>
                  <div className={styles.controlRow}>
                    <span className={styles.controlLabel}>Assembly Explode Stack</span>
                    <span className={styles.controlValue}>{Math.round(explodeAmount * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.02"
                    value={explodeAmount}
                    onChange={(e) => setExplodeAmount(parseFloat(e.target.value))}
                    className={styles.slider}
                    aria-label="Explode assembly stack slider"
                  />
                  <div className={styles.pillTrack}>
                    <button
                      type="button"
                      onClick={() => setExplodeAmount(0)}
                      className={styles.pillBtn}
                      aria-pressed={explodeAmount === 0}
                    >
                      Assembled (0%)
                    </button>
                    <button
                      type="button"
                      onClick={() => setExplodeAmount(0.5)}
                      className={styles.pillBtn}
                      aria-pressed={explodeAmount === 0.5}
                    >
                      50% Stack
                    </button>
                    <button
                      type="button"
                      onClick={() => setExplodeAmount(1)}
                      className={styles.pillBtn}
                      aria-pressed={explodeAmount === 1}
                    >
                      100% Fully Exploded
                    </button>
                  </div>
                </div>
              )}

              {/* Slicing Height Indicator Slider */}
              <div className={styles.paramCard}>
                <div className={styles.controlRow}>
                  <span className={styles.controlLabel}>Slicing Plane Z</span>
                  <span className={styles.controlValue}>{sliceHeightMm} mm</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="350"
                  step="5"
                  value={sliceHeightMm}
                  onChange={(e) => setSliceHeightMm(parseInt(e.target.value, 10))}
                  className={styles.slider}
                  aria-label="Slicing height inspection plane slider"
                />
              </div>

              {/* Status Rationale Box */}
              <div
                className={`${styles.statusCard} ${
                  xyFits && zFits ? styles.statusGood : styles.statusError
                }`}
              >
                {xyFits && zFits ? (
                  <span className="flex items-center gap-2 font-semibold">
                    <span className="inline-block h-2 w-2 rounded-full bg-[#1F6B42]" />
                    Component bounds fit safely within the 300 × 300 × 350 mm volume.
                  </span>
                ) : (
                  <span className="flex items-center gap-2 font-semibold">
                    <span className="inline-block h-2 w-2 rounded-full bg-[#991F1F]" />
                    Total envelope exceeds 300 mm bed standard. Modular division required.
                  </span>
                )}
                <p className="mt-1 text-[10px] text-[#4A4740]">
                  {selectedPartId === "full-frame"
                    ? "The complete assembled rover is 340 × 280 × 220 mm. By dividing into modular decks (280×240 mm lower base, 260×200 mm middle deck, and 140×110 mm mast), each individual plate prints cleanly on the 300 mm build plate."
                    : "Sized for rapid additive fabrication on standard large-format FFF beds (e.g. Voron 2.4 300, Bambu Lab X1/P1, or Creality K1 Max)."}
                </p>
              </div>

              <button
                type="button"
                className={styles.seat}
                onClick={() => setIsRotated90((r) => !r)}
              >
                {isRotated90 ? "Restore Initial 0° Orientation" : "Rotate Component 90° on Bed"}
              </button>
            </div>
          )}

          {/* TAB 2: SLICING & MASS ESTIMATION */}
          {inspectorTab === "slicing" && (
            <div className="flex flex-col gap-2 pt-1">
              {/* Infill Density Slider */}
              <div className={styles.paramCard}>
                <div className={styles.controlRow}>
                  <label htmlFor="infill-slider" className={styles.controlLabel}>
                    Gyroid Infill Density
                  </label>
                  <span className={styles.controlValue}>{infillPercent}%</span>
                </div>
                <input
                  id="infill-slider"
                  type="range"
                  min="15"
                  max="100"
                  step="5"
                  value={infillPercent}
                  onChange={(e) => setInfillPercent(parseInt(e.target.value, 10))}
                  className={styles.slider}
                  aria-label="Infill density slider percentage"
                />
                <div className={styles.pillTrack}>
                  {[15, 25, 40, 60, 100].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setInfillPercent(val)}
                      className={styles.pillBtn}
                      aria-pressed={infillPercent === val}
                    >
                      {val}% {val === 25 ? "(Std)" : val === 100 ? "(Solid)" : ""}
                    </button>
                  ))}
                </div>
              </div>

              {/* Perimeter Wall Loops */}
              <div className={styles.paramCard}>
                <div className={styles.controlRow}>
                  <label htmlFor="wall-loops-slider" className={styles.controlLabel}>
                    Wall Perimeters (0.4mm Nozzle)
                  </label>
                  <span className={styles.controlValue}>{wallLoops} Loops ({(wallLoops * 0.4).toFixed(1)}mm)</span>
                </div>
                <input
                  id="wall-loops-slider"
                  type="range"
                  min="2"
                  max="6"
                  step="1"
                  value={wallLoops}
                  onChange={(e) => setWallLoops(parseInt(e.target.value, 10))}
                  className={styles.slider}
                  aria-label="Wall perimeter count slider"
                />
              </div>

              {/* Quantitative Metrics Readout */}
              <div className={styles.paramCard}>
                <div className={styles.controlRow}>
                  <span className="text-[10px] text-[#68655E]">Material Density</span>
                  <span className="font-mono text-[10px] font-semibold">{currentMaterial.densityGcm3} g/cm³</span>
                </div>
                <div className={styles.controlRow}>
                  <span className="text-[10px] text-[#68655E]">Calculated Part Mass</span>
                  <span className="font-mono text-[11px] font-bold text-[#111319]">{metrics.massGrams} grams</span>
                </div>
                <div className={styles.controlRow}>
                  <span className="text-[10px] text-[#68655E]">Estimated Print Duration</span>
                  <span className="font-mono text-[10px] font-semibold">{metrics.printTimeHours} hours</span>
                </div>
                <div className={styles.controlRow}>
                  <span className="text-[10px] text-[#68655E]">BEME Material Cost</span>
                  <span className="font-mono text-[11px] font-bold text-[#1F6B42]">₦{metrics.costNgn.toLocaleString()}</span>
                </div>
                <div className={styles.controlRow}>
                  <span className="text-[10px] text-[#68655E]">Nozzle / Bed Temperature</span>
                  <span className="font-mono text-[10px]">{currentMaterial.nozzleTemp} / {currentMaterial.bedTemp}</span>
                </div>
                <div className={styles.controlRow}>
                  <span className="text-[10px] text-[#68655E]">Tensile Yield Strength</span>
                  <span className="font-mono text-[10px]">{currentMaterial.tensileYieldMpa} MPa</span>
                </div>
              </div>

              <div className="rounded-[12px] bg-[#FFFFFF] p-3 border border-[#D0CBC0] text-[10px] text-[#68655E] leading-relaxed">
                <span className="font-bold text-[#111319]">BEME Cost Calculation: </span>
                Computed from BEME Appendix D Item 26 rate of ₦27,000 / 1 kg spool (₦27.00 per gram) for structural PETG carbon-fiber composite.
              </div>
            </div>
          )}

          {/* TAB 3: HARDWARE FASTENERS & BOM */}
          {inspectorTab === "hardware" && (
            <div className="flex flex-col gap-2 pt-1">
              <div className={styles.paramCard}>
                <span className={styles.controlLabel}>Mounting Interfaces & Holes</span>
                <span className="font-mono text-[11px] font-semibold text-[#111319] pt-1">
                  {currentPart.mountingHoles}
                </span>
                <span className="text-[10px] text-[#68655E] pt-1">
                  Manufacturing: {currentPart.manufacturingMethod}
                </span>
              </div>

              <div className={styles.paramCard}>
                <span className={styles.controlLabel}>Required Fasteners & Hardware</span>
                <ul className="flex flex-col gap-2 pt-1 text-[11px] text-[#111319]">
                  {currentPart.fasteners.map((fastener, idx) => (
                    <li key={idx} className="flex items-start gap-2 border-b border-[#E5E1D8] pb-1.5 last:border-0 last:pb-0">
                      <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[#111319] mt-1.5" />
                      <span className="font-mono text-[10px]">{fastener}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-[12px] bg-[#FFFFFF] p-3 border border-[#D0CBC0] text-[10px] text-[#68655E] leading-relaxed">
                <span className="font-bold text-[#111319]">Mechanical Assembly Protocol: </span>
                All M3 fasteners thread into brass heat-set inserts melted into 4.2 mm counter-bored bosses using a standard soldering iron at 260°C. Inserts provide &gt;1.5 kN pull-out resistance to prevent vibration loosening during mecanum omnidirectional travel.
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

export default FabricationWorkbench;
