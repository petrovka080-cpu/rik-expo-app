import { readAiRoleMixed150LayerFiles } from "./aiRoleMixed150ArchitectureTestHelpers";

describe("S_AI_ROLE_MIXED_150 architecture: no approval bypass", () => {
  it("does not auto-approve or final-submit anything", () => {
    const findings = readAiRoleMixed150LayerFiles().filter((file) =>
      /autoApprove|autoApproval\s*:\s*true|approvalBypass\s*:\s*true|finalSubmit\s*:\s*true/i.test(file.content),
    );
    expect(findings.map((item) => item.file)).toEqual([]);
  });
});
