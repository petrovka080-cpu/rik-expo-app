import type {
  ProfessionalEstimateRecipeRow,
} from "./professionalEstimateTypes";

export type ProfessionalCatalogBindingStatus =
  | "CATALOG_LOOKUP_REQUIRED"
  | "CATALOG_ITEM_BOUND"
  | "CATALOG_NOT_REQUIRED";

export type ProfessionalCatalogBinding = {
  row_key: string;
  material_key: string | null;
  catalog_item_id: string | null;
  search_query: string;
  binding_status: ProfessionalCatalogBindingStatus;
  fake_catalog_item_claimed: false;
};

export function bindProfessionalRecipeRowToCatalog(
  row: ProfessionalEstimateRecipeRow,
): ProfessionalCatalogBinding {
  if (!row.material_key) {
    return {
      row_key: row.row_key,
      material_key: null,
      catalog_item_id: null,
      search_query: row.visible_name_ru,
      binding_status: "CATALOG_NOT_REQUIRED",
      fake_catalog_item_claimed: false,
    };
  }
  return {
    row_key: row.row_key,
    material_key: row.material_key,
    catalog_item_id: row.catalog_item_id,
    search_query: row.visible_name_ru,
    binding_status: row.catalog_item_id ? "CATALOG_ITEM_BOUND" : "CATALOG_LOOKUP_REQUIRED",
    fake_catalog_item_claimed: false,
  };
}
