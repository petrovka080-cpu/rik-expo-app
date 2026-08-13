import {
  DRYWALL_FLAT_CEILING_PROFESSIONAL_CATALOG_IDS_V6,
  INTERIOR_FINISHES_DOMAIN_INVENTORY,
  buildIndividualDrywallFlatCeilingEstimatePassportV6,
  drywallFlatCeilingExpectedCandidatesV6,
  isDrywallFlatCeilingProfessionalCatalogIdV6,
} from "../../src/lib/estimate/v4/domains/interiorFinishesComplete";
import { allTechnologyWaveR2Parts, compileAllTechnologyWaveR2Works } from "./technologyWaveR2TestSupport";

describe("technology-domain wave R2 flat suspended ceiling production", () => {
  test("owns exactly seven groups and 36 frozen non-INSTALL identities", () => {
    const ids = DRYWALL_FLAT_CEILING_PROFESSIONAL_CATALOG_IDS_V6;
    expect(ids).toHaveLength(36);
    expect(new Set(ids).size).toBe(36);
    expect(new Set(ids.map((id) => id.replace(/_(large_area|small_area|standard|technical_room|wet_zone|high_load)$/u, ""))).size).toBe(7);
    expect(ids.every(isDrywallFlatCeilingProfessionalCatalogIdV6)).toBe(true);
    expect(ids.some((id) => id.includes("_install_"))).toBe(false);
  });

  test("compiles all identities with individual V6 formula/resource ownership", () => {
    const results = compileAllTechnologyWaveR2Works();
    expect(results).toHaveLength(36);
    for (const result of results) {
      expect(result.compile_result.status).toBe("COMPILED");
      expect(result.compile_result.blockers).toEqual([]);
      expect(result.draft?.items.every((item) => String(item.sourceParameters?.semanticOwner).includes("drywall-flat-ceiling-professional-v6"))).toBe(true);
      expect(result.draft?.items.length).toBeGreaterThanOrEqual(45);
      expect(result.draft?.items.every((item) => item.formulaId?.endsWith("FormulaGraphV6"))).toBe(true);
      expect(result.draft?.items.every((item) => item.sourceParameters?.priceRouteV3)).toBe(true);
      expect(result.draft?.items.every((item) => Array.isArray(item.sourceParameters?.normativeRowTraceV3) && item.sourceParameters.normativeRowTraceV3.length === 4)).toBe(true);
    }
  });

  test("covers every independently frozen candidate and creates unique passports", () => {
    const passports = allTechnologyWaveR2Parts().map((parts) => {
      const inventory = INTERIOR_FINISHES_DOMAIN_INVENTORY.find((row) => row.catalog_id === parts.contract.catalog_id)!;
      const passport = buildIndividualDrywallFlatCeilingEstimatePassportV6(inventory, parts);
      const rowKeys = new Set(parts.child_assemblies.flatMap((child) => child.rows).map((row) => row.row_id.split(":row:")[1]));
      const expected = drywallFlatCeilingExpectedCandidatesV6(parts.contract.operation, parts.contract.variant);
      expect(expected.every((candidate) => rowKeys.has(candidate.candidateId))).toBe(true);
      expect(passport.expectedCandidateCount).toBe(expected.length);
      expect(passport.candidateCoveragePercent).toBe(100);
      expect(passport.shownButUnusedParameterCount).toBe(0);
      return passport;
    });
    expect(new Set(passports.map((passport) => passport.identityHash)).size).toBe(36);
    expect(new Set(passports.map((passport) => passport.parameterSchemaId)).size).toBe(36);
    expect(new Set(passports.map((passport) => passport.formulaGraphHash)).size).toBe(36);
  });
});
