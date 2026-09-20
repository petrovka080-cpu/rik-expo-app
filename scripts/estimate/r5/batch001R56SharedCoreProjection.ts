import { createHash } from "node:crypto";

import {
  compileCanonicalEstimateCore,
  type CanonicalEstimateCompileOperation,
  type CanonicalEstimateCompileCoreResult,
} from "../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore";
import { canonicalEstimateStableJson } from "../../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism";
import { compileFormulaGraph } from "../../../src/lib/estimate/backendPlatform/formulaGraph";
import type {
  Batch001DrywallSuccessorDefinitionR3,
  Batch001DrywallSuccessorResourceR3,
} from "../../../src/lib/estimate/v4/domains/interiorFinishesComplete/drywallCeilingBulkheadSuccessorR3";

function sha256(value: unknown): string {
  return createHash("sha256").update(canonicalEstimateStableJson(value), "utf8").digest("hex");
}

function sectionRu(resource: Batch001DrywallSuccessorResourceR3): string {
  if (resource.group === "material") return "Материалы";
  if (resource.group === "construction_work") return "Строительные работы";
  if (resource.group === "machine_equipment") return "Машины и оборудование";
  return "Доставка";
}

function valueType(value: unknown): "decimal" | "boolean" | "text" {
  if (typeof value === "number") return "decimal";
  if (typeof value === "boolean") return "boolean";
  return "text";
}

function constraintsFor(
  definition: Batch001DrywallSuccessorDefinitionR3,
  parameterId: string,
): Record<string, unknown> {
  const contract = definition.passport.userParameterContracts.find((candidate) => candidate.parameterId === parameterId);
  if (contract?.range.kind === "NUMERIC") return { min: contract.range.minimum, max: contract.range.maximum };
  if (contract?.range.kind === "TEXT") return { maxLength: contract.range.maximumLength };
  return {};
}

function inclusionAst(input: {
  definition: Batch001DrywallSuccessorDefinitionR3;
  resource: Batch001DrywallSuccessorResourceR3;
  values: Readonly<Record<string, string | number | boolean>>;
}): Record<string, unknown> {
  if (input.resource.applicability.kind === "DELIVERY_NOT_INCLUDED_BY_SUPPLIER") {
    return { kind: "not", operand: { kind: "parameter", id: input.resource.applicability.parameterId } };
  }
  const formula = input.definition.runtimeFormulas.find((candidate) => candidate.formulaId === input.resource.formulaId);
  if (formula?.inputParameterIds.length === 1
    && formula.expressionSource.trim() === formula.inputParameterIds[0]
    && input.values[formula.inputParameterIds[0]!] === 0) {
    return { kind: "greater_than", parameterId: formula.inputParameterIds[0], value: 0 };
  }
  return { kind: "literal", value: true };
}

export async function compileBatch001R56ThroughSharedCore(input: {
  definition: Batch001DrywallSuccessorDefinitionR3;
  values: Readonly<Record<string, string | number | boolean>>;
  operation?: CanonicalEstimateCompileOperation;
}): Promise<CanonicalEstimateCompileCoreResult> {
  const parameterDefinitions = input.definition.passport.parameters.map((parameter) => {
    const value = input.values[parameter.parameterId];
    if (value == null) throw new Error(`BATCH001_R56_PROJECTION_VALUE_MISSING:${parameter.parameterId}`);
    const contract = input.definition.passport.userParameterContracts
      .find((candidate) => candidate.parameterId === parameter.parameterId);
    return {
      parameter_id: parameter.parameterId,
      value_type: contract?.inputType === "NUMBER"
        ? "decimal"
        : contract?.inputType === "BOOLEAN"
          ? "boolean"
          : contract?.inputType === "TEXT"
            ? "text"
            : valueType(value),
      required: true,
      default_value: null,
      constraints_json: constraintsFor(input.definition, parameter.parameterId),
      truth_metadata: {
        formula_consumers: parameter.formulaConsumerIds,
        resource_branch_consumers: parameter.resourceConsumerIds,
      },
    };
  });
  const formulaDefinitions = input.definition.runtimeFormulas.map((formula) => {
    const compiled = compileFormulaGraph(formula.expressionSource);
    return {
      formula_id: formula.formulaId,
      ast: compiled.ast,
      input_parameter_ids: compiled.inputParameterIds,
      ast_sha256: sha256(compiled.ast),
    };
  });
  const resourceDefinitions = input.definition.resources.map((resource, ordinal) => {
    const resourceGraph = {
      contract: "real-professional-estimates-r5.6.batch001-resource-graph.v1",
      domain: "interior_finishes",
      group: input.definition.group,
      operation: input.definition.group,
      variant: input.definition.variant,
      resourceIdentity: resource.resourceIdentity,
      procurementOwnerId: resource.procurementOwnerId,
      ...(resource.titleSpecificationParameterIds ? {
        titleSpecificationParameterIds: resource.titleSpecificationParameterIds,
        titleSpecificationMode: resource.titleSpecificationMode,
        titleSpecificationSeparator: resource.titleSpecificationSeparator,
      } : {}),
    };
    const sourceMetadata = {
      normativeTrace: [{
        sourceId: resource.normativeSource.sourceKey,
        exactLocator: resource.normativeSource.locator,
        sourceRole: "QUANTITY_NORM_OR_WORK_EXECUTION",
      }],
      engineeringSourceIds: resource.engineeringSourceIds,
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
      inclusion_ast: inclusionAst({ definition: input.definition, resource, values: input.values }),
      resource_graph: resourceGraph,
      procurement_eligible: resource.procurementEligible,
      cost_owner_id: resource.costOwnerId,
      source_metadata: sourceMetadata,
      row_sha256: sha256({ ordinal, resource, resourceGraph, sourceMetadata }),
    };
  });
  const submittedParameters = Object.fromEntries(
    parameterDefinitions.map((parameter) => [parameter.parameter_id, input.values[parameter.parameter_id]]),
  );
  return compileCanonicalEstimateCore({
    operation: input.operation ?? "compile",
    compilerVersion: "canonical-estimate-compile-core-r1",
    catalogId: input.definition.catalogId,
    parameterDefinitions,
    formulaDefinitions,
    resourceDefinitions,
    submittedParameters,
    confirmedParameters: {},
    currencyCode: "KGS",
    priceSnapshotIds: [],
    priceItems: [],
    maximumResourceRows: 200,
    hashJson: sha256,
  });
}
