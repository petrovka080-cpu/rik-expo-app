import type { DraftRevisionPdfArtifact } from "../../../features/pdf/renderPdfFromDraftRevision";
import type { DraftRevisionSnapshot } from "../../../features/estimates/createSnapshotFromDraftRevision";

export function validateAiEstimatePdfSnapshotParity(input: {
  snapshot: DraftRevisionSnapshot;
  pdf: DraftRevisionPdfArtifact;
}): boolean {
  return input.pdf.snapshotId === input.snapshot.snapshotId &&
    input.pdf.revisionId === input.snapshot.revisionId &&
    input.pdf.rowsHash === input.snapshot.rowsHash &&
    input.pdf.presentationIdentityHash === input.snapshot.presentationIdentityHash &&
    JSON.stringify(input.pdf.presentationIdentity) === JSON.stringify(input.snapshot.presentationIdentity) &&
    input.pdf.rowsEqualLatestRevision === true;
}
