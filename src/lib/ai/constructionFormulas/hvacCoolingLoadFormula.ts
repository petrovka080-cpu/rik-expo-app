export type HvacCoolingLoadInput = {
  areaM2?: number;
  wattsPerM2?: number;
  averageIndoorUnitKw?: number;
  refrigerantLineFactorMPerM2?: number;
  condensateDrainFactorMPerM2?: number;
};

export type HvacCoolingLoadResult = {
  areaM2: number;
  wattsPerM2: number;
  coolingLoadKw: number;
  indoorUnitsApprox: number;
  outdoorUnitsApprox: number;
  refrigerantLineM: number;
  condensateDrainM: number;
};

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function calculateHvacCoolingLoad(input: HvacCoolingLoadInput): HvacCoolingLoadResult {
  const areaM2 = Math.max(1, input.areaM2 ?? 1);
  const wattsPerM2 = Math.max(80, input.wattsPerM2 ?? 120);
  const averageIndoorUnitKw = Math.max(2.5, input.averageIndoorUnitKw ?? 5);
  const coolingLoadKw = round2((areaM2 * wattsPerM2) / 1000);
  const indoorUnitsApprox = Math.max(1, Math.ceil(coolingLoadKw / averageIndoorUnitKw));
  const outdoorUnitsApprox = Math.max(1, Math.ceil(indoorUnitsApprox / 4));
  const refrigerantLineM = round2(areaM2 * (input.refrigerantLineFactorMPerM2 ?? 0.45));
  const condensateDrainM = round2(areaM2 * (input.condensateDrainFactorMPerM2 ?? 0.35));

  return {
    areaM2,
    wattsPerM2,
    coolingLoadKw,
    indoorUnitsApprox,
    outdoorUnitsApprox,
    refrigerantLineM,
    condensateDrainM,
  };
}
