import type { GlobalUnitInput } from "./globalEstimateTypes";
import { displayUnitFor, makeGlobalUnitInput, normalizeGlobalUnit } from "./globalUnitNormalizer";
import {
  convertProfessionalUnitQuantity,
  professionalUnitConversionFactor,
} from "../../estimate/professionalUnitRegistry";

function registryCode(unit: GlobalUnitInput["normalizedUnit"]): string {
  if (unit === "sq_m") return "m2";
  if (unit === "linear_m") return "lm";
  if (unit === "ton") return "t";
  return unit;
}

export function convertGlobalUnit(
  value: number,
  fromUnit: string,
  toUnit: GlobalUnitInput["normalizedUnit"],
): {
  value: number;
  conversion?: GlobalUnitInput["conversion"];
} {
  const normalizedFrom = normalizeGlobalUnit(fromUnit);
  if (normalizedFrom === toUnit) return { value };
  const convertedValue = convertProfessionalUnitQuantity(
    value,
    registryCode(normalizedFrom),
    registryCode(toUnit),
  );
  if (convertedValue === null) return { value };
  const factor = professionalUnitConversionFactor(registryCode(normalizedFrom), registryCode(toUnit));
  if (factor === null) return { value };
  return {
    value: convertedValue,
    conversion: {
      from: normalizedFrom,
      to: toUnit,
      factor,
      formula: `${value} * ${factor}`,
    },
  };
}

function localeTargetUnit(
  unit: GlobalUnitInput["normalizedUnit"],
  unitSystem: GlobalUnitInput["unitSystem"],
): GlobalUnitInput["normalizedUnit"] {
  if (unitSystem === "metric") {
    if (unit === "sq_ft") return "sq_m";
    if (unit === "linear_ft") return "linear_m";
    if (unit === "cu_ft") return "m3";
    if (unit === "lbs") return "kg";
  }
  if (unitSystem === "imperial") {
    if (unit === "sq_m") return "sq_ft";
    if (unit === "linear_m") return "linear_ft";
    if (unit === "m3") return "cu_ft";
    if (unit === "kg") return "lbs";
  }
  return unit;
}

export function normalizeGlobalUnitForLocale(params: {
  value: number;
  unit?: string;
  targetUnit?: GlobalUnitInput["normalizedUnit"];
  unitSystem: GlobalUnitInput["unitSystem"];
}): GlobalUnitInput {
  const base = makeGlobalUnitInput({ value: params.value, unit: params.unit, unitSystem: params.unitSystem });
  const targetUnit = params.targetUnit ?? localeTargetUnit(base.normalizedUnit, params.unitSystem);
  if (base.normalizedUnit === targetUnit) return base;
  const converted = convertGlobalUnit(base.normalizedValue, base.normalizedUnit, targetUnit);
  return {
    ...base,
    normalizedValue: converted.value,
    normalizedUnit: targetUnit,
    displayValue: converted.value,
    displayUnit: displayUnitFor(targetUnit, params.unitSystem),
    conversion: converted.conversion,
  };
}

export function chooseLocalAreaUnit(unitSystem: GlobalUnitInput["unitSystem"]): GlobalUnitInput["normalizedUnit"] {
  return unitSystem === "imperial" ? "sq_ft" : "sq_m";
}

export function chooseLocalLengthUnit(unitSystem: GlobalUnitInput["unitSystem"]): GlobalUnitInput["normalizedUnit"] {
  return unitSystem === "imperial" ? "linear_ft" : "linear_m";
}
