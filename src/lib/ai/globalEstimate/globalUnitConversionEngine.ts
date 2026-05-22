import { GLOBAL_UNIT_CONVERSIONS } from "./globalEstimateSeedData";
import type { GlobalUnitInput } from "./globalEstimateTypes";
import { displayUnitFor, makeGlobalUnitInput, normalizeGlobalUnit } from "./globalUnitNormalizer";

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
  const conversion = GLOBAL_UNIT_CONVERSIONS.find((item) => item.fromUnit === normalizedFrom && item.toUnit === toUnit);
  if (!conversion) return { value };
  return {
    value: value * conversion.multiplier,
    conversion: {
      from: normalizedFrom,
      to: toUnit,
      factor: conversion.multiplier,
      formula: `${value} * ${conversion.multiplier}`,
    },
  };
}

export function normalizeGlobalUnitForLocale(params: {
  value: number;
  unit?: string;
  targetUnit?: GlobalUnitInput["normalizedUnit"];
  unitSystem: GlobalUnitInput["unitSystem"];
}): GlobalUnitInput {
  const base = makeGlobalUnitInput({ value: params.value, unit: params.unit, unitSystem: params.unitSystem });
  if (!params.targetUnit || base.normalizedUnit === params.targetUnit) return base;
  const converted = convertGlobalUnit(base.normalizedValue, base.normalizedUnit, params.targetUnit);
  return {
    ...base,
    normalizedValue: converted.value,
    normalizedUnit: params.targetUnit,
    displayValue: converted.value,
    displayUnit: displayUnitFor(params.targetUnit, params.unitSystem),
    conversion: converted.conversion,
  };
}

export function chooseLocalAreaUnit(unitSystem: GlobalUnitInput["unitSystem"]): GlobalUnitInput["normalizedUnit"] {
  return unitSystem === "imperial" ? "sq_ft" : "sq_m";
}

export function chooseLocalLengthUnit(unitSystem: GlobalUnitInput["unitSystem"]): GlobalUnitInput["normalizedUnit"] {
  return unitSystem === "imperial" ? "linear_ft" : "linear_m";
}
