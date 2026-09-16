import {
  getCanonicalEstimateArtifact,
} from "../../lib/estimate/backendPlatform/canonicalEstimateClient";
import {
  CanonicalEstimateApiError,
  type CanonicalEstimateArtifactView,
} from "../../lib/estimate/backendPlatform/contracts";

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
