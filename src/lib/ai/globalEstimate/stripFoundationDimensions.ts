import type { GlobalEstimateParsedDimensions } from "./globalEstimateTypes";

function parseNumber(value: string | undefined): number | null {
  if (!value) return null;
  const numeric = Number(value.replace(",", "."));
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}

function findLabeledDimension(text: string, labels: string[]): number | null {
  const source = text.toLowerCase();
  for (const label of labels) {
    const pattern = new RegExp(`${label}\\s*[:=,-]?\\s*(\\d+(?:[.,]\\d+)?)\\s*(?:м|метр|метра|метров|m)?`, "iu");
    const match = source.match(pattern);
    const value = parseNumber(match?.[1]);
    if (value != null) return value;
  }
  return null;
}

export function parseStripFoundationDimensions(text?: string): GlobalEstimateParsedDimensions | null {
  if (!text) return null;
  const normalized = text.toLowerCase();
  if (!/ленточн|strip/.test(normalized) || !/фундамент|foundation/.test(normalized)) return null;

  const length = findLabeledDimension(normalized, ["длин[а-яё]*", "length", "l"]);
  const width = findLabeledDimension(normalized, ["ширин[а-яё]*", "width", "w"]);
  const height = findLabeledDimension(normalized, ["высот[а-яё]*", "глубин[а-яё]*", "height", "depth", "h"]);

  if (length == null || width == null || height == null) return null;

  return {
    length,
    width,
    height,
    concreteVolumeM3: Math.round(length * width * height * 100) / 100,
    unitSystem: "metric",
  };
}

export function buildStripFoundationQuantityContext(dimensions: GlobalEstimateParsedDimensions | null): Record<string, number> {
  const length = dimensions?.length ?? 10;
  const width = dimensions?.width ?? 0.4;
  const height = dimensions?.height ?? 1;
  const concreteVolume = Math.round(length * width * height * 100) / 100;
  const trenchWidth = width + 0.2;
  const trenchVolume = Math.round(length * trenchWidth * height * 100) / 100;
  const baseArea = Math.round(length * width * 100) / 100;
  const cushionVolume = Math.round(baseArea * 0.1 * 100) / 100;
  const formworkArea = Math.round(length * height * 2 * 100) / 100;
  const longitudinalRebarKg = Math.round(length * 4 * 0.888 * 100) / 100;
  const stirrupCount = Math.ceil(length / 0.4);
  const stirrupsRebarKg = Math.round(stirrupCount * (2 * (width + height)) * 0.395 * 100) / 100;
  const totalRebarKg = Math.round((longitudinalRebarKg + stirrupsRebarKg) * 100) / 100;
  const wireKg = Math.round(totalRebarKg * 0.015 * 100) / 100;
  const spacersPcs = Math.ceil(length * 4);
  const backfillVolume = Math.max(0, Math.round((trenchVolume - concreteVolume) * 100) / 100);

  return {
    strip_foundation_length_m: length,
    strip_foundation_width_m: width,
    strip_foundation_height_m: height,
    strip_foundation_concrete_volume_m3: concreteVolume,
    strip_foundation_trench_volume_m3: trenchVolume,
    strip_foundation_base_area_m2: baseArea,
    strip_foundation_top_area_m2: baseArea,
    strip_foundation_sand_volume_m3: cushionVolume,
    strip_foundation_gravel_volume_m3: cushionVolume,
    strip_foundation_formwork_area_m2: formworkArea,
    strip_foundation_waterproofing_area_m2: formworkArea,
    strip_foundation_longitudinal_rebar_kg: longitudinalRebarKg,
    strip_foundation_stirrups_rebar_kg: stirrupsRebarKg,
    strip_foundation_total_rebar_kg: totalRebarKg,
    strip_foundation_wire_kg: wireKg,
    strip_foundation_spacers_pcs: spacersPcs,
    strip_foundation_backfill_m3: backfillVolume,
    strip_foundation_pump_set: 1,
  };
}
