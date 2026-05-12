import { evaluateAiExternalIntelGatewayGuardrail } from "../../scripts/architecture_anti_regression_suite";

describe("AI external intelligence gateway architecture", () => {
  it("passes the external intel gateway architecture ratchet", () => {
    const result = evaluateAiExternalIntelGatewayGuardrail({ projectRoot: process.cwd() });

    expect(result.check).toEqual({
      name: "ai_external_intel_gateway",
      status: "pass",
      errors: [],
    });
    expect(result.summary).toEqual(
      expect.objectContaining({
        gatewayFilesPresent: true,
        sourceRegistryPresent: true,
        disabledProviderDefault: true,
        providerFlagsPresent: true,
        internalFirstGatePresent: true,
        bffRouteContractPresent: true,
        procurementExternalCandidatesPresent: true,
        citationPolicyPresent: true,
        checkedAtPolicyPresent: true,
        externalLiveFetchDisabledByDefault: true,
        noMobileExternalFetch: true,
        noUiProviderImport: true,
        noRawHtmlToMobile: true,
        noSecretsInSourceOrArtifacts: true,
        noAuthAdminOrServiceRole: true,
        noMutationSurface: true,
        externalFinalActionForbidden: true,
      }),
    );
  });
});
