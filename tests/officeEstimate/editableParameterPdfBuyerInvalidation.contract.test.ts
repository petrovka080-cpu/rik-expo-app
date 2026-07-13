import { createEstimateDraftRevision } from "../../src/lib/estimate/createEstimateDraftRevision";
import { applyAiEstimateParameterOverride } from "../../src/lib/estimate/applyAiEstimateParameterOverrides";

describe("editable parameter PDF and buyer invalidation", () => {
  it("marks snapshot, PDF and buyer package stale after parameter edit", () => {
    const initial = createEstimateDraftRevision({
      estimateDraftId: "office-param-invalidation",
      rawInput: "вентфасад под ключ 1500 кв метров",
      createdAt: "2026-07-09T00:00:00.000Z",
    });
    const withArtifacts = {
      ...initial,
      artifacts: {
        snapshotId: "snapshot-current",
        pdfArtifactId: "pdf-current",
        buyerHandoffId: "buyer-current",
        artifactsValidForRevisionId: initial.revisionId,
      },
    };

    const result = applyAiEstimateParameterOverride({
      revision: withArtifacts,
      operation: "update_param",
      paramKey: "area_m2",
      rawValue: "900 m2",
      createdAt: "2026-07-09T00:01:00.000Z",
      revisionIndex: 2,
    });

    expect(result.revision.artifacts.snapshotId).toBeNull();
    expect(result.revision.artifacts.pdfArtifactId).toBeNull();
    expect(result.revision.artifacts.buyerHandoffId).toBeNull();
    expect(result.diff.staleArtifactsAfterEdit).toEqual({
      snapshotInvalidated: true,
      pdfInvalidated: true,
      buyerHandoffInvalidated: true,
    });
  });
});
