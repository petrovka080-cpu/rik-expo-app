import {
  classifyCatalogGapResolutionRoute,
  classifyCatalogSourceGap,
  isProfessionalDeclaredSourceId,
  normalizeDeclaredSourceIds,
} from "./catalogFirstEstimateSourceGapLedger.shared";

describe("catalog first-estimate source-gap ledger", () => {
  test("normalizes scalar and repeated source identifiers", () => {
    expect(normalizeDeclaredSourceIds([" b ", "a", "b", null])).toEqual(["a", "b"]);
    expect(normalizeDeclaredSourceIds("source-a")).toEqual(["source-a"]);
  });

  test("does not mistake project facts for a professional source", () => {
    expect(isProfessionalDeclaredSourceId("project_quantity_inputs_v3")).toBe(false);
    expect(isProfessionalDeclaredSourceId("ppr_productivity_card_r1")).toBe(false);
    expect(isProfessionalDeclaredSourceId("kg_krer_27_roadworks_2015")).toBe(true);
  });

  test("classifies the strongest available document evidence without claiming a bound rate", () => {
    expect(classifyCatalogSourceGap([])).toBe("NO_PROFESSIONAL_SOURCE_DECLARED");
    expect(classifyCatalogSourceGap([{
      sourceId: "declared-only",
      databaseRegistered: false,
      officialUrl: null,
      artifactSha256: null,
      registryReviewed: false,
      registryPhysicalNormPack: false,
    }])).toBe("SOURCE_METADATA_DECLARED_ONLY_CLAIM_UNBOUND");
    expect(classifyCatalogSourceGap([{
      sourceId: "reviewed-document",
      databaseRegistered: false,
      officialUrl: "https://example.test/source.pdf",
      artifactSha256: null,
      registryReviewed: true,
      registryPhysicalNormPack: true,
    }])).toBe("SOURCE_DOCUMENT_REGISTERED_NO_ARTIFACT_HASH_CLAIM_UNBOUND");
    expect(classifyCatalogSourceGap([{
      sourceId: "hashed-document",
      databaseRegistered: true,
      officialUrl: "https://example.test/source.pdf",
      artifactSha256: "a".repeat(64),
      registryReviewed: false,
      registryPhysicalNormPack: false,
    }])).toBe("SOURCE_ARTIFACT_HASH_PRESENT_CLAIM_UNBOUND");
  });

  test("keeps project evidence and professional source acquisition on separate routes", () => {
    expect(classifyCatalogGapResolutionRoute(
      "PROJECT_SPECIFIC_REFINEMENT",
      "SOURCE_ARTIFACT_HASH_PRESENT_CLAIM_UNBOUND",
    )).toBe("PROJECT_EVIDENCE_REQUIRED");
    expect(classifyCatalogGapResolutionRoute(
      "MANAGED_PROFESSIONAL_SOURCE",
      "SOURCE_ARTIFACT_HASH_PRESENT_CLAIM_UNBOUND",
    )).toBe("EXACT_RATE_BINDING_FROM_HASHED_ARTIFACT_REQUIRED");
    expect(classifyCatalogGapResolutionRoute(
      "MANAGED_PROFESSIONAL_SOURCE",
      "SOURCE_DOCUMENT_REGISTERED_NO_ARTIFACT_HASH_CLAIM_UNBOUND",
    )).toBe("SOURCE_ARTIFACT_ACQUISITION_AND_EXACT_RATE_BINDING_REQUIRED");
    expect(classifyCatalogGapResolutionRoute(
      "MANAGED_PROFESSIONAL_SOURCE",
      "NO_PROFESSIONAL_SOURCE_DECLARED",
    )).toBe("PROFESSIONAL_SOURCE_SELECTION_AND_EXACT_RATE_BINDING_REQUIRED");
    expect(classifyCatalogGapResolutionRoute(
      "MANAGED_PROFESSIONAL_SOURCE",
      "SOURCE_ARTIFACT_HASH_PRESENT_CLAIM_UNBOUND",
      [{
        sourceId: "exact-variant-source",
        databaseRegistered: true,
        officialUrl: "https://example.test/source.pdf",
        artifactSha256: "b".repeat(64),
        registryReviewed: false,
        registryPhysicalNormPack: false,
        useRestriction: "APPLICABILITY_ONLY_EXACT_VARIANT_REQUIRED_FOR_NUMERIC_RATE",
      }],
    )).toBe("EXACT_VARIANT_SELECTION_AND_RATE_BINDING_FROM_HASHED_ARTIFACT_REQUIRED");
    expect(classifyCatalogGapResolutionRoute(
      "MANAGED_PROFESSIONAL_SOURCE",
      "SOURCE_ARTIFACT_HASH_PRESENT_CLAIM_UNBOUND",
      [{
        sourceId: "independently-hashed-source",
        databaseRegistered: true,
        officialUrl: "https://example.test/source.pdf",
        artifactSha256: null,
        independentArtifactSha256: "c".repeat(64),
        registryReviewed: false,
        registryPhysicalNormPack: false,
      }],
    )).toBe("VERIFIED_ARTIFACT_REGISTRATION_AND_EXACT_RATE_BINDING_REQUIRED");
  });
});
