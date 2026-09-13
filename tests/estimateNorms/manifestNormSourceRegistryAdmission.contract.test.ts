import { inspectManifestNormSourceRegistryAdmission } from "../../scripts/estimate/auditRealProfessionalNormPacks";

describe("current manifest norm source registry admission", () => {
  it("fails closed when an admitted trace names an unregistered generated source", () => {
    const result = inspectManifestNormSourceRegistryAdmission([
      JSON.stringify({
        canonicalId: "canonical-work:base:a",
        admissionState: "ADMITTED_CANONICAL_SUCCESSOR",
        normPackVersion: { sourceIds: ["src_reviewed", "src_professional_norm_pack_catalog_fake_v1"] },
      }),
      JSON.stringify({
        canonicalId: "historical:b",
        admissionState: "RETIRED_NOT_CURRENT",
        normPackVersion: { sourceIds: ["src_historical_missing"] },
      }),
    ].join("\n"), new Set(["src_reviewed"]));

    expect(result.complete).toBe(false);
    expect(result.admitted_definition_count).toBe(1);
    expect(result.unregistered_norm_source_ids).toEqual([
      "src_professional_norm_pack_catalog_fake_v1",
    ]);
    expect(result.unregistered_norm_source_id_class_counts).toEqual({
      generated_catalog_default: 1,
    });
    expect(result.admitted_definitions_with_unregistered_norm_sources_count).toBe(1);
    expect(result.admitted_definitions_with_unregistered_norm_sources_samples).toEqual([
      "canonical-work:base:a",
    ]);
  });

  it("accepts only a non-empty admitted denominator whose sources are registered", () => {
    const result = inspectManifestNormSourceRegistryAdmission(JSON.stringify({
      canonicalId: "canonical-work:base:a",
      admissionState: "ADMITTED_INHERITED",
      normPackVersion: { sourceIds: ["src_reviewed"] },
    }), new Set(["src_reviewed"]));

    expect(result.complete).toBe(true);
    expect(result.declared_norm_source_ids_count).toBe(1);
    expect(result.accepted_norm_source_ids_count).toBe(1);
    expect(result.unregistered_norm_source_id_class_counts).toEqual({});
  });
});
