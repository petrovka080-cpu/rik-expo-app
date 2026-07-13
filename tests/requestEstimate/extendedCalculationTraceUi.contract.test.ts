import { extended100CertificationSummary } from "../estimateGolden/extended100TestHelpers";

describe("request estimate extended calculation trace UI", () => {
  it("persists formula, template and norm trace through request and history", () => {
    const summary = extended100CertificationSummary();

    expect(summary.calculation_trace_visible).toBe(true);
    expect(summary.norm_trace_visible).toBe(true);
    expect(summary.template_version_visible).toBe(true);
    expect(summary.lifecycle_evaluations.every((item) => item.request_ui_trace_visible)).toBe(true);
    expect(summary.lifecycle_evaluations.every((item) => item.history_trace_persisted)).toBe(true);
  });
});
