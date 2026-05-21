import { readAiAlwaysOnExternalSources } from "./aiAlwaysOnExternalArchitectureTestHelpers";

describe("AI always-on external no hooks", () => {
  it("does not add React hooks to the result-first core", () => {
    expect(readAiAlwaysOnExternalSources()).not.toMatch(/\buse[A-Z]\w+\s*\(/);
  });
});
