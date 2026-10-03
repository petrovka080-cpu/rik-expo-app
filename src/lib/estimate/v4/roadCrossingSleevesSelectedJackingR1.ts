import { buildAutomaticConstructionOwnerR1, type AutomaticParameterSpec } from "./automaticConstructionOwnerR1";
import { ROAD_CROSSING_SLEEVES_COMPONENT_PARAMETERS_R1, ROAD_CROSSING_SLEEVES_COMPONENT_ROWS_R1,
  ROAD_CROSSING_SLEEVES_STAGE_MATRIX_R1, ROAD_CROSSING_SLEEVES_CASING_PREP_MATERIAL_MODES_R1,
  ROAD_CROSSING_SLEEVES_COATING_MODES_R1, ROAD_CROSSING_SLEEVES_CARRIER_CONNECTION_MODES_R1,
  ROAD_CROSSING_SLEEVES_WATER_CONTROL_MODES_R1, ROAD_CROSSING_SLEEVES_WATER_RECEIVING_MODES_R1,
  ROAD_CROSSING_SLEEVES_PREPARATION_MODES_R1, ROAD_CROSSING_SLEEVES_INSPECTION_MODES_R1,
  ROAD_CROSSING_SLEEVES_SOIL_MODES_R1 } from "./roadCrossingSleevesComponentsR1";
import { ROAD_CROSSING_SLEEVES_CIVIL_METHODS_R1 as methods } from "./roadCrossingSleevesCivilGeometryR1";
import { ROAD_CROSSING_SLEEVES_CARRIER_SUPPLY_MODES_R1 } from "./roadCrossingSleevesCasingMaterialR1";
import { ROAD_CROSSING_SLEEVES_SHORING_MODES_R1 } from "./roadCrossingSleevesShoringR1";
import { ROAD_CROSSING_SLEEVES_SHORING_GAP_MODES_R1 } from "./roadCrossingSleevesShoringGapFillR1";
import { ROAD_CROSSING_SLEEVES_REACTION_MODES_R1 } from "./roadCrossingSleevesReactionR1";
import { ROAD_CROSSING_SLEEVES_SERVICE_WASTE_MODES_R1 } from "./roadCrossingSleevesServiceWasteR1";
import { ROAD_CROSSING_SLEEVES_PIT_FILL_MODES_R1, ROAD_CROSSING_SLEEVES_TRENCH_FILL_MODES_R1 } from "./roadCrossingSleevesPitFillMaterialR1";
import { ROAD_CROSSING_SLEEVES_INTERNAL_FILL_MODES_R1 } from "./roadCrossingSleevesInternalFillR1";
import { ROAD_CROSSING_SLEEVES_WATER_TREATMENT_MODES_R1, ROAD_CROSSING_SLEEVES_WATER_TREATMENT_WASTE_MODES_R1 } from "./roadCrossingSleevesWaterTreatmentR1";
import { ROAD_CROSSING_SLEEVES_EQUIPMENT_MOBILIZATION_MODES_R1 } from "./roadCrossingSleevesEquipmentMobilizationR1";
import { ROAD_CROSSING_SLEEVES_RESTORATION_CONSTRUCTIONS_R1, ROAD_CROSSING_SLEEVES_EXTERNAL_FILL_GEOMETRIES_R1 } from "./roadCrossingSleevesSelectedCompletionR1";
import { ROAD_CROSSING_SLEEVES_SELECTED_JACKING_CATALOG_ID_R1 } from "./roadCrossingSleevesSelectedJackingPromptR1";
import { resolveInclusionGraph } from "../backendPlatform/inclusionGraph";

/** Exact declared unsupported branches, not a text/ID heuristic. The broad
 * component owner retains them; this finite full definition offers only the
 * resource programmes actually implemented by the same common compiler. */
