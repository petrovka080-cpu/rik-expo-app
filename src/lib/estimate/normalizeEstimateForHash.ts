import type { DraftRevisionSnapshot } from "../../features/estimates/createSnapshotFromDraftRevision";
import type { DraftRevisionPdfArtifact } from "../../features/pdf/renderPdfFromDraftRevision";
import type { DraftRevisionBuyerHandoff } from "../../features/procurement/createBuyerHandoffFromDraftRevision";
import type {
  EstimateDraftRevision,
  ProfessionalBoqRow,
} from "./estimateDraftRevisionContract";
import type { ProfessionalCostingResult } from "./professionalCostingContract";
import { estimateDeterministicHash } from "./estimateDeterministicHash";

function sortedEntries<T>(value: Record<string, T>): [string, T][] {
  return Object.entries(value).sort(([left], [right]) => left.localeCompare(right));
}

function normalizeMaterialQuantity(row: ProfessionalBoqRow) {
  const material = row.materialQuantity;
  if (!material) return null;
  return {
    rowId: material.rowId,
    materialKey: row.materialKey ?? null,
    baseQuantity: material.baseQuantity,
    netQuantity: material.netQuantity,
    grossQuantity: material.grossQuantity,
    procurementQuantity: material.procurementQuantity,
    procurementUnit: material.procurementUnit,
    procurementPackageSize: material.procurementPackageSize,
    wastePercent: material.wastePercent,
    formula: material.formula,
    calculationTrace: material.calculationTrace,
  };
}

export function normalizeEstimateParamsForHash(revision: EstimateDraftRevision) {
  return sortedEntries(revision.params).map(([key, param]) => ({
    key,
    value: param.value,
    canonicalUnit: param.canonicalUnit ?? null,
    source: param.source,
    sourceText: param.sourceText ?? null,
  }));
}

export function normalizeBoqRowsForHash(rows: readonly ProfessionalBoqRow[]) {
  return rows.map((row) => ({
    rowId: row.rowId,
    rowType: row.rowType,
    titleRu: row.titleRu,
    quantity: row.quantity,
    unit: row.unit,
    unitLabel: row.unitLabel ?? null,
    unitPrice: row.unitPrice ?? null,
    currency: row.currency,
    category: row.category ?? null,
    sourceId: row.sourceId ?? null,
    sourceLabel: row.sourceLabel ?? null,
    formulaId: row.formulaId ?? null,
    quantityFormula: row.quantityFormula ?? null,
    calculationTrace: row.calculationTrace ?? null,
    sourceParameters: row.sourceParameters ?? null,
    templateId: row.templateId ?? null,
    templateVersion: row.templateVersion ?? null,
    normId: row.normId ?? null,
    normFamilyId: row.normFamilyId ?? null,
    normSourceId: row.normSourceId ?? null,
    normSourceTitle: row.normSourceTitle ?? null,
    normVersion: row.normVersion ?? null,
    normReviewStatus: row.normReviewStatus ?? null,
    priceStatus: row.priceStatus ?? null,
    priceSource: row.priceSource ?? null,
    priceSourceId: row.priceSourceId ?? null,
    priceSourceLabel: row.priceSourceLabel ?? null,
    materialKey: row.materialKey ?? null,
    rateKey: row.rateKey ?? null,
    includedInProcurement: row.includedInProcurement,
    materialQuantity: normalizeMaterialQuantity(row),
  }));
}

export function normalizeEstimateRevisionForHash(revision: EstimateDraftRevision) {
  return {
    rawInput: revision.rawInput,
    selectedTemplateId: revision.selectedTemplateId,
    matchedFamily: revision.matchedFamily,
    source: revision.source,
    status: revision.status,
    params: normalizeEstimateParamsForHash(revision),
    assumptions: revision.assumptions.map((assumption) => ({
      key: assumption.key,
      value: assumption.value,
      reason: assumption.reason,
      replacedByUserInput: assumption.replacedByUserInput,
      visibleToUser: assumption.visibleToUser,
    })),
    missingInputs: revision.missingInputs,
    sections: revision.boq.sections,
    rows: normalizeBoqRowsForHash(revision.boq.rows),
    trace: {
      selectedTemplateId: revision.trace.selectedTemplateId,
      params: revision.trace.params.map((param) => ({
        key: param.key,
        value: param.value,
        canonicalUnit: param.canonicalUnit ?? null,
        source: param.source,
        affectsRowIds: [...param.affectsRowIds].sort(),
      })),
      rows: revision.trace.rows.map((row) => ({
        rowId: row.rowId,
        formulaId: row.formulaId ?? null,
        quantityFormula: row.quantityFormula ?? null,
        calculationTrace: row.calculationTrace ?? null,
        resultQuantity: row.resultQuantity,
        sourceParamKeys: [...row.sourceParamKeys].sort(),
      })),
      staleTraceAccepted: revision.trace.staleTraceAccepted,
    },
  };
}

