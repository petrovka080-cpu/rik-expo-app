import { recordAiEstimateUserFeedback } from "../../src/lib/ai/productionCanary";

test("internal canary feedback payload is captured and redacted", () => {
  const feedback = recordAiEstimateUserFeedback({
    runtimeTraceId: "trace_feedback",
    entrypoint: "/ai?context=foreman",
    workTitle: "metal_canopy_installation",
    domain: "canopies",
    object: "metal_canopy",
    operation: "installation",
    rowCount: 35,
    pdfGenerated: true,
    userFeedbackCategory: "wrong_materials",
    optionalComment: "my phone is +996 555 111 222",
    createdAt: "2026-05-30T00:00:00.000Z",
  });

  expect(feedback.valid).toBe(true);
  expect(feedback.optionalComment).toContain("[redacted_phone]");
});
