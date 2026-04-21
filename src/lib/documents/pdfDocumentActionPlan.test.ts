import {
  resolvePdfDocumentActionKindPlan,
  resolvePdfDocumentBusyExecutionActionPlan,
  resolvePdfDocumentOpenFlowStartActionPlan,
  resolvePdfDocumentPreviewModePlan,
  resolvePdfDocumentVisibilityFailureSignalActionPlan,
  resolvePdfDocumentVisibilityStartActionPlan,
} from "./pdfDocumentActionPlan";

describe("pdfDocumentActionPlan", () => {
  it("classifies supported action kinds", () => {
    expect(resolvePdfDocumentActionKindPlan("prepare")).toEqual({ action: "prepare" });
    expect(resolvePdfDocumentActionKindPlan("preview")).toEqual({ action: "preview" });
    expect(resolvePdfDocumentActionKindPlan("share")).toEqual({ action: "share" });
    expect(resolvePdfDocumentActionKindPlan("external_open")).toEqual({
      action: "external_open",
    });
  });

  it("maps preview mode for mobile remote, router-backed session, and direct fallback", () => {
    expect(
      resolvePdfDocumentPreviewModePlan({
        platform: "ios",
        sourceKind: "remote-url",
        hasRouter: true,
      }),
    ).toEqual({
      mode: "in_memory_remote_session",
      fallbackEligible: false,
    });
    expect(
      resolvePdfDocumentPreviewModePlan({
        platform: "web",
        sourceKind: "remote-url",
        hasRouter: true,
      }),
    ).toEqual({
      mode: "session_viewer_contract",
      fallbackEligible: false,
    });
    expect(
      resolvePdfDocumentPreviewModePlan({
        platform: "web",
        sourceKind: "remote-url",
        hasRouter: false,
      }),
    ).toEqual({
      mode: "direct_preview",
      fallbackEligible: true,
    });
  });

  it("composes open-flow, visibility, and busy planners without reimplementing them", () => {
    expect(
      resolvePdfDocumentOpenFlowStartActionPlan({
        flowKey: "pdf:director:report",
        existingRunId: "run-1",
        existingStartedAt: 1_000,
        existingTimestamp: 1_000,
        nowMs: 2_000,
        maxTtlMs: 60_000,
      }),
    ).toMatchObject({
      action: "join_existing",
      joinedRunId: "run-1",
    });
    expect(
      resolvePdfDocumentVisibilityStartActionPlan({
        hasRouter: true,
      }),
    ).toEqual({
      action: "begin_visibility_wait",
      reason: "router_available",
    });
    expect(
      resolvePdfDocumentVisibilityFailureSignalActionPlan({
        visibilityToken: "",
      }),
    ).toEqual({
      action: "skip_visibility_failure_signal",
      reason: "missing_visibility_token",
    });
    expect(
      resolvePdfDocumentBusyExecutionActionPlan({
        hasBusyRun: false,
        hasBusyShow: false,
        hasBusyHide: false,
        flowKey: "pdf:buyer:proposal",
      }),
    ).toEqual({
      mode: "direct",
      recordBusyCleared: false,
    });
  });
});

