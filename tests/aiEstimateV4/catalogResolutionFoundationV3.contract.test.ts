import {
  ASPHALT_USE_PROFILES_V3,
  NORMATIVE_SOURCE_REGISTRY_V3,
  assertCompositeOwnershipUniqueV3,
  auditCatalogResolutionFoundationV3,
  buildAsphalt35NormativeCompositionLedgerV3,
  buildRoadAsphaltResolutionLedgerV3,
  resolveRoadAsphaltProfileV3,
} from "../../src/lib/estimate/v4/roadworks/roadworksWaveASemanticTruth";

describe("POST-R6-01 catalog resolution foundation V3", () => {
  test("derives and completely resolves the road/asphalt denominator", () => {
    expect(auditCatalogResolutionFoundationV3()).toMatchObject({
      globalCatalogTotal: 11610,
      roadAsphaltDenominator: 35,
      uniqueRoadAsphaltCatalogIds: 35,
      duplicateRoadAsphaltCatalogIds: [],
      resolutionRecords: 35,
      genericFallbackSuccesses: 0,
      falseAutomaticAsphaltBindings: 0,
      scopeNullWithoutExplicitBlocker: 0,
    });
    expect(buildRoadAsphaltResolutionLedgerV3().every((row) => row.catalogWorkId && row.canonicalWorkTypeId)).toBe(true);
  });

  test("never treats the public-discussion draft as enacted or as the source of an executable profile", () => {
    const draft = NORMATIVE_SOURCE_REGISTRY_V3.find((source) => source.sourceId === "kg-sp-32-107-2024-draft");
    expect(draft).toMatchObject({ status: "DRAFT_PUBLIC_DISCUSSION", quantityNormAuthority: false });
    const profile = resolveRoadAsphaltProfileV3("paving_roads_landscape_interior_asphalt_install_standard");
    expect(profile.certificationClass).toBe("B");
    expect(profile.blockers).toEqual([]);
    const composition = buildAsphalt35NormativeCompositionLedgerV3()
      .find((row) => row.workId === profile.catalogWorkId);
    expect(composition?.normativeSourceIds).not.toContain("kg-sp-32-107-2024-draft");
    expect(profile.platformScopeId).toBe("ROAD_SURFACING_ONLY");
    expect(profile.attestationHash).toMatch(/^eh_[a-f0-9]{16}$/);
  });

  test("asks for scope instead of creating an ambiguous asphalt BOQ", () => {
    const profile = resolveRoadAsphaltProfileV3("paving_roads_landscape_interior_asphalt_prepare_standard");
    expect(profile.scopePresetId).toBeNull();
    expect(profile.blockers).toContain("ASPHALT_SCOPE_CLARIFICATION_REQUIRED");
  });

  test("four scopes are materially distinct and composite ownership fails closed", () => {
    const id = "paving_roads_landscape_interior_asphalt_install_standard";
    const scopes = ["REPAIR_PATCH", "ASPHALT_LAYER", "ROAD_PAVEMENT", "FULL_ROAD"] as const;
    const profiles = scopes.map((scope) => resolveRoadAsphaltProfileV3(id, scope));
    expect(new Set(profiles.map((profile) => profile.platformScopeId)).size).toBe(4);
    expect(() => assertCompositeOwnershipUniqueV3(["base:area", "surface:area", "base:area"]))
      .toThrow("DUPLICATE_COMPOSITE_QUANTITY_OWNER:base:area");
  });

  test("keeps road and parking load profiles materially distinct without inferring parking from area", () => {
    expect(new Set(Object.values(ASPHALT_USE_PROFILES_V3).map((profile) => JSON.stringify(profile))).size).toBe(4);
    expect(buildRoadAsphaltResolutionLedgerV3().every((row) => !row.variantOverlayId?.startsWith("PARKING_"))).toBe(true);
  });

  test("audits every catalog record fail-closed rather than accepting a resolution shell", () => {
    const rows = buildRoadAsphaltResolutionLedgerV3();
    expect(rows).toHaveLength(35);
    for (const row of rows) {
      expect(row.sourceCatalogLabel).toBeTruthy();
      expect(row.sourceUnit).toBe("m2");
      expect(row.parameterSchemaVersion).toBeTruthy();
      expect(row.formulaGraphVersion).toBeTruthy();
      expect(row.resourceGraphVersion).toBeTruthy();
      expect(row.attestationHash).toMatch(/^eh_[a-f0-9]{16}$/);
      if (row.domainDecision === "DOMAIN_REVIEW_REQUIRED" || row.scopePresetId === null) {
        expect(row.blockers.length).toBeGreaterThan(0);
      } else {
        expect(row.platformScopeId).not.toBeNull();
      }
    }
  });
});
