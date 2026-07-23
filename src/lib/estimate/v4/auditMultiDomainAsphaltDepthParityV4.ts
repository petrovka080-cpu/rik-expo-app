import type { MultiDomainReferencePassportV4, ReferenceBoqRowV4 } from "./multiDomainReferencePassportsV4";

export type AsphaltDepthParityAuditV4 = {
  catalogWorkId: string;
  ready: boolean;
  parameterLevels: Readonly<Record<"P0" | "P1" | "P2", number>>;
  formulaNodeCount: number;
  boqRowCount: number;
  boqCategories: readonly ReferenceBoqRowV4["category"][];
  sourceCount: number;
  materialResourceCount: number;
  blockers: readonly string[];
  distinctionSignature: string;
};

const ALWAYS_REQUIRED: readonly ReferenceBoqRowV4["category"][] = [
  "preparation", "materials", "labor", "equipment", "quality_control", "documentation",
];

const CONTEXT_REQUIRED: Readonly<Record<string, readonly ReferenceBoqRowV4["category"][]>> = {
  building_structure_demolition: ["transport", "disposal"],
  trench_excavation: ["transport"],
  strip_foundation: ["transport"],
  monolithic_slab_concreting: ["transport"],
  masonry_wall: ["transport"],
  wall_plaster: ["transport"],
  roll_roofing: ["transport"],
  water_pipe_installation: ["services"],
  sewer_pipe_installation: ["transport"],
  power_cable_laying: ["services"],
  heating_appliance_installation: ["services"],
  asphalt_pavement: ["transport"],
};

export function auditMultiDomainAsphaltDepthParityV4(
  passport: MultiDomainReferencePassportV4,
): AsphaltDepthParityAuditV4 {
  const categories = [...new Set(passport.boq.map((row) => row.category))];
  const parameterLevels = {
    P0: passport.parameters.filter((parameter) => parameter.requiredLevel === "P0").length,
    P1: passport.parameters.filter((parameter) => parameter.requiredLevel === "P1").length,
    P2: passport.parameters.filter((parameter) => parameter.requiredLevel === "P2").length,
  };
  const requiredCategories = [...ALWAYS_REQUIRED, ...(CONTEXT_REQUIRED[passport.catalogWorkId] ?? [])];
  const materialRows = passport.boq.filter((row) => row.category === "materials");
  const aggregateMaterialRows = materialRows.filter((row) =>
    /_auxiliary_materials$/u.test(row.rowDefinitionId) ||
    /^(?:Основной материал|Вспомогательные материалы|Комплект материалов)$/iu.test(row.professionalNameRu));
  const blockers = [
    ...requiredCategories.filter((category) => !categories.includes(category)).map((category) => `MISSING_CATEGORY:${category}`),
    ...(parameterLevels.P1 === 0 ? ["MISSING_P1_PARAMETERS"] : []),
    ...(parameterLevels.P2 === 0 ? ["MISSING_P2_PARAMETERS"] : []),
    ...(passport.formulaGraph.length < 8 ? [`FORMULA_GRAPH_TOO_SHALLOW:${passport.formulaGraph.length}`] : []),
    ...(passport.boq.length < 10 ? [`BOQ_TOO_SHALLOW:${passport.boq.length}`] : []),
    ...(passport.sourceIds.length < 3 ? [`SOURCE_COVERAGE_TOO_SHALLOW:${passport.sourceIds.length}`] : []),
    ...(passport.productProjectionStatus !== "READY_FOR_ISOLATED_PROOF" ? ["PRODUCT_PROJECTION_NOT_READY"] : []),
    ...(materialRows.length < 4 ? [`MATERIAL_RESOURCE_COUNT_TOO_LOW:${materialRows.length}`] : []),
    ...aggregateMaterialRows.map((row) => `AGGREGATED_MATERIAL_ROW:${row.rowDefinitionId}`),
    ...(new Set(materialRows.map((row) => row.formulaNodeId)).size !== materialRows.length
      ? ["MATERIAL_FORMULA_OWNERSHIP_NOT_UNIQUE"] : []),
    ...(passport.asphaltDepthParity !== "READY" ? ["FULL_MATERIAL_RESOURCE_DECOMPOSITION_NOT_PROVEN"] : []),
  ];
  return {
    catalogWorkId: passport.catalogWorkId,
    ready: blockers.length === 0 && passport.asphaltDepthParity === "READY",
    parameterLevels,
    formulaNodeCount: passport.formulaGraph.length,
    boqRowCount: passport.boq.length,
    boqCategories: categories,
    sourceCount: passport.sourceIds.length,
    materialResourceCount: materialRows.length,
    blockers,
    distinctionSignature: JSON.stringify({
      strategy: passport.calculationStrategyId,
      parameters: passport.parameters.map((parameter) => parameter.parameterId),
      formulas: passport.formulaGraph.map((formula) => formula.formulaNodeId),
      rows: passport.boq.map((row) => row.rowDefinitionId),
    }),
  };
}
