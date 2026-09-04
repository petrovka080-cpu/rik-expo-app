const FORMULA_FUNCTIONS = new Set(["abs", "ceil", "floor", "max", "min", "pow", "round", "sqrt"]);
const NON_MEASURE_PARAMETER = /^(?:source_prompt|project_location|drawings_or_specification|equipment_specification|geology_profile|loads)$/u;

export class CanonicalFormulaSourceBindingError extends Error {
  readonly code = "FORMULA_SOURCE_PARAMETER_UNRESOLVED" as const;

  constructor(readonly identifiers: readonly string[]) {
    super(`formula source parameters are unresolved: ${identifiers.join(",")}`);
    this.name = "CanonicalFormulaSourceBindingError";
  }
}

function normalizedFormulaSource(source: string): string {
  return source.split(";")[0]!
    .replace(/^([A-Za-z_][A-Za-z0-9_.]*)\s+or\b.*$/iu, "$1")
    .replace(/\s+(?:preliminary|shoulders|steel_t)$/iu, "")
    .trim();
}

export function canonicalFixedQuantityStatedBySource(source: string): string | null {
  const normalized = normalizedFormulaSource(source);
  const match = /^([+-]?\d+(?:\.\d+)?)(?:\s+[A-Za-z][A-Za-z _-]*)?$/u.exec(normalized);
  return match?.[1] ?? null;
}

function parameterAlias(identifier: string, parameterIds: ReadonlySet<string>): string | null {
  const candidates = [...parameterIds].filter((parameterId) => {
    if (NON_MEASURE_PARAMETER.test(parameterId) || parameterId.length < 4) return false;
    return identifier.startsWith(`${parameterId}_`) || identifier.endsWith(`_${parameterId}`);
  });
  return candidates.length === 1 ? candidates[0]! : null;
}

/**
 * Binds an authoritative formula to declared definition parameters.
 * Baseline/context values are deliberately not accepted here: replacing an
 * unresolved identifier with an example number would freeze every revision.
 */
export function bindCanonicalFormulaSource(input: {
  source: string;
  parameterIds: ReadonlySet<string>;
  derivedFormulas?: ReadonlyMap<string, string>;
  resolving?: ReadonlySet<string>;
}): string {
  const normalizedSource = normalizedFormulaSource(input.source);
  const fixedQuantity = canonicalFixedQuantityStatedBySource(normalizedSource);
  if (fixedQuantity != null) return fixedQuantity;

  const unresolved = new Set<string>();
  const result = normalizedSource.replace(/[A-Za-z_][A-Za-z0-9_.]*/gu, (identifier) => {
    if (FORMULA_FUNCTIONS.has(identifier) || input.parameterIds.has(identifier)) return identifier;
    if (identifier.toLocaleLowerCase("en-US") === "pi") return String(Math.PI);
    const alias = parameterAlias(identifier, input.parameterIds);
    if (alias) return alias;
    const derivedId = input.derivedFormulas?.has(identifier)
      ? identifier
      : input.derivedFormulas?.has(`${identifier}_count`)
        ? `${identifier}_count`
        : null;
    if (derivedId && !input.resolving?.has(derivedId)) {
      return `(${bindCanonicalFormulaSource({
        ...input,
        source: input.derivedFormulas!.get(derivedId)!,
        resolving: new Set(input.resolving).add(derivedId),
      })})`;
    }
    unresolved.add(identifier);
    return identifier;
  });
  if (unresolved.size > 0) {
    throw new CanonicalFormulaSourceBindingError([...unresolved].sort());
  }
  return result;
}
