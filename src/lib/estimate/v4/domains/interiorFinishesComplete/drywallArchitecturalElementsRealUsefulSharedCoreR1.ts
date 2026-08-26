import {
  compileCanonicalEstimateCore,
  type CanonicalEstimateCompileCoreResult,
  type CanonicalEstimateFormulaDefinition,
  type CanonicalEstimateParameterDefinition,
  type CanonicalEstimateResourceDefinition,
} from "../../../backendPlatform/canonicalEstimateCompileCore";
import { canonicalEstimateStableJson } from "../../../backendPlatform/canonicalEstimateDeterminism";
import { canonicalEstimateSha256HexText } from "../../../backendPlatform/canonicalEstimateSha256";
import { compileFormulaGraph } from "../../../backendPlatform/formulaGraph";
import {
  BATCH002_REAL_USEFUL_SHADOW_COMPILER_R1_CONTRACT,
  compileBatch002RealUsefulShadowR1,
  type Batch002MaterialRuntimeInputR1,
  type Batch002RealUsefulShadowCompileInputR1,
  type Batch002RealUsefulShadowCompileResultR1,
} from "./drywallArchitecturalElementsRealUsefulShadowCompilerR1";

export const BATCH002_REAL_USEFUL_SHARED_CORE_R1_CONTRACT =
  "real-useful-estimates.batch002-shared-core-shadow-r1.v1" as const;

export type Batch002RealUsefulSharedCoreResultR1 =
  | { status: "NEEDS_REQUIRED_INPUTS"; shadow: Extract<Batch002RealUsefulShadowCompileResultR1, { status: "NEEDS_REQUIRED_INPUTS" }>; core: null; parity: null }
  | {
    status: "RED_DRAFT_REVIEW_REQUIRED" | "RED_SHARED_CORE_PARITY_FAILED";
    shadow: Extract<Batch002RealUsefulShadowCompileResultR1, { status: "RED_DRAFT_REVIEW_REQUIRED" }>;
    core: CanonicalEstimateCompileCoreResult;
    parity: { rowCountEqual: boolean; exactTitlesEqual: boolean; quantitiesEqual: boolean; procurementFlagsEqual: boolean; errors: readonly string[] };
  };

type ParameterState = {
  definitions: CanonicalEstimateParameterDefinition[];
  submitted: Record<string, unknown>;
  ids: Set<string>;
};

const hashJson = (value: unknown): string => canonicalEstimateSha256HexText(canonicalEstimateStableJson(value));

function addParameter(state: ParameterState, input: {
  id: string;
  type: "decimal" | "text";
  value: string | number;
  constraints?: Record<string, unknown>;
  truth?: Record<string, unknown>;
}): void {
  if (state.ids.has(input.id)) {
    if (state.submitted[input.id] !== input.value) throw new Error(`BATCH002_SHARED_CORE_PARAMETER_VALUE_DRIFT:${input.id}`);
    return;
  }
  state.ids.add(input.id);
  state.definitions.push({
    parameter_id: input.id, value_type: input.type, required: true, default_value: null,
    constraints_json: input.constraints ?? (input.type === "decimal" ? { min: 0 } : { maxLength: 100_000 }),
    truth_metadata: input.truth ?? null,
  });
  state.submitted[input.id] = input.value;
}

function addFormula(formulas: Map<string, CanonicalEstimateFormulaDefinition>, id: string, source: string): void {
  if (formulas.has(id)) return;
  const compiled = compileFormulaGraph(source);
  formulas.set(id, { formula_id: id, ast: compiled.ast, input_parameter_ids: compiled.inputParameterIds, ast_sha256: hashJson(compiled.ast) });
}

function includedMaterial(input: Batch002RealUsefulShadowCompileInputR1, familyId: string): Batch002MaterialRuntimeInputR1 {
  const required = input.requiredMaterials[familyId];
  if (required) return required;
  const conditional = input.conditionalMaterials[familyId];
  if (conditional?.status === "INCLUDED") return conditional.material;
  throw new Error(`BATCH002_SHARED_CORE_INCLUDED_MATERIAL_INPUT_MISSING:${familyId}`);
}

function section(category: string): string {
  if (category === "material") return "Материалы";
  if (category === "construction_work") return "Строительные работы";
  if (category === "machine_equipment") return "Машины и оборудование";
  return "Доставка и вывоз";
}

