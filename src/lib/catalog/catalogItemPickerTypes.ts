import type { CatalogItemForEstimate } from "./catalogItemTypes";

export type CatalogItemPickerItem = Partial<CatalogItemForEstimate> & {
  catalogItemId: string;
  rikCode: string;
  name: string;
  unit: string;
  kind?: string | null;
  /** Server-owned eligibility of the selected resource for the procurement artifact. */
  procurementEligible?: boolean;
  sourceId: string;
  sourceLabel: string;
};
