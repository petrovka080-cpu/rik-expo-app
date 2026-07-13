import type {
  ProfessionalEstimateLine,
  ProfessionalEstimateRecipeRow,
  ProfessionalRegion,
} from "../professionalEstimateTemplates/professionalEstimateTypes";
import { currencyForProfessionalRegion } from "../professionalEstimateTemplates/professionalCurrencyPolicy";
import { marketMaterialKeyForRecipeRow } from "./materialMasterCatalog";
import { resolveMarketGovernedPriceForProfessionalRow } from "./regionalPricebookResolver";
import type { MarketMissingPriceQueueItem } from "./marketPricebookTypes";

export function collectMissingMarketPricesForRows(input: {
  selected_work_key: string;
  rows: readonly ProfessionalEstimateRecipeRow[];
  region: ProfessionalRegion;
}): MarketMissingPriceQueueItem[] {
  const currency = currencyForProfessionalRegion(input.region);
  return input.rows
    .filter((row) => row.price_required)
    .filter((row) => !resolveMarketGovernedPriceForProfessionalRow({ row, region: input.region }))
    .map((row) => {
      const materialKey = marketMaterialKeyForRecipeRow(row);
      return {
        queue_id: `${input.region}:${input.selected_work_key}:${row.row_key}:PRICE_MISSING`,
        selected_work_key: input.selected_work_key,
        row_key: row.row_key,
        material_key: materialKey,
        visible_name_ru: row.visible_name_ru,
        region: input.region,
        currency,
        unit: row.unit,
        reason: "PRICE_MISSING",
        fake_green_claimed: false,
      };
    });
}

export function collectMissingMarketPricesForSnapshotLines(input: {
  selected_work_key: string;
  lines: readonly ProfessionalEstimateLine[];
}): MarketMissingPriceQueueItem[] {
  return input.lines
    .filter((line) => line.price_required && line.price.price_status === "PRICE_MISSING")
    .map((line) => ({
      queue_id: `${line.price.region}:${input.selected_work_key}:${line.row_key}:PRICE_MISSING`,
      selected_work_key: input.selected_work_key,
      row_key: line.row_key,
      material_key: line.price.material_key ?? line.material_key ?? line.row_key,
      visible_name_ru: line.visible_name_ru,
      region: line.price.region,
      currency: line.price.currency,
      unit: line.unit,
      reason: "PRICE_MISSING",
      fake_green_claimed: false,
    }));
}
