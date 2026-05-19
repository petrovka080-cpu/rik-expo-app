import {
  buildAiDirectorCommandOfficeSecurityMagicMatrix,
  listAiDirectorCommandOfficeSecurityMagicPackEntries,
} from "../../scripts/ai/aiDirectorCommandOfficeSecurityMagic";

describe("AI office and security permission mutation guard", () => {
  it("does not grant roles, mutate permissions, disable policy or expose a service-role green path", () => {
    const matrix = buildAiDirectorCommandOfficeSecurityMagicMatrix({
      webProofPass: true,
      androidProofPass: true,
      iosTestflightSignoffCurrent: true,
    });
    const serialized = JSON.stringify(listAiDirectorCommandOfficeSecurityMagicPackEntries());

    expect(matrix.direct_role_permission_mutation_paths_found).toBe(0);
    expect(matrix.service_role_green_path_found).toBe(false);
    expect(serialized).not.toMatch(/permission grant allowed|role mutation allowed|policy disable allowed/i);
  });
});
