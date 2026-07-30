export type CanonicalProfessionalBoqUnit =
  | "m"
  | "lm"
  | "m2"
  | "m3"
  | "pcs"
  | "set"
  | "kg"
  | "t"
  | "l"
  | "m3_h"
  | "m3_day"
  | "roll"
  | "pack"
  | "bag"
  | "bucket"
  | "day"
  | "trip"
  | "man_hour"
  | "machine_hour"
  | "service"
  | "document"
  | "test"
  | "t_km"
  | "point"
  | "shift"
  | "m_drilling_depth"
  | "m2_glazing"
  | "m2_roof"
  | "m2_formwork"
  | "m3_concrete"
  | "kg_rebar"
  | "W"
  | "kW"
  | "MW";

const UNIT_SYNONYMS = new Map<string, CanonicalProfessionalBoqUnit>([
  ["m", "m"],
  ["meter", "m"],
  ["metre", "m"],
  ["lm", "lm"],
  ["linear_m", "lm"],
  ["linear_meter", "lm"],
  ["linear_metre", "lm"],
  ["m.p.", "lm"],
  ["m2", "m2"],
  ["sq_m", "m2"],
  ["sqm", "m2"],
  ["m3", "m3"],
  ["m3_h", "m3_h"],
  ["m3h", "m3_h"],
  ["m3_hour", "m3_h"],
  ["m3_per_hour", "m3_h"],
  ["m3_day", "m3_day"],
  ["m3d", "m3_day"],
  ["m3_per_day", "m3_day"],
  ["pcs", "pcs"],
  ["pc", "pcs"],
  ["piece", "pcs"],
  ["pieces", "pcs"],
  ["set", "set"],
  ["kg", "kg"],
  ["\u043a\u0433", "kg"],
  ["t", "t"],
  ["ton", "t"],
  ["tonne", "t"],
  ["\u0442\u043e\u043d\u043d\u0430", "t"],
  ["\u0442\u043e\u043d\u043d", "t"],
  ["l", "l"],
  ["liter", "l"],
  ["litre", "l"],
  ["\u043b\u0438\u0442\u0440", "l"],
  ["\u043b", "l"],
  ["roll", "roll"],
  ["\u0440\u0443\u043b\u043e\u043d", "roll"],
  ["pack", "pack"],
  ["package", "pack"],
  ["\u0443\u043f\u0430\u043a\u043e\u0432\u043a\u0430", "pack"],
  ["bag", "bag"],
  ["\u043c\u0435\u0448\u043e\u043a", "bag"],
  ["bucket", "bucket"],
  ["pail", "bucket"],
  ["\u0432\u0435\u0434\u0440\u043e", "bucket"],
  ["day", "day"],
  ["\u0434\u0435\u043d\u044c", "day"],
  ["trip", "trip"],
  ["\u0440\u0435\u0439\u0441", "trip"],
  ["man_hour", "man_hour"],
  ["labor_hour", "man_hour"],
  ["\u0447\u0435\u043b_\u0447\u0430\u0441", "man_hour"],
  ["machine_hour", "machine_hour"],
  ["equipment_hour", "machine_hour"],
  ["\u043c\u0430\u0448_\u0447\u0430\u0441", "machine_hour"],
  ["service", "service"],
  ["document", "document"],
  ["test", "test"],
  ["t_km", "t_km"],
  ["hour", "man_hour"],
  ["point", "point"],
  ["shift", "machine_hour"],
  ["m_drilling_depth", "m_drilling_depth"],
  ["m2_glazing", "m2_glazing"],
  ["m2_roof", "m2_roof"],
  ["m2_formwork", "m2_formwork"],
  ["m3_concrete", "m3_concrete"],
  ["kg_rebar", "kg_rebar"],
  ["w", "W"],
  ["kw", "kW"],
  ["mw", "MW"],
  ["\u0432\u0442", "W"],
  ["\u043a\u0432\u0442", "kW"],
  ["\u043c\u0432\u0442", "MW"],
]);

export const CANONICAL_PROFESSIONAL_BOQ_UNITS: readonly CanonicalProfessionalBoqUnit[] =
  Object.freeze([...new Set(UNIT_SYNONYMS.values())]);

function normalizeToken(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[\u00b2]/g, "2")
    .replace(/[\u00b3]/g, "3")
    .replace(/^(?:m3|\u043c3)(?:_|\/)?(?:h|hr|hour|\u0447|\u0447\u0430\u0441)$/u, "m3_h")
    .replace(/^(?:m3|\u043c3)_per_(?:h|hr|hour|\u0447|\u0447\u0430\u0441)$/u, "m3_h")
    .replace(/^(?:m3|\u043c3)(?:_|\/)?(?:d|day|\u0441\u0443\u0442|\u0441\u0443\u0442\u043a\u0438)$/u, "m3_day")
    .replace(/^(?:m3|\u043c3)_per_(?:d|day|\u0441\u0443\u0442|\u0441\u0443\u0442\u043a\u0438)$/u, "m3_day")
    .replace(/^\u043c\.?\u043f\.?$/u, "lm")
    .replace(/^\u043f\u043e\u0433\.?_\u043c$/u, "lm")
    .replace(/^\u043f\u043e\u0433\.?\u043c$/u, "lm")
    .replace(/^\u043c2$/u, "m2")
    .replace(/^\u043c3$/u, "m3")
    .replace(/^\u0448\u0442\.?$/u, "pcs")
    .replace(/^\u043a\u043e\u043c\u043f\u043b\u0435\u043a\u0442$/u, "set")
    .replace(/^\u043b\u0438\u0442\u0440$/u, "l")
    .replace(/^\u043b$/u, "l");
}

export function normalizeCanonicalProfessionalBoqUnit(
  unit: string | null | undefined,
): CanonicalProfessionalBoqUnit | null {
  if (!unit) return null;
  return UNIT_SYNONYMS.get(normalizeToken(unit)) ?? null;
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
