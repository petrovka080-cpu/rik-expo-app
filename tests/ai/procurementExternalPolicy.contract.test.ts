import { resolveExternalIntelPolicy } from "../../src/features/ai/externalIntel/externalIntelPolicy";
import { EXTERNAL_LIVE_FETCH_ENABLED, EXTERNAL_SOURCE_REGISTRY } from "../../src/features/ai/externalIntel/externalSourceRegistry";
import { previewProcurementSupplierMatch } from "../../src/features/ai/procurement/procurementSupplierMatchEngine";

const buyerAuth = { userId: "buyer-user", role: "buyer" } as const;

describe("procurement external policy", () => {
  it("keeps live external fetch disabled and requires citation, checkedAt, freshness, and redaction policy", () => {
    expect(EXTERNAL_LIVE_FETCH_ENABLED).toBe(false);
    expect(EXTERNAL_SOURCE_REGISTRY.every((policy) => policy.requiresCitation)).toBe(true);
    expect(EXTERNAL_SOURCE_REGISTRY.every((policy) => policy.requiresCheckedAt)).toBe(true);
    expect(EXTERNAL_SOURCE_REGISTRY.every((policy) => policy.redactionRequired)).toBe(true);
    expect(EXTERNAL_SOURCE_REGISTRY.every((policy) => policy.domainAllowlistRequired)).toBe(true);
    expect(EXTERNAL_SOURCE_REGISTRY.every((policy) => policy.freshnessWindowDays > 0)).toBe(true);
    expect(
      resolveExternalIntelPolicy({
        domain: "procurement",
        sourcePolicyIds: ["supplier_public_catalog.default"],
      }),
    ).toMatchObject({
      allowed: true,
      externalLiveFetchEnabled: false,
      citationsRequired: true,
      checkedAtRequired: true,
      redactionRequired: true,
      domainAllowlistRequired: true,
      finalActionForbidden: true,
    });
  });

  it("does not let external policy produce a final procurement action", async () => {
    const result = await previewProcurementSupplierMatch({
      auth: buyerAuth,
      externalRequested: true,
      externalSourcePolicyIds: ["supplier_public_catalog.default"],
      input: {
        items: [{ materialLabel: "Cement", quantity: 1, unit: "bag" }],
      },
      searchCatalogItems: async () => [],
      listSuppliers: async () => [],
    });

    expect(result.output).toMatchObject({
      externalChecked: false,
      externalStatus: "external_policy_not_enabled",
      nextAction: "explain",
    });
    expect(result.proof.externalResultCanFinalize).toBe(false);
  });
});
