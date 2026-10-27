import type { BasisKey, Field } from "./useCalcFields";
import type {
  CalcAutoRuleContext,
  CalcModalFieldErrors,
  CalcModalFormState,
  CalcModalInputs,
  CalcModalMeasures,
} from "./calcModal.model";
import { applyCalcAutoRules } from "./calcModal.model";
import {
  LOSS_ERROR_TEXT,
  formatCalcNumber,
  parseCalcExpression,
} from "./calcModal.normalize";

const REQUIRED_FIELD_ERROR = "Заполните поле";

export type CalcModalLossState = {
  lossValue: number;
  lossInvalid: boolean;
};

export type CalcParseResult = CalcModalFormState & {
  valid: boolean;
};

const dropClearedErrors = (
  previousErrors: CalcModalFieldErrors,
  nextErrors: CalcModalFieldErrors,
  keys: readonly BasisKey[],
) => {
  const updated: CalcModalFieldErrors = { ...previousErrors };
  for (const key of keys) {
    if (!nextErrors[key]) {
      delete updated[key];
    }
  }
  return updated;
};

export const deriveLossState = (lossPct: string): CalcModalLossState => {
  const parsed = parseCalcExpression(lossPct);
  if (parsed.kind === "empty") {
    return { lossValue: 0, lossInvalid: false };
  }
  if (parsed.kind === "invalid") {
    return { lossValue: 0, lossInvalid: true };
  }
  return { lossValue: parsed.value, lossInvalid: false };
};

export const deriveLossError = (lossTouched: boolean, lossInvalid: boolean) =>
  lossTouched && lossInvalid ? LOSS_ERROR_TEXT : null;

export const deriveMultiplier = (
  hasMultiplierField: boolean,
  measures: CalcModalMeasures,
  lossState: CalcModalLossState,
) => {
  if (hasMultiplierField && typeof measures.multiplier === "number" && Number.isFinite(measures.multiplier)) {
    return measures.multiplier;
  }
  if (lossState.lossInvalid) return 1;
  return Math.max(0, 1 + lossState.lossValue / 100);
};

export const deriveRequiredKeys = (coreFields: readonly Field[]) =>
  coreFields
    .filter((field) => (field.usedInNorms || field.required) && field.editable !== false)
    .map((field) => field.key);

export const deriveCanCalculate = (params: {
  workTypeCode?: string | null;
  loadingFields: boolean;
  calculating: boolean;
  fields: readonly Field[];
  requiredKeys: readonly BasisKey[];
  inputs: CalcModalInputs;
  hasMultiplierField: boolean;
  hasWastePctField: boolean;
  lossPct: string;
  lossState: CalcModalLossState;
}) => {
  if (!params.workTypeCode) return false;
  if (params.loadingFields || params.calculating) return false;
  if (params.fields.length === 0) return false;

  for (const key of params.requiredKeys) {
    const raw = params.inputs[key];
    if (typeof raw !== "string" || raw.trim() === "") return false;
  }

  if (!params.hasMultiplierField && !params.hasWastePctField) {
    if (!params.lossPct.trim()) return false;
    if (params.lossState.lossInvalid) return false;
  }

  return true;
};

export const getCalcParseKeys = (params: {
  fields: readonly Field[];
  inputs: CalcModalInputs;
  showSecondaryFields: boolean;
}) =>
  params.fields
    .filter((field) => {
      if (field.editable === false) return false;
      const priority = field.uiPriority ?? "core";
      if (priority === "core") return true;
      if ((priority === "secondary" || priority === "engineering") && params.showSecondaryFields) {
        return true;
      }
      const raw = params.inputs[field.key];
      return typeof raw === "string" && raw.trim() !== "";
    })
    .map((field) => field.key);

export const synchronizeCalcModalFields = (params: {
  fields: readonly Field[];
  inputs: CalcModalInputs;
  measures: CalcModalMeasures;
  errors: CalcModalFieldErrors;
  autoRuleContext: CalcAutoRuleContext;
}) => {
  const nextInputs: CalcModalInputs = {};
  const nextMeasures: CalcModalMeasures = {};
  const nextErrors: CalcModalFieldErrors = { ...params.errors };
  const visibleKeys = new Set<string>();

  for (const field of params.fields) {
    visibleKeys.add(field.key);
    nextInputs[field.key] = params.inputs[field.key] ?? "";
    const value = params.measures[field.key];
    if (typeof value === "number" && Number.isFinite(value)) {
      nextMeasures[field.key] = value;
    }
  }

  for (const key of Object.keys(nextErrors)) {
    if (!visibleKeys.has(key)) {
      delete nextErrors[key];
    }
  }

  const autoRules = applyCalcAutoRules(nextMeasures, nextInputs, params.autoRuleContext);
  return {
    inputs: autoRules.inputs,
    measures: autoRules.measures,
    errors: nextErrors,
  };
};

export const parseCalcFields = (params: {
  keys: readonly BasisKey[];
  inputs: CalcModalInputs;
  measures: CalcModalMeasures;
  errors: CalcModalFieldErrors;
  fieldMap: ReadonlyMap<BasisKey, Field>;
  autoRuleContext: CalcAutoRuleContext;
  showErrors: boolean;
}): CalcParseResult => {
  const nextInputs: CalcModalInputs = { ...params.inputs };
  const nextMeasures: CalcModalMeasures = { ...params.measures };
  const nextErrors: CalcModalFieldErrors = { ...params.errors };
  let allValid = true;

  for (const key of params.keys) {
    const field = params.fieldMap.get(key);
    if (!field) {
      continue;
    }

    const rawOriginal = params.inputs[key] ?? "";
    const parsed = parseCalcExpression(rawOriginal);
    let errorMessage: string | undefined;

    if (parsed.kind === "empty") {
      delete nextMeasures[key];
      nextInputs[key] = "";
      allValid = false;
      errorMessage = REQUIRED_FIELD_ERROR;
    } else if (parsed.kind === "invalid") {
      delete nextMeasures[key];
      allValid = false;
      errorMessage = LOSS_ERROR_TEXT;
    } else {
      nextMeasures[key] = parsed.value;
      nextInputs[key] = parsed.formatted;
    }

    if (params.showErrors) {
      if (errorMessage) {
        nextErrors[key] = errorMessage;
      } else {
        delete nextErrors[key];
      }
    } else if (!errorMessage) {
      delete nextErrors[key];
    }
  }

  const autoRules = applyCalcAutoRules(nextMeasures, nextInputs, params.autoRuleContext);
  return {
    valid: allValid,
    inputs: autoRules.inputs,
    measures: autoRules.measures,
    errors: params.showErrors ? nextErrors : dropClearedErrors(params.errors, nextErrors, params.keys),
  };
};

export const normalizeLossInputOnBlur = (lossPct: string, lossState: CalcModalLossState) => {
  if (lossState.lossInvalid || !lossPct.trim()) {
    return lossPct;
  }
  return formatCalcNumber(lossState.lossValue);
};
