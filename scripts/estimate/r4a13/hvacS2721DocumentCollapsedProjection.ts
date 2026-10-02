import { createHash } from "node:crypto";

import {
  type HvacFormula,
  type HvacParameter,
  type HvacPassport,
  type HvacResource,
} from "../hvacBackendR4/hvacR4Model";
import { semanticSha256 } from "../hvacBackendR4/support";

export type HvacS2721CollapsedDocumentLedger = {
  contract: "rik-expo-app.s27-21.hvac-included-document-ledger.v1";
  disposition: "INCLUDED_IN_PRIMARY_OPERATION_NOT_SEPARATELY_SUMMED";
  rowCount: number;
  formulaCount: number;
  removedExclusiveParameterCount: number;
  rowIds: readonly string[];
  formulaIds: readonly string[];
  removedExclusiveParameterIds: readonly string[];
  rowSetSha256: string;
  statementRu: string;
};

export type HvacS2721DocumentCollapsedPassport = Omit<HvacPassport, "passportSha256"> & {
  projectionContract: "master-s27-21.hvac-document-collapsed-source-projection.v1";
  sourcePassportSha256: string;
  collapsedIncludedDocuments: HvacS2721CollapsedDocumentLedger;
  passportSha256: string;
};

export function isHvacS2721IncludedDocumentRow(
  resource: Pick<HvacResource, "resourceGraph">,
): boolean {
  return resource.resourceGraph.componentKind === "DOCUMENT";
}

function sha256Lines(values: readonly string[]): string {
  return createHash("sha256").update(values.join("\n")).digest("hex");
}

function collectReferencedParameterIds(
  value: unknown,
  knownParameterIds: ReadonlySet<string>,
  result: Set<string>,
): void {
  if (typeof value === "string") {
    if (knownParameterIds.has(value)) result.add(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const child of value) collectReferencedParameterIds(child, knownParameterIds, result);
    return;
  }
  if (value && typeof value === "object") {
    for (const child of Object.values(value as Record<string, unknown>)) {
      collectReferencedParameterIds(child, knownParameterIds, result);
    }
  }
}

function retainedParameter(
  parameter: HvacParameter,
  retainedRowIds: ReadonlySet<string>,
): HvacParameter {
  const consumers = parameter.constraints.consumers;
  return {
    ...parameter,
    constraints: {
      ...parameter.constraints,
      ...(Array.isArray(consumers) ? {
        consumers: consumers.filter((rowId): rowId is string =>
          typeof rowId === "string" && retainedRowIds.has(rowId)),
      } : {}),
    },
  };
}

export function collapseHvacS2721DocumentPassport(
  source: HvacPassport,
): HvacS2721DocumentCollapsedPassport {
  const collapsedResources = source.resources.filter(isHvacS2721IncludedDocumentRow);
  const resources = source.resources.filter((resource) => !isHvacS2721IncludedDocumentRow(resource));
  const retainedRowIds = new Set(resources.map((resource) => resource.rowId));
  const retainedFormulaIds = new Set(resources.map((resource) => resource.formulaId));
  const formulas = source.formulas.filter((formula) => retainedFormulaIds.has(formula.formulaId));
  const retainedFormulaIdSet = new Set(formulas.map((formula) => formula.formulaId));
  const collapsedFormulaIds = [...new Set(collapsedResources
    .map((resource) => resource.formulaId)
    .filter((formulaId) => !retainedFormulaIdSet.has(formulaId)))].sort();
  const collapsedFormulaIdSet = new Set(collapsedFormulaIds);
  const collapsedInputIds = new Set(source.formulas
    .filter((formula) => collapsedFormulaIdSet.has(formula.formulaId))
    .flatMap((formula) => formula.inputParameterIds));
  const knownParameterIds = new Set(source.parameters.map((parameter) => parameter.parameterId));
  const retainedParameterReferences = new Set(formulas.flatMap((formula) => formula.inputParameterIds));
  for (const resource of resources) {
    collectReferencedParameterIds(resource.inclusionAst, knownParameterIds, retainedParameterReferences);
  }
  const removedExclusiveParameterIds = [...collapsedInputIds]
    .filter((parameterId) => !retainedParameterReferences.has(parameterId))
    .sort();
  const removedExclusiveParameterIdSet = new Set(removedExclusiveParameterIds);
  const parameters = source.parameters
    .filter((parameter) => !removedExclusiveParameterIdSet.has(parameter.parameterId))
    .map((parameter) => retainedParameter(parameter, retainedRowIds));
  const rowIds = collapsedResources.map((resource) => resource.rowId).sort();
  const collapsedIncludedDocuments: HvacS2721CollapsedDocumentLedger = {
    contract: "rik-expo-app.s27-21.hvac-included-document-ledger.v1",
    disposition: "INCLUDED_IN_PRIMARY_OPERATION_NOT_SEPARATELY_SUMMED",
    rowCount: rowIds.length,
    formulaCount: collapsedFormulaIds.length,
    removedExclusiveParameterCount: removedExclusiveParameterIds.length,
    rowIds,
    formulaIds: collapsedFormulaIds,
    removedExclusiveParameterIds,
    rowSetSha256: sha256Lines(rowIds),
    statementRu: "Исполнительные чертежи, паспорта, планы контроля, руководства и комплект передачи сохранены как обязательства технологии, включённые в основную операцию и отдельно не суммируемые.",
  };

  if (resources.length === 0 || formulas.length === 0 || parameters.length === 0) {
    throw new Error(`STOP_S2721_HVAC_DOCUMENT_COLLAPSE_EMPTY:${source.catalogId}`);
  }
  if (resources.some(isHvacS2721IncludedDocumentRow)) {
    throw new Error(`STOP_S2721_HVAC_DOCUMENT_ROW_RETAINED:${source.catalogId}`);
  }
  if (resources.some((resource) => !retainedFormulaIdSet.has(resource.formulaId))) {
    throw new Error(`STOP_S2721_HVAC_DOCUMENT_ORPHAN_RESOURCE:${source.catalogId}`);
  }
  const resourceFormulaIds = new Set(resources.map((resource) => resource.formulaId));
  if (formulas.some((formula: HvacFormula) => !resourceFormulaIds.has(formula.formulaId))) {
    throw new Error(`STOP_S2721_HVAC_DOCUMENT_ORPHAN_FORMULA:${source.catalogId}`);
  }

  const { passportSha256: sourcePassportSha256, ...sourceWithoutHash } = source;
  const projectionWithoutHash = {
    ...sourceWithoutHash,
    projectionContract: "master-s27-21.hvac-document-collapsed-source-projection.v1" as const,
    sourcePassportSha256,
    expectedStages: [...new Set(resources.map((resource) => resource.section))].sort(),
    expectedCategories: [...new Set(resources.map((resource) => resource.category))].sort(),
    parameters,
    formulas,
    resources,
    collapsedIncludedDocuments,
  };
  return {
    ...projectionWithoutHash,
    passportSha256: semanticSha256(projectionWithoutHash),
  };
}
