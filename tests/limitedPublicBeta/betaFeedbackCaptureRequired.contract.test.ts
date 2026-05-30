import { recordLimitedPublicBetaFeedback } from "../../src/lib/ai/productionCanary";

test("limited public beta captures feedback without exposing raw debug or personal data", () => {
  const feedback = recordLimitedPublicBetaFeedback({
    runtimeTraceId: "trace_beta_feedback",
    entrypoint: "/ai?context=request",
    userCohort: "beta_residential_small",
    domain: "roof_waterproofing",
    object: "roof",
    operation: "waterproofing",
    workTitle: "roof waterproofing",
    rowCount: 24,
    pdfGenerated: true,
    feedbackCategory: "wrong_units",
    optionalComment: "call +996 555 111 222 should be redacted",
    createdAt: "2026-05-30T00:00:00.000Z",
  });

  expect(feedback.valid).toBe(true);
  expect(feedback.optionalComment).toContain("[redacted_phone]");
});
