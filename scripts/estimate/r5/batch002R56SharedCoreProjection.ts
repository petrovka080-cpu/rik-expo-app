import { createHash } from "node:crypto";

import {
  compileCanonicalEstimateCore,
  type CanonicalEstimateCompileCoreResult,
  type CanonicalEstimateCompileOperation,
} from "../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore";
import { canonicalEstimateStableJson } from "../../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism";
import { compileFormulaGraph } from "../../../src/lib/estimate/backendPlatform/formulaGraph";
import type {
  Batch002DrywallResourceR3,
  Batch002DrywallSuccessorDefinitionR3,
} from "../../../src/lib/estimate/v4/domains/interiorFinishesComplete/drywallArchitecturalElementsSuccessorR3";

function sha256(value: unknown): string {
  return createHash("sha256").update(canonicalEstimateStableJson(value), "utf8").digest("hex");
}

function sectionRu(resource: Batch002DrywallResourceR3): string {
  if (resource.group === "material") return "Материалы";
  if (resource.group === "construction_work") return "Строительные работы";
  if (resource.group === "machine_equipment") return "Машины и оборудование";
  return "Доставка и вывоз";
}

function constraintsFor(
  definition: Batch002DrywallSuccessorDefinitionR3,
  parameterId: string,
): Record<string, unknown> {
  const contract = definition.passport.userParameterContracts.find((item) => item.parameterId === parameterId);
  if (contract?.range.kind === "NUMERIC") return { min: contract.range.minimum, max: contract.range.maximum };
  if (contract?.range.kind === "TEXT") {
    return { minLength: contract.range.minimumLength, maxLength: contract.range.maximumLength };
  }
  return {};
}

function valueType(value: string | number | boolean): "decimal" | "boolean" | "text" {
  if (typeof value === "number") return "decimal";
  if (typeof value === "boolean") return "boolean";
  return "text";
}

function inclusionAst(
  definition: Batch002DrywallSuccessorDefinitionR3,
  resource: Batch002DrywallResourceR3,
  values: Readonly<Record<string, string | number | boolean>>,
): Record<string, unknown> {
  if (resource.applicability.kind === "DELIVERY_NOT_INCLUDED_BY_SUPPLIER") {
    return { kind: "not", operand: { kind: "parameter", id: resource.applicability.parameterId } };
  }
  const formula = definition.runtimeFormulas.find((item) => item.formulaId === resource.formulaId);
  if (formula?.inputParameterIds.length === 1
    && formula.expressionSource.trim() === formula.inputParameterIds[0]
    && values[formula.inputParameterIds[0]!] === 0) {
    return { kind: "greater_than", parameterId: formula.inputParameterIds[0], value: 0 };
  }
  return { kind: "literal", value: true };
}

function titleSpecificationParameterId(
  definition: Batch002DrywallSuccessorDefinitionR3,
  resource: Batch002DrywallResourceR3,
): string | null {
  if (definition.operation === "FINISH_JOINT") {
    if (resource.resourceIdentity.endsWith(":joint_finish_surface")) return "surface_quality_level";
    if (resource.group === "material") return "joint_system_type";
  }
  if (definition.operation === "INSULATE" && resource.resourceIdentity.endsWith(":insulation_mat")) return "insulation_type";
  if (definition.operation === "PREPARE"
    && (resource.resourceIdentity.endsWith(":preparation_primer")
      || resource.resourceIdentity.endsWith(":preparation_clean_base"))) return "substrate_type";
  if (definition.operation === "REPAIR" && resource.resourceIdentity.endsWith(":repair_boards")) return "repair_board_type";
  if (definition.operation === "CLAD" && resource.resourceIdentity.endsWith(":cladding_boards")) return "board_type";
  if (definition.operation === "CLAD" && resource.resourceIdentity.endsWith(":cladding_cut_and_form")) return "forming_method";
  if (definition.operation === "FRAME" && resource.group === "material") return "frame_system_type";
  return null;
}

/**
 * Projects the accepted Batch-002 content passport into the same pure backend
 * compiler used by local and worker execution. The predecessor browser
 * runtime is intentionally not part of compile/recalculate ownership.
 */
export async function compileBatch002R56ThroughSharedCore(input: {
  definition: Batch002DrywallSuccessorDefinitionR3;
  values: Readonly<Record<string, string | number | boolean>>;
  operation?: CanonicalEstimateCompileOperation;
}): Promise<CanonicalEstimateCompileCoreResult> {
  const parameterDefinitions = Object.entries(input.values).map(([parameterId, value]) => ({
    parameter_id: parameterId,
    value_type: valueType(value),
    required: true,
    default_value: null,
    constraints_json: constraintsFor(input.definition, parameterId),
    truth_metadata: {
      value_source_role: "EXPLICIT_NO_HIDDEN_DEFAULT",
      formula_consumers: input.definition.runtimeFormulas
        .filter((formula) => formula.inputParameterIds.includes(parameterId))
        .map((formula) => formula.formulaId),
    },
  }));
  const formulaDefinitions = input.definition.runtimeFormulas.map((formula) => {
    const compiled = compileFormulaGraph(formula.expressionSource);
    if (canonicalEstimateStableJson(compiled.inputParameterIds)
      !== canonicalEstimateStableJson([...formula.inputParameterIds].sort())) {
      throw new Error(`BATCH002_R56_FORMULA_INPUT_DRIFT:${formula.formulaId}`);
    }
    return {
      formula_id: formula.formulaId,
      ast: compiled.ast,
      input_parameter_ids: compiled.inputParameterIds,
      ast_sha256: sha256(compiled.ast),
    };
  });
  const resourceDefinitions = input.definition.resources.map((resource, ordinal) => {
    const titleParameterId = titleSpecificationParameterId(input.definition, resource);
    const resourceGraph = {
      contract: "real-professional-estimates-r5.6.batch002-resource-graph.v1",
      domain: "interior_finishes",
      system: input.definition.system,
      operation: input.definition.operation,
      variant: input.definition.variant,
      resourceIdentity: resource.resourceIdentity,
      procurementOwnerId: resource.procurementOwnerId,
      ...(titleParameterId ? {
        titleSpecificationParameterId: titleParameterId,
        titleSpecificationMode: "APPEND",
      } : {}),
    };
    const sourceMetadata = {
      engineeringSourceIds: resource.engineeringSourceIds,
      predecessorRowIds: resource.sourcePredecessorRowIds,
    };
    return {
      id: resource.rowId,
      row_id: resource.rowId,
      ordinal,
      section: sectionRu(resource),
      category: resource.group,
      title_ru: resource.titleRu,
      unit_id: resource.unitId,
      formula_id: resource.formulaId,
      inclusion_ast: inclusionAst(input.definition, resource, input.values),
      resource_graph: resourceGraph,
      procurement_eligible: resource.procurementEligible,
      cost_owner_id: resource.costOwnerId,
      source_metadata: sourceMetadata,
      row_sha256: sha256({ ordinal, resource, resourceGraph, sourceMetadata }),
    };
  });
  return compileCanonicalEstimateCore({
    operation: input.operation ?? "compile",
    compilerVersion: "canonical-estimate-compile-core-r1",
    catalogId: input.definition.catalogId,
    parameterDefinitions,
    formulaDefinitions,
    resourceDefinitions,
    submittedParameters: { ...input.values },
    confirmedParameters: {},
    currencyCode: "KGS",
    priceSnapshotIds: [],
    priceItems: [],
    maximumResourceRows: 200,
    hashJson: sha256,
  });
}
