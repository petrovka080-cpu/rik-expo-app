import { readAiRoleMixed150LayerFiles } from "./aiRoleMixed150ArchitectureTestHelpers";

describe("S_AI_ROLE_MIXED_150 architecture: no hooks", () => {
  it("does not add AI hooks", () => {
    const findings = readAiRoleMixed150LayerFiles().filter((file) => /use[A-Z]\w+\s*\(/.test(file.content));
    expect(findings.map((item) => item.file)).toEqual([]);
  });
});
