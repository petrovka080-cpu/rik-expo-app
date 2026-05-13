import { evaluateAiExplicitE2eFixtureRegistryGuardrail } from "../../scripts/architecture_anti_regression_suite";

describe("AI explicit E2E fixture registry architecture", () => {
  it("locks explicit env fixtures without discovery, seeds, admin auth, or raw artifact output", () => {
    const result = evaluateAiExplicitE2eFixtureRegistryGuardrail({
      projectRoot: process.cwd(),
    });

    expect(result.check).toEqual({
      name: "ai_explicit_e2e_fixture_registry",
      status: "pass",
      errors: [],
    });
    expect(result.summary).toMatchObject({
      fixtureFilesPresent: true,
      resolverScriptPresent: true,
      requiredEnvNamesDeclared: true,
      missingFixtureBlockerExact: true,
      redactionPresent: true,
      noSupabaseAdminImports: true,
      noAuthAdmin: true,
      noListUsers: true,
      noServiceRole: true,
      noSeedOrWrites: true,
      artifactsRedactedPolicy: true,
    });
  });
});
