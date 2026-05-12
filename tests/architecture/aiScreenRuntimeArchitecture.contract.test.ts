import { evaluateAiCrossScreenRuntimeMatrixGuardrail } from "../../scripts/architecture_anti_regression_suite";

describe("AI cross-screen runtime matrix architecture", () => {
  it("passes the cross-screen runtime matrix architecture ratchet", () => {
    const result = evaluateAiCrossScreenRuntimeMatrixGuardrail({ projectRoot: process.cwd() });

    expect(result.check).toEqual({
      name: "ai_cross_screen_runtime_matrix",
      status: "pass",
      errors: [],
    });
    expect(result.summary).toEqual(
      expect.objectContaining({
        runtimeFilesPresent: true,
        majorScreensRegistered: true,
        producerRegistryPresent: true,
        producersHaveRolePolicy: true,
        producersRequireEvidence: true,
        bffRoutesPresent: true,
        resolverValidatesScreenId: true,
        unknownRoleDenied: true,
        notMountedSupported: true,
        noProviderImports: true,
        noSupabaseImports: true,
        noUiSupabaseImport: true,
        noUiExternalFetch: true,
        noUiProviderImport: true,
        noRawPayloadFields: true,
        noFakeCards: true,
        noMutationSurface: true,
        contractorOwnRecordsOnly: true,
        e2eRunnerPresent: true,
      }),
    );
  });
});
