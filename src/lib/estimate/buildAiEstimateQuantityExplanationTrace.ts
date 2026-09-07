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

type TraceParameterPresentation = {
  labelRu?: string;
  unit?: string;
  choices?: { value: string; labelRu: string }[];
};

function formatValue(
  param: EstimateDraftRevisionParam,
  unitRu: string,
  choices: readonly { value: string; labelRu: string }[] = [],
): string {
  if (typeof param.value === "boolean") return param.value ? "Да" : "Нет";
  const selectedChoice = choices.find((choice) => choice.value === String(param.value));
  if (selectedChoice) return selectedChoice.labelRu;
  const text = typeof param.value === "number" ? formatNumber(param.value) : String(param.value);
  if (/^[a-z0-9]+(?:_[a-z0-9]+)+$/iu.test(text)) return "уточняется";
  return unitRu ? `${text} ${unitRu}` : text;
}

function traceParameterPresentations(
  revision: EstimateDraftRevision,
): Map<string, TraceParameterPresentation> {
  const presentations = new Map<string, TraceParameterPresentation>();
  const update = (key: string, value: Partial<TraceParameterPresentation>) => {
    presentations.set(key, { ...presentations.get(key), ...value });
  };
  for (const row of revision.boq.rows) {
    const source = row.sourceParameters ?? {};
    for (const [property, field] of [
      ["asphaltV4ParameterLabelsRu", "labelRu"],
      ["asphaltV4ParameterUnits", "unit"],
    ] as const) {
      const values = source[property];
      if (!values || typeof values !== "object" || Array.isArray(values)) continue;
      for (const [key, value] of Object.entries(values)) {
        if (typeof value === "string" && value.trim()) update(key, { [field]: value.trim() });
      }
    }
    for (const property of ["roadworksWaveAParameterMetadata", "professionalDomainParameterMetadata"] as const) {
      const values = source[property];
      if (!values || typeof values !== "object" || Array.isArray(values)) continue;
      for (const [key, raw] of Object.entries(values)) {
        if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
        const metadata = raw as Record<string, unknown>;
        const choices = Array.isArray(metadata.choices)
          ? metadata.choices.flatMap((choice) => {
            if (!choice || typeof choice !== "object" || Array.isArray(choice)) return [];
            const candidate = choice as Record<string, unknown>;
            return typeof candidate.value === "string" && typeof candidate.labelRu === "string"
              ? [{ value: candidate.value, labelRu: candidate.labelRu }]
              : [];
          })
          : [];
        update(key, {
          ...(typeof metadata.labelRu === "string" && metadata.labelRu.trim()
            ? { labelRu: metadata.labelRu.trim() }
            : {}),
          ...(typeof metadata.unit === "string" && metadata.unit.trim()
            ? { unit: metadata.unit.trim() }
            : {}),
          ...(choices.length > 0 ? { choices } : {}),
        });
      }
    }
  }
  return presentations;
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
  presentation?: TraceParameterPresentation,
): AiEstimateQuantityTraceParameter {
  const unitRu = aiEstimateRuUnitForParameter(key, presentation?.unit ?? param.canonicalUnit);
  return {
    key,
    labelRu: presentation?.labelRu ?? aiEstimateRuLabelForParameter(key),
    value: param.value,
    unitRu,
    displayValueRu: formatValue(param, unitRu === "enum" ? "" : unitRu, presentation?.choices),
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
  const presentationByKey = traceParameterPresentations(revision);
  const rows = revision.boq.rows.slice(0, input.maxRows ?? revision.boq.rows.length).map((row) => {
    const parameterKeys = paramKeysForRow(revision, row);
    const parameters = parameterKeys.map((key) =>
      traceParameter(key, revision.params[key], presentationByKey.get(key)),
    );
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
