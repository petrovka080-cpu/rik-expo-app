import {
  buildDrywallIndividualProfessionalEstimatePassportV5,
  drywallMaximumScopeLinesV5,
} from "../../src/lib/estimate/v4/domains/interiorFinishesComplete";
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

    expect(parts).toHaveLength(55);
    expect(rowCounts.reduce((sum, item) => sum + item.count, 0)).toBe(5_037);
    for (const item of rowCounts) {
      const [minimum, maximum] = NATURAL_ROW_RANGES[item.operation];
      expect(item.count).toBeGreaterThanOrEqual(minimum);
      expect(item.count).toBeLessThanOrEqual(maximum);
    }
    expect(Math.min(...rowCounts.map((item) => item.count))).toBe(74);
    expect(Math.max(...rowCounts.map((item) => item.count))).toBe(114);
  });

  test("creates an individual V5 passport with a disposition for every candidate", () => {
    const passports = allTechnologyWaveParts().map(buildDrywallIndividualProfessionalEstimatePassportV5);
    expect(passports).toHaveLength(55);
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
        passport.variantType as "standard" | "large_area" | "small_area" | "technical_room" | "wet_zone",
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
      for (const parameter of part.schema.parameters) {
        if (parameter.parameter_id.startsWith("unit_price_") || controlParameters.has(parameter.parameter_id) || part.contract.non_cost_dependencies.includes(parameter.parameter_id)) continue;
        expect(formulaInputs.has(parameter.parameter_id) || derivedInputs.has(parameter.parameter_id)).toBe(true);
      }
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
});
