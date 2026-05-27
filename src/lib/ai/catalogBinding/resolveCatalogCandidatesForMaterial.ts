import {
  buildCatalogSearchQueriesForEstimateRow,
  rankCatalogCandidatesForEstimateRow,
} from "../../catalog/catalogItemSearch";
import type { CatalogItemForEstimate } from "../../catalog/catalogItemTypes";
import type { SourceBackedEstimateRow } from "../globalEstimate";

export function resolveCatalogQueriesForMaterial(row: Pick<SourceBackedEstimateRow, "name" | "unit" | "materialKey" | "rateKey">): string[] {
  return buildCatalogSearchQueriesForEstimateRow(row);
}

export function resolveCatalogCandidatesForMaterial(input: {
  row: Pick<SourceBackedEstimateRow, "name" | "unit" | "materialKey" | "rateKey">;
  candidates: CatalogItemForEstimate[];
}): CatalogItemForEstimate[] {
  return rankCatalogCandidatesForEstimateRow(input.row, input.candidates);
}
