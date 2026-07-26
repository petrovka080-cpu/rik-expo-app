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
  const familyIds = new Set<string>();
  for (const row of rows) {
    const source = row.sourceParameters ?? {};
    for (const familyId of [source.familyId, source.inlineWorkPromptFamilyId]) {
      if (typeof familyId === "string" && familyId.trim()) familyIds.add(familyId.trim());
    }
    for (const [key, value] of Object.entries(source)) putEnvironmentValue(env, key, value);
  }
  for (const [key, param] of Object.entries(params)) putEnvironmentValue(env, key, param.value);
  if (familyIds.has("gabion_wall")) env.is_gabion = true;
  else if (familyIds.has("retaining_wall")) env.is_gabion = false;
  if (
    env.wall_face_area_m2 == null &&
    typeof env.length_m === "number" &&
    typeof env.height_m === "number"
  ) {
    env.wall_face_area_m2 = env.length_m * env.height_m;
  }
  return env;
}

function rowFormulaEnvironment(
  baseEnvironment: AiEstimateFormulaEnvironment,
  row: ProfessionalBoqRow,
  params: Record<string, EstimateDraftRevisionParam>,
  naturalLanguageBaseQuantity: number | null,
): AiEstimateFormulaEnvironment {
  const env: AiEstimateFormulaEnvironment = { ...baseEnvironment };
  const formulaContext = row.sourceParameters?.formulaContext;
  if (formulaContext && typeof formulaContext === "object" && !Array.isArray(formulaContext)) {
    for (const [key, value] of Object.entries(formulaContext)) putEnvironmentValue(env, key, value);
  }
  if (naturalLanguageBaseQuantity != null) {
    env.q = naturalLanguageBaseQuantity;
    env.baseQuantity = naturalLanguageBaseQuantity;
  }
  for (const [key, param] of Object.entries(params)) putEnvironmentValue(env, key, param.value);
  return env;
}

function naturalLanguageBaseQuantity(input: {
  rows: readonly ProfessionalBoqRow[];
  params: Record<string, EstimateDraftRevisionParam>;
}): number | null {
  const usesNaturalLanguagePassport = input.rows.some((candidate) =>
    candidate.sourceParameters?.passportBackedNaturalLanguageIngress === true
  );
  if (!usesNaturalLanguagePassport) return null;
  for (const key of ["area_m2", "length_m", "volume_m3", "count"]) {
    const value = numericValue(input.params[key]?.value);
    if (value != null && value > 0) return value;
  }
  return null;
}

function setRowQuantityInEnvironment(
  env: AiEstimateFormulaEnvironment,
  rowId: string,
  quantity: number,
): void {
  env[rowId] = quantity as AiEstimateFormulaEnvironmentValue;
  if (rowId.startsWith("passport_")) {
    env[rowId.slice("passport_".length)] = quantity as AiEstimateFormulaEnvironmentValue;
  }
}

function stringSourceValue(source: Record<string, unknown>, key: string): string | null {
  const value = source[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function legacyS2BScaledQuantity(input: {
  row: ProfessionalBoqRow;
  params: Record<string, EstimateDraftRevisionParam>;
  changedParamKey?: string | null;
}): number | null {
  if (!input.changedParamKey) return null;
  const source = input.row.sourceParameters ?? {};
  const baseKey = stringSourceValue(source, "s2bBaseParameterKey");
  if (baseKey !== input.changedParamKey) return null;
  if (!String(input.row.quantityFormula ?? "").includes("driven quantity")) return null;
  if (input.row.unit === "set") return input.row.quantity;
  const previousBase = numericValue(source.s2bBaseParameterValue);
  const currentBase = numericValue(input.params[baseKey]?.value);
  if (previousBase == null || previousBase <= 0 || currentBase == null || currentBase < 0) return null;
  const scaled = input.row.quantity * (currentBase / previousBase);
  if (!Number.isFinite(scaled) || scaled < 0) return null;
  const rounded = Math.round(scaled * 1000) / 1000;
  if (input.row.unit === "pcs" || input.row.unit === "shift" || input.row.unit === "trip") {
    return Math.max(1, Math.ceil(rounded));
  }
  return rounded;
}

export function recalculateProfessionalBoqRowsFromParams(input: {
  rows: ProfessionalBoqRow[];
  params: Record<string, EstimateDraftRevisionParam>;
  changedParamKey?: string | null;
}): ProfessionalBoqRow[] {
  const env = seedEnvironment(input.rows, input.params);
  const changedParamValue = input.changedParamKey ? numericValue(input.params[input.changedParamKey]?.value) : null;
  const naturalLanguageQuantity = naturalLanguageBaseQuantity(input);

  return input.rows.map((row) => {
    let quantity = row.quantity;
    if (input.changedParamKey && row.rowId === input.changedParamKey && changedParamValue != null) {
      quantity = changedParamValue;
    } else {
      const recalculated = evaluateAiEstimateQuantityFormula({
        formula: row.quantityFormula,
        env: rowFormulaEnvironment(env, row, input.params, naturalLanguageQuantity),
      });
      if (recalculated.ok && recalculated.value != null && recalculated.value >= 0) quantity = recalculated.value;
      else {
        const scaled = legacyS2BScaledQuantity({ row, params: input.params, changedParamKey: input.changedParamKey });
        if (scaled != null) quantity = scaled;
      }
    }
    setRowQuantityInEnvironment(env, row.rowId, quantity);
    return quantity === row.quantity ? row : { ...row, quantity };
  });
}
