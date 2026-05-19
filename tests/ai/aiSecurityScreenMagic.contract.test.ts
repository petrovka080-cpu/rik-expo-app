import { buildAiDirectorCommandOfficeSecurityMagicMatrix } from "../../scripts/ai/aiDirectorCommandOfficeSecurityMagic";

describe("AI security screen magic", () => {
  it("shows security risks without role, permission, policy, or service-role green paths", () => {
    const matrix = buildAiDirectorCommandOfficeSecurityMagicMatrix({
      webProofPass: true,
      androidProofPass: true,
      iosTestflightSignoffCurrent: true,
    });

    expect(matrix).toMatchObject({
      security_screen_ready: true,
      security_context_hydrated: true,
      direct_role_permission_mutation_paths_found: 0,
      policy_disable_paths_found: 0,
      service_role_green_path_found: false,
      fake_security_findings_created: false,
    });
  });
});
