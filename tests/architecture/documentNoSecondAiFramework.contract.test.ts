import { readDocumentEvidenceSources } from "./documentArchitectureTestHelpers";

test("document evidence core does not create a second AI framework", () => {
  const source = readDocumentEvidenceSources();
  expect(source).not.toMatch(/aiMagicV2|newAi|smartAssistant|createLLM|new OpenAI/i);
});
