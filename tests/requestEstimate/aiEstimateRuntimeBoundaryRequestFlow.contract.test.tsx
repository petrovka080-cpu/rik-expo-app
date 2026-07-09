import { createAiEstimateRuntime } from "../../src/lib/estimate/runtime/createAiEstimateRuntime";

describe("AI estimate runtime boundary request flow", () => {
  it("creates draft, classification, passport, missing-input answer, and history through runtime", () => {
    const runtime = createAiEstimateRuntime();
    const draft = runtime.createDraft({
      estimateDraftId: "runtime-boundary-request",
      rawInput: "capital repair 98 m2 ceiling height 2.7 m",
      selectedTemplateId: "demolition_interior_tile_remove_standard_professional_expanded_v1",
      createdAt: "2026-07-10T00:00:00.000Z",
    });
    const classification = runtime.classifyWork({ rawInput: draft.revision.rawInput, selectedTemplateId: draft.revision.selectedTemplateId });
    const passport = runtime.buildParameterPassport({ revision: draft.revision });
    const answered = runtime.answerMissingInput({
      revision: draft.revision,
      paramKey: "q",
      rawValue: "120",
      createdAt: "2026-07-10T00:01:00.000Z",
      revisionIndex: 2,
    });
    const approved = runtime.approveRevision({
      revision: answered.revision,
      ownerUserId: "runtime-boundary-request-owner",
      approvedAt: "2026-07-10T00:02:00.000Z",
    });
    const history = runtime.loadApprovedHistory({ ownerUserId: "runtime-boundary-request-owner", limit: 50 });

    expect(classification.classification.family).not.toBe("other");
    expect(passport.cards.length).toBeGreaterThan(0);
    expect(answered.answeredParamKey).toBe("q");
    expect(approved.approved).toBe(true);
    expect(history.totalCount).toBe(1);
  });
});
