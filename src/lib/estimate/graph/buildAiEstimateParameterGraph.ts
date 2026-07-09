import {
  buildAiEstimateNormativeWorkParameterPassport,
  type AiEstimateNormativeParameterRequirement,
} from "../aiEstimateNormativeWorkParameterPassport";
import type { EstimateDraftRevision, ProfessionalBoqRow } from "../estimateDraftRevisionContract";
import { extractAiEstimateFormulaIdentifiers } from "../formula/evaluateAiEstimateQuantityFormula";
import { buildProfessionalWorkPassport } from "../buildProfessionalWorkPassport";
import type {
  AiEstimateParameterGraph,
  AiEstimateParameterGraphNode,
  AiEstimateParameterGraphNodeKind,
  AiEstimateParameterGraphRowDependency,
} from "./AiEstimateParameterGraph";

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function nodeKindForRevisionParam(
  revision: EstimateDraftRevision | null | undefined,
  key: string,
): AiEstimateParameterGraphNodeKind {
  const source = revision?.params[key]?.source;
  if (!source) return "missing";
  if (source === "edited_by_user") return "manual_override";
  if (source === "derived") return "derived";
  if (source === "default_assumption") return "catalog_default";
  return "input";
}

function rowsForInput(templateId: string, revision: EstimateDraftRevision | null | undefined): ProfessionalBoqRow[] {
  if (revision?.boq.rows.length) return revision.boq.rows;
  const passport = buildProfessionalWorkPassport(templateId);
  return (passport?.boqRecipe.allRows ?? []).map((row) => ({
    rowId: row.rowId,
    rowType: row.rowType,
    titleRu: row.titleRu,
    quantity: 0,
    unit: row.canonicalUnit,
    unitLabel: row.sourceUnit,
    unitPrice: null,
    currency: "KGS",
    category: null,
    sourceId: row.normSourceId,
    sourceLabel: row.normSourceTitle,
    formulaId: row.formulaId,
    quantityFormula: row.quantityFormula,
    calculationTrace: row.calculationTraceTemplate,
    sourceParameters: null,
    templateId,
    includedInProcurement: row.includedInProcurement,
    materialQuantity: null,
  }));
}

function requirementNode(
  requirement: AiEstimateNormativeParameterRequirement,
  revision: EstimateDraftRevision | null | undefined,
): AiEstimateParameterGraphNode {
  return {
    key: requirement.key,
    kind: nodeKindForRevisionParam(revision, requirement.key),
    required: requirement.role === "required_for_quantity" || requirement.role === "required_for_professional_accuracy",
    formulaRefs: uniqueSorted(requirement.formulaRefs),
    affectedBoqRowIds: uniqueSorted(requirement.affectsRowIds),
    pdfDependency: true,
    buyerPackageDependency: true,
    historyRevisionDependency: true,
  };
}

function rowDependencies(rows: readonly ProfessionalBoqRow[]): AiEstimateParameterGraphRowDependency[] {
  return rows.map((row) => ({
    rowId: row.rowId,
    formula: row.quantityFormula ?? null,
    parameterKeys: extractAiEstimateFormulaIdentifiers(row.quantityFormula)
      .filter((key) => key !== row.rowId)
      .sort((a, b) => a.localeCompare(b)),
  }));
}

export function buildAiEstimateParameterGraph(input: {
  templateId?: string | null;
  revision?: EstimateDraftRevision | null;
}): AiEstimateParameterGraph | null {
  const templateId = input.revision?.selectedTemplateId ?? input.templateId ?? null;
  if (!templateId) return null;
  const passport = buildAiEstimateNormativeWorkParameterPassport(templateId);
  if (!passport) return null;
  const rows = rowsForInput(templateId, input.revision);
  const baseNodes = passport.requirements.map((requirement) => requirementNode(requirement, input.revision));
  const formulaVariables = rowDependencies(rows)
    .flatMap((row) => row.parameterKeys)
    .filter((key) => !baseNodes.some((node) => node.key === key))
    .map((key): AiEstimateParameterGraphNode => ({
      key,
      kind: "formula_variable",
      required: false,
      formulaRefs: [],
      affectedBoqRowIds: rows
        .filter((row) => extractAiEstimateFormulaIdentifiers(row.quantityFormula).includes(key))
        .map((row) => row.rowId),
      pdfDependency: true,
      buyerPackageDependency: true,
      historyRevisionDependency: true,
    }));
  const nodesByKey = new Map<string, AiEstimateParameterGraphNode>();
  for (const node of [...baseNodes, ...formulaVariables]) {
    const existing = nodesByKey.get(node.key);
    nodesByKey.set(node.key, existing
      ? {
          ...existing,
          affectedBoqRowIds: uniqueSorted([...existing.affectedBoqRowIds, ...node.affectedBoqRowIds]),
          formulaRefs: uniqueSorted([...existing.formulaRefs, ...node.formulaRefs]),
        }
      : node);
  }
  return {
    templateId,
    revisionId: input.revision?.revisionId ?? null,
    nodes: [...nodesByKey.values()].sort((a, b) => a.key.localeCompare(b.key)),
    rowDependencies: rowDependencies(rows),
    exactIdentifierDependencyMatching: true,
    substringDependencyMatchingAbsent: true,
    sourceRevision: input.revision ?? undefined,
  };
}
