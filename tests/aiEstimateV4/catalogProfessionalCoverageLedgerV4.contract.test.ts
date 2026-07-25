import {
  buildCatalogProfessionalCoverageLedgerV4,
  resolveCatalogProfessionalCoverageV4,
  validateReferencePassportCatalogBindingsV4,
} from "../../src/lib/estimate/v4/catalogProfessionalCoverageLedgerV4";

describe("deterministic professional coverage ledger for all 11 610 catalog IDs", () => {
  test("classifies every catalog ID exactly once without promoting technical records to passports", () => {
    const ledger = buildCatalogProfessionalCoverageLedgerV4();

    expect(ledger.catalogTotal).toBe(11610);
    expect(ledger.rows).toHaveLength(11610);
    expect(new Set(ledger.rows.map((row) => row.catalogId)).size).toBe(11610);
    expect(ledger.counts).toEqual({
      DISTINCT_PROFESSIONAL_PASSPORT: 12,
      SCOPE_PRESET: 7152,
      PARAMETERIZED_VARIANT: 1288,
      SEARCH_ALIAS: 0,
      DOMAIN_REVIEW_REQUIRED: 3158,
    });
    expect(ledger.unclassifiedCatalogIds).toEqual([]);
    expect(ledger.duplicateCatalogIds).toEqual([]);
    expect(ledger.brokenCanonicalTargets).toEqual([]);
  });

  test("binds exactly the twelve independently proven reference passports", () => {
    const ledger = buildCatalogProfessionalCoverageLedgerV4();
    const distinct = ledger.rows.filter((row) => row.state === "DISTINCT_PROFESSIONAL_PASSPORT");

    expect(validateReferencePassportCatalogBindingsV4()).toEqual([]);
    expect(ledger.referencePassportBindingsTotal).toBe(12);
    expect(distinct).toHaveLength(12);
    expect(new Set(distinct.map((row) => row.referencePassportCatalogWorkId)).size).toBe(12);
    expect(distinct.every((row) =>
      row.resolution === "PROFESSIONAL_ESTIMATE" &&
      row.canonicalCatalogId === row.catalogId
    )).toBe(true);
  });

  test("keeps synthetic scope and estimate-level records subordinate to canonical owners", () => {
    const smallArea = resolveCatalogProfessionalCoverageV4(
      "earthworks_interior_trench_excavate_small_area",
    );
    const expandedVariant = resolveCatalogProfessionalCoverageV4(
      "expanded-template:private_house_construction_rom_concept_expanded_complex_v1",
    );
    const expandedAnchor = resolveCatalogProfessionalCoverageV4(
      "expanded-template:private_house_construction_detailed_boq_from_drawings_expanded_complex_v1",
    );

    expect(smallArea).toMatchObject({
      state: "SCOPE_PRESET",
      canonicalCatalogId: "earthworks_interior_trench_excavate_standard",
      resolution: "REQUIRED_INPUT_REQUEST",
    });
    expect(expandedVariant).toMatchObject({
      state: "PARAMETERIZED_VARIANT",
      canonicalCatalogId: "expanded-template:private_house_construction_detailed_boq_from_drawings_expanded_complex_v1",
      resolution: "REQUIRED_INPUT_REQUEST",
    });
    expect(expandedAnchor).toMatchObject({
      state: "DOMAIN_REVIEW_REQUIRED",
      canonicalCatalogId: null,
      resolution: "REQUIRED_INPUT_REQUEST",
    });
  });

  test("provides an honest required-input path for every record not independently proven", () => {
    const rows = buildCatalogProfessionalCoverageLedgerV4().rows;
    const unresolved = rows.filter((row) => row.state !== "DISTINCT_PROFESSIONAL_PASSPORT");

    expect(unresolved.length).toBeGreaterThan(0);
    expect(unresolved.every((row) =>
      row.resolution === "REQUIRED_INPUT_REQUEST" &&
      row.requiredInputs.length > 0 &&
      row.reason.length > 0 &&
      row.sourceBinding.length > 0
    )).toBe(true);
    expect(rows.filter((row) => row.state === "SEARCH_ALIAS")).toHaveLength(0);
  });

  test("is byte-stable for the same catalog inputs", () => {
    const first = buildCatalogProfessionalCoverageLedgerV4();
    const second = buildCatalogProfessionalCoverageLedgerV4();

    expect(second.checksum).toBe(first.checksum);
    expect(second.rows).toEqual(first.rows);
  });
});
