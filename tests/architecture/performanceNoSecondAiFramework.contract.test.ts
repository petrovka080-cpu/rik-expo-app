import { expectNoPattern } from "./performanceGuardTestHelpers";

describe("performance no second AI framework", () => {
  it("does not introduce another provider framework", () => {
    expectNoPattern(/\b(OpenAI|Anthropic|GoogleGenerativeAI|generateText|streamText)\b/, "second_ai_framework");
  });
});
