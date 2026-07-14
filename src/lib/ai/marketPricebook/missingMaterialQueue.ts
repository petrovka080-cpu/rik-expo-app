import {
  PROFESSIONAL_WORK_SPECIFIC_TEMPLATE_CATALOG,
} from "../professionalEstimateTemplates/workSpecificTemplateCatalog";
import type { ProfessionalEstimateRecipeRow } from "../professionalEstimateTemplates/professionalEstimateTypes";
import {
  getMarketMaterialMasterItem,
  marketMaterialKeyForRecipeRow,
} from "./materialMasterCatalog";
import type { MarketMissingMaterialQueueItem } from "./marketPricebookTypes";

function queueItem(input: {
  selected_work_key: string;
  row: ProfessionalEstimateRecipeRow;
}): MarketMissingMaterialQueueItem {
  const materialKey = marketMaterialKeyForRecipeRow(input.row);
  return {
    queue_id: `${input.selected_work_key}:${input.row.row_key}:MATERIAL_MISSING`,
    selected_work_key: input.selected_work_key,
    row_key: input.row.row_key,
    expected_material_key: materialKey,
    visible_name_ru: input.row.visible_name_ru,
    row_domain: input.row.row_domain,
    reason: "MATERIAL_MISSING",
    fake_green_claimed: false,
  };
}

export function collectMissingMarketMaterialsForRows(input: {
  selected_work_key: string;
  rows: readonly ProfessionalEstimateRecipeRow[];
}): MarketMissingMaterialQueueItem[] {
  return input.rows
    .filter((row) => !getMarketMaterialMasterItem(marketMaterialKeyForRecipeRow(row)))
    .map((row) => queueItem({ selected_work_key: input.selected_work_key, row }));
}

export function buildMissingMarketMaterialQueue(): MarketMissingMaterialQueueItem[] {
  return PROFESSIONAL_WORK_SPECIFIC_TEMPLATE_CATALOG.flatMap((template) =>
    collectMissingMarketMaterialsForRows({
      selected_work_key: template.canonical_work_key,
      rows: [
        ...template.material_recipe_rows,
        ...template.labor_rows,
        ...template.equipment_rows,
        ...template.delivery_rows,
        ...template.overhead_rows,
      ],
    })
  );
}
