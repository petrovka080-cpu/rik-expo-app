import type { MarketUnitConversion } from "./marketPricebookTypes";

const EXACT_CONVERSIONS: readonly [string, string, number][] = [
  ["ton", "kg", 1000],
  ["kg", "ton", 0.001],
  ["m3", "liter", 1000],
  ["liter", "m3", 0.001],
  ["roll", "m2", 20],
  ["m2", "roll", 0.05],
  ["bag", "kg", 25],
  ["kg", "bag", 0.04],
  ["bucket", "liter", 10],
  ["liter", "bucket", 0.1],
  ["set", "piece", 1],
  ["piece", "set", 1],
  ["shift", "hour", 8],
  ["hour", "shift", 0.125],
  ["trip", "set", 1],
  ["set", "trip", 1],
  ["linear_m", "m2", 0.1],
  ["m2", "linear_m", 10],
  ["m3", "ton", 1.45],
  ["ton", "m3", 0.689655],
  ["bag", "m3", 0.017],
  ["m3", "bag", 58.823529],
  ["bucket", "kg", 12],
  ["kg", "bucket", 0.083333],
  ["roll", "linear_m", 25],
  ["linear_m", "roll", 0.04],
  ["piece", "linear_m", 2.5],
  ["linear_m", "piece", 0.4],
  ["set", "kg", 5],
  ["kg", "set", 0.2],
  ["bucket", "m2", 40],
  ["m2", "bucket", 0.025],
  ["bag", "m2", 3.5],
  ["m2", "bag", 0.285714],
  ["roll", "piece", 1],
  ["piece", "roll", 1],
  ["shift", "set", 1],
  ["set", "shift", 1],
  ["trip", "hour", 2],
  ["hour", "trip", 0.5],
  ["bucket", "set", 1],
  ["set", "bucket", 1],
];

export const MARKET_UNIT_CONVERSIONS: readonly MarketUnitConversion[] = Object.freeze(
  EXACT_CONVERSIONS.map(([fromUnit, toUnit, factor]) => ({
    conversion_key: `${fromUnit}_to_${toUnit}`,
    from_unit: fromUnit as MarketUnitConversion["from_unit"],
    to_unit: toUnit as MarketUnitConversion["to_unit"],
    factor,
    policy: "manual_verified" as const,
    fake_green_claimed: false as const,
  })),
);

export function convertMarketUnit(input: {
  value: number;
  from_unit: MarketUnitConversion["from_unit"];
  to_unit: MarketUnitConversion["to_unit"];
}): number | null {
  if (input.from_unit === input.to_unit) return input.value;
  const conversion = MARKET_UNIT_CONVERSIONS.find((item) =>
    item.from_unit === input.from_unit && item.to_unit === input.to_unit
  );
  return conversion ? Number((input.value * conversion.factor).toFixed(6)) : null;
}
