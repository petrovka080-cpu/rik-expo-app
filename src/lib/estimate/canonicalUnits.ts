import {
  CANONICAL_PROFESSIONAL_BOQ_UNIT_CODES,
  resolveProfessionalUnitDefinition,
  type CanonicalProfessionalBoqUnit,
} from "./professionalUnitRegistry";

export type { CanonicalProfessionalBoqUnit } from "./professionalUnitRegistry";

export const CANONICAL_PROFESSIONAL_BOQ_UNITS: readonly CanonicalProfessionalBoqUnit[] =
  CANONICAL_PROFESSIONAL_BOQ_UNIT_CODES;

export function normalizeCanonicalProfessionalBoqUnit(
  unit: string | null | undefined,
): CanonicalProfessionalBoqUnit | null {
  const definition = resolveProfessionalUnitDefinition(unit);
  return definition?.boqCanonical ? definition.code as CanonicalProfessionalBoqUnit : null;
}

export type ProfessionalBoqUnitValidationInput = {
  unit: string | null | undefined;
  rowLabel?: string | null;
  rowCode?: string | null;
  rowKind?: string | null;
  workFamily?: string | null;
  normId?: string | null;
  normPackId?: string | null;
  normSourceId?: string | null;
};

export type ProfessionalBoqUnitValidation = {
  valid: boolean;
  canonicalUnit: CanonicalProfessionalBoqUnit | null;
  blocking_reasons: string[];
};

function textFor(input: ProfessionalBoqUnitValidationInput): string {
  return [
    input.workFamily,
    input.rowCode,
    input.rowLabel,
    input.normId,
    input.normPackId,
    input.normSourceId,
  ].filter(Boolean).join(" ").toLowerCase();
}

function normTextFor(input: ProfessionalBoqUnitValidationInput): string {
  return [
    input.normPackId,
    input.normSourceId,
  ].filter(Boolean).join(" ").toLowerCase();
}

function labelFor(input: ProfessionalBoqUnitValidationInput): string {
  return String(input.rowLabel ?? "").toLowerCase();
}

function primaryLabelFor(input: ProfessionalBoqUnitValidationInput): string {
  return labelFor(input).split(/\s+\u0434\u043b\u044f\s+|:/u)[0] ?? "";
}

function isMaterial(input: ProfessionalBoqUnitValidationInput): boolean {
  return String(input.rowKind ?? "").toLowerCase() === "material";
}

function pushReason(reasons: string[], reason: string): void {
  if (!reasons.includes(reason)) reasons.push(reason);
}

function hasDirectConcreteSignal(primaryLabel: string, normText: string): boolean {
  if (/(paver|paving|tile|slab\s+unit|border\s+stone|\u0431\u0440\u0443\u0441\u0447\u0430\u0442|\u043f\u043b\u0438\u0442\u043a|\u043f\u043b\u0438\u0442\u0430)/i.test(primaryLabel)) {
    return false;
  }
  return /(concrete|\u0431\u0435\u0442\u043e\u043d(?:\s|$)|\u0431\u0435\u0442\u043e\u043d\u043d\u0430\u044f\s+\u0441\u043c\u0435\u0441\u044c)/i.test(primaryLabel) ||
    /(?:^|[_:\s/-])(?:concrete_ready_mix|ready_mix)(?:[_:\s/-]|$)/i.test(normText);
}

function hasDirectRebarSignal(primaryLabel: string, normText: string): boolean {
  return /rebar|\u0430\u0440\u043c\u0430\u0442\u0443\u0440/i.test(primaryLabel) ||
    /(?:^|[_:\s/-])(?:rebar|reinforcement_rebar|kg_rebar)(?:[_:\s/-]|$)/i.test(normText);
}

function hasDirectConsumableSignal(primaryLabel: string, normText: string): boolean {
  return /(paint|primer|glue|putty|\u043a\u0440\u0430\u0441\u043a|\u0433\u0440\u0443\u043d\u0442\u043e\u0432|\u043a\u043b\u0435\u0439|\u0448\u043f\u0430\u043a\u043b\u0435\u0432|\u0448\u043f\u0430\u043a\u043b\u0451\u0432)/i.test(primaryLabel) ||
    /(?:^|[_:\s/-])(?:primer|glue|ct17|ct54|ct126|ceresit_ct17|ceresit_ct54|ceresit_ct126)(?:[_:\s/-]|$)/i.test(normText);
}

