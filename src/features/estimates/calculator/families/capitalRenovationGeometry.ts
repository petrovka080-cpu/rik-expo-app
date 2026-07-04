export type CapitalRenovationPromptParameters = {
  matched: boolean;
  areaM2: number | null;
  ceilingHeightM: number | null;
  bathroomsCount: number | null;
};

export type CapitalRenovationCalculatorInput = {
  areaM2: number;
  ceilingHeightM: number;
  bathroomsCount: number;
  bathroomTotalFloorAreaM2?: number | null;
  bathroomWallTileAreaM2?: number | null;
  baseboardLm?: number | null;
  doorsCount?: number | null;
  electricalPoints?: number | null;
  waterPoints?: number | null;
  sewerPoints?: number | null;
};

export type CapitalRenovationDerivedGeometry = {
  areaM2: number;
  ceilingHeightM: number;
  bathroomsCount: number;
  bathroomFloorAreaM2: number;
  dryFloorAreaM2: number;
  ceilingAreaM2: number;
  grossWallAreaM2: number;
  netWallAreaM2: number;
  bathroomWallTileAreaM2: number;
  paintWallAreaM2: number;
  paintTotalAreaM2: number;
  wetFloorTileAreaM2: number;
  dryFloorFinishAreaM2: number;
  baseboardLm: number;
  doorsCount: number;
  electricalPoints: number;
  waterPoints: number;
  sewerPoints: number;
  wasteVolumeM3: number;
};

function num(value: string): number {
  return Number(value.replace(",", "."));
}

function round(value: number, digits = 1): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function positive(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export function parseCapitalRenovationPrompt(text: string): CapitalRenovationPromptParameters {
  const normalized = text.toLocaleLowerCase("ru-RU");
  const wordTail = "[а-яёa-z0-9_-]*";
  const matched = new RegExp(`(капитальн${wordTail}\\s+ремонт|капремонт|ремонт\\s+квартир${wordTail}|ремонт\\s+студи${wordTail})`, "iu").test(normalized) &&
    new RegExp(`(квартир${wordTail}|студи${wordTail})`, "iu").test(normalized);
  const areaMatch = normalized.match(/(\d+(?:[,.]\d+)?)\s*(?:кв\.?\s*м|м2|м²|квадрат\w*\s*метр\w*)/i);
  const heightMatch = normalized.match(new RegExp(`(?:потол${wordTail}|h|высот${wordTail})\\s*(?:=|:)?\\s*(\\d+(?:[,.]\\d+)?)\\s*м(?:\\s|$|[,.;])`, "iu")) ??
    normalized.match(/(\d+(?:[,.]\d+)?)\s*м\s*(?:потол|высот)/iu);
  const bathroomsMatch = normalized.match(new RegExp(`(\\d+)\\s*(?:сануз${wordTail}|с\\/у|ванн${wordTail})`, "iu")) ??
    normalized.match(new RegExp(`(?:сануз${wordTail}|с\\/у|ванн${wordTail})\\s*(\\d+)`, "iu"));
  return {
    matched,
    areaM2: areaMatch ? num(areaMatch[1]) : null,
    ceilingHeightM: heightMatch ? num(heightMatch[1]) : null,
    bathroomsCount: bathroomsMatch ? Number(bathroomsMatch[1]) : null,
  };
}

export function defaultCapitalRenovationInput(params: CapitalRenovationPromptParameters): CapitalRenovationCalculatorInput {
  return {
    areaM2: positive(params.areaM2) ? params.areaM2 : 54,
    ceilingHeightM: positive(params.ceilingHeightM) ? params.ceilingHeightM : 2.7,
    bathroomsCount: positive(params.bathroomsCount) ? Math.round(params.bathroomsCount) : 1,
  };
}

export function calculateCapitalRenovationGeometry(input: CapitalRenovationCalculatorInput): CapitalRenovationDerivedGeometry {
  if (!positive(input.areaM2)) throw new Error("capital renovation area_m2 must be positive");
  if (!positive(input.ceilingHeightM)) throw new Error("capital renovation ceiling_height_m must be positive");
  if (!positive(input.bathroomsCount)) throw new Error("capital renovation bathrooms_count must be positive");

  const areaM2 = round(input.areaM2, 2);
  const ceilingHeightM = round(input.ceilingHeightM, 2);
  const bathroomsCount = Math.max(1, Math.round(input.bathroomsCount));
  const bathroomFloorAreaM2 = round(input.bathroomTotalFloorAreaM2 ?? bathroomsCount * 6, 1);
  const dryFloorAreaM2 = round(Math.max(0, areaM2 - bathroomFloorAreaM2), 1);
  const ceilingAreaM2 = areaM2;
  const wallAreaCoeff = round(ceilingHeightM * 1.15, 3);
  const grossWallAreaM2 = round(areaM2 * wallAreaCoeff, 1);
  const netWallAreaM2 = round(grossWallAreaM2 * 0.88, 1);
  const bathroomWallTileAreaM2 = round(input.bathroomWallTileAreaM2 ?? bathroomsCount * 30, 1);
  const paintWallAreaM2 = round(Math.max(0, netWallAreaM2 - bathroomWallTileAreaM2), 1);
  const paintTotalAreaM2 = round(paintWallAreaM2 + ceilingAreaM2, 1);
  return {
    areaM2,
    ceilingHeightM,
    bathroomsCount,
    bathroomFloorAreaM2,
    dryFloorAreaM2,
    ceilingAreaM2,
    grossWallAreaM2,
    netWallAreaM2,
    bathroomWallTileAreaM2,
    paintWallAreaM2,
    paintTotalAreaM2,
    wetFloorTileAreaM2: bathroomFloorAreaM2,
    dryFloorFinishAreaM2: dryFloorAreaM2,
    baseboardLm: round(input.baseboardLm ?? areaM2 * 0.92, 0),
    doorsCount: Math.max(1, Math.round(input.doorsCount ?? areaM2 / 16.33)),
    electricalPoints: Math.max(1, Math.round(input.electricalPoints ?? areaM2 * 0.8)),
    waterPoints: Math.max(1, Math.round(input.waterPoints ?? bathroomsCount * 7)),
    sewerPoints: Math.max(1, Math.round(input.sewerPoints ?? bathroomsCount * 4)),
    wasteVolumeM3: round(areaM2 * 0.25, 1),
  };
}
