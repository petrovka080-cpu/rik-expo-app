import { changeControlSource } from "./changeControlArchitectureTestHelpers";

describe("change control architecture - no prompt patch templates", () => {
  it("does not implement change control as exact prompt conditionals", () => {
    const source = changeControlSource();
    expect(source).not.toMatch(/prompt\s*===|exactPrompt|promptLookup|promptManifest/);
  });
});
