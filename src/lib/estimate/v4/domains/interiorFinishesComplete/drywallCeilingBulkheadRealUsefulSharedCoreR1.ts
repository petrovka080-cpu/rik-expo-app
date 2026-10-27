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
  BATCH001_REAL_USEFUL_SHADOW_COMPILER_R1_CONTRACT,
  compileBatch001RealUsefulShadowR1,
  type Batch001MaterialRuntimeInputR1,
  type Batch001RealUsefulShadowCompileInputR1,
  type Batch001RealUsefulShadowCompileResultR1,
} from "./drywallCeilingBulkheadRealUsefulShadowCompilerR1";

export const BATCH001_REAL_USEFUL_SHARED_CORE_R1_CONTRACT =
  "real-useful-estimates.batch001-shared-core-shadow-r1.v1" as const;

export type Batch001RealUsefulSharedCoreResultR1 =
  | {
    status: "NEEDS_REQUIRED_INPUTS";
    shadow: Extract<Batch001RealUsefulShadowCompileResultR1, { status: "NEEDS_REQUIRED_INPUTS" }>;
    core: null;
    parity: null;
  }
  | {
    status: "RED_DRAFT_REVIEW_REQUIRED" | "RED_SHARED_CORE_PARITY_FAILED";
    shadow: Extract<Batch001RealUsefulShadowCompileResultR1, { status: "RED_DRAFT_REVIEW_REQUIRED" }>;
    core: CanonicalEstimateCompileCoreResult;
    parity: {
      rowCountEqual: boolean;
      exactTitlesEqual: boolean;
      quantitiesEqual: boolean;
      procurementFlagsEqual: boolean;
      errors: readonly string[];
    };
  };

type ParameterState = {
  definitions: CanonicalEstimateParameterDefinition[];
  submitted: Record<string, unknown>;
  ids: Set<string>;
};

function hashJson(value: unknown): string {
  return canonicalEstimateSha256HexText(canonicalEstimateStableJson(value));
}

function addParameter(
  state: ParameterState,
  input: {
    parameterId: string;
    valueType: "decimal" | "text";
    value: string | number;
    constraints?: Record<string, unknown>;
    truthMetadata?: Record<string, unknown>;
  },
): void {
  if (state.ids.has(input.parameterId)) {
    if (state.submitted[input.parameterId] !== input.value) {
      throw new Error(`BATCH001_SHARED_CORE_PARAMETER_VALUE_DRIFT:${input.parameterId}`);
    }
    return;
  }
  state.ids.add(input.parameterId);
  state.definitions.push({
    parameter_id: input.parameterId,
    value_type: input.valueType,
    required: true,
    default_value: null,
    constraints_json: input.constraints ?? (input.valueType === "decimal" ? { min: 0 } : { maxLength: 2_000 }),
    truth_metadata: input.truthMetadata ?? null,
  });
  state.submitted[input.parameterId] = input.value;
}

function addFormula(
  formulas: Map<string, CanonicalEstimateFormulaDefinition>,
  formulaId: string,
  expressionSource: string,
): void {
  if (formulas.has(formulaId)) return;
  const compiled = compileFormulaGraph(expressionSource);
  formulas.set(formulaId, {
    formula_id: formulaId,
    ast: compiled.ast,
    input_parameter_ids: compiled.inputParameterIds,
    ast_sha256: hashJson(compiled.ast),
  });
}

function materialInput(
  input: Batch001RealUsefulShadowCompileInputR1,
  familyId: string,
): Batch001MaterialRuntimeInputR1 {
  const required = input.requiredMaterials[familyId];
  if (required) return required;
  const conditional = input.conditionalMaterials[familyId];
  if (conditional?.status === "INCLUDED") return conditional.material;
  throw new Error(`BATCH001_SHARED_CORE_INCLUDED_MATERIAL_INPUT_MISSING:${familyId}`);
}

function sectionRu(category: string): string {
  if (category === "material") return "Материалы";
  if (category === "construction_work") return "Строительные работы";
  if (category === "machine_equipment") return "Машины и оборудование";
  if (category === "delivery") return "Доставка и вывоз";
  return "Прочее";
}

