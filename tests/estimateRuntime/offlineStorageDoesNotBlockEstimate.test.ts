import { buildEstimateFromInlineWorkPrompt } from "../../src/lib/estimate/buildEstimateFromInlineWorkPrompt";
import { createPlatformOfflineStorage } from "../../src/lib/platform/offlineStorage";
import { resetPlatformStorageWarningBucketsForTests } from "../../src/lib/platform/observabilityStorage";
import { resetPlatformObservabilityEvents, getPlatformObservabilityEvents } from "../../src/lib/observability/platformObservability";

describe("offline storage does not block estimate", () => {
  const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

  beforeEach(() => {
    warnSpy.mockClear();
    resetPlatformStorageWarningBucketsForTests();
    resetPlatformObservabilityEvents();
  });

  afterAll(() => {
    warnSpy.mockRestore();
  });

  it("treats quota writes as soft failures and still builds estimate", async () => {
    const quotaStorage = createPlatformOfflineStorage({
      getItem: jest.fn(async () => null),
      setItem: jest.fn(async () => {
        throw new DOMException("quota exceeded", "QuotaExceededError");
      }),
      removeItem: jest.fn(async () => undefined),
    });

    await expect(quotaStorage.setItemSoft("estimate-flow", "payload")).resolves.toMatchObject({
      ok: false,
      softFailure: true,
    });
    await expect(quotaStorage.setItemSoft("estimate-flow", "payload")).resolves.toMatchObject({
      ok: false,
      softFailure: true,
      warningEmitted: false,
    });

    const estimate = buildEstimateFromInlineWorkPrompt({
      rawInput: "вентфасад под ключ 1500 кв метров",
      currency: "KGS",
    });

    expect(estimate.draft?.items.length).toBeGreaterThan(30);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(getPlatformObservabilityEvents().filter((event) => event.event === "write_failed")).toHaveLength(2);
  });
});
