import { evaluateAiProcurementContextEngineGuardrail } from "../../scripts/architecture_anti_regression_suite";

describe("AI procurement context engine architecture", () => {
  it("passes the procurement context engine architecture ratchet", () => {
    const result = evaluateAiProcurementContextEngineGuardrail({ projectRoot: process.cwd() });

    expect(result.check).toEqual({
      name: "ai_procurement_context_engine",
      status: "pass",
      errors: [],
    });
    expect(result.summary).toEqual(
      expect.objectContaining({
        procurementFilesPresent: true,
        bffRoutesPresent: true,
        requestContextResolverPresent: true,
        internalFirstPolicyPresent: true,
        marketplaceSecondPolicyPresent: true,
        externalLiveFetchDisabled: true,
        externalCitationPolicyPresent: true,
        externalCheckedAtPolicyPresent: true,
        supplierMatchUsesSafeToolsOnly: true,
        supplierMatchNoFinalSelection: true,
        draftRequestDraftOnly: true,
        submitForApprovalNoFinalExecution: true,
        noProviderImports: true,
        noSupabaseImports: true,
        noUiSupabaseImport: true,
        noUiExternalFetch: true,
        noUiModelProviderImport: true,
        noRawOutputFields: true,
        noApprovalPersistenceFake: true,
        e2eRunnerPresent: true,
        e2eBoundedRealRequestDiscoveryPresent: true,
        e2eRequestDiscoveryNoSeedOrAdmin: true,
      }),
    );
  });
});
