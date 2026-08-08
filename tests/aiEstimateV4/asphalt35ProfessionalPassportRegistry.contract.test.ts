import {
  auditAsphalt35InventoryManifest,
  buildAsphalt35CalculationProfilesV4,
  buildAsphalt35InventoryManifest,
  buildAsphalt35ProfessionalPassportsV4,
} from "../../src/lib/estimate/v4/roadworks";

describe("Asphalt 35/35 ProfessionalEstimatePassportV4 registry", () => {
  const passports = buildAsphalt35ProfessionalPassportsV4();
  const profiles = buildAsphalt35CalculationProfilesV4();
  const manifest = buildAsphalt35InventoryManifest();

  test("generates the canonical 35-record manifest with unique identities and no fallback", () => {
    expect(auditAsphalt35InventoryManifest()).toMatchObject({
      inventory: 35,
      unique_work_key: 35,
      unique_catalog_item_id: 35,
      unique_passport_id: 35,
      unique_calculation_profile: 35,
      unique_semantic_fingerprint: 35,
      generic_fallback: 0,
      silent_alias: 0,
      missing_classification: 0,
      missing_owner: 0,
      normative_source_missing: 0,
      calculation_ready: 24,
      needs_required_inputs: 11,
    });
  });

  test("creates one versioned passport and calculation profile for every exact work key", () => {
    expect(passports).toHaveLength(35);
    expect(profiles).toHaveLength(35);
    expect(manifest).toHaveLength(35);
    expect(new Set(profiles.map((row) => row.profileHash)).size).toBe(35);
    for (const record of manifest) {
      const passport = passports.find((row) => row.catalogWorkId === record.work_key)!;
      const profile = profiles.find((row) => row.workKey === record.work_key)!;
      expect(passport.passportId).toBe(record.passport_id);
      expect(passport.version).toBe(record.passport_version);
      expect(profile.calculationProfileId).toBe(record.calculation_profile_id);
      expect(profile.calculationProfileVersion).toBe(record.calculation_profile_version);
      expect(profile.passportId).toBe(passport.passportId);
      expect(profile.semanticOwner).toBe(passport.passportId);
      expect(record.semantic_owner).toBe(record.passport_id);
      expect(record.catalog_item_id).toBeTruthy();
      expect(record.classification_reason.length).toBeGreaterThan(0);
      expect(record.parameter_schema_id).toBe(profile.parameterSchemaId);
      expect(record.normative_composition_id).toBe(profile.normativeCompositionId);
      expect(record.boq_profile_id).toBe(profile.typedBoqProfileId);
    }
  });

  test("separates normative authority layers and keeps prices, AI and overrides out of formula truth", () => {
    for (const passport of passports) {
      expect(passport.normativeComposition.technicalRequirementSourceIds.length).toBeGreaterThan(0);
      expect(passport.normativeComposition.estimateResourceNormSourceIds.length).toBeGreaterThan(0);
      expect(passport.normativeComposition.internationalCrosswalkSourceIds.length).toBeGreaterThan(0);
      expect(passport.normativeComposition.marketPriceSourceIds).toEqual([]);
      expect(passport.normativeComposition.aiRecommendationSourceIds).toEqual([]);
      expect(passport.normativeComposition.userOverrideSourceIds).toEqual([]);
      expect(passport.normativeComposition.unresolvedConflictIds).toEqual([]);
      expect(passport.normativeComposition.conflictResolution.length).toBeGreaterThan(0);
    }
  });

  test("binds readiness, immutable revision, PDF and procurement projections to each semantic owner", () => {
    for (const passport of passports) {
      expect(passport.boq.semanticOwner).toBe(passport.passportId);
      expect(passport.migration.semanticOwner).toBe(passport.passportId);
      expect(passport.contracts.readiness.requiredInputKeys.length).toBeGreaterThan(0);
      expect(passport.contracts.revision.immutableSnapshotRequired).toBe(true);
      expect(passport.contracts.pdfProjection.sourceOfTruth).toBe("IMMUTABLE_REVISION");
      expect(passport.contracts.procurementProjection.sourceOfTruth).toBe("IMMUTABLE_REVISION");
      expect(passport.contracts.procurementProjection.excludesControlAndDocumentRows).toBe(true);
      expect(passport.evidence.independentGoldenFixtures).toEqual([
        `${passport.catalogWorkId}:normal:v4`,
        `${passport.catalogWorkId}:boundary:v4`,
        `${passport.catalogWorkId}:edit-reopen:v4`,
      ]);
    }
  });

  test("does not claim disputed applicability is calculation-ready before its required inputs", () => {
    const disputed = manifest.filter((row) => /_(?:wet_zone|technical_room)$/.test(row.work_key));
    expect(disputed).toHaveLength(11);
    expect(disputed.every((row) => row.readiness_state === "NEEDS_REQUIRED_INPUTS")).toBe(true);
    expect(disputed.every((row) => row.required_parameters.length >= 3)).toBe(true);
    expect(manifest.filter((row) => !/_(?:wet_zone|technical_room)$/.test(row.work_key))
      .every((row) => row.readiness_state === "CALCULATION_READY")).toBe(true);
  });
});
