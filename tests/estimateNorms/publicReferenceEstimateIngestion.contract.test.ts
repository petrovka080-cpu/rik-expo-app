import {
  auditPublicReferenceEstimatePassport,
  publicReferenceRequiresExpertReview,
  publicReferenceRuntimeNetworkPolicy,
  type PublicReferenceEstimatePassport,
} from "../../src/lib/estimate/publicReferenceEstimateIngestion";

function reference(overrides: Partial<PublicReferenceEstimatePassport> = {}): PublicReferenceEstimatePassport {
  return {
    reference_id: "public_reference:solar:utility:example:v1",
    title: "Utility solar plant bill of quantities reference",
    source_url: "https://example.org/solar-boq.pdf",
    publisher: "Example public engineering publisher",
    jurisdiction: "international_reference",
    published_at: "2025-01-10",
    accessed_at: "2026-07-14",
    license: "OPEN_LICENSE",
    work_family: "solar_power_plant",
    project_type: "utility_scale_solar_power_plant",
    scale: "utility_scale",
    currency: "USD",
    line_items: [
      { title: "PV modules", unit: "MW", quantity: 100, section: "equipment", source_row_id: "1" },
      { title: "DC cable network", unit: "m", quantity: 450000, section: "materials", source_row_id: "2" },
    ],
    units: ["MW", "m"],
    parameters: { capacity_mw: 100, scale_class: "utility_scale" },
    document_hash: "a".repeat(64),
    validation_status: "REFERENCE_NORMALIZED",
    ...overrides,
  };
}

describe("public reference estimate ingestion", () => {
  it("allows lawful normalized references for structure but not production quantities", () => {
    const audit = auditPublicReferenceEstimatePassport(reference());

    expect(audit).toEqual({
      accepted_for_registry: true,
      can_influence_structure: true,
      can_influence_production_quantities: false,
      blockers: [],
    });
  });

  it("requires cross-check or expert validation before quantities can influence production", () => {
    expect(auditPublicReferenceEstimatePassport(reference({
      validation_status: "REFERENCE_CROSS_CHECKED",
    })).can_influence_production_quantities).toBe(true);
    expect(publicReferenceRequiresExpertReview(reference({
      validation_status: "REFERENCE_CROSS_CHECKED",
    }))).toBe(true);
    expect(publicReferenceRequiresExpertReview(reference({
      validation_status: "REFERENCE_EXPERT_VALIDATED",
    }))).toBe(false);
  });

  it("rejects unknown license or unstable source metadata", () => {
    const audit = auditPublicReferenceEstimatePassport(reference({
      source_url: "not-a-url",
      license: "LICENSE_UNKNOWN",
      document_hash: "short",
    }));

    expect(audit.accepted_for_registry).toBe(false);
    expect(audit.can_influence_structure).toBe(false);
    expect(audit.can_influence_production_quantities).toBe(false);
    expect(audit.blockers).toEqual(expect.arrayContaining([
      "REFERENCE_SOURCE_URL_INVALID",
      "REFERENCE_LICENSE_NOT_ALLOWED",
      "REFERENCE_DOCUMENT_HASH_INVALID",
    ]));
  });

  it("forbids live internet access from runtime", () => {
    expect(publicReferenceRuntimeNetworkPolicy()).toEqual({
      runtime_fetch_allowed: false,
      ingestion_fetch_allowed: true,
      registry_required_before_runtime: true,
    });
  });
});
