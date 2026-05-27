import { world50000Source } from "./world50000ArchitectureTestHelpers";

describe("world 50000 architecture - no prompt hardcoded prices", () => {
  it("does not inject prices into prompt text or proof prompts", () => {
    expect(world50000Source()).not.toMatch(/unitPrice\s*:|price\s*:\s*\d|сом\s*\/|KGS\s*\d/i);
  });
});
