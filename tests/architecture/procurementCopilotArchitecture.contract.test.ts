import { evaluateAiProcurementCopilotRuntimeChainGuardrail } from "../../scripts/architecture_anti_regression_suite";

describe("AI procurement copilot runtime chain architecture", () => {
  it("passes the procurement copilot runtime chain architecture ratchet", () => {
    const result = evaluateAiProcurementCopilotRuntimeChainGuardrail({ projectRoot: process.cwd() });

    expect(result.check).toEqual({
      name: "ai_procurement_copilot_runtime_chain",
      status: "pass",
      errors: [],
    });
    expect(result.summary).toEqual(
      expect.objectContaining({
        copilotFilesPresent: true,
        bffRoutesPresent: true,
        planEnginePresent: true,
        internalFirstOrderPresent: true,
        marketplaceSecondPresent: true,
        externalStatusBridgePresent: true,
        externalLiveFetchDisabled: true,
        draftPreviewOnly: true,
        submitForApprovalPreviewOnly: true,
        supplierCardsRequireEvidence: true,
        noProviderImports: true,
        noSupabaseImports: true,
        noUiSupabaseImport: true,
        noUiExternalFetch: true,
        noUiModelProviderImport: true,
        noRawOutputFields: true,
        noHardcodedSupplierCards: true,
        noMutationSurface: true,
        e2eRunnerPresent: true,
      }),
    );
  });
});
