import { expectNoInternalCanaryPattern } from "./internalCanaryArchitectureTestHelpers";

test("internal canary adds no second AI framework", () => {
  expectNoInternalCanaryPattern(/new\s+(OpenAI|Anthropic|GoogleGenerativeAI)|from\s+["']@ai-sdk\/|createAIFramework/i, "second_ai_framework");
});
