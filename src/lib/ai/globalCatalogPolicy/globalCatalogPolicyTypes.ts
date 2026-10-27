export type GlobalCatalogCandidate = {
  catalogItemId: string;
  materialKey: string;
  label: string;
  region: string;
  supplierName?: never;
  stockQuantity?: never;
  availability?: never;
};

export type GlobalCatalogMaterialRow = {
  materialKey: string;
  unit: string;
  quantity: number;
  catalogRegion: string;
  catalogCandidates: GlobalCatalogCandidate[];
  catalogItemId?: string;
  catalogGapWarning?: string;
};
