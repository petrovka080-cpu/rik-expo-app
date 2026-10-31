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
  const operations=['install','lay','compact','repair','prepare','level','drain','finish'];
  const expectedIds=[...operations.map(operation=>`paving_roads_landscape_interior_asphalt_${operation}_standard`),
    ...operations.map(operation=>`paving_roads_landscape_interior_asphalt_${operation}_wet_zone`),
    ...['install','lay','compact'].map(operation=>`paving_roads_landscape_interior_asphalt_${operation}_technical_room`)].sort();
  const expectedCount=expectedIds.length;

  test.each([1, 2, 3, 4] as const)("cohort %i terminates its exact retained catalog records", (cohort) => {
    const records = ledger.filter((row) => row.cohort === cohort);
    const expected=expectedIds.slice((cohort-1)*5,cohort*5);
    expect(records.map(row=>row.workId)).toEqual(expected);
    expect(records.every((row) => row.terminalDecision === "EXECUTABLE_B")).toBe(true);
    expect(new Set(records.map((row) => row.fixtureId)).size).toBe(expected.length);
  });

  test("accounts for the canonical denominator with complete normative and typed-BOQ trace", () => {
    expect(auditAsphalt35NormativeCompositionV3()).toMatchObject({
      catalog_records: expectedCount,
      resolution_records: expectedCount,
      normative_composition_records: expectedCount,
      executable_records: expectedCount,
      blocked_c_records: 0,
      missing_terminal_decisions: 0,
      executable_without_work_specific_fixture: 0,
      executable_without_parameter_schema: 0,
      executable_without_formula_graph: 0,
      executable_without_resource_graph: 0,
      successful_ambiguous_compilation: 0,
      C_profile_user_visible_compile: 0,
      duplicate_fixture_ids: 0,
      unique_composition_fingerprints: expectedCount,
      kr_primary_source: expectedCount,
      kr_estimate_resource_binding: expectedCount,
      interstate_status_resolved: expectedCount,
      international_crosswalk_resolved: expectedCount,
      formula_trace: expectedCount,
      source_trace: expectedCount,
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

  test("keeps retained physical technologies distinct and rejects retired area-only variants", () => {
    expect(RoadworksWaveAInventory.map(item=>item.workId)).toEqual(expectedIds);
    for (const operation of ["install", "lay", "compact", "repair", "level"] as const) {
      const scopes=[...(['standard','wet_zone'] as const),
        ...(['install','lay','compact'].includes(operation)?['technical_room' as const]:[])];
      const variants = scopes.map((scope) => {
        const item = RoadworksWaveAInventory.find((candidate) => candidate.workId.includes(`_asphalt_${operation}_${scope}`))!;
        const rows = compileRoadworksWaveAWork(item.canonicalWorkId, DEFAULT_ROADWORKS_WAVE_A_INPUTS, { scopeProfile: scope });
        return rows.rows.map((row) => `${row.rowId.slice(item.canonicalWorkId.length)}:${row.category}:${row.formulaId}`).join("|");
      });
      expect(new Set(variants).size).toBe(scopes.length);
      for(const suffix of ['small_area','large_area']) {
        const retired=`paving_roads_landscape_interior_asphalt_${operation}_${suffix}`;
        expect(RoadworksWaveAInventory.some(item=>item.workId===retired)).toBe(false);
        expect(()=>compileRoadworksWaveAWork(retired,DEFAULT_ROADWORKS_WAVE_A_INPUTS)).toThrow();
      }
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
