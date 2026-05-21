import { createContractRuntimeTraceFixture } from "./contractRuntimeTestFixtures";

describe("AI contract trace", () => {
  it("captures understanding, source planning, gateway queries, refs, links, facts, and UI safety", async () => {
    const trace = await createContractRuntimeTraceFixture();
    expect(trace.traceId).toBe("contract-runtime-test-trace");
    expect(trace.sourcePlanning.appDataRequired).toBe(true);
    expect(trace.sourcePlanning.internetAllowed).toBe(false);
    expect(trace.gateway.used).toBe(true);
    expect(trace.gateway.queries.every((query) => query.bounded && query.orgScoped && query.roleScoped)).toBe(true);
    expect(trace.sources.sourceRefIds.length).toBeGreaterThan(0);
    expect(trace.sources.openLinkCount).toBeGreaterThan(0);
    expect(trace.numericFacts.length).toBeGreaterThan(0);
    expect(trace.safety.changedData).toBe(false);
    expect(trace.ui.language).toBe("ru");
  });
});
