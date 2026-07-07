import type { EstimateDraftRevision } from "./estimateDraftRevisionContract";

export type EstimateDraftRevisionValidation = {
  valid: boolean;
  revision_without_template_id: boolean;
  revision_without_params: boolean;
  revision_without_boq: boolean;
  revision_without_trace: boolean;
  pdf_artifact_points_to_old_revision: boolean;
  buyer_handoff_points_to_old_revision: boolean;
  failures: string[];
};

export function validateEstimateDraftRevision(
  revision: EstimateDraftRevision,
): EstimateDraftRevisionValidation {
  const revisionWithoutTemplateId = !revision.selectedTemplateId.trim();
  const revisionWithoutParams = Object.keys(revision.params).length === 0;
  const revisionWithoutBoq = revision.boq.rows.length === 0 || revision.boq.sections.length === 0;
  const revisionWithoutTrace =
    !revision.trace.traceId ||
    revision.trace.revisionId !== revision.revisionId ||
    revision.trace.selectedTemplateId !== revision.selectedTemplateId ||
    revision.trace.rows.length !== revision.boq.rows.length;
  const pdfArtifactPointsToOldRevision =
    Boolean(revision.artifacts.pdfArtifactId) &&
    revision.artifacts.artifactsValidForRevisionId !== revision.revisionId;
  const buyerHandoffPointsToOldRevision =
    Boolean(revision.artifacts.buyerHandoffId) &&
    revision.artifacts.artifactsValidForRevisionId !== revision.revisionId;

  const failures = [
    revisionWithoutTemplateId ? "revision_without_template_id" : "",
    revisionWithoutParams ? "revision_without_params" : "",
    revisionWithoutBoq ? "revision_without_boq" : "",
    revisionWithoutTrace ? "revision_without_trace" : "",
    pdfArtifactPointsToOldRevision ? "pdf_artifact_points_to_old_revision" : "",
    buyerHandoffPointsToOldRevision ? "buyer_handoff_points_to_old_revision" : "",
  ].filter(Boolean);

  return {
    valid: failures.length === 0,
    revision_without_template_id: revisionWithoutTemplateId,
    revision_without_params: revisionWithoutParams,
    revision_without_boq: revisionWithoutBoq,
    revision_without_trace: revisionWithoutTrace,
    pdf_artifact_points_to_old_revision: pdfArtifactPointsToOldRevision,
    buyer_handoff_points_to_old_revision: buyerHandoffPointsToOldRevision,
    failures,
  };
}

export function assertValidEstimateDraftRevision(revision: EstimateDraftRevision): void {
  const validation = validateEstimateDraftRevision(revision);
  if (!validation.valid) {
    throw new Error(`ESTIMATE_DRAFT_REVISION_INVALID:${validation.failures.join(",")}`);
  }
}
