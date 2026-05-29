import { recordAiEstimateFeedback, validateAiEstimateFeedbackPayload } from "../../src/lib/ai/productionCanary";
import { feedbackPayload } from "./productionCanaryTestHelpers";

test("feedback payload is valid and redacted", () => {
  const recorded = recordAiEstimateFeedback(feedbackPayload({ optionalUserComment: "phone +1 555 222 1111" }));
  expect(recorded.valid).toBe(true);
  expect(recorded.optionalUserComment).toContain("[redacted_phone]");
  expect(validateAiEstimateFeedbackPayload(recorded).valid).toBe(true);
});
