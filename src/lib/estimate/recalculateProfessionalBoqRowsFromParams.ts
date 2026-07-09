import type {
  EstimateDraftRevisionParam,
  ProfessionalBoqRow,
} from "./estimateDraftRevisionContract";

type FormulaEnvironment = Record<string, number | boolean>;
type FormulaArgument = number | boolean | typeof Math | ((...args: number[]) => number);

const FORMULA_FUNCTIONS: Record<string, (...args: number[]) => number> = {
  ceil: Math.ceil,
  floor: Math.floor,
  round: Math.round,
  max: Math.max,
  min: Math.min,
  sqrt: Math.sqrt,
  abs: Math.abs,
  round_to: (value: number, precision = 0) => {
    const digits = Number.isFinite(precision) ? Math.max(0, Math.min(8, Math.round(precision))) : 0;
    const multiplier = 10 ** digits;
    return Math.round(value * multiplier) / multiplier;
  },
};

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

function putEnvironmentValue(env: FormulaEnvironment, key: string, value: unknown): void {
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
): FormulaEnvironment {
  const env: FormulaEnvironment = {};
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

function identifiers(expression: string): string[] {
  return [...new Set((expression.match(/\b[a-z][a-z0-9_]*\b/gi) ?? []).filter((token) => !/^\d/.test(token)))];
}

function normalizeFormulaExpression(formula: string): string | null {
  const expression = formula.trim();
  if (!expression) return null;
  if (/["'`;={}\[\]]/.test(expression)) return null;
  if (/[^a-z0-9_+\-*/().,?:\s]/i.test(expression)) return null;
  return expression.replace(/\b(ceil|floor|round|max|min|sqrt|abs)\s*\(/gi, (_match, fn: string) => `Math.${fn.toLowerCase()}(`);
}

function evaluateFormula(
  formula: string | null | undefined,
  env: FormulaEnvironment,
): number | null {
  if (!formula) return null;
  const expression = normalizeFormulaExpression(formula);
  if (!expression) return null;

  const sourceIdentifiers = identifiers(formula);
  const variableNames: string[] = [];
  const variableValues: FormulaArgument[] = [];
  for (const name of sourceIdentifiers) {
    if (name === "Math") continue;
    const formulaFunction = FORMULA_FUNCTIONS[name.toLowerCase()];
    if (formulaFunction) {
      variableNames.push(name);
      variableValues.push(formulaFunction);
      continue;
    }
    if (!Object.prototype.hasOwnProperty.call(env, name)) return null;
    variableNames.push(name);
    variableValues.push(env[name]);
  }

  try {
    const evaluator = new Function("Math", ...variableNames, `"use strict"; return (${expression});`);
    const value = evaluator(Math, ...variableValues);
    return typeof value === "number" && Number.isFinite(value) ? Math.round(value * 1000) / 1000 : null;
  } catch {
    return null;
  }
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
      const recalculated = evaluateFormula(row.quantityFormula, env);
      if (recalculated != null && recalculated >= 0) quantity = recalculated;
    }
    putEnvironmentValue(env, row.rowId, quantity);
    return quantity === row.quantity ? row : { ...row, quantity };
  });
}
