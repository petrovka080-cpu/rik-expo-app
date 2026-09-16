import {
  assertFormworkRemainingFamilyApplicabilityMatrix,
  FORMWORK_REMAINING_FAMILY_APPLICABILITY_MATRIX,
  FORMWORK_REMAINING_FAMILY_CONTRACTS,
} from "./formworkRemainingFamilyApplicabilityCorrection";

describe("remaining foundation formwork applicability correction", () => {
  test("covers exactly three seven-context families without changing the accepted pile-cap fixture", () => {
    expect(() => assertFormworkRemainingFamilyApplicabilityMatrix()).not.toThrow();
    expect(FORMWORK_REMAINING_FAMILY_CONTRACTS).toHaveLength(3);
    expect(FORMWORK_REMAINING_FAMILY_APPLICABILITY_MATRIX).toHaveLength(21);
    expect(new Set(FORMWORK_REMAINING_FAMILY_APPLICABILITY_MATRIX.map((row) => row.familyKey))).toEqual(
      new Set(["strip_foundation", "slab_foundation", "foundation_walls"]),
    );
    expect(FORMWORK_REMAINING_FAMILY_APPLICABILITY_MATRIX.some(
      (row) => row.catalogId.includes("pile_cap"),
    )).toBe(false);
  });

  test("fails closed to measurement-only until every catalog ID has its own project evidence", () => {
    for (const row of FORMWORK_REMAINING_FAMILY_APPLICABILITY_MATRIX) {
      expect(row.status).toBe("OPEN_MEASUREMENT_ONLY_RESTORED");
      expect(row.evidence).toEqual({
        clonedFixtureRejectedAsPerIdEvidence: true,
        measurementOnlyFallbackRequired: true,
      });
      expect(row.conditions.length).toBeGreaterThanOrEqual(3);
      expect(row.requiredProject.length).toBeGreaterThanOrEqual(2);
      expect(row.includedStages).toEqual(["измерение площади контакта опалубки по RICS NRM 2"]);
    }
  });
});
