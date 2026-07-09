import { createEstimateDraftRevision } from "../../src/lib/estimate/createEstimateDraftRevision";
import { applyAiEstimateParameterOverride } from "../../src/lib/estimate/applyAiEstimateParameterOverrides";

describe("AI estimate parameter recalculation", () => {
  it("creates a new revision, updates parameter cards and invalidates downstream artifacts", () => {
    const initial = createEstimateDraftRevision({
      estimateDraftId: "param-recalc",
      rawInput: "вентфасад под ключ 1500 кв метров",
      createdAt: "2026-07-09T00:00:00.000Z",
    });
    const revisionWithArtifacts = {
      ...initial,
      artifacts: {
        snapshotId: "snapshot-old",
        pdfArtifactId: "pdf-old",
        buyerHandoffId: "buyer-old",
        artifactsValidForRevisionId: initial.revisionId,
      },
    };

    const result = applyAiEstimateParameterOverride({
      revision: revisionWithArtifacts,
      operation: "update_param",
      paramKey: "area_m2",
      rawValue: "1200 m2",
      createdAt: "2026-07-09T00:01:00.000Z",
      revisionIndex: 2,
    });

    expect(result.revision.previousRevisionId).toBe(initial.revisionId);
    expect(result.revision.params.area_m2.value).toBe(1200);
    expect(result.diff.changedParams).toContainEqual({ key: "area_m2", before: 1500, after: 1200 });
    expect(result.diff.changedRowsCount).toBeGreaterThan(0);
    expect(result.diff.staleArtifactsAfterEdit.snapshotInvalidated).toBe(true);
    expect(result.diff.staleArtifactsAfterEdit.pdfInvalidated).toBe(true);
    expect(result.diff.staleArtifactsAfterEdit.buyerHandoffInvalidated).toBe(true);
    expect(result.cards.some((card) => card.key === "area_m2" && card.displayValueRu.includes("1 200"))).toBe(true);
  });
});
