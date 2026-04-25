import { readFileSync } from "fs";
import { join } from "path";

describe("foreman draft boundary decomposition audit", () => {
  it("keeps the root hook on the extracted boundary modules", () => {
    const hookSource = readFileSync(
      join(process.cwd(), "src", "screens", "foreman", "hooks", "useForemanDraftBoundary.ts"),
      "utf8",
    );

    expect(hookSource).toContain("foreman.draftBoundary.plan");
    expect(hookSource).toContain("foreman.draftBoundary.apply");
    expect(hookSource).toContain("foreman.draftBoundary.recovery");
    expect(hookSource).toContain("foreman.draftBoundary.sync");
    expect(hookSource).toContain("foreman.draftBoundary.effects");
    expect(hookSource).toContain("foreman.draftBoundary.requestDetails");
    expect(hookSource).toContain("foreman.draftBoundary.telemetry");
    expect(hookSource).toContain("foreman.draftBoundary.postSubmit");
    expect(hookSource).toContain("runForemanDraftBoundarySyncNow");
    expect(hookSource).toContain("runForemanRestoreDraftIfNeeded");
    expect(hookSource).toContain("applyForemanDraftHeaderEditToBoundary");
    expect(hookSource).toContain("subscribeForemanDraftBoundaryAppState");
    expect(hookSource).toContain("startForemanDraftBoundaryNetworkRuntime");
    expect(hookSource).not.toContain("eslint-disable");
    expect(hookSource).not.toContain("enqueueForemanMutation(");
    expect(hookSource).not.toContain("flushForemanMutationQueue(");
    expect(hookSource).not.toContain("loadForemanRemoteDraftSnapshot(");
    expect(hookSource).not.toContain("resolveForemanPostSubmitSubmittedOwnerId");
    expect(hookSource).not.toContain("resolveForemanPostSubmitDraftPlan");
    expect(hookSource).not.toContain("resolveForemanDraftBoundaryFailurePlan");
    expect(hookSource).not.toContain("resolveForemanDraftBoundaryManualRecoveryTelemetryPlan");
    expect(hookSource).not.toContain("loadForemanRequestDetails(");
    expect(hookSource).not.toContain("AppState.addEventListener");
    expect(hookSource).not.toContain("subscribePlatformNetwork(");
    expect(hookSource).not.toContain("ensurePlatformNetworkService(");
  });
});
