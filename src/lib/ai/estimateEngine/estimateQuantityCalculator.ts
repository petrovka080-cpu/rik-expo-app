import type { ConstructionWorkType } from "./estimateTypes";

export function extractEstimateArea(questionRu: string): { value: number; unit: "m2" } | undefined {
  const match = questionRu.replace(",", ".").match(/(\d+(?:\.\d+)?)\s*(?:кв\.?\s*м|м2|м²|m2)/i);
  if (!match) return undefined;
  const value = Number(match[1]);
  if (!Number.isFinite(value) || value <= 0) return undefined;
  return { value, unit: "m2" };
}

export function roundQuantity(value: number): number {
  return Math.round(value * 10) / 10;
}

export function calculateFlooringDerivedQuantities(area: number) {
  return {
    coveringM2: roundQuantity(area * 1.1),
    underlayM2: roundQuantity(area * 1.05),
    plinthM: roundQuantity(area * 0.8),
    thresholdsPcs: Math.max(1, Math.round(area / 20)),
    workM2: roundQuantity(area),
  };
}

export function calculateAsphaltDerivedQuantities(area: number) {
  return {
    asphaltM2: roundQuantity(area),
    basePrepM2: roundQuantity(area),
    bitumenPrimerSet: 1,
    deliverySet: 1,
  };
}

export function calculatePlasterDerivedQuantities(area: number) {
  return {
    plasterKg: roundQuantity(area * 16),
    primerSet: Math.max(1, Math.ceil(area / 100)),
    beaconsM: roundQuantity(area * 0.4),
    cornerBeadsM: roundQuantity(area * 0.2),
    workM2: roundQuantity(area),
  };
}

export function defaultAreaForWorkType(workType: ConstructionWorkType): number {
  if (workType === "plastering") return 200;
  return 100;
}
