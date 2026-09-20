import type {
  EstimateDraftRevisionParam,
  ProfessionalBoqRow,
} from "./estimateDraftRevisionContract";
import {
  evaluateAiEstimateQuantityFormula,
  extractAiEstimateFormulaIdentifiers,
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
  parameterEnvironment: AiEstimateFormulaEnvironment,
  naturalLanguageBaseQuantity: number | null,
): AiEstimateFormulaEnvironment {
  const env: AiEstimateFormulaEnvironment = {};
  const formulaContext = row.sourceParameters?.formulaContext;
  const context = formulaContext && typeof formulaContext === "object" && !Array.isArray(formulaContext)
    ? formulaContext as Record<string, unknown>
    : null;
  // The evaluator can only observe identifiers referenced by this formula.
  // Project those keys with the same precedence as the former full object
  // copies: base < row context < natural-language q < canonical parameters.
  for (const key of extractAiEstimateFormulaIdentifiers(row.quantityFormula)) {
    if (Object.prototype.hasOwnProperty.call(baseEnvironment, key)) env[key] = baseEnvironment[key];
    if (context && Object.prototype.hasOwnProperty.call(context, key)) {
      putEnvironmentValue(env, key, context[key]);
    }
    if (naturalLanguageBaseQuantity != null && (key === "q" || key === "baseQuantity")) {
      env[key] = naturalLanguageBaseQuantity;
    }
    if (Object.prototype.hasOwnProperty.call(parameterEnvironment, key)) {
      env[key] = parameterEnvironment[key];
    }
  }
  return env;
}

function parameterFormulaEnvironment(
  params: Record<string, EstimateDraftRevisionParam>,
): AiEstimateFormulaEnvironment {
  const env: AiEstimateFormulaEnvironment = {};
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

const ACCESS_SYSTEM_TITLES_RU: Readonly<Record<string, string>> = Object.freeze({
  MOBILE_TOWER: "Передвижная вышка-тура подтверждённой конфигурации",
  FRAME_SCAFFOLD: "Инвентарные рамные леса подтверждённой конфигурации",
  SCISSOR_LIFT: "Самоходный ножничный подъёмник подтверждённой модели",
  ARTICULATED_BOOM_LIFT: "Коленчатый подъёмник подтверждённой модели",
  OWNED_COMPATIBLE_EQUIPMENT: "Собственное совместимое средство доступа пользователя",
});

function selectedAccessSystemTitle(
  params: Record<string, EstimateDraftRevisionParam>,
): string | null {
  const value = params.access_system_type?.value;
  if (typeof value !== "string" || !value.trim()) return null;
  return ACCESS_SYSTEM_TITLES_RU[value.trim()] ?? value.trim();
}

function projectConfirmedAccessChoice(
  row: ProfessionalBoqRow,
  params: Record<string, EstimateDraftRevisionParam>,
): ProfessionalBoqRow {
  const selectedTitle = selectedAccessSystemTitle(params);
  if (!selectedTitle) return row;
  const isAccessEquipment = row.rowId === "drywall_prepare_access_equipment";
  const isAccessOperations = row.rowId === "drywall_prepare_access_operations";
  const isAccessDelivery = row.rowId === "drywall_prepare_access_delivery";
  const isAccessReturn = row.rowId === "drywall_prepare_access_return";
  if (!isAccessEquipment && !isAccessOperations && !isAccessDelivery && !isAccessReturn) return row;
  const titleRu = isAccessEquipment
    ? selectedTitle
    : isAccessOperations
      ? `Подготовка, проверка, перестановка и завершение работы: ${selectedTitle}`
      : isAccessDelivery
        ? `Доставка на объект: ${selectedTitle}`
        : `Возврат поставщику: ${selectedTitle}`;
  return {
    ...row,
    titleRu,
    sourceParameters: {
      ...(row.sourceParameters ?? {}),
      selectedAccessSystemType: params.access_system_type?.value,
      selectedAccessSupplyMode: params.access_supply_mode?.value,
      elevatedWorkRequirementState: params.elevated_work_requirement_state?.value,
    },
  };
}

function resolvedConditionalRow(
  row: ProfessionalBoqRow,
  params: Record<string, EstimateDraftRevisionParam>,
  quantity: number,
): ProfessionalBoqRow {
  const blockerIds = Array.isArray(row.sourceParameters?.parameterBlockerIds)
    ? row.sourceParameters.parameterBlockerIds.filter(
      (value): value is string => typeof value === "string" && value.trim().length > 0,
    )
    : [];
  if (blockerIds.length === 0) return quantity === row.quantity ? row : { ...row, quantity };
  const blockersResolved = blockerIds.every((key) => params[key] != null);
  const requirementParam = stringSourceValue(row.sourceParameters ?? {}, "conditionalRequirementParam");
  const requirementValue = stringSourceValue(row.sourceParameters ?? {}, "conditionalRequirementValue");
  const requirementSatisfied = !requirementParam || !requirementValue ||
    params[requirementParam]?.value === requirementValue;
  const includedInEstimate = blockersResolved && requirementSatisfied && quantity > 0;
  const conditionalProcurementEligible = row.sourceParameters?.conditionalProcurementEligible === true ||
    row.rowType === "material";
  const includedInProcurement = includedInEstimate && conditionalProcurementEligible;
  const currentIncludedInEstimate = row.sourceParameters?.includedInEstimate !== false;
  if (
    quantity === row.quantity &&
    includedInEstimate === currentIncludedInEstimate &&
    includedInProcurement === row.includedInProcurement
  ) return row;
  return projectConfirmedAccessChoice({
    ...row,
    quantity,
    includedInProcurement,
    sourceParameters: {
      ...(row.sourceParameters ?? {}),
      includedInEstimate,
      includedInProcurement,
      conditionalInputsResolved: blockersResolved,
    },
  }, params);
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
  // Formula context can shadow the base environment, while canonical user
  // parameters must win. Compile those parameter values once per revision
  // instead of parsing and validating every value again for every BOQ row.
  const parameterEnvironment = parameterFormulaEnvironment(input.params);
  const changedParamValue = input.changedParamKey ? numericValue(input.params[input.changedParamKey]?.value) : null;
  const naturalLanguageQuantity = naturalLanguageBaseQuantity(input);

  return input.rows.map((row) => {
    let quantity = row.quantity;
    if (input.changedParamKey && row.rowId === input.changedParamKey && changedParamValue != null) {
      quantity = changedParamValue;
    } else {
      const recalculated = evaluateAiEstimateQuantityFormula({
        formula: row.quantityFormula,
        env: rowFormulaEnvironment(env, row, parameterEnvironment, naturalLanguageQuantity),
      });
      if (recalculated.ok && recalculated.value != null && recalculated.value >= 0) quantity = recalculated.value;
      else {
        const scaled = legacyS2BScaledQuantity({ row, params: input.params, changedParamKey: input.changedParamKey });
        if (scaled != null) quantity = scaled;
      }
    }
    setRowQuantityInEnvironment(env, row.rowId, quantity);
    return resolvedConditionalRow(row, input.params, quantity);
  });
}
