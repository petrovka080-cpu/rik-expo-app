import { parseNativeEstimateBuildTimingEvidence } from "../../scripts/e2e/nativeEstimateBuildTimingEvidence";

describe("native estimate build timing evidence", () => {
  it("admits one production build inside both budgets", () => {
    expect(parseNativeEstimateBuildTimingEvidence([
      `I/ReactNativeJS: '[RikEstimateBuild]', '{"stage":"RUNTIME_DRAFT_READY","elapsedMs":12368}'`,
      `I/ReactNativeJS: '[RikEstimateBuild]', '{"stage":"BUNDLE_PERSISTED","elapsedMs":12438}'`,
    ].join("\n"))).toMatchObject({
      runtime_draft_ready_ms: 12_368,
      first_persist_ms: 12_438,
      runtime_build_count: 1,
      persist_count: 1,
      duplicate_build_count: 0,
      performance_budget_green: true,
      failures: [],
    });
  });

  it("rejects a slow or duplicate build instead of selecting its fastest marker", () => {
    const evidence = parseNativeEstimateBuildTimingEvidence([
      `I/ReactNativeJS: '{"stage":"RUNTIME_DRAFT_READY","elapsedMs":12000}'`,
      `I/ReactNativeJS: '{"stage":"BUNDLE_PERSISTED","elapsedMs":12100}'`,
      `I/ReactNativeJS: '{"stage":"RUNTIME_DRAFT_READY","elapsedMs":49034}'`,
      `I/ReactNativeJS: '{"stage":"BUNDLE_PERSISTED","elapsedMs":49454}'`,
    ].join("\n"));

    expect(evidence.runtime_draft_ready_ms).toBe(49_034);
    expect(evidence.first_persist_ms).toBe(12_100);
    expect(evidence.duplicate_build_count).toBe(1);
    expect(evidence.failures).toEqual(expect.arrayContaining([
      "runtime_draft_ready_budget_exceeded:49034",
      "duplicate_build_count:1",
    ]));
  });

  it("fails closed when production markers are absent", () => {
    expect(parseNativeEstimateBuildTimingEvidence("unrelated log line")).toMatchObject({
      performance_budget_green: false,
      failures: ["runtime_draft_ready_marker_missing", "first_persist_marker_missing"],
    });
  });
});
