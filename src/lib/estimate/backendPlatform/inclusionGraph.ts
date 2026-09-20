export type InclusionGraphAst = Record<string, unknown>;

export type InclusionGraphResolution = {
  /** null means that the definition branch cannot yet be decided from supplied inputs. */
  value: boolean | null;
  missingParameterIds: string[];
};

export class InclusionGraphEvaluationError extends Error {
  readonly code = "INVALID_INCLUSION_GRAPH" as const;

  constructor(message: string) {
    super(message);
    this.name = "InclusionGraphEvaluationError";
  }
}

function finiteNumber(value: unknown, label: string): number {
  if ((typeof value !== "number" && typeof value !== "string") || String(value).trim() === "") {
    throw new InclusionGraphEvaluationError(`missing numeric operand ${label}`);
  }
  const number = Number(value);
  if (!Number.isFinite(number)) throw new InclusionGraphEvaluationError(`invalid numeric operand ${label}`);
  return number;
}

function childNodes(ast: InclusionGraphAst): InclusionGraphAst[] {
  const raw = Array.isArray(ast.operands) ? ast.operands : Array.isArray(ast.conditions) ? ast.conditions : null;
  if (!raw || raw.length === 0 || raw.some((entry) => !entry || typeof entry !== "object" || Array.isArray(entry))) {
    throw new InclusionGraphEvaluationError("logical node requires non-empty object children");
  }
  return raw as InclusionGraphAst[];
}

function mergeMissing(...groups: readonly string[][]): string[] {
  return [...new Set(groups.flat())].sort();
}

export function resolveInclusionGraph(
  ast: InclusionGraphAst,
  parameters: Record<string, unknown>,
): InclusionGraphResolution {
  if (!ast || typeof ast !== "object" || Array.isArray(ast)) {
    throw new InclusionGraphEvaluationError("inclusion AST must be an object");
  }
  const kind = String(ast.kind ?? "");
  if (kind === "literal") {
    if (typeof ast.value !== "boolean") {
      throw new InclusionGraphEvaluationError("literal node requires boolean value");
    }
    return { value: ast.value, missingParameterIds: [] };
  }
  if (kind === "parameter") {
    const parameterId = String(ast.id ?? "");
    if (!parameterId) throw new InclusionGraphEvaluationError("parameter node requires id");
    if (!Object.prototype.hasOwnProperty.call(parameters, parameterId)
      || parameters[parameterId] === undefined
      || parameters[parameterId] === null
      || parameters[parameterId] === "") {
      return { value: null, missingParameterIds: [parameterId] };
    }
    return { value: parameters[parameterId] === true, missingParameterIds: [] };
  }
  if (kind === "present") {
    const parameterId = String(ast.parameterId ?? "");
    if (!parameterId) throw new InclusionGraphEvaluationError("present node requires parameterId");
    const value = parameters[parameterId];
    return value !== undefined && value !== null && value !== ""
      ? { value: true, missingParameterIds: [] }
      : { value: null, missingParameterIds: [parameterId] };
  }
  if (kind === "not") {
    if (!ast.operand || typeof ast.operand !== "object" || Array.isArray(ast.operand)) {
      throw new InclusionGraphEvaluationError("not node requires one operand");
    }
    const child = resolveInclusionGraph(ast.operand as InclusionGraphAst, parameters);
    return { value: child.value == null ? null : !child.value, missingParameterIds: child.missingParameterIds };
  }
  if (kind === "and" || kind === "or") {
    const children = childNodes(ast).map((entry) => resolveInclusionGraph(entry, parameters));
    const decided = kind === "and"
      ? children.some((entry) => entry.value === false) ? false
        : children.every((entry) => entry.value === true) ? true : null
      : children.some((entry) => entry.value === true) ? true
        : children.every((entry) => entry.value === false) ? false : null;
    return {
      value: decided,
      missingParameterIds: decided == null
        ? mergeMissing(...children.filter((entry) => entry.value == null).map((entry) => entry.missingParameterIds))
      : [],
    };
  }
  const comparisonKinds = new Set([
    "equals",
    "not_equals",
    "in",
    "greater_than",
    "greater_than_or_equal",
    "less_than",
    "less_than_or_equal",
  ]);
  if (!comparisonKinds.has(kind)) {
    throw new InclusionGraphEvaluationError(`unsupported inclusion AST kind ${kind || "<empty>"}`);
  }
  const parameterId = String(ast.parameterId ?? "");
  if (!parameterId) throw new InclusionGraphEvaluationError(`${kind || "unknown"} node requires parameterId`);
  if ((kind === "equals" || kind === "not_equals") && !Object.prototype.hasOwnProperty.call(ast, "value")) {
    throw new InclusionGraphEvaluationError(`${kind} node requires value`);
  }
  if (kind === "in" && (!Array.isArray(ast.values) || ast.values.length === 0)) {
    throw new InclusionGraphEvaluationError("in node requires values");
  }
  if (kind.startsWith("greater_than") || kind.startsWith("less_than")) {
    finiteNumber(ast.value, `${parameterId}.value`);
  }
  if (!Object.prototype.hasOwnProperty.call(parameters, parameterId)
    || parameters[parameterId] === undefined
    || parameters[parameterId] === null
    || parameters[parameterId] === "") {
    return { value: null, missingParameterIds: [parameterId] };
  }
  const actual = parameters[parameterId];
  if (kind === "equals" || kind === "not_equals") {
    return { value: kind === "equals" ? actual === ast.value : actual !== ast.value, missingParameterIds: [] };
  }
  if (kind === "in") {
    return { value: (ast.values as unknown[]).includes(actual), missingParameterIds: [] };
  }
  if (kind === "greater_than") return { value: finiteNumber(actual, parameterId) > finiteNumber(ast.value, `${parameterId}.value`), missingParameterIds: [] };
  if (kind === "greater_than_or_equal") return { value: finiteNumber(actual, parameterId) >= finiteNumber(ast.value, `${parameterId}.value`), missingParameterIds: [] };
  if (kind === "less_than") return { value: finiteNumber(actual, parameterId) < finiteNumber(ast.value, `${parameterId}.value`), missingParameterIds: [] };
  if (kind === "less_than_or_equal") return { value: finiteNumber(actual, parameterId) <= finiteNumber(ast.value, `${parameterId}.value`), missingParameterIds: [] };
  throw new InclusionGraphEvaluationError(`unsupported inclusion AST kind ${kind || "<empty>"}`);
}

export function evaluateInclusionGraph(ast: InclusionGraphAst, parameters: Record<string, unknown>): boolean {
  return resolveInclusionGraph(ast, parameters).value === true;
}
