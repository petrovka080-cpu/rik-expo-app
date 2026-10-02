import { buildAutomaticConstructionOwnerR1, type AutomaticOwnerDefinition, type AutomaticParameterSpec, type AutomaticRowSpec } from "./automaticConstructionOwnerR1";
import { ROAD_CROSSING_SLEEVES_QUANTITY_PARAMETERS_R1 } from "./roadCrossingSleevesQuantityModelR1";
import { ROAD_CROSSING_SLEEVES_SPACER_PARAMETERS_R1, ROAD_CROSSING_SLEEVES_SPACER_GEOMETRY_ROWS_R1 } from "./roadCrossingSleevesSpacerGeometryR1";
import { ROAD_CROSSING_SLEEVES_PROCUREMENT_PARAMETERS_R1, ROAD_CROSSING_SLEEVES_PROCUREMENT_ROWS_R1 } from "./roadCrossingSleevesProcurementR1";
import { ROAD_CROSSING_SLEEVES_CIVIL_PARAMETERS_R1, ROAD_CROSSING_SLEEVES_CIVIL_ROWS_R1 } from "./roadCrossingSleevesCivilGeometryR1";
import { ROAD_CROSSING_SLEEVES_JOINT_RESOURCE_PARAMETERS_R1, ROAD_CROSSING_SLEEVES_JOINT_RESOURCE_ROWS_R1 } from "./roadCrossingSleevesJointResourcesR1";
import { ROAD_CROSSING_SLEEVES_CASING_MATERIAL_PARAMETERS_R1, ROAD_CROSSING_SLEEVES_CASING_MATERIAL_ROWS_R1 } from "./roadCrossingSleevesCasingMaterialR1";
import { ROAD_CROSSING_SLEEVES_BEDDING_PARAMETERS_R1, ROAD_CROSSING_SLEEVES_BEDDING_ROWS_R1 } from "./roadCrossingSleevesBeddingMaterialR1";

/** Composition of tested components ONLY. No second evaluator, profile defaults,
 * publication or claim of complete crossing execution. Return scope alongside
 * the definition so a caller cannot mistake arithmetic integration for a full
 * construction owner, engineering acceptance or procurement approval.
 */
export const ROAD_CROSSING_SLEEVES_COMPONENTS_SCOPE_R1 = Object.freeze({
  catalogId: "canonical-work:expanded:road_crossing_sleeves",
  fullOwner: false, engineeringAccepted: false, readyForPublication: false,
  omitted: Object.freeze([
    "Method-specific civil execution resources, excavation support/reaction structures and groundwater measures",
    "Actual net pit return fill, suitability/reuse/haul/disposal of soil and non-granular/other bedding technologies",
    "Joint preparation/fit-up/NDT/repairs/coating/drying and method-specific insertion/lifting",
    "Actual logistics and certified freight mass, compatible prices and disjoint cost bases",
    "Full-owner reconciliation of explicit purchase exceptions with formula-reference balances",
    "Actual product/layout/design acceptance and governed full-owner publication/readback/UI acceptance",
  ]),
});
export const ROAD_CROSSING_SLEEVES_COMPONENT_PARAMETERS_R1: readonly AutomaticParameterSpec[] = Object.freeze([
  ...ROAD_CROSSING_SLEEVES_QUANTITY_PARAMETERS_R1, ...ROAD_CROSSING_SLEEVES_SPACER_PARAMETERS_R1,
  ...ROAD_CROSSING_SLEEVES_CASING_MATERIAL_PARAMETERS_R1, ...ROAD_CROSSING_SLEEVES_PROCUREMENT_PARAMETERS_R1,
  ...ROAD_CROSSING_SLEEVES_CIVIL_PARAMETERS_R1, ...ROAD_CROSSING_SLEEVES_JOINT_RESOURCE_PARAMETERS_R1,
  ...ROAD_CROSSING_SLEEVES_BEDDING_PARAMETERS_R1,
]);
export const ROAD_CROSSING_SLEEVES_COMPONENT_ROWS_R1: readonly AutomaticRowSpec[] = Object.freeze([
  ...ROAD_CROSSING_SLEEVES_CASING_MATERIAL_ROWS_R1, ...ROAD_CROSSING_SLEEVES_SPACER_GEOMETRY_ROWS_R1,
  ...ROAD_CROSSING_SLEEVES_PROCUREMENT_ROWS_R1, ...ROAD_CROSSING_SLEEVES_CIVIL_ROWS_R1, ...ROAD_CROSSING_SLEEVES_JOINT_RESOURCE_ROWS_R1,
  ...ROAD_CROSSING_SLEEVES_BEDDING_ROWS_R1,
]);
function assertUnique(ids: readonly string[], kind: string): void {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) throw new Error(`RCS_COMPONENT_DUPLICATE_${kind}:${id}`);
    seen.add(id);
  }
}
export function buildRoadCrossingSleevesComponentsR1(
  sourceMetadata: Parameters<typeof buildAutomaticConstructionOwnerR1>[0]["sourceMetadata"],
): Readonly<{ scope: typeof ROAD_CROSSING_SLEEVES_COMPONENTS_SCOPE_R1; definition: AutomaticOwnerDefinition }> {
  assertUnique(ROAD_CROSSING_SLEEVES_COMPONENT_PARAMETERS_R1.map(parameter => parameter.id), "PARAMETER");
  assertUnique(ROAD_CROSSING_SLEEVES_COMPONENT_ROWS_R1.map(row => row.rowId), "ROW");
  assertUnique(ROAD_CROSSING_SLEEVES_COMPONENT_ROWS_R1.map(row => row.formulaId), "FORMULA");
  const definition = buildAutomaticConstructionOwnerR1({
    contract: "rik-expo-app.s27-28.road-crossing-sleeves-components.v1", semanticOwner: "road_crossing_sleeves_components",
    sourceId: "road-crossing-sleeves-automatic-s27-28", normId: "actual-selected-project-facts-and-source-bounded-components",
    sourceMetadata, applicabilityRu: "Компоненты одного футляра: количества, выбранные материалы, геометрия и MMA стыки. Не полная строительная работа или приёмка проекта.",
    ordinary: ROAD_CROSSING_SLEEVES_COMPONENT_PARAMETERS_R1.filter(parameter => parameter.kind === "ordinary"),
    profile: [], conditional: ROAD_CROSSING_SLEEVES_COMPONENT_PARAMETERS_R1.filter(parameter => parameter.kind === "conditional"),
    rows: ROAD_CROSSING_SLEEVES_COMPONENT_ROWS_R1, excludedUnownedAssumptions: ROAD_CROSSING_SLEEVES_COMPONENTS_SCOPE_R1.omitted,
  });
  return Object.freeze({ scope: ROAD_CROSSING_SLEEVES_COMPONENTS_SCOPE_R1, definition });
}