export function normalizeSnapshotForHash(snapshot: DraftRevisionSnapshot) {
  return {
    rowsHash: snapshot.rowsHash,
    totalsHash: snapshot.totalsHash,
    rows: normalizeBoqRowsForHash(snapshot.rows),
    snapshot_revision_binding_enforced: snapshot.snapshot_revision_binding_enforced,
  };
}

export function normalizeCostingForHash(costing: ProfessionalCostingResult) {
  return {
    lines: costing.lines.map((line) => ({
      rowId: line.rowId,
      templateId: line.templateId,
      family: line.family,
      rowType: line.rowType,
      name: line.name,
      quantity: line.quantity,
      unit: line.unit,
      unitPrice: line.unitPrice,
      priceState: line.priceState,
      currency: line.currency,
      priceSourceId: line.priceSourceId,
      priceSourceLabel: line.priceSourceLabel,
      priceRetrievedAt: line.priceRetrievedAt,
      priceRegion: line.priceRegion,
      lineSubtotal: line.lineSubtotal,
      trustedForPreliminaryTotal: line.trustedForPreliminaryTotal,
      trustedForContractTotal: line.trustedForContractTotal,
      priceLimitations: line.priceLimitations,
    })),
    summary: costing.summary,
  };
}

export function normalizePdfPackageForHash(pdf: DraftRevisionPdfArtifact) {
  return {
    rowsHash: pdf.rowsHash,
    rowsEqualLatestRevision: pdf.rowsEqualLatestRevision,
    pdf_revision_binding_enforced: pdf.pdf_revision_binding_enforced,
    body: pdf.body,
  };
}

export function normalizeBuyerHandoffForHash(buyerHandoff: DraftRevisionBuyerHandoff) {
  return {
    rowsHash: buyerHandoff.rowsHash,
    items: buyerHandoff.items,
    costTrace: buyerHandoff.costTrace,
    buyer_handoff_revision_binding_enforced: buyerHandoff.buyer_handoff_revision_binding_enforced,
    forbiddenWorkRowsPresent: buyerHandoff.forbiddenWorkRowsPresent,
  };
}

export function estimateReplayHashes(input: {
  revision: EstimateDraftRevision;
  snapshot: DraftRevisionSnapshot;
  costing: ProfessionalCostingResult;
  pdf: DraftRevisionPdfArtifact;
  buyerHandoff: DraftRevisionBuyerHandoff;
}) {
  return {
    prompt_hash: estimateDeterministicHash({
      rawInput: input.revision.rawInput,
      selectedTemplateId: input.revision.selectedTemplateId,
    }),
    params_hash: estimateDeterministicHash(normalizeEstimateParamsForHash(input.revision)),
    boq_hash: estimateDeterministicHash(normalizeEstimateRevisionForHash(input.revision)),
    material_quantity_hash: estimateDeterministicHash(normalizeBoqRowsForHash(input.revision.boq.rows).map((row) => ({
      rowId: row.rowId,
      materialKey: row.materialKey,
      materialQuantity: row.materialQuantity,
    }))),
    snapshot_hash: estimateDeterministicHash(normalizeSnapshotForHash(input.snapshot)),
    costing_hash: estimateDeterministicHash(normalizeCostingForHash(input.costing)),
    pdf_package_hash: estimateDeterministicHash(normalizePdfPackageForHash(input.pdf)),
    buyer_handoff_hash: estimateDeterministicHash(normalizeBuyerHandoffForHash(input.buyerHandoff)),
  };
}
