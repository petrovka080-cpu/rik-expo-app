import { buildAiDirectorCommandOfficeSecurityMagicMatrix } from "../../scripts/ai/aiDirectorCommandOfficeSecurityMagic";

describe("AI security no role mutation", () => {
  it("does not expose role, permission, or policy mutation as a green path", () => {
    const matrix = buildAiDirectorCommandOfficeSecurityMagicMatrix({
      webProofPass: true,
      androidProofPass: true,
      iosTestflightSignoffCurrent: true,
    });

    expect(matrix.direct_role_permission_mutation_paths_found).toBe(0);
    expect(matrix.policy_disable_paths_found).toBe(0);
  });
});
