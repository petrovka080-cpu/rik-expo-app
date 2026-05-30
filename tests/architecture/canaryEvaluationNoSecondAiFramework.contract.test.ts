import { expectNoCanaryEvaluationPattern } from "./canaryEvaluationArchitectureTestHelpers";

test("canary evaluation adds no second AI framework", () => {
  expectNoCanaryEvaluationPattern(/new\s+(?:OpenAI|Anthropic|GoogleGenerativeAI)|from\s+["'](?:openai|@anthropic-ai|@google\/generative-ai)["']/i, "second_ai_framework");
});
