import type { GlobalUnitInput, GlobalUnitSystem } from "./globalEstimateTypes";

export function normalizeGlobalUnit(rawUnit: string | undefined): GlobalUnitInput["normalizedUnit"] {
  const unit = (rawUnit ?? "").toLowerCase().replace(/\s+/g, "_");
  if (unit === "m2" || unit === "sqm" || unit === "sq_m" || unit === "м2" || unit === "м²" || unit.includes("квадрат") || unit.includes("quadratmeter")) return "sq_m";
  if (unit === "sq_ft" || unit === "sqft" || unit === "ft2" || unit === "ft²") return "sq_ft";
  if (unit === "sq_yd" || unit === "yd2" || unit === "yd²") return "sq_ft";
  if (unit === "m" || unit === "linear_m" || unit === "пог._м" || unit === "пог.м") return "linear_m";
  if (unit === "ft" || unit === "linear_ft") return "linear_ft";
  if (unit === "pcs" || unit === "pc" || unit === "шт") return "pcs";
  if (unit === "set" || unit === "комплект") return "set";
  if (unit === "kg" || unit === "кг") return "kg";
  if (unit === "lbs" || unit === "lb") return "lbs";
  if (unit === "m3" || unit === "м3") return "m3";
  if (unit === "cu_ft" || unit === "ft3" || unit === "ft³") return "cu_ft";
  if (unit === "ton" || unit === "т") return "ton";
  return "sq_m";
}

export function displayUnitFor(unit: GlobalUnitInput["normalizedUnit"], unitSystem: GlobalUnitSystem): string {
  if (unit === "sq_m") return "m²";
  if (unit === "sq_ft") return "sq ft";
  if (unit === "linear_m") return unitSystem === "metric" ? "пог. м" : "linear m";
  if (unit === "linear_ft") return "linear ft";
  if (unit === "pcs") return "pcs";
  if (unit === "set") return "set";
  if (unit === "kg") return "kg";
  if (unit === "lbs") return "lbs";
  if (unit === "m3") return "m³";
  if (unit === "cu_ft") return "cu ft";
  return unit;
}

export function makeGlobalUnitInput(params: {
  value: number;
  unit?: string;
  unitSystem: GlobalUnitSystem;
}): GlobalUnitInput {
  const normalizedUnit = normalizeGlobalUnit(params.unit);
  return {
    rawValue: params.value,
    rawUnit: (params.unit ?? normalizedUnit) as GlobalUnitInput["rawUnit"],
    normalizedValue: params.value,
    normalizedUnit,
    displayValue: params.value,
    displayUnit: displayUnitFor(normalizedUnit, params.unitSystem),
    unitSystem: params.unitSystem,
  };
}
