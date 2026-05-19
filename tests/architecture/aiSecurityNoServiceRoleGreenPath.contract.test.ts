import { buildAiDirectorCommandOfficeSecurityMagicMatrix } from "../../scripts/ai/aiDirectorCommandOfficeSecurityMagic";

describe("AI security no service role green path", () => {
  it("does not make service_role/admin bypass a valid AI path", () => {
    const matrix = buildAiDirectorCommandOfficeSecurityMagicMatrix({
      webProofPass: true,
      androidProofPass: true,
      iosTestflightSignoffCurrent: true,
    });

    expect(matrix.service_role_green_path_found).toBe(false);
  });
});