export async function compileBatch001RealUsefulShadowThroughSharedCoreR1(
  input: Batch001RealUsefulShadowCompileInputR1,
): Promise<Batch001RealUsefulSharedCoreResultR1> {
  const shadow = compileBatch001RealUsefulShadowR1(input);
  if (shadow.status === "NEEDS_REQUIRED_INPUTS") {
    return { status: "NEEDS_REQUIRED_INPUTS", shadow, core: null, parity: null };
  }

  const parameterState: ParameterState = { definitions: [], submitted: {}, ids: new Set() };
  const formulas = new Map<string, CanonicalEstimateFormulaDefinition>();
  const resources: CanonicalEstimateResourceDefinition[] = [];
  addParameter(parameterState, {
    parameterId: "result_area_m2",
    valueType: "decimal",
    value: input.resultAreaM2,
    constraints: { min: 0.000001, max: 10_000_000 },
    truthMetadata: { source: "project_or_measurement", hiddenDefault: false },
  });
  addParameter(parameterState, {
    parameterId: "source_identity",
    valueType: "text",
    value: input.sourceIdentity,
    truthMetadata: { source: "prepared_shadow_source", productionAdmissionAttached: false },
  });

  let ordinal = 0;
  for (const row of shadow.projection.materialRows) {
    const material = materialInput(input, row.familyId);
    const titleParameterId = `exact_spec_${row.familyId}`;
    const specificationParameterId = `technical_specification_${row.familyId}`;
    const normParameterId = `norm_${row.familyId}`;
    const lossParameterId = `loss_${row.familyId}_percent`;
    const packageParameterId = `package_size_${row.familyId}`;
    addParameter(parameterState, {
      parameterId: titleParameterId,
      valueType: "text",
      value: material.exactTitleRu,
      constraints: { maxLength: 500 },
      truthMetadata: { role: "exact_public_title", familyId: row.familyId },
    });
    addParameter(parameterState, {
      parameterId: specificationParameterId,
      valueType: "text",
      value: material.specificationRu,
      constraints: { maxLength: 1_000 },
      truthMetadata: { role: "technical_specification", familyId: row.familyId },
    });
    addParameter(parameterState, {
      parameterId: normParameterId,
      valueType: "decimal",
      value: material.normPerM2,
      constraints: { min: 0.000000001, max: 1_000_000_000 },
      truthMetadata: { role: "net_norm_per_result_unit", familyId: row.familyId },
    });
    addParameter(parameterState, {
      parameterId: lossParameterId,
      valueType: "decimal",
      value: material.lossPercent,
      constraints: { min: 0, max: 100 },
      truthMetadata: { role: "explicit_loss_percent", familyId: row.familyId },
    });
    addParameter(parameterState, {
      parameterId: packageParameterId,
      valueType: "decimal",
      value: material.packageSize,
      constraints: { min: 0.000000001, max: 1_000_000_000 },
      truthMetadata: { role: "package_size", familyId: row.familyId, packageTitleRu: material.packageTitleRu },
    });
    addFormula(
      formulas,
      row.formulaId,
      `result_area_m2 * ${normParameterId} * (1 + ${lossParameterId} / 100)`,
    );
    const resourceGraph = {
      contract: BATCH001_REAL_USEFUL_SHARED_CORE_R1_CONTRACT,
      technologyPassportSha256: shadow.projection.technologyPassportSha256,
      familyId: row.familyId,
      stageId: row.stageId,
      semanticOwnerId: row.semanticOwnerId,
      titleSpecificationParameterId: titleParameterId,
      titleSpecificationMode: "REPLACE",
      technicalSpecificationParameterId: specificationParameterId,
      netQuantity: row.netQuantity,
      grossQuantity: row.grossQuantity,
      lossPercent: row.lossPercent,
      package: row.package,
      procurementRuleId: row.procurementRuleId,
    };
    const sourceMetadata = {
      normativeTrace: row.normSourceIds.map((sourceId) => ({ sourceId, sourceRole: "QUANTITY_NORM" })),
      purposeRu: row.purposeRu,
      shadowOnly: true,
    };
    resources.push({
      id: row.rowId,
      row_id: row.rowId,
      ordinal: ordinal++,
      section: sectionRu("material"),
      category: "material",
      title_ru: "Точная закупочная позиция",
      unit_id: row.unitId,
      formula_id: row.formulaId,
      inclusion_ast: { kind: "literal", value: true },
      resource_graph: resourceGraph,
      procurement_eligible: true,
      cost_owner_id: row.costOwnerId,
      source_metadata: sourceMetadata,
      row_sha256: hashJson({ row, resourceGraph, sourceMetadata }),
    });
  }

  for (const row of shadow.projection.constructionOperationRows) {
    addFormula(formulas, row.formulaId, "result_area_m2");
    const resourceGraph = {
      contract: BATCH001_REAL_USEFUL_SHARED_CORE_R1_CONTRACT,
      technologyPassportSha256: shadow.projection.technologyPassportSha256,
      operationId: row.operationId,
      stageId: row.stageId,
      semanticOwnerId: row.semanticOwnerId,
    };
    const sourceMetadata = {
      normativeTrace: row.normSourceIds.map((sourceId) => ({ sourceId, sourceRole: "WORK_EXECUTION" })),
      purposeRu: row.purposeRu,
      shadowOnly: true,
    };
    resources.push({
      id: row.rowId,
      row_id: row.rowId,
      ordinal: ordinal++,
      section: sectionRu("construction_work"),
      category: "construction_work",
      title_ru: row.titleRu,
      unit_id: row.unitId,
      formula_id: row.formulaId,
      inclusion_ast: { kind: "literal", value: true },
      resource_graph: resourceGraph,
      procurement_eligible: false,
      cost_owner_id: row.costOwnerId,
      source_metadata: sourceMetadata,
      row_sha256: hashJson({ row, resourceGraph, sourceMetadata }),
    });
  }

  if (shadow.projection.equipmentRows.length > 0) {
    const productivity = input.access.kind === "IN_WORK_RATE" ? null : input.access.productivityM2PerShift;
    if (productivity == null) throw new Error("BATCH001_SHARED_CORE_ACCESS_PRODUCTIVITY_MISSING");
    addParameter(parameterState, {
      parameterId: "access_productivity_m2_per_shift",
      valueType: "decimal",
      value: productivity,
      constraints: { min: 0.000001, max: 1_000_000 },
      truthMetadata: { role: "equipment_productivity", accessKind: input.access.kind },
    });
    addParameter(parameterState, {
      parameterId: "access_method",
      valueType: "text",
      value: input.access.kind,
      truthMetadata: { role: "mutually_exclusive_access_choice" },
    });
  }
  for (const row of shadow.projection.equipmentRows) {
    addFormula(formulas, row.formulaId, "ceil(result_area_m2 / access_productivity_m2_per_shift)");
    const resourceGraph = {
      contract: BATCH001_REAL_USEFUL_SHARED_CORE_R1_CONTRACT,
      technologyPassportSha256: shadow.projection.technologyPassportSha256,
      equipmentRuleId: row.equipmentRuleId,
      equipmentClassRu: row.equipmentClassRu,
      keyCharacteristicsRu: row.keyCharacteristicsRu,
      operationId: row.operationId,
      inclusionCondition: row.inclusionCondition,
      semanticOwnerId: row.semanticOwnerId,
    };
    const sourceMetadata = {
      normativeTrace: row.normSourceIds.map((sourceId) => ({ sourceId, sourceRole: "EQUIPMENT_SELECTION" })),
      shadowOnly: true,
    };
    resources.push({
      id: row.rowId,
      row_id: row.rowId,
      ordinal: ordinal++,
      section: sectionRu("machine_equipment"),
      category: "machine_equipment",
      title_ru: row.titleRu,
      unit_id: row.unitId,
      formula_id: row.formulaId,
      inclusion_ast: { kind: "literal", value: true },
      resource_graph: resourceGraph,
      procurement_eligible: true,
      cost_owner_id: row.costOwnerId,
      source_metadata: sourceMetadata,
      row_sha256: hashJson({ row, resourceGraph, sourceMetadata }),
    });
  }

  for (const [familyId, decision] of Object.entries(input.conditionalMaterials)) {
    addParameter(parameterState, {
      parameterId: `conditional_${familyId}_status`,
      valueType: "text",
      value: decision.status,
      truthMetadata: { role: "conditional_material_decision", familyId },
    });
    if (decision.status === "EXCLUDED") {
      addParameter(parameterState, {
        parameterId: `conditional_${familyId}_exclusion_evidence_sha256`,
        valueType: "text",
        value: decision.evidenceSha256,
        constraints: { minLength: 64, maxLength: 64, pattern: "^[a-f0-9]{64}$" },
        truthMetadata: { role: "conditional_material_exclusion_proof", familyId },
      });
    }
  }

  if (input.access.kind === "IN_WORK_RATE") {
    addParameter(parameterState, { parameterId: "access_method", valueType: "text", value: input.access.kind });
    addParameter(parameterState, {
      parameterId: "tower_exclusion_evidence_sha256", valueType: "text", value: input.access.towerExclusionEvidenceSha256,
    });
    addParameter(parameterState, {
      parameterId: "scissor_exclusion_evidence_sha256", valueType: "text", value: input.access.scissorExclusionEvidenceSha256,
    });
  } else if (input.access.kind === "TOWER_5M") {
    addParameter(parameterState, {
      parameterId: "scissor_exclusion_evidence_sha256", valueType: "text", value: input.access.scissorExclusionEvidenceSha256,
    });
  } else {
    addParameter(parameterState, {
      parameterId: "tower_exclusion_evidence_sha256", valueType: "text", value: input.access.towerExclusionEvidenceSha256,
    });
  }

  for (const row of shadow.projection.deliveryRows) {
    if (input.delivery?.kind !== "SEPARATE_5T_TRUCK") {
      throw new Error("BATCH001_SHARED_CORE_DELIVERY_INPUT_MISSING");
    }
    addParameter(parameterState, {
      parameterId: "cargo_mass_t",
      valueType: "decimal",
      value: input.delivery.cargoMassT,
      constraints: { min: 0.000001, max: 1_000_000 },
      truthMetadata: { role: "delivery_cargo_mass", deduplicationKey: row.deduplicationKey },
    });
    addParameter(parameterState, {
      parameterId: "delivery_distance_km",
      valueType: "decimal",
      value: input.delivery.distanceKm,
      constraints: { min: 0.000001, max: 100_000 },
      truthMetadata: { role: "delivery_distance", deduplicationKey: row.deduplicationKey },
    });
    addParameter(parameterState, {
      parameterId: "delivery_mode",
      valueType: "text",
      value: input.delivery.kind,
      truthMetadata: { role: "delivery_branch" },
    });
    addFormula(formulas, row.formulaId, "cargo_mass_t * delivery_distance_km");
    const resourceGraph = {
      contract: BATCH001_REAL_USEFUL_SHARED_CORE_R1_CONTRACT,
      technologyPassportSha256: shadow.projection.technologyPassportSha256,
      deliveryFlowId: row.deliveryFlowId,
      cargoFamilyIds: row.cargoFamilyIds,
      vehicleTypeRu: row.vehicleTypeRu,
      capacityRequirementRu: row.capacityRequirementRu,
      deduplicationKey: row.deduplicationKey,
      semanticOwnerId: row.semanticOwnerId,
    };
    const sourceMetadata = {
      normativeTrace: row.normSourceIds.map((sourceId) => ({ sourceId, sourceRole: "DELIVERY_FLOW" })),
      shadowOnly: true,
    };
    resources.push({
      id: row.rowId,
      row_id: row.rowId,
      ordinal: ordinal++,
      section: sectionRu("delivery"),
      category: "delivery",
      title_ru: row.titleRu,
      unit_id: row.unitId,
      formula_id: row.formulaId,
      inclusion_ast: { kind: "literal", value: true },
      resource_graph: resourceGraph,
      procurement_eligible: true,
      cost_owner_id: row.costOwnerId,
      source_metadata: sourceMetadata,
      row_sha256: hashJson({ row, resourceGraph, sourceMetadata }),
    });
  }
  if (input.delivery?.kind === "INCLUDED_BY_SUPPLIER") {
    addParameter(parameterState, {
      parameterId: "delivery_mode",
      valueType: "text",
      value: input.delivery.kind,
      truthMetadata: { role: "delivery_branch" },
    });
    addParameter(parameterState, {
      parameterId: "delivery_exclusion_evidence_sha256",
      valueType: "text",
      value: input.delivery.exclusionEvidenceSha256,
      truthMetadata: { role: "delivery_exclusion_proof" },
    });
  }

  const core = await compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: BATCH001_REAL_USEFUL_SHARED_CORE_R1_CONTRACT,
    catalogId: input.catalogId,
    parameterDefinitions: parameterState.definitions,
    formulaDefinitions: [...formulas.values()],
    resourceDefinitions: resources,
    submittedParameters: parameterState.submitted,
    confirmedParameters: {},
    currencyCode: "KGS",
    priceSnapshotIds: [],
    priceItems: [],
    maximumResourceRows: 200,
    hashJson,
  });

  const shadowRows = [
    ...shadow.projection.materialRows,
    ...shadow.projection.constructionOperationRows,
    ...shadow.projection.equipmentRows,
    ...shadow.projection.deliveryRows,
  ];
  const expectedQuantity = new Map<string, number>();
  for (const row of shadow.projection.materialRows) expectedQuantity.set(row.rowId, Number(row.grossQuantity));
  for (const row of shadow.projection.constructionOperationRows) expectedQuantity.set(row.rowId, input.resultAreaM2);
  for (const row of shadow.projection.equipmentRows) {
    const productivity = input.access.kind === "IN_WORK_RATE" ? Number.NaN : input.access.productivityM2PerShift;
    expectedQuantity.set(row.rowId, Math.ceil(input.resultAreaM2 / productivity));
  }
  for (const row of shadow.projection.deliveryRows) {
    const delivery = input.delivery?.kind === "SEPARATE_5T_TRUCK" ? input.delivery : null;
    expectedQuantity.set(row.rowId, delivery ? delivery.cargoMassT * delivery.distanceKm : Number.NaN);
  }
  const coreById = new Map(core.rows.map((row) => [row.row_id, row]));
  const procurementRowIds = new Set([
    ...shadow.projection.materialRows,
    ...shadow.projection.equipmentRows,
    ...shadow.projection.deliveryRows,
  ].map((row) => row.rowId));
  const parityErrors: string[] = [];
  for (const row of shadowRows) {
    const actual = coreById.get(row.rowId);
    if (!actual) {
      parityErrors.push(`SHARED_CORE_ROW_MISSING:${row.rowId}`);
      continue;
    }
    if (actual.title_ru !== row.titleRu) parityErrors.push(`SHARED_CORE_TITLE_MISMATCH:${row.rowId}`);
    const expected = expectedQuantity.get(row.rowId);
    if (expected == null || Math.abs(Number(actual.quantity) - expected) > 0.00000001) {
      parityErrors.push(`SHARED_CORE_QUANTITY_MISMATCH:${row.rowId}`);
    }
    const expectedProcurement = procurementRowIds.has(row.rowId);
    if (actual.procurement_eligible !== expectedProcurement) {
      parityErrors.push(`SHARED_CORE_PROCUREMENT_FLAG_MISMATCH:${row.rowId}`);
    }
  }
  if (core.rows.length !== shadowRows.length) parityErrors.push("SHARED_CORE_ROW_COUNT_MISMATCH");
  const parity = {
    rowCountEqual: core.rows.length === shadowRows.length,
    exactTitlesEqual: !parityErrors.some((error) => error.includes("TITLE_MISMATCH")),
    quantitiesEqual: !parityErrors.some((error) => error.includes("QUANTITY_MISMATCH")),
    procurementFlagsEqual: !parityErrors.some((error) => error.includes("PROCUREMENT_FLAG_MISMATCH")),
    errors: parityErrors,
  };
  return {
    status: parityErrors.length === 0 ? "RED_DRAFT_REVIEW_REQUIRED" : "RED_SHARED_CORE_PARITY_FAILED",
    shadow,
    core,
    parity,
  };
}

export const BATCH001_REAL_USEFUL_SHARED_CORE_SOURCE_LINEAGE_R1 = Object.freeze({
  shadowCompilerContract: BATCH001_REAL_USEFUL_SHADOW_COMPILER_R1_CONTRACT,
  sharedCoreContract: BATCH001_REAL_USEFUL_SHARED_CORE_R1_CONTRACT,
  productionAdmissionAttached: false as const,
});
