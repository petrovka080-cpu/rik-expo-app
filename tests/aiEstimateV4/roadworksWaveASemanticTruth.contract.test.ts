import {
  DEFAULT_ROADWORKS_WAVE_A_INPUTS,
  ROADWORKS_WAVE_A_NORMATIVE_SOURCES,
  RoadworksWaveAInventory,
  auditRoadworksWaveASemanticTruth,
  compileRoadworksWaveAWork,
  getRoadworksWaveAOperation,
  resolveRoadworksWaveAConversationalWork,
} from "../../src/lib/estimate/v4/roadworks";

describe("Roadworks Wave A semantic and normative truth", () => {
  test("reports the repaired 35-record semantic and composition truth", () => {
    const audit = auditRoadworksWaveASemanticTruth();
    expect(audit).toMatchObject({
      total_work_ids: 35,
      distinct_professional_models: 8,
      catalog_aliases: 0,
      scope_presets: 16,
      domain_review_required: 11,
      unique_semantic_signatures: 35,
      scope_profiles_ignored_by_compiler: 0,
      missing_golden_fixtures: 0,
      missing_p0_parameters: 0,
      silent_p0_defaults: 0,
      missing_formula_sources: 0,
      generic_output_rows: 0,
      models_requiring_domain_review: 20,
      blockerStatus: "ASPHALT_35_COMPOSITION_READY_FOR_PLATFORM_GATES",
      fake_green_claimed: false,
    });
    expect(audit.unexplainedCloneGroups).toEqual([]);
    expect(audit.invalidCanonicalMappings).toEqual([]);
    expect(audit.missingSourceCoverage).toEqual([]);
  });

  test("mapped catalog entries preserve identity but resolve to one canonical semantic owner", () => {
    for (const alias of RoadworksWaveAInventory.filter((item) => item.catalogClassification !== "CANONICAL_WORK_MODEL")) {
      const canonical = RoadworksWaveAInventory.find((item) => item.workId === alias.canonicalWorkId)!;
      expect(alias.canonicalModelId).toBe(canonical.canonicalModelId);
      const aliasRows = compileRoadworksWaveAWork(alias.canonicalWorkId, DEFAULT_ROADWORKS_WAVE_A_INPUTS).rows;
      const canonicalRows = compileRoadworksWaveAWork(canonical.workId, DEFAULT_ROADWORKS_WAVE_A_INPUTS).rows;
      expect(aliasRows.map((row) => ({
        suffix: row.rowId.slice(alias.canonicalWorkId.length),
        category: row.category,
        unit: row.unit,
        quantity: row.quantity,
        formulaId: row.formulaId,
      }))).toEqual(canonicalRows.map((row) => ({
        suffix: row.rowId.slice(canonical.workId.length),
        category: row.category,
        unit: row.unit,
        quantity: row.quantity,
        formulaId: row.formulaId,
      })));
    }
  });

  test("binds compiled rows only to registered sources without calling compiler output golden", () => {
    const knownSources = new Set([
      ...ROADWORKS_WAVE_A_NORMATIVE_SOURCES.map((source) => source.sourceId),
      "project_quantity_inputs_v3",
    ]);
    for (const model of RoadworksWaveAInventory.filter((item) => item.catalogClassification === "CANONICAL_WORK_MODEL")) {
      const compilation = compileRoadworksWaveAWork(model.workId, DEFAULT_ROADWORKS_WAVE_A_INPUTS);
      expect(compilation.rows.every((row) => row.sourceIds.every((sourceId) => knownSources.has(sourceId)))).toBe(true);
    }
  });

  test("resolves conversational scope requests without full catalog names", () => {
    const operationText = {
      install: "сделать асфальтовое покрытие",
      lay: "уложить асфальт",
      compact: "укатать асфальт",
      repair: "починить асфальт",
      prepare: "подготовить поверхность асфальтового покрытия",
      level: "сделать выравнивающий слой",
      drain: "сформировать водоотвод",
      finish: "герметизация стыков",
    } as const;
    const scopeText = {
      standard: "",
      small_area: "на небольшом участке",
      large_area: "на большой территории",
      wet_zone: "во влажном участке",
      technical_room: "внутри цеха",
    } as const;
    for (const item of RoadworksWaveAInventory) {
      const operation = getRoadworksWaveAOperation(item.workId)!;
      const resolution = resolveRoadworksWaveAConversationalWork(
        `${operationText[operation]} ${scopeText[item.scopeProfile]} 120 квадратов`,
      );
      expect(resolution.status).toBe("resolved");
      expect(resolution.registration?.workId).toBe(item.workId);
    }
  });

  test("does not turn negation or multi-operation ambiguity into a professional estimate", () => {
    expect(resolveRoadworksWaveAConversationalWork("не ремонт асфальта, нужна только оценка состояния").status)
      .toBe("negated");
    const ambiguous = resolveRoadworksWaveAConversationalWork("уложить и уплотнить асфальт на участке");
    expect(ambiguous.status).toBe("ambiguous");
    expect(ambiguous.registration).toBeNull();
  });
});
