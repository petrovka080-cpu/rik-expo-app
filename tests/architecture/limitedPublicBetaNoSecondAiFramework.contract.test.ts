import { readLimitedPublicBetaSources } from "./limitedPublicBetaArchitectureTestHelpers";

test("limited public beta does not create a second AI framework", () => {
  const source = readLimitedPublicBetaSources();
  expect(source).not.toMatch(/new OpenAI|new Anthropic|LangChain|LlamaIndex|SecondAiFramework/i);
});
