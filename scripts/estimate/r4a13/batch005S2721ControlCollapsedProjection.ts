import { createHash } from "node:crypto";

import type {
  Batch005R4BackendDefinition,
  Batch005R4BackendParameter,
  Batch005R4BackendResource,
  Batch005R4RuntimeFormula,
} from "../r5/batch005R4SharedCoreProjection";
import { buildAllBatch005R4CanonicalBackendDefinitions } from "../r5/batch005R4SharedCoreProjection";

const CONTROL_ROW_ID = /:row:(?:doc_|[^:]*_doc_|hse_|qa_|handover_|op_mark_verify$|op_replace_record$|op_replace_closeout$|op_test_protocol$)/u;

export type Batch005S2721CollapsedControlLedger = {
  contract: "rik-expo-app.s27-21.batch005-included-control-ledger.v1";
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

export type Batch005S2721ControlCollapsedDefinition = Omit<
  Batch005R4BackendDefinition,
  "contract" | "runtimeFormulas" | "resources" | "passport"
> & {
  contract: "master-s27-21.batch005-control-collapsed-successor.v1";
  runtimeFormulas: readonly Batch005R4RuntimeFormula[];
  resources: readonly Batch005R4BackendResource[];
  passport: Omit<
    Batch005R4BackendDefinition["passport"],
    | "includedScopeRu"
    | "parameters"
    | "formulas"
    | "resources"
    | "userParameterContracts"
    | "semanticOwners"
    | "costOwners"
    | "procurementOwners"
  > & {
    includedScopeRu: readonly string[];
    parameters: readonly Batch005R4BackendParameter[];
    formulas: readonly Batch005R4RuntimeFormula[];
    resources: readonly Batch005R4BackendResource[];
    userParameterContracts: Batch005R4BackendDefinition["passport"]["userParameterContracts"];
    semanticOwners: readonly string[];
    costOwners: readonly string[];
    procurementOwners: readonly string[];
    collapsedIncludedControl: Batch005S2721CollapsedControlLedger;
  };
};

export function isBatch005S2721IncludedControlRow(
  resource: Pick<Batch005R4BackendResource, "rowId">,
): boolean {
  return CONTROL_ROW_ID.test(resource.rowId);
}

function sha256Lines(values: readonly string[]): string {
  return createHash("sha256").update(values.join("\n")).digest("hex");
}

export function collapseBatch005S2721ControlDefinition(
  source: Batch005R4BackendDefinition,
): Batch005S2721ControlCollapsedDefinition {
  const collapsedResources = source.resources.filter(isBatch005S2721IncludedControlRow);
  const resources = source.resources.filter((resource) => !isBatch005S2721IncludedControlRow(resource));
  const retainedRowIds = new Set(resources.map((resource) => resource.rowId));
  const retainedFormulaIds = new Set(resources.map((resource) => resource.formulaId));
  const runtimeFormulas = source.runtimeFormulas.filter((formula) => retainedFormulaIds.has(formula.formulaId));
  const retainedFormulaIdSet = new Set(runtimeFormulas.map((formula) => formula.formulaId));
  const collapsedFormulaIds = [...new Set(collapsedResources
    .map((resource) => resource.formulaId)
    .filter((formulaId) => !retainedFormulaIdSet.has(formulaId)))].sort();

  const parameters = source.passport.parameters
    .map((parameter): Batch005R4BackendParameter => ({
      ...parameter,
      formulaConsumerIds: parameter.formulaConsumerIds
        .filter((formulaId) => retainedFormulaIdSet.has(formulaId)),
      resourceConsumerIds: parameter.resourceConsumerIds
        .filter((rowId) => retainedRowIds.has(rowId)),
    }))
    .filter((parameter) => parameter.formulaConsumerIds.length > 0
      || parameter.resourceConsumerIds.length > 0);
  const retainedParameterIds = new Set(parameters.map((parameter) => parameter.parameterId));
  const removedExclusiveParameterIds = source.passport.parameters
    .map((parameter) => parameter.parameterId)
    .filter((parameterId) => !retainedParameterIds.has(parameterId))
    .sort();
  const userParameterContracts = source.passport.userParameterContracts
    .filter((contract) => retainedParameterIds.has(contract.parameterId))
    .map((contract) => ({
      ...contract,
      formulaConsumerIds: contract.formulaConsumerIds
        .filter((formulaId) => retainedFormulaIdSet.has(formulaId)),
      resourceConsumerIds: contract.resourceConsumerIds
        .filter((rowId) => retainedRowIds.has(rowId)),
    }));
  const rowIds = collapsedResources.map((resource) => resource.rowId).sort();
  const collapsedIncludedControl: Batch005S2721CollapsedControlLedger = {
    contract: "rik-expo-app.s27-21.batch005-included-control-ledger.v1",
    disposition: "INCLUDED_IN_PRIMARY_OPERATION_NOT_SEPARATELY_SUMMED",
    rowCount: rowIds.length,
    formulaCount: collapsedFormulaIds.length,
    removedExclusiveParameterCount: removedExclusiveParameterIds.length,
    rowIds,
    formulaIds: collapsedFormulaIds,
    removedExclusiveParameterIds,
    rowSetSha256: sha256Lines(rowIds),
    statementRu: "Охрана труда, входной и операционный контроль, исполнительные записи и передача результата сохранены как обязательства технологии, включённые в основную операцию и отдельно не суммируемые.",
  };

  if (resources.length === 0 || runtimeFormulas.length === 0 || parameters.length === 0) {
    throw new Error(`STOP_S2721_BATCH005_CONTROL_COLLAPSE_EMPTY:${source.catalogId}`);
  }
  if (resources.some(isBatch005S2721IncludedControlRow)) {
    throw new Error(`STOP_S2721_BATCH005_CONTROL_ROW_RETAINED:${source.catalogId}`);
  }
  if (runtimeFormulas.some((formula) => !retainedFormulaIds.has(formula.formulaId))) {
    throw new Error(`STOP_S2721_BATCH005_ORPHAN_FORMULA:${source.catalogId}`);
  }
  if (parameters.some((parameter) => parameter.formulaConsumerIds.length === 0
    && parameter.resourceConsumerIds.length === 0)) {
    throw new Error(`STOP_S2721_BATCH005_ORPHAN_PARAMETER:${source.catalogId}`);
  }

  return {
    ...source,
    contract: "master-s27-21.batch005-control-collapsed-successor.v1",
    runtimeFormulas,
    resources,
    technologyStepsRu: [
      ...source.technologyStepsRu,
      "Включённые HSE/QA/исполнительные обязательства свёрнуты в технологический ledger и отдельно не суммируются",
    ],
    passport: {
      ...source.passport,
      includedScopeRu: resources.map((resource) => resource.titleRu),
      parameters,
      formulas: runtimeFormulas,
      resources,
      userParameterContracts,
      semanticOwners: resources.map((resource) => resource.semanticOwnerId),
      costOwners: [...new Set(resources.map((resource) => resource.costOwnerId))],
      procurementOwners: resources.flatMap((resource) => resource.procurementOwnerId
        ? [resource.procurementOwnerId]
        : []),
      collapsedIncludedControl,
    },
  };
}

export function buildAllBatch005S2721ControlCollapsedDefinitions(): readonly Batch005S2721ControlCollapsedDefinition[] {
  return buildAllBatch005R4CanonicalBackendDefinitions()
    .map(collapseBatch005S2721ControlDefinition);
}