export async function compileBatch002RealUsefulShadowThroughSharedCoreR1(
  input: Batch002RealUsefulShadowCompileInputR1,
): Promise<Batch002RealUsefulSharedCoreResultR1> {
  const shadow = compileBatch002RealUsefulShadowR1(input);
  if (shadow.status === "NEEDS_REQUIRED_INPUTS") return { status: "NEEDS_REQUIRED_INPUTS", shadow, core: null, parity: null };
  const parameters: ParameterState = { definitions: [], submitted: {}, ids: new Set() };
  const formulas = new Map<string, CanonicalEstimateFormulaDefinition>();
  const resources: CanonicalEstimateResourceDefinition[] = [];
  let ordinal = 0;
  addParameter(parameters, { id: "result_area_m2", type: "decimal", value: input.resultAreaM2, constraints: { min: 0.000001, max: 10_000_000 }, truth: { source: "project_or_measurement", hiddenDefault: false } });
  addParameter(parameters, { id: "source_identity", type: "text", value: input.sourceIdentity, truth: { shadowOnly: true, productionAdmissionAttached: false } });
  addParameter(parameters, { id: "system_passport_reference", type: "text", value: input.systemPassportReference, truth: { source: "project_or_manufacturer_system_passport" } });
  addParameter(parameters, {
    id: "shadow_decisions_json", type: "text",
    value: canonicalEstimateStableJson({ conditionalMaterials: input.conditionalMaterials, access: input.access, delivery: input.delivery, waste: input.waste }),
    truth: { role: "conditional_exclusion_and_logistics_evidence", shadowOnly: true },
  });

  const pushResource = (inputResource: {
    row: { rowId: string; titleRu: string; unitId: string; formulaId: string; costOwnerId: string; normSourceIds: readonly string[] };
    category: string;
    resourceGraph: Record<string, unknown>;
    sourceMetadata: Record<string, unknown>;
    procurement: boolean;
  }): void => {
    const definition = {
      id: inputResource.row.rowId, row_id: inputResource.row.rowId, ordinal: ordinal++,
      section: section(inputResource.category), category: inputResource.category,
      title_ru: inputResource.row.titleRu, unit_id: inputResource.row.unitId,
      formula_id: inputResource.row.formulaId, inclusion_ast: { kind: "literal", value: true },
      resource_graph: inputResource.resourceGraph, procurement_eligible: inputResource.procurement,
      cost_owner_id: inputResource.row.costOwnerId, source_metadata: inputResource.sourceMetadata,
      row_sha256: "",
    } satisfies CanonicalEstimateResourceDefinition;
    definition.row_sha256 = hashJson({ ...definition, row_sha256: undefined });
    resources.push(definition);
  };

  for (const row of shadow.projection.materialRows) {
    const material = includedMaterial(input, row.familyId);
    const titleId = `exact_spec_${row.familyId}`;
    const technicalId = `technical_specification_${row.familyId}`;
    const normId = `norm_${row.familyId}`;
    const lossId = `loss_${row.familyId}_percent`;
    const packageId = `package_size_${row.familyId}`;
    addParameter(parameters, { id: titleId, type: "text", value: material.exactTitleRu, truth: { role: "exact_public_title", familyId: row.familyId } });
    addParameter(parameters, { id: technicalId, type: "text", value: material.specificationRu, truth: { role: "technical_specification", familyId: row.familyId } });
    addParameter(parameters, { id: normId, type: "decimal", value: material.normPerM2, constraints: { min: 0.000000001, max: 1_000_000_000 }, truth: { role: "net_norm", familyId: row.familyId } });
    addParameter(parameters, { id: lossId, type: "decimal", value: material.lossPercent, constraints: { min: 0, max: 100 }, truth: { role: "explicit_loss_percent", familyId: row.familyId } });
    addParameter(parameters, { id: packageId, type: "decimal", value: material.packageSize, constraints: { min: 0.000000001, max: 1_000_000_000 }, truth: { role: "package_size", packageTitleRu: material.packageTitleRu } });
    addFormula(formulas, row.formulaId, `result_area_m2 * ${normId} * (1 + ${lossId} / 100)`);
    pushResource({
      row, category: "material", procurement: true,
      resourceGraph: {
        contract: BATCH002_REAL_USEFUL_SHARED_CORE_R1_CONTRACT,
        technologyPassportSha256: shadow.projection.technologyPassportSha256,
        familyId: row.familyId, stageId: row.stageId, titleSpecificationParameterId: titleId,
        titleSpecificationMode: "REPLACE", technicalSpecificationParameterId: technicalId,
        netQuantity: row.netQuantity, grossQuantity: row.grossQuantity, lossPercent: row.lossPercent,
        package: row.package, procurementRuleId: row.procurementRuleId,
      },
      sourceMetadata: { normSourceIds: row.normSourceIds, purposeRu: row.purposeRu, shadowOnly: true },
    });
  }
  for (const row of shadow.projection.constructionOperationRows) {
    addFormula(formulas, row.formulaId, "result_area_m2");
    pushResource({ row, category: "construction_work", procurement: false,
      resourceGraph: { contract: BATCH002_REAL_USEFUL_SHARED_CORE_R1_CONTRACT, technologyPassportSha256: shadow.projection.technologyPassportSha256, operationId: row.operationId, stageId: row.stageId },
      sourceMetadata: { normSourceIds: row.normSourceIds, purposeRu: row.purposeRu, shadowOnly: true } });
  }
  if (shadow.projection.equipmentRows.length > 0) {
    if (input.access.kind === "IN_WORK_RATE") throw new Error("BATCH002_SHARED_CORE_ACCESS_PRODUCTIVITY_MISSING");
    addParameter(parameters, { id: "access_productivity_m2_per_shift", type: "decimal", value: input.access.productivityM2PerShift, constraints: { min: 0.000001, max: 1_000_000 }, truth: { role: "equipment_productivity" } });
    addFormula(formulas, "equipment-shifts:access", "ceil(result_area_m2 / access_productivity_m2_per_shift)");
  }
  for (const row of shadow.projection.equipmentRows) pushResource({
    row, category: "machine_equipment", procurement: true,
    resourceGraph: { contract: BATCH002_REAL_USEFUL_SHARED_CORE_R1_CONTRACT, technologyPassportSha256: shadow.projection.technologyPassportSha256, equipmentRuleId: row.equipmentRuleId, equipmentClassRu: row.equipmentClassRu, keyCharacteristicsRu: row.keyCharacteristicsRu, operationId: row.operationId, inclusionCondition: row.inclusionCondition },
    sourceMetadata: { normSourceIds: row.normSourceIds, shadowOnly: true },
  });
  for (const row of shadow.projection.deliveryRows) {
    if (input.delivery?.kind !== "SEPARATE_5T_TRUCK") throw new Error("BATCH002_SHARED_CORE_DELIVERY_INPUT_MISSING");
    addParameter(parameters, { id: "delivery_mass_t", type: "decimal", value: input.delivery.cargoMassT, constraints: { min: 0.000001, max: 1_000_000 } });
    addParameter(parameters, { id: "delivery_distance_km", type: "decimal", value: input.delivery.distanceKm, constraints: { min: 0.000001, max: 100_000 } });
    addFormula(formulas, row.formulaId, "delivery_mass_t * delivery_distance_km");
    pushResource({ row, category: "delivery", procurement: true,
      resourceGraph: { contract: BATCH002_REAL_USEFUL_SHARED_CORE_R1_CONTRACT, technologyPassportSha256: shadow.projection.technologyPassportSha256, deliveryFlowId: row.deliveryFlowId, cargoFamilyIds: row.cargoFamilyIds, vehicleTypeRu: row.vehicleTypeRu, capacityRequirementRu: row.capacityRequirementRu, deduplicationKey: row.deduplicationKey },
      sourceMetadata: { normSourceIds: row.normSourceIds, shadowOnly: true } });
  }
  for (const row of shadow.projection.wasteRows) {
    if (input.waste?.kind !== "SEPARATE_5T_TRUCK") throw new Error("BATCH002_SHARED_CORE_WASTE_INPUT_MISSING");
    addParameter(parameters, { id: "waste_mass_t", type: "decimal", value: input.waste.wasteMassT, constraints: { min: 0.000001, max: 1_000_000 } });
    addParameter(parameters, { id: "waste_distance_km", type: "decimal", value: input.waste.distanceKm, constraints: { min: 0.000001, max: 100_000 } });
    addFormula(formulas, row.formulaId, "waste_mass_t * waste_distance_km");
    pushResource({ row, category: "waste", procurement: true,
      resourceGraph: { contract: BATCH002_REAL_USEFUL_SHARED_CORE_R1_CONTRACT, technologyPassportSha256: shadow.projection.technologyPassportSha256, wasteFlowId: row.wasteFlowId, sourceMaterialFamilyIds: row.sourceMaterialFamilyIds, vehicleTypeRu: row.vehicleTypeRu, deduplicationKey: row.deduplicationKey },
      sourceMetadata: { normSourceIds: row.normSourceIds, shadowOnly: true } });
  }
  const core = await compileCanonicalEstimateCore({
    operation: "compile", compilerVersion: BATCH002_REAL_USEFUL_SHARED_CORE_R1_CONTRACT,
    catalogId: input.catalogId, parameterDefinitions: parameters.definitions,
    formulaDefinitions: [...formulas.values()], resourceDefinitions: resources,
    submittedParameters: parameters.submitted, confirmedParameters: {}, currencyCode: "KGS",
    priceSnapshotIds: [], priceItems: [], maximumResourceRows: 200, hashJson,
  });
  const shadowRows = [
    ...shadow.projection.materialRows, ...shadow.projection.constructionOperationRows,
    ...shadow.projection.equipmentRows, ...shadow.projection.deliveryRows, ...shadow.projection.wasteRows,
  ];
  const quantities = new Map<string, number>();
  for (const row of shadow.projection.materialRows) quantities.set(row.rowId, Number(row.grossQuantity));
  for (const row of shadow.projection.constructionOperationRows) quantities.set(row.rowId, input.resultAreaM2);
  for (const row of shadow.projection.equipmentRows) quantities.set(row.rowId, input.access.kind === "IN_WORK_RATE" ? Number.NaN : Math.ceil(input.resultAreaM2 / input.access.productivityM2PerShift));
  for (const row of shadow.projection.deliveryRows) quantities.set(row.rowId, input.delivery?.kind === "SEPARATE_5T_TRUCK" ? input.delivery.cargoMassT * input.delivery.distanceKm : Number.NaN);
  for (const row of shadow.projection.wasteRows) quantities.set(row.rowId, input.waste?.kind === "SEPARATE_5T_TRUCK" ? input.waste.wasteMassT * input.waste.distanceKm : Number.NaN);
  const coreById = new Map(core.rows.map((row) => [row.row_id, row]));
  const procurement = new Set([...shadow.projection.materialRows, ...shadow.projection.equipmentRows, ...shadow.projection.deliveryRows, ...shadow.projection.wasteRows].map((row) => row.rowId));
  const errors: string[] = [];
  for (const row of shadowRows) {
    const actual = coreById.get(row.rowId);
    if (!actual) { errors.push(`SHARED_CORE_ROW_MISSING:${row.rowId}`); continue; }
    if (actual.title_ru !== row.titleRu) errors.push(`SHARED_CORE_TITLE_MISMATCH:${row.rowId}`);
    if (Math.abs(Number(actual.quantity) - (quantities.get(row.rowId) ?? Number.NaN)) > 0.00000001) errors.push(`SHARED_CORE_QUANTITY_MISMATCH:${row.rowId}`);
    if (actual.procurement_eligible !== procurement.has(row.rowId)) errors.push(`SHARED_CORE_PROCUREMENT_FLAG_MISMATCH:${row.rowId}`);
  }
  if (core.rows.length !== shadowRows.length) errors.push("SHARED_CORE_ROW_COUNT_MISMATCH");
  const parity = {
    rowCountEqual: core.rows.length === shadowRows.length,
    exactTitlesEqual: !errors.some((error) => error.includes("TITLE_MISMATCH")),
    quantitiesEqual: !errors.some((error) => error.includes("QUANTITY_MISMATCH")),
    procurementFlagsEqual: !errors.some((error) => error.includes("PROCUREMENT_FLAG_MISMATCH")), errors,
  };
  return { status: errors.length === 0 ? "RED_DRAFT_REVIEW_REQUIRED" : "RED_SHARED_CORE_PARITY_FAILED", shadow, core, parity };
}

export const BATCH002_REAL_USEFUL_SHARED_CORE_SOURCE_LINEAGE_R1 = Object.freeze({
  shadowCompilerContract: BATCH002_REAL_USEFUL_SHADOW_COMPILER_R1_CONTRACT,
  sharedCoreContract: BATCH002_REAL_USEFUL_SHARED_CORE_R1_CONTRACT,
  productionAdmissionAttached: false as const,
});
