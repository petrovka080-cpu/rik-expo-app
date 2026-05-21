import { readAiRoleMixed150LayerFiles } from "./aiRoleMixed150ArchitectureTestHelpers";

describe("S_AI_ROLE_MIXED_150 architecture: no useEffect hacks", () => {
  it("does not use React effect fetching", () => {
    const findings = readAiRoleMixed150LayerFiles().filter((file) => /useEffect\s*\(/.test(file.content));
    expect(findings.map((item) => item.file)).toEqual([]);
  });
});
