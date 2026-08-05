import fs from "fs";
import path from "path";

import { estimateDeterministicHash } from "../../src/lib/estimate/estimateDeterministicHash";
import {
  ASPHALT_REFERENCE_V1_GOLDENS,
  ASPHALT_REFERENCE_V1_PROFILE,
} from "../../src/lib/estimate/v4/asphalt/asphaltReferenceV1";
import { compileAsphaltProfessionalEstimateV4 } from "../../src/lib/estimate/v4/asphalt/compileAsphaltProfessionalEstimateV4";
import { ROAD_SCOPE_SELECTION_QUESTION_RU } from "../../src/lib/estimate/v4/asphalt/roadScopeTruthV4";
import { ASPHALT_WORK_SPECIFIC_PARAMETER_SCHEMA_V4 } from "../../src/lib/estimate/v4/asphalt/asphaltWorkSpecificParameterSchemaV4";
import {
  createEstimateWorkProfileRegistry,
  type EstimateWorkProfileRegistration,
} from "../../src/lib/estimate/workProfiles/estimateWorkProfileRegistry";

function corpusHash(compilation: ReturnType<typeof compileAsphaltProfessionalEstimateV4>): string {
  return estimateDeterministicHash(
    compilation.compiled_rows.map((row) => ({
      rowId: row.definition.row_id,
      wbs: row.definition.wbs_code,
      category: row.definition.category,
      unit: row.definition.unit_id,
      formula: row.definition.formula_id,
      inputs: row.formula_input_values,
      quantity: row.quantity,
      sourceId: row.definition.source_id,
      rounding: row.definition.explanation_trace_ru,
    })),
  );
}

describe("ASPHALT_REFERENCE_V1 freeze", () => {
  test("binds the canonical four scope presets to one passport, schema, strategies and honest readiness", () => {
    expect(ASPHALT_REFERENCE_V1_PROFILE.scopePresets.map((scope) => ({
      scopeId: scope.scopePresetId,
      label: scope.labelRu,
    }))).toEqual(ROAD_SCOPE_SELECTION_QUESTION_RU.options);
    expect(new Set(ASPHALT_REFERENCE_V1_PROFILE.scopePresets.map((scope) =>
      scope.calculationStrategyId
    )).size).toBe(4);
    expect(ASPHALT_REFERENCE_V1_PROFILE.scopePresets.every((scope) =>
      scope.parameterSchemaVersion === ASPHALT_WORK_SPECIFIC_PARAMETER_SCHEMA_V4.schema_id
    )).toBe(true);
    expect(ASPHALT_REFERENCE_V1_PROFILE.readiness).toEqual({
      catalogMapped: "PROVEN",
      runtimeCompilable: "PROVEN",
      formulaInvariant: "PROVEN",
      normativeVerified: "PARTIAL_REVIEW_REQUIRED",
      priceCovered: "NOT_COVERED",
      referenceAccepted: "QUANTITY_REFERENCE_ACCEPTED",
    });
  });

  test.each(ASPHALT_REFERENCE_V1_GOLDENS)(
    "$scopePresetId matches its independent engineering golden and WBS boundaries",
    (golden) => {
      const compile = () => compileAsphaltProfessionalEstimateV4({
        raw_text: `асфальт площадь ${golden.fixtureInput.area_m2} м2`,
        parameter_overrides: {
          scope_profile: { value: golden.assemblyProfileId, source: "user_input" },
        },
      });
      const first = compile();
      const replay = compile();
      const rowIds = first.compiled_rows.map((row) => row.definition.row_id);
      const categories = new Set<string>(first.compiled_rows.map((row) => row.definition.category));

      expect(first.preliminary_assembly_policy.profile_id).toBe(golden.assemblyProfileId);
      expect(first.compiled_rows).toHaveLength(golden.expectedRowCount);
      expect(corpusHash(first)).toBe(golden.expectedCorpusHash);
      expect(corpusHash(replay)).toBe(golden.expectedCorpusHash);
      expect(new Set(rowIds).size).toBe(rowIds.length);
      expect(golden.requiredRowIds.every((rowId) => rowIds.includes(rowId))).toBe(true);
      expect(golden.forbiddenRowIds.every((rowId) => !rowIds.includes(rowId))).toBe(true);
      expect(golden.requiredCategories.every((category) => categories.has(category))).toBe(true);
      expect(first.compiled_rows.every((row) =>
        Number.isFinite(row.quantity) &&
        row.quantity > 0 &&
        Boolean(row.definition.formula_id) &&
        Boolean(row.definition.unit_id) &&
        Boolean(row.definition.source_id) &&
        Boolean(row.definition.explanation_trace_ru)
      )).toBe(true);
      expect(first.compile_blockers).toEqual([]);
      expect(first.formula_dimension_blockers).toEqual([]);
      expect(first.category_unit_blockers).toEqual([]);
      expect(first.source_trace_complete).toBe(true);
      expect(first.price_coverage).toEqual({
        total_rows: golden.expectedRowCount,
        priced_rows: 0,
        missing_price_rows: golden.expectedRowCount,
        coverage_ratio: 0,
        total_amount: null,
        display_total_ru: "Итог не рассчитан: цены не заполнены",
      });
      expect(golden.priceReadiness).toBe("PRICE_DATA_REQUIRED");
    },
  );

  test("a second work type is added by registration without changing DraftSession or request controller", () => {
    const secondProfile: EstimateWorkProfileRegistration = {
      registrationVersion: "test-v1",
      workPassportId: "TILE_REFERENCE_TEST",
      canonicalWorkKey: "tile_installation",
      catalogWorkIds: ["tile_installation"],
      scopePresets: [{
        scopePresetId: "TILE_STANDARD",
        labelRu: "Стандартная укладка плитки",
        calculationStrategyId: "tile-standard:test-v1",
        parameterSchemaVersion: "tile-schema:test-v1",
        engineVersion: "test-v1",
        requiredParameterAlternatives: [{ alternativeId: "area", parameterKeys: ["area_m2"] }],
      }],
      formulaGraphVersion: "tile-formula-graph:test-v1",
      readiness: {
        catalogMapped: "PROVEN",
        runtimeCompilable: "NOT_PROVEN",
        formulaInvariant: "NOT_PROVEN",
        normativeVerified: "NOT_PROVEN",
        priceCovered: "NOT_COVERED",
        referenceAccepted: "PENDING",
      },
    };
    const registry = createEstimateWorkProfileRegistry([
      ASPHALT_REFERENCE_V1_PROFILE,
      secondProfile,
    ]);
    const draftSessionSource = fs.readFileSync(
      path.resolve(process.cwd(), "src/lib/estimate/draftSession/estimateDraftSession.ts"),
      "utf8",
    );
    const requestControllerSource = fs.readFileSync(
      path.resolve(process.cwd(), "src/features/consumerRepair/ConsumerRepairRequestScreen.tsx"),
      "utf8",
    );

    expect(registry.getByCatalogWorkId("tile_installation")).toMatchObject({
      workPassportId: "TILE_REFERENCE_TEST",
      scopePresets: [{ scopePresetId: "TILE_STANDARD" }],
    });
    expect(registry.getScopePreset("tile_installation", "TILE_STANDARD")).toMatchObject({
      calculationStrategyId: "tile-standard:test-v1",
    });
    expect(draftSessionSource).not.toMatch(/asphalt|tile_installation|ROAD_SURFACING_ONLY/iu);
    expect(requestControllerSource).not.toMatch(/asphalt|tile_installation|ROAD_SURFACING_ONLY/iu);
  });
});
