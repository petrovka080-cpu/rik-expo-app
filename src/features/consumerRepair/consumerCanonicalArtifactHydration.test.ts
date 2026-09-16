import {
  CanonicalEstimateApiError,
  ESTIMATE_PLATFORM_API_VERSION,
  type CanonicalEstimateArtifactView,
} from "../../lib/estimate/backendPlatform/contracts";
import { canonicalReadyArtifactBindingFromView } from "./consumerCanonicalArtifactHydration";

const REVISION_ID = "65d2a6f7-af26-40af-91c3-7a5d060d34eb";
const RELEASE_ID = "97e1125d-24f3-513f-b203-d96fd54ecb83";

function artifact(
  kind: CanonicalEstimateArtifactView["kind"],
  status: CanonicalEstimateArtifactView["status"] = "ready",
): CanonicalEstimateArtifactView {
  return {
    apiVersion: ESTIMATE_PLATFORM_API_VERSION,
    artifactId: `${kind}-artifact`,
    revisionId: REVISION_ID,
    releaseId: RELEASE_ID,
    kind,
    status,
    contentType: null,
    byteSize: null,
    sha256: null,
    metadata: {},
    errorCode: null,
    createdAt: "2026-09-16T00:00:00.000Z",
    updatedAt: "2026-09-16T00:00:00.000Z",
    readyAt: status === "ready" ? "2026-09-16T00:00:00.000Z" : null,
    signedUrl: null,
    signedUrlExpiresAt: null,
  };
}

describe("canonical cold-reopen artifact hydration", () => {
  test("normalizes the professional PDF endpoint to the shared PDF binding", () => {
    expect(canonicalReadyArtifactBindingFromView({
      artifact: artifact("professional_pdf"),
      requestedKind: "pdf",
      expectedRevisionId: REVISION_ID,
      expectedReleaseId: RELEASE_ID,
    })).toEqual({
      artifactId: "professional_pdf-artifact",
      kind: "pdf",
      revisionId: REVISION_ID,
      releaseId: RELEASE_ID,
    });
  });

  test("restores a ready procurement artifact and ignores an unfinished one", () => {
    expect(canonicalReadyArtifactBindingFromView({
      artifact: artifact("procurement"),
      requestedKind: "procurement",
      expectedRevisionId: REVISION_ID,
      expectedReleaseId: RELEASE_ID,
    })?.kind).toBe("procurement");
    expect(canonicalReadyArtifactBindingFromView({
      artifact: artifact("procurement", "building"),
      requestedKind: "procurement",
      expectedRevisionId: REVISION_ID,
      expectedReleaseId: RELEASE_ID,
    })).toBeNull();
  });

  test("fails closed when the backend artifact belongs to another revision", () => {
    const stale = { ...artifact("procurement"), revisionId: "31166aeb-4568-4561-8931-3296c84f1f59" };
    expect(() => canonicalReadyArtifactBindingFromView({
      artifact: stale,
      requestedKind: "procurement",
      expectedRevisionId: REVISION_ID,
      expectedReleaseId: RELEASE_ID,
    })).toThrow(CanonicalEstimateApiError);
  });
});