const unsupported = new Set<string>([
  methods.openCut, ROAD_CROSSING_SLEEVES_CARRIER_SUPPLY_MODES_R1.other,
  ROAD_CROSSING_SLEEVES_SHORING_MODES_R1.other, ROAD_CROSSING_SLEEVES_SHORING_GAP_MODES_R1.other,
  ROAD_CROSSING_SLEEVES_REACTION_MODES_R1.other, ROAD_CROSSING_SLEEVES_SERVICE_WASTE_MODES_R1.other,
  ROAD_CROSSING_SLEEVES_PIT_FILL_MODES_R1.other, ROAD_CROSSING_SLEEVES_TRENCH_FILL_MODES_R1.other,
  ROAD_CROSSING_SLEEVES_INTERNAL_FILL_MODES_R1.other, ROAD_CROSSING_SLEEVES_CASING_PREP_MATERIAL_MODES_R1.other,
  ROAD_CROSSING_SLEEVES_COATING_MODES_R1.other, ROAD_CROSSING_SLEEVES_CARRIER_CONNECTION_MODES_R1.other,
  ROAD_CROSSING_SLEEVES_WATER_CONTROL_MODES_R1.other, ROAD_CROSSING_SLEEVES_WATER_RECEIVING_MODES_R1.other,
  ROAD_CROSSING_SLEEVES_PREPARATION_MODES_R1.other, ROAD_CROSSING_SLEEVES_INSPECTION_MODES_R1.other,
  ROAD_CROSSING_SLEEVES_SOIL_MODES_R1.other, ROAD_CROSSING_SLEEVES_WATER_TREATMENT_MODES_R1.other,
  ROAD_CROSSING_SLEEVES_WATER_TREATMENT_WASTE_MODES_R1.other, ROAD_CROSSING_SLEEVES_EQUIPMENT_MOBILIZATION_MODES_R1.other,
  ROAD_CROSSING_SLEEVES_RESTORATION_CONSTRUCTIONS_R1.existingOwnerRequired,
  ROAD_CROSSING_SLEEVES_EXTERNAL_FILL_GEOMETRIES_R1.existingOwnerRequired,
]);
const selectedMethod = Object.freeze({ rcs_civil_installation_method: methods.pipeJacking });
/** A false branch is outside this immutable chosen technology. Unknown source
 * facts remain declared and visible. The shared graph decides both cases. */
export const ROAD_CROSSING_SLEEVES_SELECTED_JACKING_ROWS_R1 = Object.freeze(ROAD_CROSSING_SLEEVES_COMPONENT_ROWS_R1
  .filter(row => !row.inclusion || resolveInclusionGraph(row.inclusion, selectedMethod).value !== false));
export const ROAD_CROSSING_SLEEVES_SELECTED_JACKING_PARAMETERS_R1: readonly AutomaticParameterSpec[] = Object.freeze(
  ROAD_CROSSING_SLEEVES_COMPONENT_PARAMETERS_R1.filter(parameter => !parameter.requiredWhen || resolveInclusionGraph(
    "kind" in parameter.requiredWhen ? parameter.requiredWhen : { kind: "equals", ...parameter.requiredWhen }, selectedMethod).value !== false)
    .map(parameter => parameter.values
    ? { ...parameter, values: parameter.values.filter(value => !unsupported.has(value)) } : parameter));
export const ROAD_CROSSING_SLEEVES_SELECTED_JACKING_SCOPE_R1 = Object.freeze({
  catalogId: ROAD_CROSSING_SLEEVES_SELECTED_JACKING_CATALOG_ID_R1,
  fullOwner: true, engineeringAccepted: false, readyForPublication: true,
  method: methods.pipeJacking,
  boundaryRu: "Один прямой равномерный футляр, подтверждённые прямоугольные котлованы, поддержанные отдельные полные ресурсные программы; восстановление только одним однородным зернистым слоем, наружное заполнение только полным равномерным кольцом. Проектные факты и допуски остаются локальными потребностями до подтверждения.",
  unsupportedValues: Object.freeze([...unsupported]),
});
export function buildRoadCrossingSleevesSelectedJackingR1(
  sourceMetadata: Parameters<typeof buildAutomaticConstructionOwnerR1>[0]["sourceMetadata"],
) {
  if (ROAD_CROSSING_SLEEVES_SELECTED_JACKING_PARAMETERS_R1.some(p => p.values?.length === 0)) throw new Error("RCS_SELECTED_EMPTY_SUPPORTED_BRANCH");
  const owned = new Set(ROAD_CROSSING_SLEEVES_STAGE_MATRIX_R1.flatMap(stage => stage.ownResourceIds));
  if (ROAD_CROSSING_SLEEVES_SELECTED_JACKING_ROWS_R1.some(row => !owned.has(row.rowId))) throw new Error("RCS_SELECTED_STAGE_RESOURCE_UNOWNED");
  const definition = buildAutomaticConstructionOwnerR1({
    contract: "rik-expo-app.s27-31.road-crossing-sleeves-selected-jacking.v1", semanticOwner: "road_crossing_sleeves_selected_jacking",
    sourceId: "road-crossing-sleeves-selected-jacking-s27-31", normId: "actual-selected-project-facts-no-engineering-defaults",
    sourceMetadata, applicabilityRu: ROAD_CROSSING_SLEEVES_SELECTED_JACKING_SCOPE_R1.boundaryRu,
    ordinary: ROAD_CROSSING_SLEEVES_SELECTED_JACKING_PARAMETERS_R1.filter(p => p.kind === "ordinary"), profile: [],
    conditional: ROAD_CROSSING_SLEEVES_SELECTED_JACKING_PARAMETERS_R1.filter(p => p.kind === "conditional"),
    rows: ROAD_CROSSING_SLEEVES_SELECTED_JACKING_ROWS_R1, excludedUnownedAssumptions: [], deferMissingProjectFactsToRows: true,
    unconditionalProjectFactParameterIds: ["rcs_steel_density_kg_m3", "rcs_raci_selected_elements_per_ring"],
  });
  const selectedRowIds = new Set(ROAD_CROSSING_SLEEVES_SELECTED_JACKING_ROWS_R1.map(row => row.rowId));
  return Object.freeze({ scope: ROAD_CROSSING_SLEEVES_SELECTED_JACKING_SCOPE_R1, definition,
    stageMatrix: Object.freeze(ROAD_CROSSING_SLEEVES_STAGE_MATRIX_R1.map(({ remaining: _remaining, ...stage }) => ({ ...stage,
      ownResourceIds: Object.freeze(stage.ownResourceIds.filter(rowId => selectedRowIds.has(rowId))) }))) });
}
/** Must be called by the governed successor before its generic FULL passport.
 * Technical coverage and engineering/project admission are distinct facts. */
