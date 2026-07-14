import { validateAiEstimateStorageBoundary } from "../../src/lib/estimate/storage/validateAiEstimateStorageBoundary";

describe("AI estimate storage boundary", () => {
  it("keeps durable storage behind an adapter and preserves approved history", () => {
    const result = validateAiEstimateStorageBoundary();

    expect(result.ok).toBe(true);
    expect(result.directLocalStorageCallsOutsideStorageAdapterCount).toBe(0);
    expect(result.approvedHistoryNeverTreatedAsCache).toBe(true);
    expect(result.currentDraftPreservedUnderStoragePressure).toBe(true);
    expect(result.storageDiagnosticsRedacted).toBe(true);
  }, 300_000);
});
