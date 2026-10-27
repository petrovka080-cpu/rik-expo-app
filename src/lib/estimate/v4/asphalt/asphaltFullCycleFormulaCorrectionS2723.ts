import { compileFormulaGraph } from "../../backendPlatform/formulaGraph";

type Json = Record<string, any>;

const CORRECTED_EXPRESSION_BY_SOURCE_ROW_ID: Readonly<Record<string, string>> = Object.freeze({
  asphalt_layer_1_material:
    "area_m2 * binder_layer_thickness_mm / 1000 * asphalt_density_t_m3 * (1 + asphalt_waste_percent / 100)",
  asphalt_layer_2_material:
    "area_m2 * wearing_layer_thickness_mm / 1000 * asphalt_density_t_m3 * (1 + asphalt_waste_percent / 100)",
  longitudinal_joints:
    "length_m * max(0, ceil(width_m / paver_working_width_m) - 1) * 2",
  joint_sealing_material:
    "length_m * max(0, ceil(width_m / paver_working_width_m) - 1) * 2 + width_m * max(0, ceil(length_m / paving_shift_length_m) - 1) * 2",
  joint_sealing_application:
    "length_m * max(0, ceil(width_m / paver_working_width_m) - 1) * 2 + width_m * max(0, ceil(length_m / paving_shift_length_m) - 1) * 2",
  edge_treatment: "edge_treatment_length_m",
});

export const ASPHALT_TRANSVERSE_JOINT_ROW_ID_S2723 =
  "asphalt_concrete_pavement:s2723:transverse_joints" as const;
export const ASPHALT_TRANSVERSE_JOINT_FORMULA_ID_S2723 =
  "s2723:asphalt_concrete_pavement:formula:transverse_joints" as const;

function sourceRowSuffix(resource: Json): string {
  return String(resource.resource_graph?.sourceRowId ?? "").split(":").at(-1) ?? "";
}

function correctedFormula(formula: Json, expression: string): Json {
  const graph = compileFormulaGraph(expression);
  return {
    ...formula,
    expression_source: graph.source,
    ast: graph.ast,
    input_parameter_ids: graph.inputParameterIds,
  };
}

/**
 * Repairs the persisted R555 flattening boundary. User-editable asphalt layer
 * facts stay live formula inputs, while joint/edge quantities require their
 * own geometry and can no longer be scaled from pavement area.
 */
export function correctAsphaltFullCycleDefinitionS2723(input: Readonly<{
  formulas: readonly Json[];
  resources: readonly Json[];
}>): Readonly<{ formulas: readonly Json[]; resources: readonly Json[] }> {
  const expressionByFormulaId = new Map<string, string>();
  for (const resource of input.resources) {
    const expression = CORRECTED_EXPRESSION_BY_SOURCE_ROW_ID[sourceRowSuffix(resource)];
    if (expression != null) expressionByFormulaId.set(String(resource.formula_id), expression);
  }
  const formulas = input.formulas.map((formula) => {
    const expression = expressionByFormulaId.get(String(formula.formula_id));
    return expression == null ? { ...formula } : correctedFormula(formula, expression);
  });
  const longitudinal = input.resources.find((resource) =>
    sourceRowSuffix(resource) === "longitudinal_joints");
  if (!longitudinal) throw new Error("STOP_S2723_ASPHALT_LONGITUDINAL_TEMPLATE_MISSING");
  if (input.resources.some((resource) =>
    String(resource.row_id) === ASPHALT_TRANSVERSE_JOINT_ROW_ID_S2723)) {
    throw new Error("STOP_S2723_ASPHALT_TRANSVERSE_ROW_ALREADY_PRESENT");
  }
  const transverseGraph = compileFormulaGraph(
    "width_m * max(0, ceil(length_m / paving_shift_length_m) - 1) * 2",
  );
  formulas.push({
    ...input.formulas.find((formula) =>
      String(formula.formula_id) === String(longitudinal.formula_id)),
    formula_id: ASPHALT_TRANSVERSE_JOINT_FORMULA_ID_S2723,
    expression_source: transverseGraph.source,
    ast: transverseGraph.ast,
    input_parameter_ids: transverseGraph.inputParameterIds,
  });
  const maximumOrdinal = Math.max(...input.resources.map((resource) => Number(resource.ordinal)));
  const transverseResource: Json = {
    ...longitudinal,
    row_id: ASPHALT_TRANSVERSE_JOINT_ROW_ID_S2723,
    ordinal: maximumOrdinal + 1,
    title_ru: "Устройство поперечных стыков асфальтобетонного покрытия",
    formula_id: ASPHALT_TRANSVERSE_JOINT_FORMULA_ID_S2723,
    semantic_owner:
      "canonical-work:expanded:asphalt_concrete_pavement:asphalt_concrete_pavement:s2723:transverse_joints",
    cost_owner_id: "s2723-asphalt-cost:transverse-joints",
    resource_graph: {
      ...longitudinal.resource_graph,
      sourceRowId: "asphalt_concrete_pavement:transverse_joints",
      s2723Correction: "EXACT_TRANSVERSE_JOINT_GEOMETRY",
    },
    source_metadata: {
      ...longitudinal.source_metadata,
      s2723Correction: "TRANSVERSE_OPERATION_VISIBLE_UNTIL_GEOMETRY_CONFIRMED",
    },
  };
  const resources = input.resources.map((resource) => {
    const suffix = sourceRowSuffix(resource);
    return suffix === "geotextile_material" || suffix === "geotextile_installation"
      ? {
        ...resource,
        inclusion_ast: { kind: "parameter", id: "geotextile_required" },
        source_metadata: {
          ...resource.source_metadata,
          s2723Correction: "GEOTEXTILE_BRANCH_FOLLOWS_EXPLICIT_REQUIREMENT_FLAG",
        },
      }
      : { ...resource };
  });
  return Object.freeze({
    formulas: Object.freeze(formulas),
    resources: Object.freeze([...resources, transverseResource]),
  });
}
