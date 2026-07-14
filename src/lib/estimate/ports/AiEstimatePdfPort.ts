import type { DraftRevisionSnapshot } from "../../../features/estimates/createSnapshotFromDraftRevision";
import type { DraftRevisionPdfArtifact } from "../../../features/pdf/renderPdfFromDraftRevision";
import type { EstimateDraftRevision } from "../estimateDraftRevisionContract";

export type AiEstimatePdfPort = {
  readonly portKind: "estimate_pdf";
  buildPdfSnapshot(input: {
    revision: EstimateDraftRevision;
    snapshot?: DraftRevisionSnapshot;
  }): {
    revision: EstimateDraftRevision;
    snapshot: DraftRevisionSnapshot;
    pdf: DraftRevisionPdfArtifact;
  };
};
