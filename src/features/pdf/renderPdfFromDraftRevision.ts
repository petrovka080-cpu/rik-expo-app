import { createSnapshotFromDraftRevision, type DraftRevisionSnapshot } from "../estimates/createSnapshotFromDraftRevision";
import type { EstimateDraftRevision } from "../../lib/estimate/estimateDraftRevisionContract";
import { calculateProfessionalCostForDraftRows } from "../../lib/estimate/professionalCostCalculator";
import { renderProfessionalCostSection } from "./renderProfessionalCostSection";
import { renderProfessionalBoqFullMaterialComposition } from "./renderProfessionalBoqFullMaterialComposition";
import { renderMaterialQuantityTraceSection } from "./renderMaterialQuantityTraceSection";
import { renderMaterialWastePackagingSection } from "./renderMaterialWastePackagingSection";

export type DraftRevisionPdfArtifact = {
  pdfArtifactId: string;
  revisionId: string;
  snapshotId: string;
  rowsHash: string;
  rowsEqualLatestRevision: true;
  pdf_revision_binding_enforced: true;
  body: string;
};

export function renderPdfFromDraftRevision(input: {
  revision: EstimateDraftRevision;
  snapshot?: DraftRevisionSnapshot;
}): {
  revision: EstimateDraftRevision;
  snapshot: DraftRevisionSnapshot;
  pdf: DraftRevisionPdfArtifact;
} {
  const snapshotResult = input.snapshot
    ? { snapshot: input.snapshot, revision: input.revision }
    : createSnapshotFromDraftRevision(input.revision);
  if (snapshotResult.snapshot.revisionId !== snapshotResult.revision.revisionId) {
    throw new Error("PDF_DRAFT_REVISION_SNAPSHOT_MISMATCH");
  }
  const cost = calculateProfessionalCostForDraftRows({
    templateId: snapshotResult.revision.selectedTemplateId,
    family: snapshotResult.revision.matchedFamily,
    rows: snapshotResult.snapshot.rows.filter((row) => row.rowType !== "document" && row.rowType !== "other"),
  });
  const pdf: DraftRevisionPdfArtifact = {
    pdfArtifactId: `pdf_${snapshotResult.revision.revisionId}`,
    revisionId: snapshotResult.revision.revisionId,
    snapshotId: snapshotResult.snapshot.snapshotId,
    rowsHash: snapshotResult.snapshot.rowsHash,
    rowsEqualLatestRevision: true,
    pdf_revision_binding_enforced: true,
    body: [
      `revision=${snapshotResult.revision.revisionId}`,
      `snapshot=${snapshotResult.snapshot.snapshotId}`,
      ...snapshotResult.snapshot.rows.map((row) => `${row.rowId};${row.titleRu};${row.quantity};${row.unit}`),
      renderProfessionalBoqFullMaterialComposition({ rows: snapshotResult.snapshot.rows }),
      renderMaterialQuantityTraceSection({
        rows: snapshotResult.snapshot.rows,
        templateId: snapshotResult.revision.selectedTemplateId,
        family: snapshotResult.revision.matchedFamily,
      }),
      renderMaterialWastePackagingSection({
        rows: snapshotResult.snapshot.rows,
        templateId: snapshotResult.revision.selectedTemplateId,
        family: snapshotResult.revision.matchedFamily,
      }),
      renderProfessionalCostSection({ summary: cost.summary, lines: cost.lines }),
    ].join("\n"),
  };
  return {
    snapshot: snapshotResult.snapshot,
    pdf,
    revision: {
      ...snapshotResult.revision,
      artifacts: {
        ...snapshotResult.revision.artifacts,
        snapshotId: snapshotResult.snapshot.snapshotId,
        pdfArtifactId: pdf.pdfArtifactId,
        artifactsValidForRevisionId: snapshotResult.revision.revisionId,
      },
    },
  };
}
