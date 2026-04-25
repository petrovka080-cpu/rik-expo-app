import { readFileSync } from "fs";
import { join } from "path";

describe("foreman draft boundary runtime owner hook", () => {
  it("keeps runtime subscription orchestration in the extracted hook", () => {
    const source = readFileSync(
      join(
        process.cwd(),
        "src",
        "screens",
        "foreman",
        "hooks",
        "useForemanDraftBoundaryRuntimeSubscriptions.ts",
      ),
      "utf8",
    );

    expect(source).toContain("useEffect");
    expect(source).toContain("planForemanFocusRestoreTrigger");
    expect(source).toContain("runForemanDraftBoundaryLiveCleanupEffect");
    expect(source).toContain("subscribeForemanDraftBoundaryAppState");
    expect(source).toContain("startForemanDraftBoundaryNetworkRuntime");
    expect(source).toContain("runForemanDraftBoundaryRemoteDetailsEffect");
    expect(source).toContain("runForemanDraftBoundaryRemoteItemsEffect");
  });

  it("stays free of direct queue, request-details fetch, and platform subscription ownership", () => {
    const source = readFileSync(
      join(
        process.cwd(),
        "src",
        "screens",
        "foreman",
        "hooks",
        "useForemanDraftBoundaryRuntimeSubscriptions.ts",
      ),
      "utf8",
    );

    expect(source).not.toContain("enqueueForemanMutation(");
    expect(source).not.toContain("flushForemanMutationQueue(");
    expect(source).not.toContain("loadForemanRequestDetails(");
    expect(source).not.toContain("AppState.addEventListener");
    expect(source).not.toContain("subscribePlatformNetwork(");
    expect(source).not.toContain("ensurePlatformNetworkService(");
  });
});
