import {
  evaluateAiTraceObservabilityGuardrail,
} from "../../scripts/architecture_anti_regression_suite";
import { isIosTestFlightInternalQaScopedRun } from "../mobileRelease/iosTestFlightInternalQaScopeTestHelper";

describe("AI trace observability architecture", () => {
  it("keeps AI trace recording redacted, bounded, and provider-free", () => {
    const result = evaluateAiTraceObservabilityGuardrail({
      projectRoot: process.cwd(),
    });

    if (isIosTestFlightInternalQaScopedRun() && !result.summary.artifactsPresent) {
      expect(result.check).toMatchObject({ name: "ai_trace_observability", status: "fail" });
      expect(result.check.errors).toContain("ai_trace_artifacts_missing");
      expect(result.summary).toMatchObject({
        traceFilesPresent: true,
        eventRegistryComplete: true,
        recorderPresent: true,
        redactionPresent: true,
        noRawPrompt: true,
        noRawProviderPayload: true,
        noSecretsOrAuthorization: true,
        testsPresent: true,
        artifactsPresent: false,
      });
      return;
    }

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
