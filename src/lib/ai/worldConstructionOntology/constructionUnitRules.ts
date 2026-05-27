import type { GlobalUnitInput } from "../globalEstimate";
import type { WorldConstructionObjectScope, WorldConstructionOperation } from "./worldConstructionTypes";

export function defaultConstructionUnit(input: {
  objectScope: WorldConstructionObjectScope;
  operation: WorldConstructionOperation;
  text: string;
}): GlobalUnitInput["normalizedUnit"] {
  const text = input.text.toLocaleLowerCase("ru-RU");
  if (/кв|м2|м²|sqm|sq\s*m/.test(text)) return "sq_m";
  if (/м3|м³|куб/.test(text)) return "m3";
  if (/пог|метр|meters|linear/.test(text) && !/кв/.test(text)) return "linear_m";
  if (/шт|окон|двер|pcs|points/.test(text)) return "pcs";
  if (/тонн|\bт\b|ton/.test(text)) return "ton";
  if (input.objectScope === "hydropower_unit" || input.objectScope === "solar_array") return "set";
  if (input.objectScope === "well" || input.operation === "drilling") return "linear_m";
  if (input.operation === "masonry" || input.operation === "waterproofing" || input.operation === "paving") return "sq_m";
  return "sq_m";
}

export function parseConstructionVolume(text: string, fallbackUnit: GlobalUnitInput["normalizedUnit"]): {
  volume: number;
  unit: GlobalUnitInput["normalizedUnit"];
} {
  const normalized = text.toLocaleLowerCase("ru-RU").replace(/\s+/g, " ");
  const match = normalized.match(/(\d+(?:[\s,.]\d{3})*(?:[,.]\d+)?)\s*(кв\.?\s*м|м2|м²|sqm|sq\s*m|м3|м³|куб\.?\s*м|пог\.?\s*м|метров|метра|м\b|шт|окон|двер|квт|kw|кг|kg|тонн?|т\b|set|компл)/i);
  if (!match) {
    return { volume: fallbackUnit === "set" || fallbackUnit === "pcs" ? 1 : 100, unit: fallbackUnit };
  }
  const volume = Math.max(1, Number(match[1].replace(/\s/g, "").replace(",", ".")) || 1);
  const rawUnit = match[2].toLocaleLowerCase("ru-RU");
  const unit: GlobalUnitInput["normalizedUnit"] =
    /кв|м2|м²|sqm|sq/.test(rawUnit) ? "sq_m" :
      /м3|м³|куб/.test(rawUnit) ? "m3" :
        /пог|метр|^м$/.test(rawUnit) ? "linear_m" :
          /кг|kg/.test(rawUnit) ? "kg" :
            /тон|^т$/.test(rawUnit) ? "ton" :
              /шт|окон|двер|pcs/.test(rawUnit) ? "pcs" :
                "set";
  return { volume, unit: /квт|kw/.test(rawUnit) ? "set" : unit };
}
