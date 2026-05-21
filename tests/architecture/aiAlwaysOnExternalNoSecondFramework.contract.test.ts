import { readAiAlwaysOnExternalSources } from "./aiAlwaysOnExternalArchitectureTestHelpers";

describe("AI always-on external no second framework", () => {
  it("does not instantiate a new model or provider framework", () => {
    const source = readAiAlwaysOnExternalSources();
    expect(source).not.toContain("new AiModelGateway");
    expect(source).not.toMatch(/\bfetch\s*\(/);
    expect(source).not.toMatch(/\bopenai\b|\bgemini\b/i);
  });
});
