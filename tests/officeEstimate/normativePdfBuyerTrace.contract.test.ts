import { createEstimateDraftRevision } from "../../src/lib/estimate/createEstimateDraftRevision";
import { applyAiEstimateParameterOverride } from "../../src/lib/estimate/applyAiEstimateParameterOverrides";
import { buildAiEstimateQuantityExplanationTrace } from "../../src/lib/estimate/buildAiEstimateQuantityExplanationTrace";

describe("normative PDF and buyer trace binding", () => {
  it("marks PDF and buyer package stale when a normative parameter changes", () => {
    const revision = createEstimateDraftRevision({
      estimateDraftId: "normative-pdf-buyer",
      rawInput: "Вентфасад 1500 м2 высота 40 м утепление 100 мм",
      createdAt: "2026-07-09T00:00:00.000Z",
      artifacts: {
        snapshotId: "snapshot-r1",
        pdfArtifactId: "pdf-r1",
        buyerHandoffId: "buyer-r1",
        artifactsValidForRevisionId: "r1",
      },
    });
    const paramKey = revision.params.facade_area_m2 ? "facade_area_m2" : "area_m2";
    const result = applyAiEstimateParameterOverride({
      revision,
      operation: revision.params[paramKey] ? "update_param" : "add_param",
      paramKey,
      rawValue: "1800 м2",
      createdAt: "2026-07-09T00:01:00.000Z",
      revisionIndex: 2,
    });
    const trace = buildAiEstimateQuantityExplanationTrace({ revision: result.revision });

    expect(result.diff.staleArtifactsAfterEdit.pdfInvalidated).toBe(true);
    expect(result.diff.staleArtifactsAfterEdit.buyerHandoffInvalidated).toBe(true);
    expect(result.revision.artifacts.pdfArtifactId).toBeNull();
    expect(result.revision.artifacts.buyerHandoffId).toBeNull();
    expect(trace?.rows.some((row) => /1\s?800|1800/.test(row.explanationRu))).toBe(true);
  });
});
