import type { AiEstimateLedgerRecord } from "../AiEstimateLedgerTypes";

export function validateAiEstimateLedgerRevisionArtifactLifecycle(record: AiEstimateLedgerRecord) {
  const currentRevision = record.revisions.find((revision) => revision.revisionId === record.currentRevisionId) ?? null;
  const revisionChainPreserved = record.revisions.every((revision, index) =>
    index === 0 || revision.previousRevisionId === record.revisions[index - 1]?.revisionId
  );
  const staleArtifactsRejected = record.artifacts.artifactsValidForRevisionId === null
    || record.artifacts.artifactsValidForRevisionId === record.currentRevisionId;
  const currentRevisionHasBoundArtifacts = currentRevision !== null
    && (
      currentRevision.artifactsValidForRevisionId === null
      || currentRevision.artifactsValidForRevisionId === currentRevision.revisionId
    );
  return {
    ok: revisionChainPreserved && staleArtifactsRejected && currentRevisionHasBoundArtifacts,
    revision_chain_preserved: revisionChainPreserved,
    stale_pdf_buyer_invalidated_after_revision: staleArtifactsRejected,
    current_revision_artifact_binding_valid: currentRevisionHasBoundArtifacts,
  };
}
