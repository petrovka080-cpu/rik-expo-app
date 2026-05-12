import { evaluateAiAppActionGraphArchitectureGuardrail } from "../../scripts/architecture_anti_regression_suite";

describe("AI app action graph architecture", () => {
  it("passes the architecture anti-regression ratchet", () => {
    const result = evaluateAiAppActionGraphArchitectureGuardrail({ projectRoot: process.cwd() });

    expect(result.check).toEqual({
      name: "ai_app_action_graph_architecture",
      status: "pass",
      errors: [],
    });
    expect(result.summary).toEqual(
      expect.objectContaining({
        appGraphFilesPresent: true,
        domainGraphFilesPresent: true,
        internalFirstPolicyPresent: true,
        externalIntelPolicyPresent: true,
        bffRoutesPresent: true,
        majorScreensRegistered: true,
        aiRelevantButtonsMapped: true,
        buttonCoverageScannerPresent: true,
        businessActionsHaveRiskPolicy: true,
        approvalRequiredCannotExecuteDirectly: true,
        forbiddenActionsHaveNoTool: true,
        externalSourcesRequireCitation: true,
        externalLiveFetchDisabled: true,
        externalFinalActionForbidden: true,
        noMobileExternalLiveFetch: true,
        noUiSupabaseGraphImport: true,
        noUiModelProviderGraphImport: true,
        noRawPayloadFields: true,
        mutationCountZero: true,
      }),
    );
  });
});
