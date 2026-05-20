import { readLiveUiSource } from "./aiLiveUiArchitectureTestUtils";

describe("live AI UI architecture: no second framework", () => {
  it("does not create another assistant framework or client transport", () => {
    const source = readLiveUiSource();
    expect(source).not.toMatch(/sendAssistantMessage|openai|chatCompletion|createCompletion|streamText|generateText/i);
  });
});
