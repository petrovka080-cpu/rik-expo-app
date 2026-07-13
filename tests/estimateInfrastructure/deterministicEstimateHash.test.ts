import { estimateDeterministicHash } from "../../src/lib/estimate/estimateDeterministicHash";
import { createEstimateDraftRevision } from "../../src/lib/estimate/createEstimateDraftRevision";
import { normalizeEstimateParamsForHash } from "../../src/lib/estimate/normalizeEstimateForHash";

describe("deterministic estimate hash", () => {
  it("is stable across object key order and normalizes volatile param timestamps out", () => {
    expect(estimateDeterministicHash({ b: 2, a: 1 })).toBe(estimateDeterministicHash({ a: 1, b: 2 }));

    const first = createEstimateDraftRevision({
      estimateDraftId: "hash-stability",
      rawInput: "profile sheet fence 100 linear meters",
      selectedTemplateId: "profile_sheet_fence",
      createdAt: "2026-07-09T00:00:00.000Z",
    });
    const second = createEstimateDraftRevision({
      estimateDraftId: "hash-stability",
      rawInput: "profile sheet fence 100 linear meters",
      selectedTemplateId: "profile_sheet_fence",
      createdAt: "2026-07-09T00:10:00.000Z",
    });

    expect(estimateDeterministicHash(normalizeEstimateParamsForHash(first))).toBe(
      estimateDeterministicHash(normalizeEstimateParamsForHash(second)),
    );
  });
});
