import type {
  EstimateDraftRevision,
  EstimateDraftRevisionParam,
  ProfessionalBoqRow,
} from "./estimateDraftRevisionContract";
import {
  aiEstimateRuLabelForParameter,
  aiEstimateRuUnitForParameter,
  isAiEstimateTechnicalHiddenParam,
} from "./aiEstimateRuParameterDictionary";

export type AiEstimateQuantityTraceParameter = {
  key: string;
  labelRu: string;
  value: EstimateDraftRevisionParam["value"];
  unitRu: string;
  displayValueRu: string;
};

export type AiEstimateQuantityExplanationTraceRow = {
  rowId: string;
  titleRu: string;
  quantity: number;
  unit: string;
  unitLabelRu: string;
  parameterKeys: string[];
  parameters: AiEstimateQuantityTraceParameter[];
  visibleFormulaRu: string;
  explanationRu: string;
  currentValuesSignature: string;
};

export type AiEstimateQuantityExplanationTrace = {
  traceId: string;
  revisionId: string;
  selectedTemplateId: string;
  staleTraceAccepted: false;
  rowCount: number;
  rows: AiEstimateQuantityExplanationTraceRow[];
  traceUsesCurrentParameterValues: boolean;
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 3 }).format(value);
}

function formatValue(param: EstimateDraftRevisionParam, unitRu: string): string {
  const text = typeof param.value === "number" ? formatNumber(param.value) : String(param.value);
  return unitRu ? `${text} ${unitRu}` : text;
}

function signature(value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash).toString(36);
}

function unique<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

function paramKeysForRow(revision: EstimateDraftRevision, row: ProfessionalBoqRow): string[] {
  const traceRow = revision.trace.rows.find((item) => item.rowId === row.rowId);
  const fromRowTrace = traceRow?.sourceParamKeys ?? [];
  const fromParamTrace = revision.trace.params
    .filter((param) => param.affectsRowIds.includes(row.rowId))
    .map((param) => param.key);
  return unique([...fromRowTrace, ...fromParamTrace])
    .filter((key) => !isAiEstimateTechnicalHiddenParam(key))
    .filter((key) => Boolean(revision.params[key]));
}

function traceParameter(
  key: string,
  param: EstimateDraftRevisionParam,
): AiEstimateQuantityTraceParameter {
  const unitRu = aiEstimateRuUnitForParameter(key, param.canonicalUnit);
  return {
    key,
    labelRu: aiEstimateRuLabelForParameter(key),
    value: param.value,
    unitRu,
    displayValueRu: formatValue(param, unitRu),
  };
}

function visibleFormulaFor(parameters: readonly AiEstimateQuantityTraceParameter[]): string {
  if (parameters.length === 0) return "по расчетной строке паспорта работ";
  return `по параметрам: ${parameters.map((param) => `${param.labelRu} ${param.displayValueRu}`).join(", ")}`;
}

function explanationFor(input: {
  row: ProfessionalBoqRow;
  parameters: readonly AiEstimateQuantityTraceParameter[];
}): string {
  const quantity = `${formatNumber(input.row.quantity)} ${input.row.unitLabel || input.row.unit}`;
  if (input.parameters.length === 0) {
    return `Количество ${quantity} рассчитано по строке паспорта работ.`;
  }
  return `Количество ${quantity} рассчитано ${visibleFormulaFor(input.parameters)}.`;
}

export function buildAiEstimateQuantityExplanationTrace(input: {
  revision: EstimateDraftRevision | null | undefined;
  maxRows?: number;
}): AiEstimateQuantityExplanationTrace | null {
  const revision = input.revision;
  if (!revision) return null;
  const rows = revision.boq.rows.slice(0, input.maxRows ?? revision.boq.rows.length).map((row) => {
    const parameterKeys = paramKeysForRow(revision, row);
    const parameters = parameterKeys.map((key) => traceParameter(key, revision.params[key]));
    const currentValuesSignature = signature(JSON.stringify(parameters.map((param) => [
      param.key,
      param.value,
      param.unitRu,
    ])));
    return {
      rowId: row.rowId,
      titleRu: row.titleRu,
      quantity: row.quantity,
      unit: row.unit,
      unitLabelRu: row.unitLabel || row.unit,
      parameterKeys,
      parameters,
      visibleFormulaRu: visibleFormulaFor(parameters),
      explanationRu: explanationFor({ row, parameters }),
      currentValuesSignature,
    };
  });
  return {
    traceId: revision.trace.traceId,
    revisionId: revision.revisionId,
    selectedTemplateId: revision.selectedTemplateId,
    staleTraceAccepted: false,
    rowCount: revision.boq.rows.length,
    rows,
    traceUsesCurrentParameterValues: revision.trace.staleTraceAccepted === false,
  };
}
