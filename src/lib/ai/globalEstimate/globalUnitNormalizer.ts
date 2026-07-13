import type { GlobalUnitInput, GlobalUnitSystem } from "./globalEstimateTypes";

export function normalizeGlobalUnit(rawUnit: string | undefined): GlobalUnitInput["normalizedUnit"] {
  const unit = (rawUnit ?? "").normalize("NFKC").toLowerCase().replace(/\s+/g, "_");
  if (
    unit === "m2" ||
    unit === "\u043c2" ||
    unit === "sqm" ||
    unit === "sq_m" ||
    unit === "\u043a\u0432.\u043c" ||
    unit === "\u043a\u0432_\u043c" ||
    unit === "Рј2" ||
    unit === "РјВІ" ||
    unit.includes("\u043a\u0432") ||
    unit.includes("\u043a\u0432\u0430\u0434\u0440\u0430\u0442") ||
    unit.includes("РєРІ") ||
    unit.includes("РєРІР°РґСЂР°С‚") ||
    unit.includes("quadratmeter")
  ) return "sq_m";
  if (unit === "sq_ft" || unit === "sqft" || unit === "ft2" || unit === "ftВІ") return "sq_ft";
  if (unit === "sq_yd" || unit === "yd2" || unit === "ydВІ") return "sq_ft";
  if (
    unit === "m" ||
    unit === "\u043c" ||
    unit === "linear_m" ||
    unit === "\u043f\u043e\u0433._\u043c" ||
    unit === "\u043f\u043e\u0433.\u043c" ||
    unit === "\u043f.\u043c" ||
    unit === "РїРѕРі._Рј" ||
    unit === "РїРѕРі.Рј" ||
    unit.includes("\u043f\u043e\u0433\u043e\u043d") ||
    unit.includes("РїРѕРіРѕРЅ")
  ) return "linear_m";
  if (unit === "ft" || unit === "linear_ft") return "linear_ft";
  if (
    unit === "pcs" ||
    unit === "pc" ||
    unit === "\u0448\u0442" ||
    unit === "\u0448\u0442." ||
    unit === "С€С‚" ||
    unit.includes("\u0442\u043e\u0447") ||
    unit.includes("С‚РѕС‡")
  ) return "pcs";
  if (
    unit === "set" ||
    unit === "\u043a\u043e\u043c\u043f\u043b\u0435\u043a\u0442" ||
    unit === "\u043a\u043e\u043c\u043f\u043b." ||
    unit === "\u043a\u043e\u043c\u043f\u043b" ||
    unit === "\u043d\u0430\u0431\u043e\u0440" ||
    unit === "РєРѕРјРїР»РµРєС‚" ||
    unit === "РєРѕРјРїР»." ||
    unit === "РєРѕРјРїР»"
  ) return "set";
  if (unit === "kg" || unit === "\u043a\u0433" || unit === "РєРі") return "kg";
  if (unit === "lbs" || unit === "lb") return "lbs";
  if (unit === "m3" || unit === "\u043c3" || unit === "Рј3" || unit.includes("\u043a\u0443\u0431")) return "m3";
  if (unit === "cu_ft" || unit === "ft3" || unit === "ftВі") return "cu_ft";
  if (
    unit === "ton" ||
    unit === "\u0442" ||
    unit === "\u0442\u043e\u043d\u043d" ||
    unit === "\u0442\u043e\u043d\u043d\u0430" ||
    unit === "\u0442\u043e\u043d\u043d\u044b" ||
    unit === "С‚" ||
    unit === "С‚РѕРЅРЅ" ||
    unit === "С‚РѕРЅРЅР°" ||
    unit === "С‚РѕРЅРЅС‹"
  ) return "ton";
  return "sq_m";
}

export function displayUnitFor(unit: GlobalUnitInput["normalizedUnit"], unitSystem: GlobalUnitSystem): string {
  if (unit === "sq_m") return "\u043c\u00b2";
  if (unit === "sq_ft") return "sq ft";
  if (unit === "linear_m") return unitSystem === "metric" ? "\u043f\u043e\u0433. \u043c" : "linear m";
  if (unit === "linear_ft") return "linear ft";
  if (unit === "pcs") return unitSystem === "metric" ? "\u0448\u0442" : "pcs";
  if (unit === "set") return unitSystem === "metric" ? "\u043a\u043e\u043c\u043f\u043b." : "set";
  if (unit === "kg") return "\u043a\u0433";
  if (unit === "lbs") return "lbs";
  if (unit === "m3") return "\u043c\u00b3";
  if (unit === "cu_ft") return "cu ft";
  if (unit === "ton") return "\u0442";
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
