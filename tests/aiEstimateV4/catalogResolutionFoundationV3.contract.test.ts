import {
  NORMATIVE_SOURCE_REGISTRY_V3,
  assertCompositeOwnershipUniqueV3,
  auditCatalogResolutionFoundationV3,
  buildRoadAsphaltResolutionLedgerV3,
  resolveRoadAsphaltProfileV3,
} from "../../src/lib/estimate/v4/catalogResolutionFoundationV3";

describe("POST-R6-01 catalog resolution foundation V3", () => {
  test("derives and completely resolves the road/asphalt denominator", () => {
    expect(auditCatalogResolutionFoundationV3()).toMatchObject({
      globalCatalogTotal: 11610,
      roadAsphaltDenominator: 35,
      uniqueRoadAsphaltCatalogIds: 35,
      duplicateRoadAsphaltCatalogIds: [],
      canonicalWorkTypes: 8,
      scopePresetCatalogEntries: 16,
      unresolvedSemanticDecisions: 0,
      genericFallbackSuccesses: 0,
    });
    expect(buildRoadAsphaltResolutionLedgerV3().every((row) => row.catalogWorkId && row.canonicalWorkTypeId)).toBe(true);
  });

  test("keeps unverified official content in class C and never treats the draft as enacted", () => {
    const draft = NORMATIVE_SOURCE_REGISTRY_V3.find((source) => source.sourceId === "kg-sp-32-107-2024-draft");
    expect(draft).toMatchObject({ status: "DRAFT_PUBLIC_DISCUSSION", quantityNormAuthority: false });
    const profile = resolveRoadAsphaltProfileV3("paving_roads_landscape_interior_asphalt_install_standard");
    expect(profile.certificationClass).toBe("C");
    expect(profile.blockers).toContain("NORMATIVE_QUANTITY_SOURCE_CONTENT_UNAVAILABLE");
    expect(profile.scopeComponents).toEqual(expect.arrayContaining(["compacted_thickness", "prepared_base"]));
    expect(profile.attestationHash).toMatch(/^[a-f0-9]{64}$/);
  });

  test("asks for scope instead of creating an ambiguous asphalt BOQ", () => {
    const profile = resolveRoadAsphaltProfileV3("paving_roads_landscape_interior_asphalt_prepare_standard");
    expect(profile.scopePresetId).toBeNull();
    expect(profile.scopeComponents).toEqual([]);
    expect(profile.blockers).toContain("ASPHALT_SCOPE_CLARIFICATION_REQUIRED");
  });

  test("four scopes are materially distinct and composite ownership fails closed", () => {
    const id = "paving_roads_landscape_interior_asphalt_install_standard";
    const scopes = ["REPAIR_PATCH", "ASPHALT_LAYER", "ROAD_PAVEMENT", "FULL_ROAD"] as const;
    const profiles = scopes.map((scope) => resolveRoadAsphaltProfileV3(id, scope));
    expect(new Set(profiles.map((profile) => JSON.stringify(profile.scopeComponents))).size).toBe(4);
    expect(() => assertCompositeOwnershipUniqueV3(["base:area", "surface:area", "base:area"]))
      .toThrow("DUPLICATE_COMPOSITE_QUANTITY_OWNER:base:area");
  });
});

