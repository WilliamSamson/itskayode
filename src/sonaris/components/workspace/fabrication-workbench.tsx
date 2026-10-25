"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  ADHESION_TYPES,
  CHASSIS_COMPONENTS,
  FABRICATION_MATERIALS,
  INFILL_PATTERNS,
  LAYER_HEIGHT_OPTIONS,
  PRINTER_PROFILES,
  SUPPORT_STYLES,
  calculatePartFabrication,
  formatPrintDuration,
  type AdhesionTypeId,
  type ChassisPartId,
  type FabricationMaterialId,
  type InfillPatternId,
  type LayerHeightMm,
  type PrinterProfileId,
  type SupportStyleId
} from "./fabrication-models";
import styles from "./fabrication-workbench.module.css";

const FabricationStage = dynamic(
  () => import("./fabrication-stage").then((mod) => mod.FabricationStage),
  {
    ssr: false,
    loading: () => (
      <div className="relative h-full min-h-[420px] w-full overflow-hidden bg-[var(--sonaris-deck)] flex flex-col items-center justify-center gap-2 font-mono text-[11px] text-[var(--sonaris-studio-muted)] select-none">
        <strong className="tracking-wider uppercase text-[var(--sonaris-studio-ink)] text-[12px]">
          SONARIS · 3D Slicer &amp; Fabrication Bed
        </strong>
        <span className="text-[10px]">Mounting PEI Build Plate &amp; Toolpath Engine</span>
      </div>
    )
  }
);

