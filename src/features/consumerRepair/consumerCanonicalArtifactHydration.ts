import {
  assertCanonicalEstimateArtifactIdentity,
  buildCanonicalEstimateArtifact,
  getCanonicalEstimateArtifact,
} from "../../lib/estimate/backendPlatform/canonicalEstimateClient";
import {
  CanonicalEstimateApiError,
  type CanonicalEstimateArtifactView,
  type CanonicalEstimateRevisionView,
} from "../../lib/estimate/backendPlatform/contracts";

export async function loadConsumerCanonicalProcurementArtifact(input: {
  revision: CanonicalEstimateRevisionView;
  currentCatalogReleaseId: string;
  expectedCatalogId?: string | null;
}): Promise<CanonicalEstimateArtifactView> {
  const { revision } = input;
  let artifact: CanonicalEstimateArtifactView;
  if (input.currentCatalogReleaseId !== revision.releaseId) {
    // Historical releases permit immutable reads, not new artifact jobs.
    try {
      artifact = await getCanonicalEstimateArtifact({ revisionId: revision.revisionId, kind: "procurement" });
    } catch (error) {
      if (!(error instanceof CanonicalEstimateApiError) || error.code !== "NOT_FOUND") throw error;
      throw new CanonicalEstimateApiError(
        "Для этой старой версии сохранённый список закупки не найден. Сформируйте исправленную смету для нового списка.",
        { code: "REVISION_CONTENT_QUARANTINED", httpStatus: 409 },
      );
    }
  } else {
    // Current releases still ensure the current renderer through the server.
    artifact = await buildCanonicalEstimateArtifact({
      revisionId: revision.revisionId,
      kind: "procurement",
      idempotencyKey: `consumer-procurement-${revision.revisionId}`,
    });
  }
  assertCanonicalEstimateArtifactIdentity({
    artifact, revision, expectedKind: "procurement",
    expectedCatalogId: input.expectedCatalogId ?? revision.catalogId,
    expectedRowCount: revision.rowCount,
  });
  return artifact;
}

export type ConsumerCanonicalReadyArtifactBinding = {
  artifactId: string;
  kind: "pdf" | "procurement";
  revisionId: string;
  releaseId: string;
};

type RequestedArtifact = {
  kind: "pdf" | "procurement";
  documentProfile?: "professional_v1";
};

const COLD_REOPEN_ARTIFACTS: readonly RequestedArtifact[] = [
  { kind: "pdf", documentProfile: "professional_v1" },
  { kind: "procurement" },
];

export function canonicalReadyArtifactBindingFromView(input: {
  artifact: CanonicalEstimateArtifactView;
  requestedKind: "pdf" | "procurement";
  expectedRevisionId: string;
  expectedReleaseId: string;
}): ConsumerCanonicalReadyArtifactBinding | null {
  const { artifact, requestedKind, expectedRevisionId, expectedReleaseId } = input;
  if (artifact.status !== "ready") return null;
  const kindMatches = requestedKind === "pdf"
    ? artifact.kind === "pdf" || artifact.kind === "professional_pdf"
    : artifact.kind === "procurement";
  if (
    !artifact.artifactId.trim()
    || !kindMatches
    || artifact.revisionId !== expectedRevisionId
    || artifact.releaseId !== expectedReleaseId
  ) {
    throw new CanonicalEstimateApiError(
      "Сохранённый артефакт не восстановлен: backend вернул другую версию сметы.",
      { code: "CANONICAL_ARTIFACT_COLD_REOPEN_IDENTITY_MISMATCH", httpStatus: 409 },
    );
  }
  return {
    artifactId: artifact.artifactId,
    kind: requestedKind,
    revisionId: artifact.revisionId,
    releaseId: artifact.releaseId,
  };
}

export async function loadConsumerCanonicalReadyArtifacts(input: {
  revisionId: string;
  releaseId: string;
}): Promise<ConsumerCanonicalReadyArtifactBinding[]> {
  const artifacts = await Promise.all(COLD_REOPEN_ARTIFACTS.map(async (requested) => {
    try {
      const artifact = await getCanonicalEstimateArtifact({
        revisionId: input.revisionId,
        kind: requested.kind,
        documentProfile: requested.documentProfile,
      });
      return canonicalReadyArtifactBindingFromView({
        artifact,
        requestedKind: requested.kind,
        expectedRevisionId: input.revisionId,
        expectedReleaseId: input.releaseId,
      });
    } catch (error) {
      if (error instanceof CanonicalEstimateApiError && error.code === "NOT_FOUND") {
        return null;
      }
      throw error;
    }
  }));
  return artifacts.filter(
    (artifact): artifact is ConsumerCanonicalReadyArtifactBinding => artifact != null,
  );
}
