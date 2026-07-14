import { createEstimateDraftRevision } from "../../src/lib/estimate/createEstimateDraftRevision";
import { recalculateEstimateDraftRevision } from "../../src/lib/estimate/recalculateEstimateDraftRevision";
import { parseUserParamPatch } from "../../src/lib/estimate/parseUserParamPatch";
import { validateEstimateDraftRevision } from "../../src/lib/estimate/validateEstimateDraftRevision";

describe("estimate draft revision contract", () => {
  it("creates initial prompt revision and recalculates a new revision after param edit", () => {
    const r1 = createEstimateDraftRevision({
      estimateDraftId: "draft-gabion",
      rawInput: "габион стена длина 150 метров высота 30 метров толщина 1 метр",
      createdAt: "2026-07-07T00:00:00.000Z",
    });
    const patch = parseUserParamPatch({
      revision: r1,
      operation: "update_param",
      paramKey: "length_m",
      rawValue: "100 м",
    });
    const { revision: r2, diff } = recalculateEstimateDraftRevision(r1, patch, {
      createdAt: "2026-07-07T00:01:00.000Z",
      revisionIndex: 2,
    });

    expect(validateEstimateDraftRevision(r1).valid).toBe(true);
    expect(validateEstimateDraftRevision(r2).valid).toBe(true);
    expect(r1.selectedTemplateId).toBe(r2.selectedTemplateId);
    expect(r2.previousRevisionId).toBe(r1.revisionId);
    expect(r2.params.length_m.value).toBe(100);
    expect(r2.params.volume_m3.value).toBe(3000);
    expect(r2.trace.revisionId).toBe(r2.revisionId);
    expect(diff.changedRowsCount).toBeGreaterThan(0);
    expect(diff.changedParams.some((item) => item.key === "length_m")).toBe(true);
    expect(r2.artifacts.pdfArtifactId).toBeNull();
    expect(r2.artifacts.buyerHandoffId).toBeNull();
  });
});
