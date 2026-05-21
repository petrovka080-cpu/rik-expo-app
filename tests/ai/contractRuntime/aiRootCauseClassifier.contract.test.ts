import { classifyAiRootCause, createAiInvariantCheck } from "../../../src/lib/ai/contractRuntime";

describe("AI root cause classifier", () => {
  it("maps invariant failures to the correct architecture layer and forbids symptom fixes", () => {
    const report = classifyAiRootCause({
      traceId: "trace-1",
      check: createAiInvariantCheck("NUMERIC_FACTS_MATCH_EXPECTED", false, "Missing GKL shortage."),
    });

    expect(report.category).toBe("domain_provider");
    expect(report.correctFixLayer).toBe("domain_provider");
    expect(report.forbiddenFixes).toEqual(expect.arrayContaining(["question_id_hardcode", "screen_local_if"]));
  });
});
