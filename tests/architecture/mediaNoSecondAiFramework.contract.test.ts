import { readMediaSources } from "./mediaArchitectureTestHelpers";

test("media core does not create a parallel AI framework", () => {
  expect(readMediaSources()).not.toMatch(/newAi|aiMagicV2|smartAssistant|ai2/i);
});
