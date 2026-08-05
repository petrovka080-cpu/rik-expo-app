import type { DraftRevisionSnapshot } from "../../features/estimates/createSnapshotFromDraftRevision";
import type { DraftRevisionPdfArtifact } from "../../features/pdf/renderPdfFromDraftRevision";
import type { DraftRevisionBuyerHandoff } from "../../features/procurement/createBuyerHandoffFromDraftRevision";
import type { EstimateDraftRevision } from "./estimateDraftRevisionContract";
import {
  AI_ESTIMATE_CALCULATOR_VERSION,
  AI_ESTIMATE_CATALOG_VERSION,
  AI_ESTIMATE_NORM_REGISTRY_VERSION,
  AI_ESTIMATE_PRICEBOOK_VERSION,
  AI_ESTIMATE_REPLAYABLE_CORE_SCHEMA,
  type EstimateReplayRecord,
  type EstimateReplayVersionLineage,
} from "./replayableEstimateCoreContract";
import { estimateReplayHashes } from "./normalizeEstimateForHash";
import { calculateProfessionalCostForDraftRows } from "./professionalCostCalculator";

function firstRevisionTimestamp(revision: EstimateDraftRevision): string {
  return Object.values(revision.params)[0]?.lastChangedAt ?? "1970-01-01T00:00:00.000Z";
}

function defaultLineage(sourceSha: string): EstimateReplayVersionLineage {
  return {
    source_sha: sourceSha,
    catalog_version: AI_ESTIMATE_CATALOG_VERSION,
    norm_registry_version: AI_ESTIMATE_NORM_REGISTRY_VERSION,
    pricebook_version: AI_ESTIMATE_PRICEBOOK_VERSION,
    calculator_version: AI_ESTIMATE_CALCULATOR_VERSION,
  };
}

export function buildEstimateReplayRecord(input: {
  caseId: string;
  revision: EstimateDraftRevision;
  snapshot: DraftRevisionSnapshot;
  pdf: DraftRevisionPdfArtifact;
  buyerHandoff: DraftRevisionBuyerHandoff;
  sourceSha: string;
  createdAt?: string;
  versionLineage?: Partial<EstimateReplayVersionLineage>;
}): EstimateReplayRecord {
  if (!input.revision.resolvedIdentity) {
    throw new Error("REPLAY_RESOLVED_IDENTITY_REQUIRED_FOR_NEW_REVISION");
  }
  const costing = calculateProfessionalCostForDraftRows({
    templateId: input.revision.selectedTemplateId,
    family: input.revision.matchedFamily,
    rows: input.snapshot.rows.filter((row) => row.rowType !== "document" && row.rowType !== "other"),
  });
  const versionLineage = {
    ...defaultLineage(input.sourceSha),
    ...(input.versionLineage ?? {}),
  };
  const materialRows = input.revision.boq.rows.filter((row) => row.rowType === "material");
  const workRows = input.revision.boq.rows.filter((row) => row.rowType === "work" || row.rowType === "labor");
  return {
    schema: AI_ESTIMATE_REPLAYABLE_CORE_SCHEMA,
    record_id: `replay_record:${input.caseId}:${input.revision.revisionId}`,
    case_id: input.caseId,
    source_prompt: input.revision.rawInput,
    selected_template_id: input.revision.selectedTemplateId,
    estimate_draft_id: input.revision.estimateDraftId,
    revision_id: input.revision.revisionId,
    snapshot_id: input.snapshot.snapshotId,
    pdf_artifact_id: input.pdf.pdfArtifactId,
    buyer_handoff_id: input.buyerHandoff.buyerHandoffId,
    created_at: input.createdAt ?? firstRevisionTimestamp(input.revision),
    matched_family: input.revision.matchedFamily,
    row_count: input.revision.boq.rows.length,
    material_rows_count: materialRows.length,
    work_rows_count: workRows.length,
    snapshot_rows_hash: input.snapshot.rowsHash,
    snapshot_totals_hash: input.snapshot.totalsHash,
    version_lineage: versionLineage,
    resolved_identity: input.revision.resolvedIdentity,
    hashes: estimateReplayHashes({
      revision: input.revision,
      snapshot: input.snapshot,
      costing,
      pdf: input.pdf,
      buyerHandoff: input.buyerHandoff,
    }),
    replay_record_builder_created: true,
    all_replay_records_have_snapshot: true,
    all_replay_records_have_version_lineage: true,
    all_new_replay_records_have_resolved_identity: true,
    new_revision_prompt_fallback_used: false,
    fake_green_claimed: false,
  };
}
