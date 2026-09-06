import { createHash } from "node:crypto";

import {
  buildCanonicalProcurementProjection,
  selectCanonicalArtifactRows,
} from "../../src/lib/estimate/backendPlatform/canonicalEstimateArtifactContract";
import type { CanonicalEstimateCompileCoreResult } from "../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore";
import { canonicalEstimateStableJson } from "../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism";
import { buildCanonicalProfessionalPdfProjection } from "../../src/lib/estimate/backendPlatform/canonicalProfessionalPdf";

export type CanonicalDurableRevision = {
  revisionId: string;
  parentRevisionId: string | null;
  definitionVersionId: string;
  projection: CanonicalEstimateCompileCoreResult["revisionProjection"];
  rows: CanonicalEstimateCompileCoreResult["rows"];
};

export function reopenCanonicalDurableRevision(
  revision: CanonicalDurableRevision,
): CanonicalDurableRevision {
  return JSON.parse(canonicalEstimateStableJson(revision)) as CanonicalDurableRevision;
}

export function changedCanonicalRowIds(
  before: CanonicalEstimateCompileCoreResult["rows"],
  after: CanonicalEstimateCompileCoreResult["rows"],
): string[] {
  const beforeById = new Map(before.map((row) => [row.row_id, canonicalEstimateStableJson(row)]));
  return after
    .filter((row) => beforeById.get(row.row_id) !== canonicalEstimateStableJson(row))
    .map((row) => row.row_id);
}

export function buildCanonicalDurableArtifacts(input: {
  durable: CanonicalDurableRevision;
  workTitleRu: string;
  createdAt: string;
  primaryMeasureParameterId: string;
  primaryMeasureUnitId: string;
}) {
  const selected = selectCanonicalArtifactRows(input.durable.rows);
  const projection = input.durable.projection;
  const revision = {
    id: input.durable.revisionId,
    release_id: "canonical-durable-contract-release",
    catalog_id: projection.catalogId,
    definition_version_id: input.durable.definitionVersionId,
    checksum_sha256: createHash("sha256")
      .update(canonicalEstimateStableJson(projection), "utf8")
      .digest("hex"),
    row_count: selected.estimateRows.length,
    currency_code: projection.currencyCode,
    totals: projection.totals,
    input_parameters: projection.parameters,
    revision_number: input.durable.parentRevisionId ? 2 : 1,
    created_at: input.createdAt,
    primary_measure_parameter_id: input.primaryMeasureParameterId,
    primary_measure_value: projection.parameters[input.primaryMeasureParameterId],
    primary_measure_unit_id: input.primaryMeasureUnitId,
  };
  return {
    selected,
    pdf: buildCanonicalProfessionalPdfProjection({
      revision,
      rows: selected.estimateRows,
      workTitleRu: input.workTitleRu,
      definitionVersionId: input.durable.definitionVersionId,
    }),
    procurement: buildCanonicalProcurementProjection({
      revision,
      procurementRows: selected.procurementRows,
    }),
  };
}
