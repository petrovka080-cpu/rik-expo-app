import {
  STRIP_FOUNDATION_REINFORCEMENT_PARAMETERS,
  STRIP_FOUNDATION_REINFORCEMENT_TARGETS,
} from "../v4/stripFoundationReinforcementR1";

type Primitive = string | number | boolean;

const CATALOG_IDS: ReadonlySet<string> = new Set(
  STRIP_FOUNDATION_REINFORCEMENT_TARGETS.map((target) => target.catalogId),
);

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

const PARAMETER_LABEL_PATTERN = STRIP_FOUNDATION_REINFORCEMENT_PARAMETERS
  .map((parameter) => escapeRegExp(parameter.title_ru))
  .join("|");

function labeledValue(text: string, titleRu: string): string | null {
  return text.match(new RegExp(
    `${escapeRegExp(titleRu)}\\s*[:=]\\s*([\\s\\S]*?)(?=\\s+(?:${PARAMETER_LABEL_PATTERN})\\s*[:=]|$)`,
    "iu",
  ))?.[1]?.trim() || null;
}

function parseBoolean(value: string): boolean | null {
  const normalized = value.trim().toLocaleLowerCase("ru-RU");
  if (["да", "true", "1"].includes(normalized)) return true;
  if (["нет", "false", "0"].includes(normalized)) return false;
  return null;
}

export function stripFoundationReinforcementPromptDetailsR1(
  values: Readonly<Record<string, Primitive>>,
): string[] {
  return STRIP_FOUNDATION_REINFORCEMENT_PARAMETERS.map((parameter) => {
    const value = values[parameter.parameter_id];
    if (value == null) {
      throw new Error(`STRIP_FOUNDATION_REINFORCEMENT_PROMPT_VALUE_MISSING:${parameter.parameter_id}`);
    }
    const rendered = typeof value === "boolean" ? (value ? "да" : "нет") : String(value);
    return `${parameter.title_ru}: ${rendered}`;
  });
}

/**
 * Reads the complete approved bar schedule and execution schedule from the
 * ordinary user form. It only recognizes the seven exact strip-foundation
 * reinforcement identities and never derives steel mass from concrete volume.
 */
export function extractStripFoundationReinforcementCanonicalParametersR1(input: {
  catalogId: string;
  text: string;
}): Readonly<Record<string, Primitive>> | null {
  if (!CATALOG_IDS.has(input.catalogId)) return null;
  const result: Record<string, Primitive> = {};
  for (const parameter of STRIP_FOUNDATION_REINFORCEMENT_PARAMETERS) {
    const raw = labeledValue(input.text, parameter.title_ru);
    if (raw == null) continue;
    if (parameter.value_type === "decimal" || parameter.value_type === "integer") {
      const value = Number(raw.replace(/\s+/gu, "").replace(",", "."));
      if (Number.isFinite(value)) result[parameter.parameter_id] = value;
      continue;
    }
    if (parameter.value_type === "boolean") {
      const value = parseBoolean(raw);
      if (value != null) result[parameter.parameter_id] = value;
      continue;
    }
    result[parameter.parameter_id] = raw;
  }
  return Object.keys(result).length > 0 ? Object.freeze(result) : null;
}
