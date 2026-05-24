export type CatalogItemPickerItem = {
  catalogItemId: string;
  rikCode: string;
  name: string;
  unit: string;
  kind?: string | null;
  sourceId: string;
  sourceLabel: string;
};
