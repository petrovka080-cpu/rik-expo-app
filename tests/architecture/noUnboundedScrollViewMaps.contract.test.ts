import {
  verifyFlatListTuning,
} from "../../scripts/performance/verifyFlatListTuning";
import {
  SCROLLVIEW_MAP_BOUNDS,
} from "../../src/lib/performance/listPerformancePolicy";

describe("S_PERF_01 ScrollView map bounds", () => {
  it("keeps variable ScrollView maps classified with exact per-callsite proof", () => {
    const result = verifyFlatListTuning(process.cwd(), { writeArtifacts: false });

    expect(result.status).toBe("PASS");
    expect(result.summary.unboundedScrollViewMapsRemaining).toBe(0);
    expect(result.scrollViewMapFindings.filter((finding) => !finding.classified)).toEqual([]);
    expect(result.scrollViewMapFindings.length).toBeGreaterThanOrEqual(SCROLLVIEW_MAP_BOUNDS.length);
  });

  it("rejects broad ScrollView map allowlists by policy shape", () => {
    for (const entry of SCROLLVIEW_MAP_BOUNDS) {
      expect(entry.file).not.toContain("*");
      expect(entry.expression).not.toBe(".map");
      expect(entry.expression.trim()).toContain(".map");
      expect(entry.owner.trim().length).toBeGreaterThan(0);
      expect(entry.boundProof.trim().length).toBeGreaterThan(0);
      expect(entry.maxItemsProof.trim().length).toBeGreaterThan(0);
    }
  });
});