export function assertRoadCrossingSleevesSelectedJackingPublicationR1(component: ReturnType<typeof buildRoadCrossingSleevesSelectedJackingR1>): void {
  if (component.scope.fullOwner !== true || component.scope.readyForPublication !== true || component.scope.method !== methods.pipeJacking
    || component.definition.parameters.some(p => (p.constraints_json?.values as string[] | undefined)?.some(value => unsupported.has(value)))) {
    throw new Error("RCS_SELECTED_PUBLICATION_UNSUPPORTED_SCOPE");
  }
  const expectedRows = new Map(ROAD_CROSSING_SLEEVES_SELECTED_JACKING_ROWS_R1.map(row => [row.rowId, row]));
  const resourceIds = new Set(component.definition.resources.map(row => row.row_id));
  const formulaIds = new Set(component.definition.formulas.map(formula => formula.formula_id));
  const parameterIds = new Set(component.definition.parameters.map(parameter => parameter.parameter_id));
  const expectedParameterIds = new Set([...ROAD_CROSSING_SLEEVES_SELECTED_JACKING_PARAMETERS_R1.map(p => p.id),
    ...ROAD_CROSSING_SLEEVES_SELECTED_JACKING_ROWS_R1.flatMap(row => row.effectiveQuantityOutput ? [row.effectiveQuantityOutput.parameterId] : [])]);
  const stageIds = component.stageMatrix.flatMap(stage => stage.ownResourceIds);
  if (component.definition.resources.length !== expectedRows.size || resourceIds.size !== expectedRows.size
    || [...expectedRows.keys()].some(rowId => !resourceIds.has(rowId))
    || component.definition.formulas.length !== expectedRows.size || formulaIds.size !== expectedRows.size
    || component.definition.parameters.length !== expectedParameterIds.size || parameterIds.size !== expectedParameterIds.size
    || [...expectedParameterIds].some(id => !parameterIds.has(id))
    || stageIds.length !== expectedRows.size || new Set(stageIds).size !== expectedRows.size
    || stageIds.some(rowId => !resourceIds.has(rowId))) {
    throw new Error("RCS_SELECTED_PUBLICATION_INCOMPLETE_RESOURCE_COVERAGE");
  }
  for (const resource of component.definition.resources) {
    const expected = expectedRows.get(resource.row_id)!;
    const graph = resource.resource_graph as Record<string, unknown>;
    if (graph.formulaId !== expected.formulaId || graph.normalizedUom !== expected.unitId
      || !formulaIds.has(expected.formulaId)
      || (Array.isArray(graph.inputParameterIds) && graph.inputParameterIds.some(id => !parameterIds.has(String(id))))) {
      throw new Error(`RCS_SELECTED_PUBLICATION_RESOURCE_BINDING:${resource.row_id}`);
    }
  }
  const expectedFormulas = new Map(ROAD_CROSSING_SLEEVES_SELECTED_JACKING_ROWS_R1.map(row => [row.formulaId, row]));
  for (const formula of component.definition.formulas) {
    const expected = expectedFormulas.get(formula.formula_id);
    if (!expected || formula.expression_source !== expected.expression || formula.output_unit_id !== expected.unitId
      || formula.input_parameter_ids?.some(id => !parameterIds.has(id))) {
      throw new Error(`RCS_SELECTED_PUBLICATION_FORMULA_BINDING:${formula.formula_id}`);
    }
  }
}
