import type { Field } from "./useCalcFields";
import type {
  CalcModalInputs,
  CalcModalMeasures,
  CalcModalRow,
} from "./calcModal.model";
import {
  type CalcModalLossState,
  deriveCanCalculate,
  deriveLossError,
  deriveMultiplier,
  deriveRequiredKeys,
} from "./calcModal.validation";

export type CalcModalFieldGroups = {
  coreFields: Field[];
  additionalFields: Field[];
  derivedFields: Field[];
  hasMultiplierField: boolean;
  hasWastePctField: boolean;
};

export type CalcModalViewState = CalcModalFieldGroups & {
  requiredKeys: string[];
  lossError: string | null;
  multiplier: number;
  canCalculate: boolean;
  canSend: boolean;
};

export const partitionCalcModalFields = (fields: readonly Field[]): CalcModalFieldGroups => {
  const coreFields = fields.filter(
    (field) => (field.uiPriority ?? "core") === "core" && field.visibleInBaseUi !== false,
  );
  const additionalFields = fields.filter((field) => {
    const priority = field.uiPriority ?? "core";
    return priority === "secondary" || priority === "engineering";
  });
  const derivedFields = fields.filter((field) => (field.uiPriority ?? "core") === "derived");
  const hasMultiplierField = fields.some((field) => field.key === "multiplier" || field.key === "loss");
  const hasWastePctField = fields.some((field) => field.key === "waste_pct" || field.key === "loss");

  return {
    coreFields,
    additionalFields,
    derivedFields,
    hasMultiplierField,
    hasWastePctField,
  };
};

export const deriveCalcModalViewState = (params: {
  workTypeCode?: string | null;
  fields: readonly Field[];
  loadingFields: boolean;
  calculating: boolean;
  addingToRequest: boolean;
  inputs: CalcModalInputs;
  measures: CalcModalMeasures;
  rows: CalcModalRow[] | null;
  lossPct: string;
  lossTouched: boolean;
  lossState: CalcModalLossState;
}): CalcModalViewState => {
  const groups = partitionCalcModalFields(params.fields);
  const requiredKeys = deriveRequiredKeys(groups.coreFields);
  const multiplier = deriveMultiplier(groups.hasMultiplierField, params.measures, params.lossState);
  const lossError = deriveLossError(params.lossTouched, params.lossState.lossInvalid);

  return {
    ...groups,
    requiredKeys,
    multiplier,
    lossError,
    canCalculate: deriveCanCalculate({
      workTypeCode: params.workTypeCode,
      loadingFields: params.loadingFields,
      calculating: params.calculating,
      fields: params.fields,
      requiredKeys,
      inputs: params.inputs,
      hasMultiplierField: groups.hasMultiplierField,
      hasWastePctField: groups.hasWastePctField,
      lossPct: params.lossPct,
      lossState: params.lossState,
    }),
    canSend:
      Array.isArray(params.rows) &&
      params.rows.length > 0 &&
      !params.addingToRequest &&
      !params.calculating,
  };
};