function hasDirectLinearSystemSignal(primaryLabel: string): boolean {
  if (/(bedding|backfill|sand|gravel|\u043e\u0441\u043d\u043e\u0432\u0430\u043d|\u043e\u0431\u0441\u044b\u043f|\u043f\u0435\u0441\u0447\u0430\u043d|\u0449\u0435\u0431\u0435\u043d)/i.test(primaryLabel)) {
    return false;
  }
  return /(?:^|\s)(pipe|cable|\u0442\u0440\u0443\u0431\u0430|\u0442\u0440\u0443\u0431\u044b|\u0442\u0440\u0443\u0431\u043e\u043f\u0440\u043e\u0432\u043e\u0434|\u043a\u0430\u0431\u0435\u043b\u044c|\u043a\u0430\u0431\u0435\u043b\u0438)(?:\s|$)/i.test(primaryLabel);
}

export function validateProfessionalBoqUnit(
  input: ProfessionalBoqUnitValidationInput,
): ProfessionalBoqUnitValidation {
  const canonicalUnit = normalizeCanonicalProfessionalBoqUnit(input.unit);
  const blockingReasons: string[] = [];
  const text = textFor(input);
  const normText = normTextFor(input);
  const primaryLabel = primaryLabelFor(input);

  if (!canonicalUnit) pushReason(blockingReasons, "UNKNOWN_UNIT");
  if (/diamond|drilling|\u0431\u0443\u0440\u0435\u043d|\u0441\u0432\u0435\u0440\u043b/i.test(text) && canonicalUnit === "m2") {
    pushReason(blockingReasons, "DIAMOND_DRILLING_WRONG_M2_UNIT");
  }
  if (hasDirectConcreteSignal(primaryLabel, normText) && isMaterial(input) && canonicalUnit === "m2") {
    pushReason(blockingReasons, "CONCRETE_MATERIAL_WRONG_M2_UNIT");
  }
  if (hasDirectRebarSignal(primaryLabel, normText) && isMaterial(input) && canonicalUnit === "m2") {
    pushReason(blockingReasons, "REBAR_MATERIAL_WRONG_M2_UNIT");
  }
  if (
    hasDirectConsumableSignal(primaryLabel, normText) &&
    isMaterial(input) &&
    canonicalUnit === "m2"
  ) {
    pushReason(blockingReasons, "CONSUMABLE_MATERIAL_WRONG_M2_UNIT");
  }
  if (/(baseboard|plinth|\u043f\u043b\u0438\u043d\u0442\u0443\u0441)/i.test(text) && canonicalUnit === "m2") {
    pushReason(blockingReasons, "BASEBOARD_WRONG_M2_UNIT");
  }
  if (
    isMaterial(input) &&
    hasDirectLinearSystemSignal(primaryLabel) &&
    canonicalUnit !== null &&
    !["m", "lm", "pcs", "set"].includes(canonicalUnit)
  ) {
    pushReason(blockingReasons, "LINEAR_SYSTEM_WRONG_UNIT");
  }
  if (
    isMaterial(input) &&
    /(glazing|glass\s+unit|\u043e\u0441\u0442\u0435\u043a\u043b\u0435\u043d|\u0441\u0442\u0435\u043a\u043b\u043e\u043f\u0430\u043a\u0435\u0442|\u0432\u0438\u0442\u0440\u0430\u0436)/i.test(primaryLabel) &&
    canonicalUnit !== null &&
    !["m", "lm", "m2", "m2_glazing", "pcs", "set", "kg", "l"].includes(canonicalUnit)
  ) {
    pushReason(blockingReasons, "GLAZING_WRONG_UNIT");
  }

  return {
    valid: blockingReasons.length === 0,
    canonicalUnit,
    blocking_reasons: blockingReasons,
  };
}
