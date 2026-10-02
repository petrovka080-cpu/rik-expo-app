import { createHash } from "node:crypto";

import {
  buildWaterBackendDefinitions,
  type JsonRecord,
  type WaterDefinition,
  type WaterResource,
} from "../waterBackendR3/waterDomainModel";

export type WaterS2721CollapsedControlLedger = {
  contract: "rik-expo-app.s27-21.water-included-control-ledger.v1";
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

export type WaterS2721ControlCollapsedDefinition = WaterDefinition & {
  projectionContract: "master-s27-21.water-control-collapsed-source-projection.v1";
  collapsedIncludedControl: WaterS2721CollapsedControlLedger;
};

export function isWaterS2721IncludedControlRow(
  resource: Pick<WaterResource, "resourceGraph" | "semanticOwner">,
): boolean {
  return resource.resourceGraph.componentRole === "DOCUMENT"
    || resource.semanticOwner.startsWith("documentation:");
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
    for (const child of Object.values(value as JsonRecord)) {
      collectReferencedParameterIds(child, knownParameterIds, result);
    }
  }
}

export function collapseWaterS2721ControlDefinition(
  source: WaterDefinition,
): WaterS2721ControlCollapsedDefinition {
  const collapsedResources = source.resources.filter(isWaterS2721IncludedControlRow);
  const resources = source.resources.filter((resource) => !isWaterS2721IncludedControlRow(resource));
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
    .filter((parameter) => !removedExclusiveParameterIdSet.has(parameter.parameterId));
  const rowIds = collapsedResources.map((resource) => resource.rowId).sort();
  const collapsedIncludedControl: WaterS2721CollapsedControlLedger = {
    contract: "rik-expo-app.s27-21.water-included-control-ledger.v1",
    disposition: "INCLUDED_IN_PRIMARY_OPERATION_NOT_SEPARATELY_SUMMED",
    rowCount: rowIds.length,
    formulaCount: collapsedFormulaIds.length,
    removedExclusiveParameterCount: removedExclusiveParameterIds.length,
    rowIds,
    formulaIds: collapsedFormulaIds,
    removedExclusiveParameterIds,
    rowSetSha256: sha256Lines(rowIds),
    statementRu: "Исполнительные записи, протоколы, паспорта и комплект сдачи сохранены как обязательства технологии, включённые в основную операцию и отдельно не суммируемые.",
  };

  if (resources.length === 0 || formulas.length === 0 || parameters.length === 0) {
    throw new Error(`STOP_S2721_WATER_CONTROL_COLLAPSE_EMPTY:${source.work.catalogId}`);
  }
  if (resources.some(isWaterS2721IncludedControlRow)) {
    throw new Error(`STOP_S2721_WATER_CONTROL_ROW_RETAINED:${source.work.catalogId}`);
  }
  if (resources.some((resource) => !retainedFormulaIdSet.has(resource.formulaId))) {
    throw new Error(`STOP_S2721_WATER_CONTROL_ORPHAN_RESOURCE:${source.work.catalogId}`);
  }
  if (formulas.some((formula) => !resources.some((resource) => resource.formulaId === formula.formulaId))) {
    throw new Error(`STOP_S2721_WATER_CONTROL_ORPHAN_FORMULA:${source.work.catalogId}`);
  }

  return {
    ...source,
    projectionContract: "master-s27-21.water-control-collapsed-source-projection.v1",
    parameters,
    formulas,
    resources,
    collapsedIncludedControl,
    work: {
      ...source.work,
      passport: {
        ...source.work.passport,
        s2721CollapsedIncludedControl: collapsedIncludedControl,
      },
    },
  };
}

export function buildAllWaterS2721ControlCollapsedDefinitions(): readonly WaterS2721ControlCollapsedDefinition[] {
  return buildWaterBackendDefinitions().map(collapseWaterS2721ControlDefinition);
}
