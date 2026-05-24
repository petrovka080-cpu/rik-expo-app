import type { CatalogItemForEstimate } from "./catalogItemTypes";

export type CatalogItemPickerItem = Partial<CatalogItemForEstimate> & {
  catalogItemId: string;
  rikCode: string;
  name: string;
  unit: string;
  kind?: string | null;
  sourceId: string;
  sourceLabel: string;
};
