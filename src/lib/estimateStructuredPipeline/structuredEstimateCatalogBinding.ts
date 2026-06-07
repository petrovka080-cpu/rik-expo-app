import {
  formatCatalogMaterialButtonLabel,
  toVisibleEstimateLabel,
} from "../estimatePresentation/visibleEstimateLabelPolicy";
import type { StructuredEstimatePayload, StructuredEstimateRow } from "./structuredEstimateTypes";
import { stableStructuredEstimateHash } from "./buildStructuredEstimatePayload";

export type StructuredEstimateCatalogRowBinding = {
  rowId: string;
  visibleName: string;
  searchQuery: string;
  buttonLabel: string;
  materialKey?: string;
  catalogItemId?: string | null;
};

function visibleMaterialSearchQuery(row: StructuredEstimateRow): string {
  return toVisibleEstimateLabel({
    label: row.visibleName,
    materialKey: row.materialKey,
    sectionType: "materials",
  });
}

export function buildStructuredEstimateCatalogBinding(payload: StructuredEstimatePayload) {
  const materialRows = payload.rows.filter((row) => row.sectionType === "materials");
  const rows: StructuredEstimateCatalogRowBinding[] = materialRows.map((row) => {
    const searchQuery = visibleMaterialSearchQuery(row);
    return {
      rowId: row.rowId,
      visibleName: row.visibleName,
      searchQuery,
      buttonLabel: formatCatalogMaterialButtonLabel({
        visibleName: searchQuery,
        materialKey: row.materialKey,
      }),
      materialKey: row.materialKey,
      catalogItemId: row.catalogItemId,
    };
  });

  return {
    payloadFingerprint: payload.fingerprint,
    rows,
    catalogRowsFingerprint: stableStructuredEstimateHash(rows.map((row) => ({
      rowId: row.rowId,
      visibleName: row.visibleName,
      searchQuery: row.searchQuery,
      buttonLabel: row.buttonLabel,
    }))),
    fakeGreenClaimed: false as const,
  };
}
