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
  | "roll"
  | "bag"
  | "day"
  | "trip"
  | "man_hour"
  | "machine_hour"
  | "point"
  | "shift"
  | "m_drilling_depth"
  | "m2_glazing"
  | "m2_roof"
  | "m2_formwork"
  | "m3_concrete"
  | "kg_rebar";

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
  ["pcs", "pcs"],
  ["pc", "pcs"],
  ["piece", "pcs"],
  ["pieces", "pcs"],
  ["set", "set"],
  ["kg", "kg"],
  ["t", "t"],
  ["ton", "t"],
  ["tonne", "t"],
  ["l", "l"],
  ["liter", "l"],
  ["litre", "l"],
  ["roll", "roll"],
  ["bag", "bag"],
  ["day", "day"],
  ["trip", "trip"],
  ["man_hour", "man_hour"],
  ["labor_hour", "man_hour"],
  ["machine_hour", "machine_hour"],
  ["equipment_hour", "machine_hour"],
  ["hour", "man_hour"],
  ["point", "point"],
  ["shift", "machine_hour"],
  ["m_drilling_depth", "m_drilling_depth"],
  ["m2_glazing", "m2_glazing"],
  ["m2_roof", "m2_roof"],
  ["m2_formwork", "m2_formwork"],
  ["m3_concrete", "m3_concrete"],
  ["kg_rebar", "kg_rebar"],
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
  ].filter(Boolean).join(" ").toLowerCase();
}

function labelFor(input: ProfessionalBoqUnitValidationInput): string {
  return String(input.rowLabel ?? "").toLowerCase();
}

function primaryLabelFor(input: ProfessionalBoqUnitValidationInput): string {
  return labelFor(input).split(/\s+\u0434\u043b\u044f\s+/u)[0] ?? "";
}

function isMaterial(input: ProfessionalBoqUnitValidationInput): boolean {
  return String(input.rowKind ?? "").toLowerCase() === "material";
}

export function validateProfessionalBoqUnit(
  input: ProfessionalBoqUnitValidationInput,
): ProfessionalBoqUnitValidation {
  const canonicalUnit = normalizeCanonicalProfessionalBoqUnit(input.unit);
  const blockingReasons: string[] = [];
  const text = textFor(input);
  const primaryLabel = primaryLabelFor(input);

  if (!canonicalUnit) blockingReasons.push("UNKNOWN_UNIT");
  if (/diamond|drilling|\u0431\u0443\u0440\u0435\u043d|\u0441\u0432\u0435\u0440\u043b/i.test(text) && canonicalUnit === "m2") {
    blockingReasons.push("DIAMOND_DRILLING_WRONG_M2_UNIT");
  }
  if (/(concrete|\u0431\u0435\u0442\u043e\u043d(?:\s|$)|\u0431\u0435\u0442\u043e\u043d\u043d\u0430\u044f\s+\u0441\u043c\u0435\u0441\u044c)/i.test(primaryLabel) && isMaterial(input) && canonicalUnit === "m2") {
    blockingReasons.push("CONCRETE_MATERIAL_WRONG_M2_UNIT");
  }
  if (/rebar|\u0430\u0440\u043c\u0430\u0442\u0443\u0440/i.test(primaryLabel) && isMaterial(input) && canonicalUnit === "m2") {
    blockingReasons.push("REBAR_MATERIAL_WRONG_M2_UNIT");
  }
  if (
    /(paint|primer|glue|putty|\u043a\u0440\u0430\u0441\u043a|\u0433\u0440\u0443\u043d\u0442\u043e\u0432|\u043a\u043b\u0435\u0439|\u0448\u043f\u0430\u043a\u043b\u0435\u0432|\u0448\u043f\u0430\u043a\u043b\u0451\u0432)/i.test(primaryLabel) &&
    isMaterial(input) &&
    canonicalUnit === "m2"
  ) {
    blockingReasons.push("CONSUMABLE_MATERIAL_WRONG_M2_UNIT");
  }
  if (/(baseboard|plinth|\u043f\u043b\u0438\u043d\u0442\u0443\u0441)/i.test(primaryLabel) && canonicalUnit === "m2") {
    blockingReasons.push("BASEBOARD_WRONG_M2_UNIT");
  }
  if (
    /(?:^|\s)(pipe|cable|\u0442\u0440\u0443\u0431\u0430|\u0442\u0440\u0443\u0431\u044b|\u0442\u0440\u0443\u0431\u043e\u043f\u0440\u043e\u0432\u043e\u0434|\u043a\u0430\u0431\u0435\u043b\u044c|\u043a\u0430\u0431\u0435\u043b\u0438)(?:\s|$)/i.test(primaryLabel) &&
    canonicalUnit !== null &&
    !["m", "lm", "pcs", "set"].includes(canonicalUnit)
  ) {
    blockingReasons.push("LINEAR_SYSTEM_WRONG_UNIT");
  }
  if (
    /(glazing|glass\s+unit|\u043e\u0441\u0442\u0435\u043a\u043b\u0435\u043d|\u0441\u0442\u0435\u043a\u043b\u043e\u043f\u0430\u043a\u0435\u0442|\u0432\u0438\u0442\u0440\u0430\u0436)/i.test(primaryLabel) &&
    canonicalUnit !== null &&
    !["m2", "m2_glazing", "pcs", "set"].includes(canonicalUnit)
  ) {
    blockingReasons.push("GLAZING_WRONG_UNIT");
  }

  return {
    valid: blockingReasons.length === 0,
    canonicalUnit,
    blocking_reasons: blockingReasons,
  };
}
