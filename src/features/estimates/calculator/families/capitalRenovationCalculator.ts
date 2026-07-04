import {
  calculateCapitalRenovationGeometry,
  defaultCapitalRenovationInput,
  parseCapitalRenovationPrompt,
  type CapitalRenovationCalculatorInput,
  type CapitalRenovationDerivedGeometry,
  type CapitalRenovationPromptParameters,
} from "./capitalRenovationGeometry";
import {
  buildCapitalRenovationRows,
  type CapitalRenovationEstimateRow,
} from "./capitalRenovationRecipes";

export type CapitalRenovationCalculatorResult = {
  status: "PRELIMINARY_NEEDS_CONFIRMATION";
  promptParameters: CapitalRenovationPromptParameters;
  input: CapitalRenovationCalculatorInput;
  geometry: CapitalRenovationDerivedGeometry;
  rows: CapitalRenovationEstimateRow[];
  missingParameters: string[];
};

export const CAPITAL_RENOVATION_REQUIRED_MISSING_PARAMETERS = [
  "это квартира или частный дом",
  "количество комнат",
  "общая площадь санузлов",
  "площадь кухни",
  "стены: штукатурка по всем стенам или частично",
  "пол: ламинат / SPC / плитка / другое",
  "потолок: покраска / ГКЛ / натяжной",
  "санузлы: плитка до потолка или частично",
  "электрика: эконом / стандарт / премиум",
  "сантехника: точки воды и канализации",
  "количество межкомнатных дверей",
  "регион и валюта для цен",
  "бренды материалов или средний класс",
] as const;

export function isCapitalRenovationPrompt(text: string): boolean {
  return parseCapitalRenovationPrompt(text).matched;
}

export function calculateCapitalRenovationFromPrompt(text: string): CapitalRenovationCalculatorResult | null {
  const promptParameters = parseCapitalRenovationPrompt(text);
  if (!promptParameters.matched) return null;
  const input = defaultCapitalRenovationInput(promptParameters);
  const geometry = calculateCapitalRenovationGeometry(input);
  return {
    status: "PRELIMINARY_NEEDS_CONFIRMATION",
    promptParameters,
    input,
    geometry,
    rows: buildCapitalRenovationRows(geometry),
    missingParameters: [...CAPITAL_RENOVATION_REQUIRED_MISSING_PARAMETERS],
  };
}

export function capitalRenovationFormulaTrace(row: CapitalRenovationEstimateRow, geometry: CapitalRenovationDerivedGeometry): string {
  return [
    "template=capital_renovation_professional_calculator",
    "templateVersion=1.0.0",
    `formula=${row.formula}`,
    "normSource=src_professional_norm_pack_capital_renovation_calculator_v1",
    `area_m2=${geometry.areaM2}`,
    `ceiling_height_m=${geometry.ceilingHeightM}`,
    `bathrooms_count=${geometry.bathroomsCount}`,
    `result=${row.quantity} ${row.unit}`,
  ].join("; ");
}

export function capitalRenovationQuantitySummary(geometry: CapitalRenovationDerivedGeometry): Record<string, number> {
  return {
    area_m2: geometry.areaM2,
    ceiling_height_m: geometry.ceilingHeightM,
    bathrooms_count: geometry.bathroomsCount,
    ceiling_area_m2: geometry.ceilingAreaM2,
    bathroom_floor_area_m2: geometry.bathroomFloorAreaM2,
    dry_floor_area_m2: geometry.dryFloorAreaM2,
    gross_wall_area_m2: geometry.grossWallAreaM2,
    net_wall_area_m2: geometry.netWallAreaM2,
    bathroom_wall_tile_area_m2: geometry.bathroomWallTileAreaM2,
    paint_wall_area_m2: geometry.paintWallAreaM2,
    paint_total_area_m2: geometry.paintTotalAreaM2,
    baseboard_lm: geometry.baseboardLm,
    electrical_points: geometry.electricalPoints,
    water_points: geometry.waterPoints,
    sewer_points: geometry.sewerPoints,
    doors_count: geometry.doorsCount,
    waste_volume_m3: geometry.wasteVolumeM3,
  };
}
