import { evaluateFormulaGraph } from "../../backendPlatform/formulaGraph";
import {
  ASPHALT_TRANSVERSE_JOINT_FORMULA_ID_S2723,
  correctAsphaltFullCycleDefinitionS2723,
} from "./asphaltFullCycleFormulaCorrectionS2723";

function fixture(sourceRowId: string, index: number) {
  return {
    formula: {
      formula_id: `formula:${index}`,
      output_unit_id: sourceRowId.includes("material") ? "t" : "m",
      expression_source: "area_m2",
      ast: { version: "formula-graph-r1", kind: "parameter", id: "area_m2" },
      input_parameter_ids: ["area_m2"],
    },
    resource: {
      row_id: `row:${index}`,
      ordinal: index,
      section: "Работы и труд",
      category: "Работы и труд",
      title_ru: sourceRowId,
      row_type: "service",
      unit_id: "m",
      formula_id: `formula:${index}`,
      inclusion_ast: {},
      resource_graph: { sourceRowId: `asphalt_concrete_pavement:${sourceRowId}` },
      semantic_owner: `owner:${index}`,
      cost_owner_id: `cost:${index}`,
      procurement_eligible: false,
      source_metadata: {},
    },
  };
}

describe("S27.23 asphalt persisted-formula correction", () => {
  it("keeps layer thickness editable and refuses to invent joint geometry from area", () => {
    const rows = [
      "asphalt_layer_1_material",
      "asphalt_layer_2_material",
      "longitudinal_joints",
      "joint_sealing_material",
      "joint_sealing_application",
      "edge_treatment",
    ].map(fixture);
    const corrected = correctAsphaltFullCycleDefinitionS2723({
      formulas: rows.map((row) => row.formula),
      resources: rows.map((row) => row.resource),
    });
    const formulaFor = (sourceRowId: string) => {
      const resource = corrected.resources.find((row) =>
        String(row.resource_graph?.sourceRowId).endsWith(`:${sourceRowId}`));
      return corrected.formulas.find((row) => row.formula_id === resource?.formula_id)!;
    };

    expect(evaluateFormulaGraph(formulaFor("asphalt_layer_1_material").ast, {
      area_m2: 900,
      binder_layer_thickness_mm: 60,
      asphalt_density_t_m3: 2.35,
      asphalt_waste_percent: 2,
    })).toBe("129.438");
    expect(evaluateFormulaGraph(formulaFor("asphalt_layer_2_material").ast, {
      area_m2: 900,
      wearing_layer_thickness_mm: 50,
      asphalt_density_t_m3: 2.35,
      asphalt_waste_percent: 2,
    })).toBe("107.865");
    expect(formulaFor("joint_sealing_material").input_parameter_ids).toEqual([
      "length_m",
      "paver_working_width_m",
      "paving_shift_length_m",
      "width_m",
    ]);
    expect(formulaFor("edge_treatment").input_parameter_ids).toEqual([
      "edge_treatment_length_m",
    ]);
    expect(corrected.formulas.some((row) =>
      row.formula_id === ASPHALT_TRANSVERSE_JOINT_FORMULA_ID_S2723)).toBe(true);
    expect(corrected.resources).toHaveLength(rows.length + 1);
  });

  it("makes the inherited geotextile branch follow its explicit requirement flag", () => {
    const geotextile = fixture("geotextile_material", 1);
    const longitudinal = fixture("longitudinal_joints", 2);
    const corrected = correctAsphaltFullCycleDefinitionS2723({
      formulas: [geotextile.formula, longitudinal.formula],
      resources: [geotextile.resource, longitudinal.resource],
    });

    expect(corrected.resources.find((row) =>
      String(row.resource_graph?.sourceRowId).endsWith(":geotextile_material"))?.inclusion_ast)
      .toEqual({ kind: "parameter", id: "geotextile_required" });
  });
});
