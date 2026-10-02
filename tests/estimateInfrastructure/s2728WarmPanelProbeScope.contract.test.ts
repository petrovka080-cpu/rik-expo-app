import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("S27.28 owned Android warm-panel evidence scope", () => {
  const source = readFileSync(resolve("scripts/estimate/r4a13/runS2728PressureSewerAndroidEditableAcceptance.ts"), "utf8");
  it("requires the caller's saved revision and actual primary value instead of a stale fixture", () => {
    expect(source).toContain("measureWarmPanelOpens(argument, value)");
    expect(source).toContain("n.text === expectedLength && n.enabled");
    expect(source).toContain("Number.isFinite(Number(expectedLength))");
    expect(source).not.toContain('const revisionId = "4e7d1840-ec80-4b44-b924-8f86607c379e"');
    expect(source).not.toContain('n.text === "200"');
  });
  it("rejects unsaved parameter or row changes before measuring a saved panel", () => {
    expect(source).toContain('n.resourceId === "editable-param-batch-dirty-count"');
    expect(source).toContain('n.resourceId === "request-estimate-row-batch-bar"');
    expect(source).toContain("S2728_UNSAVED_INPUT_DO_NOT_TOGGLE");
  });
  it("reports twenty opens, audit mutations and sampled memory without claiming a continuous peak", () => {
    expect(source).toContain("index < 20");
    expect(source).toContain("parameterSessionRequestCount");
    expect(source).toContain("calculationMutationRequestCount");
    expect(source).toContain("sampledPeakPssKiB");
    expect(source).toContain("retainedPssDeltaKiB");
    expect(source).toContain("not cold reopen, first-action frame or continuous peak-memory acceptance");
    expect(source).toContain("masterAccepted: false");
  });
});
