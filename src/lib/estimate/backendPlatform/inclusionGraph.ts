export type InclusionGraphAst = Record<string, unknown>;

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

export function evaluateInclusionGraph(ast: InclusionGraphAst, parameters: Record<string, unknown>): boolean {
  if (!ast || typeof ast !== "object" || Array.isArray(ast)) {
    throw new InclusionGraphEvaluationError("inclusion AST must be an object");
  }
  const kind = String(ast.kind ?? "");
  if (kind === "literal") {
    if (typeof ast.value !== "boolean") {
      throw new InclusionGraphEvaluationError("literal node requires boolean value");
    }
    return ast.value;
  }
  if (kind === "parameter") {
    const parameterId = String(ast.id ?? "");
    if (!parameterId) throw new InclusionGraphEvaluationError("parameter node requires id");
    return parameters[parameterId] === true;
  }
  if (kind === "not") {
    if (!ast.operand || typeof ast.operand !== "object" || Array.isArray(ast.operand)) {
      throw new InclusionGraphEvaluationError("not node requires one operand");
    }
    return !evaluateInclusionGraph(ast.operand as InclusionGraphAst, parameters);
  }
  if (kind === "and" || kind === "or") {
    const children = childNodes(ast);
    return kind === "and"
      ? children.every((entry) => evaluateInclusionGraph(entry, parameters))
      : children.some((entry) => evaluateInclusionGraph(entry, parameters));
  }
  const parameterId = String(ast.parameterId ?? "");
  if (!parameterId) throw new InclusionGraphEvaluationError(`${kind || "unknown"} node requires parameterId`);
  const actual = parameters[parameterId];
  if (kind === "equals" || kind === "not_equals") {
    if (!Object.prototype.hasOwnProperty.call(ast, "value")) {
      throw new InclusionGraphEvaluationError(`${kind} node requires value`);
    }
    return kind === "equals" ? actual === ast.value : actual !== ast.value;
  }
  if (kind === "in") {
    if (!Array.isArray(ast.values) || ast.values.length === 0) throw new InclusionGraphEvaluationError("in node requires values");
    return ast.values.includes(actual);
  }
  if (kind === "greater_than") return finiteNumber(actual, parameterId) > finiteNumber(ast.value, `${parameterId}.value`);
  if (kind === "greater_than_or_equal") return finiteNumber(actual, parameterId) >= finiteNumber(ast.value, `${parameterId}.value`);
  if (kind === "less_than") return finiteNumber(actual, parameterId) < finiteNumber(ast.value, `${parameterId}.value`);
  if (kind === "less_than_or_equal") return finiteNumber(actual, parameterId) <= finiteNumber(ast.value, `${parameterId}.value`);
  throw new InclusionGraphEvaluationError(`unsupported inclusion AST kind ${kind || "<empty>"}`);
}
