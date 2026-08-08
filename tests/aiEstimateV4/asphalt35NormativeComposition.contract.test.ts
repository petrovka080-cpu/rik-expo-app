import {
  DEFAULT_ROADWORKS_WAVE_A_INPUTS,
  NORMATIVE_SOURCE_REGISTRY_V3,
  RoadworksWaveAInventory,
  auditAsphalt35NormativeCompositionV3,
  buildAsphalt35NormativeCompositionLedgerV3,
  compileRoadworksWaveAWork,
} from "../../src/lib/estimate/v4/roadworks";

describe("Asphalt 35/35 normative composition", () => {
  const ledger = buildAsphalt35NormativeCompositionLedgerV3();

  test.each([1, 2, 3, 4, 5, 6, 7] as const)("cohort %i terminates exactly five records", (cohort) => {
    const records = ledger.filter((row) => row.cohort === cohort);
    expect(records).toHaveLength(5);
    expect(records.every((row) => row.terminalDecision === "EXECUTABLE_B")).toBe(true);
    expect(new Set(records.map((row) => row.fixtureId)).size).toBe(5);
  });

  test("accounts for the canonical denominator with complete normative and typed-BOQ trace", () => {
    expect(auditAsphalt35NormativeCompositionV3()).toMatchObject({
      catalog_records: 35,
      resolution_records: 35,
      normative_composition_records: 35,
      executable_records: 35,
      blocked_c_records: 0,
      missing_terminal_decisions: 0,
      executable_without_work_specific_fixture: 0,
      executable_without_parameter_schema: 0,
      executable_without_formula_graph: 0,
      executable_without_resource_graph: 0,
      successful_ambiguous_compilation: 0,
      C_profile_user_visible_compile: 0,
      duplicate_fixture_ids: 0,
      unique_composition_fingerprints: 35,
      kr_primary_source: 35,
      kr_estimate_resource_binding: 35,
      interstate_status_resolved: 35,
      international_crosswalk_resolved: 35,
      formula_trace: 35,
      source_trace: 35,
      unmapped: 0,
      unexplained: 0,
      unresolved_conflicts: 0,
      silent_fallback: 0,
      typed_boq_metadata_missing: 0,
      control_document_payable_or_procurable: 0,
      nondeterministic_fingerprints: 0,
    });
  });

  test("gives every executable estimate work, labor, equipment, quality and documentation", () => {
    for (const record of ledger.filter((row) => row.terminalDecision === "EXECUTABLE_B")) {
      expect(record.applicableCategories).toEqual(expect.arrayContaining(["work", "labor", "equipment", "test", "document"]));
      expect(record.formulaIds).toHaveLength(record.resourceRowIds.length);
      expect(record.normativeSourceIds.length).toBeGreaterThan(0);
      expect(record.priceTreatment).toBe("UNPRICED_EXPLICIT");
      expect(record.blockerCodes).toEqual([]);
    }
  });

  test("includes material and logistics only for operations whose composition requires them", () => {
    for (const record of ledger.filter((row) => row.terminalDecision === "EXECUTABLE_B")) {
      const materialOperation = /_asphalt_(?:install|lay|repair|level|finish)_/.test(record.workId);
      const logisticsOperation = /_asphalt_(?:install|lay|repair|level)_/.test(record.workId);
      expect(record.applicableCategories.includes("material")).toBe(materialOperation);
      expect(record.applicableCategories.includes("logistics")).toBe(logisticsOperation);
    }
  });

  test("keeps standard/small/large variants materially different without changing the canonical owner", () => {
    for (const operation of ["install", "lay", "compact", "repair", "level"] as const) {
      const variants = (["standard", "small_area", "large_area"] as const).map((scope) => {
        const item = RoadworksWaveAInventory.find((candidate) => candidate.workId.includes(`_asphalt_${operation}_${scope}`))!;
        const rows = compileRoadworksWaveAWork(item.canonicalWorkId, DEFAULT_ROADWORKS_WAVE_A_INPUTS, { scopeProfile: scope });
        return rows.rows.map((row) => `${row.rowId.slice(item.canonicalWorkId.length)}:${row.category}:${row.formulaId}`).join("|");
      });
      expect(new Set(variants).size).toBe(3);
    }
  });

  test("binds all resolved wet-zone and technical-room reference cases without generic fallback", () => {
    const disputed = ledger.filter((row) => /_(?:wet_zone|technical_room)$/.test(row.workId));
    expect(disputed).toHaveLength(11);
    expect(disputed.every((row) => row.terminalDecision === "EXECUTABLE_B")).toBe(true);
    expect(disputed.every((row) => row.resourceRowIds.length > 0 && row.blockerCodes.length === 0)).toBe(true);
  });

  test("does not use draft or metadata-only international sources as quantity authority", () => {
    expect(NORMATIVE_SOURCE_REGISTRY_V3.filter((source) => source.quantityNormAuthority).map((source) => source.sourceId).sort())
      .toEqual(["kg_krer_11_floors_2015", "kg_krer_27_roadworks_2015"]);
    expect(NORMATIVE_SOURCE_REGISTRY_V3.find((source) => source.sourceId === "kg-sp-32-107-2024-draft")?.status)
      .toBe("DRAFT_PUBLIC_DISCUSSION");
    for (const id of ["astm-d6927-22", "iso-12006-2-2015", "ifc-4.3"]) {
      expect(NORMATIVE_SOURCE_REGISTRY_V3.find((source) => source.sourceId === id)?.quantityNormAuthority).toBe(false);
    }
  });
});
