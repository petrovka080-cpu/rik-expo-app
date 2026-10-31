import {
  buildDrywallIndividualProfessionalEstimatePassportV5,
  drywallMaximumScopeLinesV5,
  DRYWALL_ARCHITECTURAL_ELEMENT_PROFESSIONAL_CATALOG_IDS_V4,
  type DrywallArchitecturalElementVariantV4,
} from "../../src/lib/estimate/v4/domains/interiorFinishesComplete";
import { compileProfessionalProjectAssemblyV4 } from "../../src/lib/estimate/v4/professionalProjectAssemblyV4";
import {
  allTechnologyWaveParts,
  exactTechnologyWaveParts,
  technologyWaveParameterValues,
} from "./technologyWaveR1TestSupport";

const NATURAL_ROW_RANGES = {
  PREPARE: [45, 85],
  ALIGN: [50, 90],
  INSULATE: [55, 100],
  FINISH_JOINT: [60, 110],
  FRAME: [75, 135],
  CLAD: [70, 125],
  REPAIR: [90, 165],
} as const;

describe("BATCH-002 active Wave-55 maximum professional estimate expansion R1", () => {
  test("expands every frozen work into a natural, operation-specific BOQ without padding", () => {
    const parts = allTechnologyWaveParts();
    const rowCounts = parts.map((part) => ({
      catalogId: part.contract.catalog_id,
      operation: part.contract.operation,
      count: part.child_assemblies.flatMap((child) => child.rows).length,
    }));

    expect(DRYWALL_ARCHITECTURAL_ELEMENT_PROFESSIONAL_CATALOG_IDS_V4).toHaveLength(11*3);
    expect(parts.map(part=>part.contract.catalog_id).sort())
      .toEqual([...DRYWALL_ARCHITECTURAL_ELEMENT_PROFESSIONAL_CATALOG_IDS_V4].sort());
    expect(parts.every(part=>!/(?:small_area|large_area)$/.test(part.contract.catalog_id))).toBe(true);
    expect(new Set(rowCounts.map(item=>item.catalogId)).size).toBe(parts.length);
    for (const item of rowCounts) {
      const [minimum, maximum] = NATURAL_ROW_RANGES[item.operation];
      expect(item.count).toBeGreaterThanOrEqual(minimum);
      expect(item.count).toBeLessThanOrEqual(maximum);
    }
  });

  test('retired size-only identities cannot return as active maximum-scope work',()=>{
    for(const suffix of ['small_area','large_area']) {
      const retired='drywall_ceiling_interior_curve_frame_'+suffix;
      expect(DRYWALL_ARCHITECTURAL_ELEMENT_PROFESSIONAL_CATALOG_IDS_V4).not.toContain(retired);
      expect(()=>exactTechnologyWaveParts(retired)).toThrow('TECHNOLOGY_WAVE_INVENTORY_MISSING');
    }
  });

  test("creates an individual V5 passport with a disposition for every candidate", () => {
    const passports = allTechnologyWaveParts().map(buildDrywallIndividualProfessionalEstimatePassportV5);
    expect(passports).toHaveLength(DRYWALL_ARCHITECTURAL_ELEMENT_PROFESSIONAL_CATALOG_IDS_V4.length);
    for (const passport of passports) {
      const candidateDecisions = [
        ...passport.materialCandidateDecisions.filter((item) => !item.candidate_id.startsWith("typed-child:")),
        ...passport.operationCandidateDecisions,
        ...passport.machineCandidateDecisions,
        ...passport.serviceCandidateDecisions,
        ...passport.testCandidateDecisions,
        ...passport.logisticsCandidateDecisions,
        ...passport.wasteHseDocumentCandidateDecisions,
      ];
      const expected = drywallMaximumScopeLinesV5(
        passport.operationType as keyof typeof NATURAL_ROW_RANGES,
        passport.variantType as DrywallArchitecturalElementVariantV4,
      );
      expect(candidateDecisions).toHaveLength(expected.length);
      expect(candidateDecisions.every((item) => item.decision === "INCLUDED" && item.row_id)).toBe(true);
      expect(passport.candidateDecisionCoverage).toBe(100);
      expect(passport.silentOmission).toBe(0);
      expect(passport.unresolvedNA).toBe(0);
      expect(passport.unexplainedBoqAlias).toBe(0);
      expect(passport.boqSemanticSetHash).toMatch(/^eh_[a-f0-9]{16}$/u);
      expect(passport.formulaGraphHash).toMatch(/^eh_[a-f0-9]{16}$/u);
      expect(passport.normativeProofHash).toMatch(/^eh_[a-f0-9]{16}$/u);
    }
  });

  test("keeps every non-control parameter connected to a formula or a derived geometry rule", () => {
    const controlParameters = new Set([
      "work_included", "estimate_scope_mode", "funding_source", "project_type", "product_profile_id",
      "material_certificate_reference", "system_passport_reference", "normative_rate_code",
      "price_basis_reference", "price_basis_date", "working_height_m",
    ]);
    for (const part of allTechnologyWaveParts()) {
      const rows = part.child_assemblies.flatMap((child) => child.rows);
      const formulaInputs = new Set(rows.flatMap((row) => row.formula.input_parameter_ids));
      const derivedInputs = new Set((part.schema.derived_parameter_rules ?? []).flatMap((rule) =>
        rule.alternatives.flatMap((alternative) => alternative.input_parameter_ids)));
      const disconnected = part.schema.parameters.filter((parameter) =>
        !parameter.parameter_id.startsWith("unit_price_")
        && !controlParameters.has(parameter.parameter_id)
        && !part.contract.non_cost_dependencies.includes(parameter.parameter_id)
        && !formulaInputs.has(parameter.parameter_id)
        && !derivedInputs.has(parameter.parameter_id)
      ).map((parameter) => parameter.parameter_id);
      expect({ catalogId: part.contract.catalog_id, disconnected }).toEqual({
        catalogId: part.contract.catalog_id,
        disconnected: [],
      });
    }
  });

  test("reproduces the curve-frame wet-zone demonstration from editable PROJECT_INPUT values", () => {
    const catalogId = "drywall_ceiling_interior_curve_frame_wet_zone";
    const part = exactTechnologyWaveParts(catalogId);
    const rows = new Map(part.child_assemblies.flatMap((child) => child.rows).map((row) => [row.row_id.split(":row:")[1], row]));
    const values = Object.fromEntries(Object.entries(technologyWaveParameterValues(catalogId))
      .filter(([, parameter]) => typeof parameter.value === "number")
      .map(([id, parameter]) => [id, parameter.value as number]));
    const quantity = (key: string): number => {
      const row = rows.get(key);
      if (!row) throw new Error(`DEMO_ROW_MISSING:${key}`);
      return row.formula.calculate(values);
    };

    expect(quantity("curve_arc_length_control")).toBeCloseTo(12.5663706, 6);
    expect(quantity("frame_flexible_track")).toBeCloseTo(27.6460154, 6);
    expect(quantity("frame_vertical_profiles")).toBeCloseTo(17.01, 6);
    expect(quantity("frame_cross_profiles")).toBeCloseTo(15.75, 6);
    expect(quantity("frame_adjustable_hangers")).toBe(20);
    expect(quantity("frame_hanger_rods")).toBeCloseTo(12.6, 6);
    expect(quantity("frame_profile_connectors")).toBe(50);
    expect(quantity("frame_track_anchors")).toBe(54);
    expect(quantity("frame_hanger_anchors")).toBe(21);
    expect(quantity("frame_metal_screws")).toBeCloseTo(313, 6);
    expect(quantity("frame_acoustic_tape")).toBeCloseTo(26.3893783, 6);
    expect(quantity("frame_hatch_reinforcement")).toBeCloseTo(5.04, 6);
    expect(quantity("frame_mep_reinforcement")).toBeCloseTo(5.04, 6);
    expect(quantity("frame_reinforcement_connectors")).toBeCloseTo(32, 6);
    expect(quantity("frame_anchor_drilling")).toBe(74);
  });

  test("includes additional CLAD layers only when board_layer_count is greater than one", () => {
    const catalogId = "drywall_ceiling_interior_curve_clad_standard";
    const part = exactTechnologyWaveParts(catalogId);
    const baseValues = technologyWaveParameterValues(catalogId);
    const compile = (boardLayerCount: number) => compileProfessionalProjectAssemblyV4({
      project_assembly_id: `technology-wave:${catalogId}:${boardLayerCount}`,
      parent_passport_id: part.contract.professional_proof_bundle_id,
      parent_revision_id: null,
      requested_catalog_id: catalogId,
      requested_work_key: part.contract.work_key,
      scope_mode: "FULL_APPLICABLE_SCOPE",
      parameter_values: {
        ...baseValues,
        board_layer_count: { ...baseValues.board_layer_count!, value: boardLayerCount },
      },
      child_assemblies: part.child_assemblies,
    });
    const additionalKeys = [
      "clad_additional_layer_board",
      "clad_additional_layer_screws",
      "clad_additional_layer_installation",
    ];

    expect(compile(1).compiled_rows.filter((row) =>
      additionalKeys.some((key) => row.row_id.endsWith(`:row:${key}`))
    )).toEqual([]);
    const twoLayerRows = compile(2).compiled_rows.filter((row) =>
      additionalKeys.some((key) => row.row_id.endsWith(`:row:${key}`))
    );
    expect(twoLayerRows).toHaveLength(3);
    expect(twoLayerRows.every((row) => row.quantity > 0)).toBe(true);
    expect(twoLayerRows.every((row) => row.inclusion_condition.endsWith("board_layer_count>1"))).toBe(true);
  });
});
