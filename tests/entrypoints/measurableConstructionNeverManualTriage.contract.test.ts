import { runMeasurableConstructionNeverFinalTriageProof } from "../../scripts/e2e/measurableConstructionNeverFinalTriageCore";

jest.setTimeout(120_000);

describe("measurable construction work never ends as final manual triage", () => {
  it("returns governed estimates for 300 measurable real-work prompts", () => {
    const result = runMeasurableConstructionNeverFinalTriageProof();

    expect(result.matrix).toMatchObject({
      final_status: "GREEN_MEASURABLE_CONSTRUCTION_WORK_NEVER_FINAL_TRIAGE_READY",
      measurable_cases_total: 300,
      measurable_cases_passed: 300,
      manual_triage_final_found: false,
      template_gap_final_found: false,
      requires_review_warning_present: true,
      clarifying_questions_present: true,
      fake_green_claimed: false,
    });
    expect(result.results.map((item) => [item.caseId, item.failures])).toEqual(
      result.results.map((item) => [item.caseId, []]),
    );
  });
});
