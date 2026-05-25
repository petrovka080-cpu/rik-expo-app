import {
  assertRequestEstimateStateTransitionAllowed,
  resolveRequestEstimateStateTransition,
} from "../../src/features/consumerRepair/requestEstimateStateMachine";

describe("request estimate state machine", () => {
  it("allows the production request estimate flow", () => {
    expect(resolveRequestEstimateStateTransition({ currentStatus: "idle", event: "GENERATE_ESTIMATE" })).toMatchObject({
      allowed: true,
      to: "generating_estimate",
    });
    expect(resolveRequestEstimateStateTransition({ currentStatus: "generating_estimate", event: "ESTIMATE_READY" })).toMatchObject({
      allowed: true,
      to: "draft_ready",
    });
    expect(resolveRequestEstimateStateTransition({ currentStatus: "draft_ready", event: "EDIT_QUANTITY" })).toMatchObject({
      allowed: true,
      to: "editing",
    });
    expect(resolveRequestEstimateStateTransition({ currentStatus: "editing", event: "SELECT_CATALOG_ITEM" })).toMatchObject({
      allowed: true,
      to: "catalog_selecting",
    });
    expect(resolveRequestEstimateStateTransition({ currentStatus: "catalog_selecting", event: "MAKE_PDF" })).toMatchObject({
      allowed: true,
      to: "pdf_generating",
    });
  });

  it("blocks mutable events after sent", () => {
    expect(() =>
      assertRequestEstimateStateTransitionAllowed({ currentStatus: "sent", event: "EDIT_QUANTITY" }),
    ).toThrow(/immutable/);
  });
});
