import {
  evaluateAiTraceObservabilityGuardrail,
} from "../../scripts/architecture_anti_regression_suite";

describe("AI trace observability architecture", () => {
  it("keeps AI trace recording redacted, bounded, and provider-free", () => {
    const result = evaluateAiTraceObservabilityGuardrail({
      projectRoot: process.cwd(),
    });

    expect(result.check).toMatchObject({ name: "ai_trace_observability", status: "pass" });
    expect(result.summary).toMatchObject({
      traceFilesPresent: true,
      eventRegistryComplete: true,
      recorderPresent: true,
      redactionPresent: true,
      exportPolicyPresent: true,
      noRawPrompt: true,
      noRawProviderPayload: true,
      noSecretsOrAuthorization: true,
      noFullUserEmail: true,
      noDbRows: true,
      noModelProviderImports: true,
      noSupabaseImports: true,
      testsPresent: true,
      artifactsPresent: true,
    });
  });
});
