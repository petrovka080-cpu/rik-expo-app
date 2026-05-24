import {
  buildCatalogSearchQueriesForEstimateRow,
  deriveMaterialKeyFromRateKey,
  rankCatalogCandidatesForEstimateRow,
} from "../../../catalog/catalogItemSearch";
import type { CatalogItemForEstimate } from "../../../catalog/catalogItemTypes";
import type { GlobalEstimateResult, SourceBackedEstimateRow } from "../globalEstimateTypes";
import type {
  EstimateCatalogBindingCandidate,
  EstimateCatalogBindingResult,
  EstimateCatalogBindingStatus,
} from "./globalEstimateCatalogBindingTypes";

export type EstimateCatalogSearchProvider = (
  query: string,
  row: SourceBackedEstimateRow,
) => Promise<CatalogItemForEstimate[]>;

function rowId(row: SourceBackedEstimateRow): string {
  return row.code || row.rowNumber;
}

function isMaterialRow(sectionType: string, row: SourceBackedEstimateRow): boolean {
  return sectionType === "materials" && Boolean(row.materialKey || deriveMaterialKeyFromRateKey(row.rateKey));
}

function toCandidate(item: CatalogItemForEstimate, reason: string): EstimateCatalogBindingCandidate {
  return {
    catalogItemId: item.catalogItemId,
    name: item.name,
    unit: item.unit,
    unitLabel: item.unitLabel,
    unitPrice: item.unitPrice ?? null,
    currency: item.currency,
    sourceId: item.sourceId,
    sourceLabel: item.sourceLabel,
    confidence: item.confidence,
    availabilityStatus: item.availabilityStatus,
    stockStatus: item.stockStatus,
    matchReason: reason,
  };
}

function bindingStatus(candidateCount: number): EstimateCatalogBindingStatus {
  if (candidateCount === 0) return "no_catalog_match";
  if (candidateCount === 1) return "matched";
  return "multiple_candidates";
}

function dedupeCandidates(candidates: CatalogItemForEstimate[]): CatalogItemForEstimate[] {
  const byId = new Map<string, CatalogItemForEstimate>();
  for (const candidate of candidates) {
    if (!byId.has(candidate.catalogItemId)) byId.set(candidate.catalogItemId, candidate);
  }
  return [...byId.values()];
}

export async function bindEstimateRowsToCatalogItems(input: {
  estimate: GlobalEstimateResult;
  searchProvider?: EstimateCatalogSearchProvider;
  maxCandidatesPerRow?: number;
}): Promise<EstimateCatalogBindingResult> {
  const provider = input.searchProvider ?? (async (query) => {
    const { searchCatalogItemsForEstimateBinding } = await import("../../../catalog/catalogItemsService");
    return searchCatalogItemsForEstimateBinding(query, input.maxCandidatesPerRow ?? 8);
  });
  const rows: EstimateCatalogBindingResult["rows"] = [];
  const warnings: string[] = [];

  for (const section of input.estimate.sections) {
    for (const row of section.rows) {
      const materialKey = row.materialKey ?? deriveMaterialKeyFromRateKey(row.rateKey);
      if (!isMaterialRow(section.type, row)) {
        rows.push({
          rowId: rowId(row),
          materialKey,
          rateKey: row.rateKey,
          catalogCandidates: [],
          bindingStatus: "not_material_row",
        });
        continue;
      }

      const queries = buildCatalogSearchQueriesForEstimateRow({
        name: row.name,
        unit: row.unit,
        materialKey,
        rateKey: row.rateKey,
      });
      const found: CatalogItemForEstimate[] = [];
      for (const query of queries) {
        found.push(...await provider(query, row));
      }

      const ranked = rankCatalogCandidatesForEstimateRow({
        name: row.name,
        unit: row.unit,
        materialKey,
        rateKey: row.rateKey,
      }, dedupeCandidates(found)).slice(0, input.maxCandidatesPerRow ?? 8);
      const catalogCandidates = ranked.map((candidate) =>
        toCandidate(candidate, candidate.rateKey === row.rateKey
          ? "rateKey"
          : candidate.materialKey === materialKey
            ? "materialKey"
            : "name/unit"),
      );
      const status = bindingStatus(catalogCandidates.length);
      if (status === "no_catalog_match") {
        warnings.push(`NO_CATALOG_MATCH:${rowId(row)}:${materialKey ?? row.rateKey}`);
      }
      rows.push({
        rowId: rowId(row),
        materialKey,
        rateKey: row.rateKey,
        catalogCandidates,
        bindingStatus: status,
      });
    }
  }

  return {
    estimateId: input.estimate.estimateId,
    rows,
    warnings,
  };
}

export function selectEstimateCatalogCandidate(input: {
  binding: EstimateCatalogBindingResult;
  rowId: string;
  catalogItemId: string;
}): EstimateCatalogBindingResult {
  return {
    ...input.binding,
    rows: input.binding.rows.map((row) =>
      row.rowId === input.rowId
        ? { ...row, selectedCatalogItemId: input.catalogItemId }
        : row,
    ),
  };
}
