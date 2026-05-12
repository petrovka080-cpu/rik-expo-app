import { resolveInternalFirstExternalGate } from "../../src/features/ai/externalIntel/internalFirstExternalGate";

describe("internal-first external gate", () => {
  it("requires internal data and evidence before any external lookup", () => {
    expect(
      resolveInternalFirstExternalGate({
        domain: "procurement",
        internalDataChecked: false,
        marketplaceChecked: true,
        internalEvidenceRefs: ["internal_app:request:1"],
        sourcePolicyIds: ["supplier_public_catalog.default"],
      }),
    ).toMatchObject({
      allowed: false,
      reason: "internal_data_check_required",
      requiresCitation: true,
      forbiddenForFinalAction: true,
    });

    expect(
      resolveInternalFirstExternalGate({
        domain: "procurement",
        internalDataChecked: true,
        marketplaceChecked: true,
        internalEvidenceRefs: [],
        sourcePolicyIds: ["supplier_public_catalog.default"],
      }),
    ).toMatchObject({
      allowed: false,
      reason: "internal_evidence_required",
    });
  });

  it("requires marketplace check before procurement external lookup", () => {
    expect(
      resolveInternalFirstExternalGate({
        domain: "procurement",
        internalDataChecked: true,
        marketplaceChecked: false,
        internalEvidenceRefs: ["internal_app:request:1"],
        sourcePolicyIds: ["supplier_public_catalog.default"],
      }),
    ).toMatchObject({
      allowed: false,
      marketplaceChecked: false,
      reason: "marketplace_check_required_for_procurement",
    });
  });

  it("allows only allowlisted sources after internal and marketplace evidence", () => {
    expect(
      resolveInternalFirstExternalGate({
        domain: "procurement",
        internalDataChecked: true,
        marketplaceChecked: true,
        internalEvidenceRefs: ["internal_app:request:1"],
        sourcePolicyIds: ["supplier_public_catalog.default"],
      }),
    ).toMatchObject({
      allowed: true,
      internalDataChecked: true,
      marketplaceChecked: true,
      sourcePolicyIds: ["supplier_public_catalog.default"],
      requiresCitation: true,
      forbiddenForFinalAction: true,
    });

    expect(
      resolveInternalFirstExternalGate({
        domain: "warehouse",
        internalDataChecked: true,
        marketplaceChecked: false,
        internalEvidenceRefs: ["internal_app:request:1"],
        sourcePolicyIds: ["supplier_public_catalog.default"],
      }),
    ).toMatchObject({
      allowed: false,
      reason: "domain_not_allowlisted_for_external_source",
    });
  });
});
