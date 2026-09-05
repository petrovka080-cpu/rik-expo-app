import {
  buildProfessionalWorkPassport,
  clearProfessionalWorkPassportBuildCaches,
} from "../../src/lib/estimate/buildProfessionalWorkPassport";
import {
  bindCanonicalFormulaSource,
  canonicalFixedQuantityStatedBySource,
} from "../../src/lib/estimate/backendPlatform/canonicalFormulaSourceBinding";
import {
  compileFormulaGraph,
  evaluateFormulaGraph,
} from "../../src/lib/estimate/backendPlatform/formulaGraph";

const CASES = [
  ["aeration_tanks", ["capacity_m3_day"]],
  ["chlorination_station", ["capacity_m3_day"]],
  ["aluminum_window_wall", ["glazing_area_m2", "floors"]],
  ["ventilated_facade", ["facade_area_m2", "floors"]],
  ["battens_counterbattens", ["roof_area_m2", "insulation_mm", "roof_windows_count"]],
  ["battery_energy_storage", ["capacity_mw"]],
  ["boiler_house", ["capacity_mw", "boiler_count"]],
  ["blasting_preparation", ["volume_m3"]],
  ["steel_tank", ["volume_m3"]],
  ["pipe_rack", ["length_m"]],
  ["data_center_mep", ["length_m", "network_count"]],
  ["distribution_substation", ["voltage_kv"]],
  ["transformer_substation", ["voltage_kv"]],
  ["solar_power_plant", ["capacity_mw"]],
] as const;

function passportFor(familyId: string) {
  clearProfessionalWorkPassportBuildCaches();
  const passport = buildProfessionalWorkPassport(
    `${familyId}_preliminary_boq_expanded_complex_v1`,
  );
  if (!passport) throw new Error(`R4_A6_PASSPORT_MISSING:${familyId}`);
  return passport;
}

describe("R4-A6 expanded formula dependency owners", () => {
  it.each(CASES)("binds every %s formula to its semantic inputs or an explicit fixed quantity", (
    familyId,
    expectedMeasureIds,
  ) => {
    const passport = passportFor(familyId);
    const parameters = [...passport.parameterSchema.required, ...passport.parameterSchema.optional];
    const parameterIds = new Set(parameters.map((parameter) => parameter.key));
    const derivedFormulas = new Map<string, string>();
    const baseline: Record<string, number> = {};
    for (const step of passport.formulas.formulaSteps) {
      const assignment = /^\s*([A-Za-z_][A-Za-z0-9_.]*)\s*=\s*(.+?)\s*$/u.exec(step);
      if (assignment) derivedFormulas.set(assignment[1]!, assignment[2]!);
    }
    for (const row of passport.boqRecipe.allRows) {
      derivedFormulas.set(row.rowId, row.quantityFormula);
      for (const [key, value] of Object.entries(row.formulaContext ?? {})) {
        if (typeof value === "number" && Number.isFinite(value)) baseline[key] = value;
      }
    }
    expect([...parameterIds].filter((id) => expectedMeasureIds.includes(id as never))).toEqual(
      expect.arrayContaining([...expectedMeasureIds]),
    );
    for (const measureId of expectedMeasureIds) {
      const parameter = parameters.find((candidate) => candidate.key === measureId);
      expect(parameter?.required).toBe(true);
      expect(parameter?.unit).toBeTruthy();
      expect(baseline[measureId]).toBeGreaterThan(0);
    }

    for (const row of passport.boqRecipe.allRows) {
      const expression = bindCanonicalFormulaSource({
        source: row.quantityFormula,
        parameterIds,
        derivedFormulas,
        resolving: new Set([row.rowId]),
      });
      const compiled = compileFormulaGraph(expression);
      const fixed = canonicalFixedQuantityStatedBySource(row.quantityFormula) != null;
      expect(compiled.inputParameterIds.length === 0).toBe(fixed);
      expect(Number.isFinite(Number(evaluateFormulaGraph(compiled.ast, baseline)))).toBe(true);
    }
  });

  it("encodes the substation voltage threshold as a real sensitivity dependency", () => {
    const passport = passportFor("distribution_substation");
    const formulas = new Map(passport.boqRecipe.allRows.map((row) => [row.rowId, row.quantityFormula]));
    const evaluate = (rowId: string, voltageKv: number) => Number(evaluateFormulaGraph(
      compileFormulaGraph(formulas.get(rowId)!).ast,
      { voltage_kv: voltageKv },
    ));

    expect([evaluate("transformer_foundation_m3", 10), evaluate("transformer_foundation_m3", 110)])
      .toEqual([12, 80]);
    expect([evaluate("cable_trench_m", 10), evaluate("cable_trench_m", 110)])
      .toEqual([60, 300]);
    expect([evaluate("crane_shifts", 10), evaluate("crane_shifts", 110)])
      .toEqual([1, 6]);
  });
});
