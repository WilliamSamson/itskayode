import type { Component } from "./sonaris-engine";

const finite = (...values: number[]) => values.every(Number.isFinite);
/** Steady-state Thevenin source feeding a constant-power load. Returns the lower-current root; not battery chemistry, state of charge or transient validation. */
export function batteryCircuit(
  Vopen: number,
  Rinternal: number,
  loadW: number
): { currentA: number; loadedV: number; lossW: number } | null {
  if (!finite(Vopen, Rinternal, loadW) || Vopen <= 0 || Rinternal < 0 || loadW < 0) return null;
  const discriminant = Vopen * Vopen - 4 * Rinternal * loadW;
  if (discriminant < 0 || !Number.isFinite(discriminant)) return null;
  // Rationalized root avoids cancellation when resistance or load is small.
  const currentA =
    loadW === 0
      ? 0
      : Rinternal === 0
        ? loadW / Vopen
        : (2 * loadW) / (Vopen + Math.sqrt(discriminant));
  const loadedV = Vopen - currentA * Rinternal,
    lossW = currentA * currentA * Rinternal;
  return finite(currentA, loadedV, lossW) ? { currentA, loadedV, lossW } : null;
}
/** currentLimit is the supplied OUTPUT continuous-current limit. Converter topology and allowed voltage range must be checked separately. */
export function converter(
  inputV: number,
  outputV: number,
  outputA: number,
  efficiency: number,
  currentLimit: number
): { inputA: number; lossW: number; overloaded: boolean } | null {
  if (
    !finite(inputV, outputV, outputA, efficiency, currentLimit) ||
    inputV <= 0 ||
    outputV <= 0 ||
    outputA < 0 ||
    efficiency <= 0 ||
    efficiency > 1 ||
    currentLimit <= 0
  )
    return null;
  const outputW = outputV * outputA,
    inputW = outputW / efficiency,
    inputA = inputW / inputV,
    lossW = inputW - outputW;
  return finite(inputA, lossW) ? { inputA, lossW, overloaded: outputA > currentLimit } : null;
}
/** Lumped steady-state thermal rise (C), using an appropriate measured/sourced junction-to-ambient resistance in C/W. No transient or airflow prediction. */
export function thermal(
  ambient: number,
  lossW: number,
  thermalResistance: number,
  maxTemp: number
): { estimatedTemp: number; margin: number } | null {
  if (!finite(ambient, lossW, thermalResistance, maxTemp) || lossW < 0 || thermalResistance < 0)
    return null;
  const estimatedTemp = ambient + lossW * thermalResistance,
    margin = maxTemp - estimatedTemp;
  return finite(estimatedTemp, margin) ? { estimatedTemp, margin } : null;
}
/** Simply-supported uniform beam, central point force, small elastic deflection. Result metres. Not chassis FEA or a strength check. */
export function beamDeflection(
  forceN: number,
  spanM: number,
  Epa: number,
  secondMomentM4: number
): number | null {
  if (
    !finite(forceN, spanM, Epa, secondMomentM4) ||
    forceN < 0 ||
    spanM <= 0 ||
    Epa <= 0 ||
    secondMomentM4 <= 0
  )
    return null;
  const deflection = (forceN * spanM ** 3) / (48 * Epa * secondMomentM4);
  return Number.isFinite(deflection) ? deflection : null;
}
/** All placements must be explicitly confirmed because the component model's default origin is not placement evidence. A quantity group is treated as colocated at its supplied centroid; split groups for separately placed instances. */
export function assemblyMassProperties(
  components: Component[],
  confirmedPlacementIds: readonly string[] = []
): { massKg: number; centerOfMass: [number, number, number] } | null {
  if (!components.length) return null;
  const confirmed = new Set(confirmedPlacementIds);
  if (
    components.some(
      (c) =>
        !confirmed.has(c.id) ||
        c.massKg === null ||
        !finite(c.massKg) ||
        c.massKg <= 0 ||
        !Number.isInteger(c.quantity) ||
        c.quantity <= 0 ||
        c.position.length !== 3 ||
        !c.position.every(Number.isFinite)
    )
  )
    return null;
  let massKg = 0;
  const moment: [number, number, number] = [0, 0, 0];
  for (const c of components) {
    const mass = c.massKg! * c.quantity;
    massKg += mass;
    for (let i = 0; i < 3; i++) moment[i] += mass * c.position[i];
  }
  const centerOfMass = moment.map((m) => m / massKg) as [number, number, number];
  return finite(massKg, ...centerOfMass) ? { massKg, centerOfMass } : null;
}
