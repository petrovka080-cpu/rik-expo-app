import {
  PERF_FLATLIST_ENTERPRISE_WAVE,
  verifyFlatListTuning,
} from "../../scripts/performance/verifyFlatListTuning";
import {
  DEFAULT_FLATLIST_PERF,
  DENSE_FLATLIST_PERF,
  ENTERPRISE_LIST_TARGETS,
} from "../../src/lib/performance/listPerformancePolicy";

describe("S_PERF_01_FLATLIST_ENTERPRISE_TUNING_CLOSEOUT", () => {
  it("keeps the shared render window policies explicit", () => {
    expect(DEFAULT_FLATLIST_PERF).toEqual({
      initialNumToRender: 12,
      maxToRenderPerBatch: 12,
      windowSize: 7,
      onEndReachedThreshold: 0.4,
    });
    expect(DENSE_FLATLIST_PERF).toEqual({
      initialNumToRender: 20,
      maxToRenderPerBatch: 20,
      windowSize: 9,
      onEndReachedThreshold: 0.5,
    });
  });

  it("verifies every enterprise list target is tuned and bounded", () => {
    const result = verifyFlatListTuning(process.cwd(), { writeArtifacts: false });

    expect(result.wave).toBe(PERF_FLATLIST_ENTERPRISE_WAVE);
    expect(result.status).toBe("PASS");
    expect(result.errors).toEqual([]);
    expect(result.summary.remainingUntunedFlatlists).toBe(0);
    expect(result.summary.unboundedScrollViewMapsRemaining).toBe(0);
    expect(result.summary.keyExtractorsPresent).toBe(true);
    expect(result.summary.renderWindowPolicyApplied).toBe(true);
    expect(result.summary.paginationOrBoundProofPresent).toBe(true);
    expect(result.summary.broadAllowlistUsed).toBe(false);
    expect(result.summary.rowsHiddenToPass).toBe(false);
    expect(result.summary.businessLogicChanged).toBe(false);
    expect(result.summary.newHooksAdded).toBe(false);
    expect(result.summary.fakeGreenClaimed).toBe(false);
  });

  it("covers the production-scale screen set without broad targets", () => {
    expect(ENTERPRISE_LIST_TARGETS.map((target) => target.screenId)).toEqual([
      "buyer.requests",
      "accountant.history",
      "warehouse.stock",
      "warehouse.incoming",
      "warehouse.issue",
      "market.home",
      "market.supplier_showcase",
      "chat.thread",
      "reports.dashboard",
    ]);
    expect(ENTERPRISE_LIST_TARGETS.every((target) => !target.file.includes("*"))).toBe(true);
    expect(ENTERPRISE_LIST_TARGETS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          screenId: "reports.dashboard",
          kind: "SectionList",
          file: "src/features/reports/ReportsDashboardScreen.tsx",
        }),
      ]),
    );
  });
});