export function FabricationWorkbench() {
  const [selectedPartId, setSelectedPartId] = useState<ChassisPartId>("base-plate");
  const [selectedMaterialId, setSelectedMaterialId] = useState<FabricationMaterialId>("petg-cf");
  const [printerProfileId, setPrinterProfileId] = useState<PrinterProfileId>("voron-300");
  const [infillPattern, setInfillPattern] = useState<InfillPatternId>("gyroid");
  const [supportStyle, setSupportStyle] = useState<SupportStyleId>("tree-organic");
  const [adhesionType, setAdhesionType] = useState<AdhesionTypeId>("brim-8mm");
  const [layerHeightMm, setLayerHeightMm] = useState<LayerHeightMm>(0.20);
  const [infillPercent, setInfillPercent] = useState<number>(25);
  const [wallLoops, setWallLoops] = useState<number>(4);
  const [isRotated90, setIsRotated90] = useState<boolean>(false);
  const [showBuildCage, setShowBuildCage] = useState<boolean>(true);
  const [explodeAmount, setExplodeAmount] = useState<number>(0);
  const [sliceHeightMm, setSliceHeightMm] = useState<number>(350);
  const [isAutoSlicing, setIsAutoSlicing] = useState<boolean>(false);
  const [cameraView, setCameraView] = useState<"isometric" | "top" | "front" | "side">("isometric");
  const [inspectorTab, setInspectorTab] = useState<"slicer" | "machine" | "hardware">("slicer");

  const currentPart = useMemo(
    () => CHASSIS_COMPONENTS.find((p) => p.id === selectedPartId) || CHASSIS_COMPONENTS[0],
    [selectedPartId]
  );

  const currentMaterial = useMemo(
    () => FABRICATION_MATERIALS.find((m) => m.id === selectedMaterialId) || FABRICATION_MATERIALS[0],
    [selectedMaterialId]
  );

  const currentPrinter = useMemo(
    () => PRINTER_PROFILES.find((p) => p.id === printerProfileId) || PRINTER_PROFILES[0],
    [printerProfileId]
  );

  const currentPattern = useMemo(
    () => INFILL_PATTERNS.find((p) => p.id === infillPattern) || INFILL_PATTERNS[0],
    [infillPattern]
  );

  const currentSupport = useMemo(
    () => SUPPORT_STYLES.find((s) => s.id === supportStyle) || SUPPORT_STYLES[0],
    [supportStyle]
  );

  const metrics = useMemo(
    () =>
      calculatePartFabrication(selectedPartId, selectedMaterialId, infillPercent, wallLoops, {
        infillPattern,
        supportStyle,
        adhesionType,
        layerHeightMm,
        printerProfileId,
        supportEnabled: supportStyle !== "none",
        isRotated90
      }),
    [
      selectedPartId,
      selectedMaterialId,
      infillPercent,
      wallLoops,
      infillPattern,
      supportStyle,
      adhesionType,
      layerHeightMm,
      printerProfileId,
      isRotated90
    ]
  );

  // Active footprint dimensions accounting for 90° bed orientation
  const partX = isRotated90 ? currentPart.widthMm : currentPart.lengthMm;
  const partY = isRotated90 ? currentPart.lengthMm : currentPart.widthMm;
  const maxSliceTarget = Math.min(currentPrinter.bedMm[2], currentPart.heightMm + 6);
  const isSlicing = sliceHeightMm < maxSliceTarget - 1;
  const currentSliceLayer = Math.min(
    metrics.layerCount,
    Math.max(1, Math.round(sliceHeightMm / layerHeightMm))
  );

  // Continuous layer-by-layer Z-slice playback loop when `isAutoSlicing` is active
  useEffect(() => {
    if (!isAutoSlicing) return;
    let rafId = 0;
    let lastTs = performance.now();
    const topZ = Math.max(8, currentPart.heightMm + 2);

    const step = (now: number) => {
      const dt = Math.min(0.06, (now - lastTs) / 1000);
      lastTs = now;
      setSliceHeightMm((prev) => {
        const start = prev >= topZ ? 0.8 : prev;
        const speedMmPerSec = Math.max(4, topZ * 0.32);
        const next = start + dt * speedMmPerSec;
        return next >= topZ ? 0.8 : Number(next.toFixed(1));
      });
      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [isAutoSlicing, currentPart.heightMm]);

  return (
    <div className={styles.workbench}>
      <div className={styles.instrumentFrame}>
        {/* ============================================================= */}
        {/* 1. UNIFIED TOP ISLAND CONTROL BAR                             */}
        {/* ============================================================= */}
        <div className={styles.controlStrip}>
          {/* Left: Segmented Fabricated Part Switcher (6 Parts) */}
          <div className={styles.toolGroup} role="group" aria-label="Chassis fabricated components">
            {CHASSIS_COMPONENTS.map((part) => (
              <button
                key={part.id}
                type="button"
                aria-pressed={selectedPartId === part.id}
                onClick={() => {
                  setSelectedPartId(part.id);
                  setSupportStyle(part.recommendedSupport);
                  setIsAutoSlicing(false);
                  setSliceHeightMm(currentPrinter.bedMm[2]);
                }}
              >
                {part.shortTabLabel}
              </button>
            ))}
          </div>

          {/* Right: Inline Part Separation, Z-Slice Scrubber + Play, Material & Camera Toggles */}
          <div className={styles.instrumentCluster}>
            {/* Sub-Part Bed Spacing Scrubber */}
            <div className={styles.inlineScrubber}>
              <button
                type="button"
                className={styles.flatBtn}
                aria-pressed={explodeAmount > 0.01}
                onClick={() => setExplodeAmount((prev) => (prev > 0.05 ? 0 : 0.65))}
                title="Adjust sub-part spacing on build plate"
              >
                Spacing
              </button>
              <input
                type="range"
                min={0}
                max={100}
                step={2}
                value={Math.round(explodeAmount * 100)}
                onChange={(e) => setExplodeAmount(Number(e.target.value) / 100)}
                className={styles.scrubberSlider}
                aria-label="Sub-part bed spacing percentage"
              />
              <span className={styles.scrubberVal}>{Math.round(explodeAmount * 100)}%</span>
            </div>

            {/* Z-Slice Cross-Section Scrubber + Layer Playback */}
            <div className={styles.inlineScrubber}>
              <button
                type="button"
                className={styles.flatBtn}
                aria-pressed={isAutoSlicing}
                onClick={() => {
                  setIsAutoSlicing((playing) => {
                    if (!playing && sliceHeightMm >= currentPart.heightMm) {
                      setSliceHeightMm(1);
                    }
                    return !playing;
                  });
                }}
                title="Animate layer-by-layer Z-slicing toolpath from bed y=0"
              >
                {isAutoSlicing ? "Pause Slice" : "Play Slice"}
              </button>
              <input
                type="range"
                min={0.8}
                max={maxSliceTarget}
                step={0.4}
                value={Math.min(maxSliceTarget, sliceHeightMm)}
                onChange={(e) => {
                  setIsAutoSlicing(false);
                  setSliceHeightMm(Number(e.target.value));
                }}
                className={styles.scrubberSlider}
                aria-label="Z-slice height inspection plane"
              />
              <span className={styles.scrubberVal}>
                {isSlicing ? `L${currentSliceLayer}/${metrics.layerCount}` : "Full"}
              </span>
            </div>

            {/* Engineering Polymer / CNC Material Selector */}
            <div className={styles.flatGroup} role="group" aria-label="Fabrication material">
              {FABRICATION_MATERIALS.map((mat) => (
                <button
                  key={mat.id}
                  type="button"
                  className={styles.flatBtn}
                  aria-pressed={selectedMaterialId === mat.id}
                  onClick={() => {
                    setSelectedMaterialId(mat.id);
                    if (mat.type === "cnc-mill") {
                      setPrinterProfileId("cnc-6040");
                    } else if (printerProfileId === "cnc-6040") {
                      setPrinterProfileId("voron-300");
                    }
                  }}
                >
                  {mat.shortLabel}
                </button>
              ))}
            </div>

            {/* Camera Angles & Bed Orientation */}
            <div className={styles.flatGroup}>
              {(["isometric", "top", "front", "side"] as const).map((view) => (
                <button
                  key={view}
                  type="button"
                  className={styles.flatBtn}
                  aria-pressed={cameraView === view}
                  onClick={() => setCameraView(view)}
                >
                  {view === "isometric"
                    ? "Iso"
                    : view === "top"
                      ? "Top"
                      : view === "front"
                        ? "Front"
                        : "Side"}
                </button>
              ))}
              <button
                type="button"
                className={styles.flatBtn}
                aria-pressed={isRotated90}
                onClick={() => setIsRotated90((r) => !r)}
                title="Rotate part arrangement 90° on build plate"
              >
                {isRotated90 ? "90°" : "0°"}
              </button>
              <button
                type="button"
                className={styles.flatBtn}
                aria-pressed={showBuildCage}
                onClick={() => setShowBuildCage((c) => !c)}
                title="Toggle build volume wireframe cage"
              >
                Cage
              </button>
            </div>
          </div>
        </div>

        {/* ============================================================= */}
        {/* 2. EDGE-TO-EDGE 3D SLICER STAGE & ARCHITECTURAL LEDGER PANE   */}
        {/* ============================================================= */}
        <div className={styles.canvasRow}>
          {/* Left: Interactive 3D Slicer & Build Plate Viewport */}
          <div className={styles.stage}>
            <div>
              <FabricationStage
                selectedPartId={selectedPartId}
                selectedMaterialId={selectedMaterialId}
                isRotated90={isRotated90}
                sliceHeightMm={isSlicing ? sliceHeightMm : currentPrinter.bedMm[2]}
                explodeAmount={explodeAmount}
                showBuildCage={showBuildCage}
                infillPattern={infillPattern}
                supportStyle={supportStyle}
                adhesionType={adhesionType}
                infillPercent={infillPercent}
                wallLoops={wallLoops}
                printerProfileId={printerProfileId}
                cameraView={cameraView}
              />
            </div>

            {/* Quiet, card-free Stage Bottom Telemetry Line */}
            <div className={styles.stageHud}>
              <span>
                <strong className="text-[#111319] tabular-nums">
                  {partX} × {partY} × {currentPart.heightMm} mm
                </strong>
                {" · "}
                {metrics.bedUtilizationPercent}% of {currentPrinter.bedMm[0]}×
                {currentPrinter.bedMm[1]}mm Bed · {currentPart.subPartCount} nested parts on y=0
              </span>

              <span className="tabular-nums">
                {isSlicing
                  ? `Z = ${sliceHeightMm.toFixed(1)}mm (Layer ${currentSliceLayer}/${metrics.layerCount}) · `
                  : ""}
                {currentPattern.shortLabel} {infillPercent}% · {currentSupport.shortLabel} ·{" "}
                <strong className="text-[#111319]">
                  {metrics.massGrams} g{" "}
                  {metrics.filamentMeters > 0 ? `(${metrics.filamentMeters} m)` : ""} ·{" "}
                  {metrics.printTimeFormatted} · ₦{metrics.costNgn.toLocaleString()}
                </strong>
              </span>
            </div>
          </div>

          {/* Right: Hairline Architectural Slicer & CAM Specification Sheet */}
          <aside className={styles.inspector} aria-label="Slicer and fabrication specification sheet">
            <div className={styles.inspectorTop}>
              {/* Kicker & Plain-Text Envelope Status */}
              <div className={styles.kickerRow}>
                <span className={styles.kicker}>
                  SLICER &amp; CAM · {currentMaterial.shortLabel}
                </span>
                <span
                  className={`${styles.envelopeStatus} ${
                    metrics.fitsSelectedPrinter ? styles.envelopePass : styles.envelopeFail
                  }`}
                >
                  {metrics.fitsSelectedPrinter
                    ? `CLEARS ${currentPrinter.bedMm[0]}×${currentPrinter.bedMm[1]} BED`
                    : `EXCEEDS ${currentPrinter.bedMm[0]}MM BED`}
                </span>
              </div>

              <div className={styles.titleRow}>
                <h2>{currentPart.name}</h2>
                <div className={styles.subtitle}>{currentPart.subtitle}</div>
              </div>

              {/* 4-Column Hairline Telemetry Strip */}
              <div className={styles.metricsStrip}>
                <div className={styles.metricCol}>
                  <span className={styles.metricLabel}>Mass</span>
                  <span className={styles.metricValue}>{metrics.massGrams} g</span>
                  <span className={styles.metricSub}>{metrics.volumeCm3} cm³</span>
                </div>

                <div className={styles.metricCol}>
                  <span className={styles.metricLabel}>
                    {currentMaterial.type === "cnc-mill" ? "Billet" : "1.75mm Spool"}
                  </span>
                  <span className={styles.metricValue}>
                    {currentMaterial.type === "cnc-mill"
                      ? `${currentPart.heightMm}mm Al`
                      : `${metrics.filamentMeters} m`}
                  </span>
                  <span className={styles.metricSub}>{metrics.spoolsRequired} kg spool</span>
                </div>

                <div className={styles.metricCol}>
                  <span className={styles.metricLabel}>Print Time</span>
                  <span className={styles.metricValue}>{metrics.printTimeFormatted}</span>
                  <span className={styles.metricSub}>{metrics.volumetricFlowMm3s} mm³/s</span>
                </div>

                <div className={styles.metricCol}>
                  <span className={styles.metricLabel}>BEME Cost</span>
                  <span className={styles.metricValue}>₦{metrics.costNgn.toLocaleString()}</span>
                  <span className={styles.metricSub}>
                    ₦{(currentMaterial.costPerKgNgn / 1000).toFixed(0)}/g
                  </span>
                </div>
              </div>

              {/* Flat Text Tabs */}
              <div className={styles.flatTabs} role="tablist" aria-label="Slicer specification views">
                <button
                  type="button"
                  role="tab"
                  aria-selected={inspectorTab === "slicer"}
                  aria-pressed={inspectorTab === "slicer"}
                  className={styles.flatBtn}
                  onClick={() => setInspectorTab("slicer")}
                >
                  Slicer &amp; Supports
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={inspectorTab === "machine"}
                  aria-pressed={inspectorTab === "machine"}
                  className={styles.flatBtn}
                  onClick={() => setInspectorTab("machine")}
                >
                  Bed Layout &amp; Bounds
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={inspectorTab === "hardware"}
                  aria-pressed={inspectorTab === "hardware"}
                  className={styles.flatBtn}
                  onClick={() => setInspectorTab("hardware")}
                >
                  Sub-Parts &amp; Fasteners
                </button>
              </div>

              {/* ========================================================= */}
              {/* TAB 1: SLICER PROCESS, INFILL, SUPPORTS & FEATURE LEDGER   */}
              {/* ========================================================= */}
              {inspectorTab === "slicer" && (
                <div>
                  <dl className={styles.ledger}>
                    <div className={styles.ledgerRow}>
                      <dt>Infill Pattern</dt>
                      <dd>
                        <div className={styles.inlineChoices}>
                          {INFILL_PATTERNS.map((pat) => (
                            <button
                              key={pat.id}
                              type="button"
                              className={styles.flatBtn}
                              aria-pressed={infillPattern === pat.id}
                              onClick={() => setInfillPattern(pat.id)}
                            >
                              {pat.shortLabel}
                            </button>
                          ))}
                        </div>
                      </dd>
                    </div>

                    <div className={styles.ledgerRow}>
                      <dt>Infill Density</dt>
                      <dd>
                        <div className="flex items-center gap-2">
                          <input
                            id="infill-slider"
                            type="range"
                            min="15"
                            max="100"
                            step="5"
                            value={infillPercent}
                            onChange={(e) => setInfillPercent(parseInt(e.target.value, 10))}
                            className={styles.scrubberSlider}
                            style={{ flex: 1 }}
                            aria-label="Infill density percentage"
                          />
                          <span className={styles.monoVal}>{infillPercent}%</span>
                        </div>
                        <div className={`${styles.inlineChoices} mt-1`}>
                          {[15, 25, 40, 60, 100].map((val) => (
                            <button
                              key={val}
                              type="button"
                              className={styles.flatBtn}
                              aria-pressed={infillPercent === val}
                              onClick={() => setInfillPercent(val)}
                            >
                              {val}%
                            </button>
                          ))}
                        </div>
                      </dd>
                    </div>

                    <div className={styles.ledgerRow}>
                      <dt>Support Type</dt>
                      <dd>
                        <div className={styles.inlineChoices}>
                          {SUPPORT_STYLES.map((sup) => (
                            <button
                              key={sup.id}
                              type="button"
                              className={styles.flatBtn}
                              aria-pressed={supportStyle === sup.id}
                              onClick={() => setSupportStyle(sup.id)}
                            >
                              {sup.shortLabel}
                            </button>
                          ))}
                        </div>
                      </dd>
                    </div>

                    <div className={styles.ledgerRow}>
                      <dt>Bed Adhesion</dt>
                      <dd>
                        <div className={styles.inlineChoices}>
                          {ADHESION_TYPES.map((adh) => (
                            <button
                              key={adh.id}
                              type="button"
                              className={styles.flatBtn}
                              aria-pressed={adhesionType === adh.id}
                              onClick={() => setAdhesionType(adh.id)}
                            >
                              {adh.shortLabel}
                            </button>
                          ))}
                        </div>
                      </dd>
                    </div>

                    <div className={styles.ledgerRow}>
                      <dt>Layer Height</dt>
                      <dd>
                        <div className={styles.inlineChoices}>
                          {LAYER_HEIGHT_OPTIONS.map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              className={styles.flatBtn}
                              aria-pressed={layerHeightMm === opt.value}
                              onClick={() => setLayerHeightMm(opt.value)}
                            >
                              {opt.label}
                            </button>
                          ))}
                          <span className="text-[9.5px] text-[#68655E] font-mono">
                            ({metrics.layerCount} layers)
                          </span>
                        </div>
                      </dd>
                    </div>

                    <div className={styles.ledgerRow}>
                      <dt>Walls &amp; Skin</dt>
                      <dd>
                        <div className={styles.inlineChoices}>
                          {[2, 3, 4, 5, 6].map((loops) => (
                            <button
                              key={loops}
                              type="button"
                              className={styles.flatBtn}
                              aria-pressed={wallLoops === loops}
                              onClick={() => setWallLoops(loops)}
                            >
                              {loops} Loops
                            </button>
                          ))}
                          <span className="text-[9.5px] text-[#68655E] font-mono">
                            ({(wallLoops * metrics.lineWidthMm).toFixed(2)}mm · {metrics.topBottomLayers} skin)
                          </span>
                        </div>
                      </dd>
                    </div>
                  </dl>

                  {/* Hairline G-Code Feature Breakdown Table */}
                  <table className={styles.breakdownTable} aria-label="G-code feature breakdown">
                    <thead>
                      <tr>
                        <th>Toolpath Feature</th>
                        <th>Mass</th>
                        <th>Spool</th>
                        <th>Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.featureBreakdown.map((item) => (
                        <tr key={item.feature}>
                          <td className="font-semibold">{item.feature}</td>
                          <td className="font-bold">
                            {item.massGrams} g ({item.percentOfMass}%)
                          </td>
                          <td>{item.filamentMeters > 0 ? `${item.filamentMeters} m` : "—"}</td>
                          <td>{formatPrintDuration(item.timeHours)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* ========================================================= */}
              {/* TAB 2: BED ARRANGEMENT, ALIGNMENT, ORIENT & BOUNDS         */}
              {/* ========================================================= */}
              {inspectorTab === "machine" && (
                <div>
                  <dl className={styles.ledger}>
                    <div className={styles.ledgerRow}>
                      <dt>Machine</dt>
                      <dd>
                        <div className={styles.inlineChoices}>
                          {PRINTER_PROFILES.map((prof) => (
                            <button
                              key={prof.id}
                              type="button"
                              className={styles.flatBtn}
                              aria-pressed={printerProfileId === prof.id}
                              onClick={() => setPrinterProfileId(prof.id)}
                            >
                              {prof.shortLabel}
                            </button>
                          ))}
                        </div>
                      </dd>
                    </div>

                    <div className={styles.ledgerRow}>
                      <dt>Bed Envelope</dt>
                      <dd className={styles.monoVal}>
                        {currentPrinter.bedMm[0]} × {currentPrinter.bedMm[1]} ×{" "}
                        {currentPrinter.bedMm[2]} mm
                      </dd>
                    </div>

                    <div className={styles.ledgerRow}>
                      <dt>Part Bounds</dt>
                      <dd className={styles.monoVal}>
                        {partX} × {partY} × {currentPart.heightMm} mm ({metrics.bedUtilizationPercent}%
                        area)
                      </dd>
                    </div>

                    <div className={styles.ledgerRow}>
                      <dt>Orientation</dt>
                      <dd>
                        <div className={styles.inlineChoices}>
                          <button
                            type="button"
                            className={styles.flatBtn}
                            aria-pressed={!isRotated90}
                            onClick={() => setIsRotated90(false)}
                          >
                            0° Align X ({currentPart.lengthMm}×{currentPart.widthMm}mm)
                          </button>
                          <button
                            type="button"
                            className={styles.flatBtn}
                            aria-pressed={isRotated90}
                            onClick={() => setIsRotated90(true)}
                          >
                            90° Align Z ({currentPart.widthMm}×{currentPart.lengthMm}mm)
                          </button>
                        </div>
                      </dd>
                    </div>

                    <div className={styles.ledgerRow}>
                      <dt>Bed Nesting</dt>
                      <dd>
                        <div className={styles.inlineChoices}>
                          {[
                            { val: 0, label: "Compact Nest (12mm gap)" },
                            { val: 0.5, label: "Medium Spread (24mm)" },
                            { val: 1, label: "Wide Spread (40mm)" }
                          ].map((preset) => (
                            <button
                              key={preset.val}
                              type="button"
                              className={styles.flatBtn}
                              aria-pressed={Math.abs(explodeAmount - preset.val) < 0.03}
                              onClick={() => setExplodeAmount(preset.val)}
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>
                      </dd>
                    </div>

                    <div className={styles.ledgerRow}>
                      <dt>First Layer</dt>
                      <dd className={styles.monoVal}>
                        100% Seated at y = 0.0 mm · Zero Mid-Air Overlaps
                      </dd>
                    </div>

                    <div className={styles.ledgerRow}>
                      <dt>Temperatures</dt>
                      <dd className={styles.monoVal}>
                        {currentMaterial.nozzleTemp} / {currentMaterial.bedTemp} /{" "}
                        {currentMaterial.chamberTemp}
                      </dd>
                    </div>

                    <div className={styles.ledgerRow}>
                      <dt>Feedrates</dt>
                      <dd className={styles.monoVal}>
                        {currentPrinter.outerWallSpeedMms} wall · {currentPrinter.infillSpeedMms}{" "}
                        infill · {currentPrinter.travelSpeedMms} travel mm/s
                      </dd>
                    </div>
                  </dl>
                  <p className={styles.summaryNote}>{currentSupport.description}</p>
                </div>
              )}

              {/* ========================================================= */}
              {/* TAB 3: SUB-PARTS, HARDWARE FASTENERS & BEME BOM           */}
              {/* ========================================================= */}
              {inspectorTab === "hardware" && (
                <div>
                  <dl className={styles.ledger}>
                    <div className={styles.ledgerRow}>
                      <dt>Process</dt>
                      <dd>{currentPart.manufacturingMethod}</dd>
                    </div>
                    <div className={styles.ledgerRow}>
                      <dt>Interfaces</dt>
                      <dd className={styles.monoVal}>{currentPart.mountingHoles}</dd>
                    </div>
                    <div className={styles.ledgerRow}>
                      <dt>Nested Zones ({currentPart.subPartCount})</dt>
                      <dd>
                        {currentPart.subPartNames.map((name, idx) => (
                          <div key={idx} className="py-0.5 font-mono text-[10px]">
                            {idx + 1}. {name}
                          </div>
                        ))}
                      </dd>
                    </div>
                    <div className={styles.ledgerRow}>
                      <dt>Fasteners</dt>
                      <dd>
                        {currentPart.fasteners.map((fastener, idx) => (
                          <div key={idx} className="py-0.5 font-mono text-[10px]">
                            {fastener}
                          </div>
                        ))}
                      </dd>
                    </div>
                  </dl>
                  <p className={styles.summaryNote}>{currentPart.description}</p>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default FabricationWorkbench;
