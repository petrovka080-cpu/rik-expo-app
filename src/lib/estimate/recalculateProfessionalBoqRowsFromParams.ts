import type {
  EstimateDraftRevisionParam,
  ProfessionalBoqRow,
} from "./estimateDraftRevisionContract";
import {
  evaluateAiEstimateQuantityFormula,
  type AiEstimateFormulaEnvironment,
  type AiEstimateFormulaEnvironmentValue,
} from "./formula/evaluateAiEstimateQuantityFormula";

function numericValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function booleanValue(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  return null;
}

function putEnvironmentValue(env: AiEstimateFormulaEnvironment, key: string, value: unknown): void {
  const cleanKey = String(key ?? "").trim();
  if (!/^[a-z][a-z0-9_]*$/i.test(cleanKey)) return;
  const asNumber = numericValue(value);
  if (asNumber != null) {
    env[cleanKey] = asNumber;
    return;
  }
  const asBoolean = booleanValue(value);
  if (asBoolean != null) env[cleanKey] = asBoolean;
}

function seedEnvironment(
  rows: readonly ProfessionalBoqRow[],
  params: Record<string, EstimateDraftRevisionParam>,
): AiEstimateFormulaEnvironment {
  const env: AiEstimateFormulaEnvironment = {};
  for (const row of rows) {
    const source = row.sourceParameters ?? {};
    for (const [key, value] of Object.entries(source)) putEnvironmentValue(env, key, value);
    const formulaContext = source.formulaContext;
    if (formulaContext && typeof formulaContext === "object" && !Array.isArray(formulaContext)) {
      for (const [key, value] of Object.entries(formulaContext)) putEnvironmentValue(env, key, value);
    }
  }
  for (const [key, param] of Object.entries(params)) putEnvironmentValue(env, key, param.value);
  return env;
}

function setRowQuantityInEnvironment(
  env: AiEstimateFormulaEnvironment,
  rowId: string,
  quantity: number,
): void {
  env[rowId] = quantity as AiEstimateFormulaEnvironmentValue;
}

export function recalculateProfessionalBoqRowsFromParams(input: {
  rows: ProfessionalBoqRow[];
  params: Record<string, EstimateDraftRevisionParam>;
  changedParamKey?: string | null;
}): ProfessionalBoqRow[] {
  const env = seedEnvironment(input.rows, input.params);
  const changedParamValue = input.changedParamKey ? numericValue(input.params[input.changedParamKey]?.value) : null;

  return input.rows.map((row) => {
    let quantity = row.quantity;
    if (input.changedParamKey && row.rowId === input.changedParamKey && changedParamValue != null) {
      quantity = changedParamValue;
    } else {
      const recalculated = evaluateAiEstimateQuantityFormula({ formula: row.quantityFormula, env });
      if (recalculated.ok && recalculated.value != null && recalculated.value >= 0) quantity = recalculated.value;
    }
    setRowQuantityInEnvironment(env, row.rowId, quantity);
    return quantity === row.quantity ? row : { ...row, quantity };
  });
}
