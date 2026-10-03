import { compileFormulaGraph, evaluateFormulaGraph, compareFormulaGraphDecimals, type CompiledFormulaGraph } from "./formulaGraph";

export type InclusionGraphAst = Record<string, unknown>;
const conditionFormulas = new WeakMap<InclusionGraphAst, CompiledFormulaGraph>();

function conditionFormula(ast: InclusionGraphAst): CompiledFormulaGraph {
  if (typeof ast.expression !== "string" || !ast.expression.trim()
    || typeof ast.unitId !== "string" || !ast.unitId.trim()
    || typeof ast.value !== "number" || !Number.isFinite(ast.value)) {
    throw new InclusionGraphEvaluationError("formula comparison requires an expression, output unit and finite threshold");
  }
  const cached = conditionFormulas.get(ast);
  // Metadata is immutable in normal use. Also defend callers replacing a
  // source expression on an existing object; never reuse a different formula.
  if (cached?.source === ast.expression) return cached;
  const formula = compileFormulaGraph(ast.expression);
  conditionFormulas.set(ast, formula);
  return formula;
}

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
  if (kind === "formula_greater_than") {
    const formula = conditionFormula(ast);
    const missing = formula.inputParameterIds.filter(id =>
      parameters[id] === undefined || parameters[id] === null || parameters[id] === "");
    if (missing.length) return { value: null, missingParameterIds: missing };
    const numericParameters = Object.fromEntries(formula.inputParameterIds.map(id => {
      const value = parameters[id];
      finiteNumber(value, id);
      // Validate scalar shape without converting exact decimal strings to
      // floating point before the existing fixed-decimal graph evaluates them.
      return [id, value as string | number];
    }));
    return { value: compareFormulaGraphDecimals(evaluateFormulaGraph(formula.ast, numericParameters), ast.value as number) > 0, missingParameterIds: [] };
  }
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
  const numericComparison = kind.startsWith("greater_than") || kind.startsWith("less_than");
  const hasPeerOperand = Object.prototype.hasOwnProperty.call(ast, "valueParameterId");
  const valueParameterId = hasPeerOperand && typeof ast.valueParameterId === "string"
    ? ast.valueParameterId.trim() : "";
  if (hasPeerOperand && (!numericComparison || !valueParameterId
    || Object.prototype.hasOwnProperty.call(ast, "value"))) {
    throw new InclusionGraphEvaluationError("numeric comparison requires exactly one literal or peer operand");
  }
  if (numericComparison && !hasPeerOperand) finiteNumber(ast.value, `${parameterId}.value`);
  if (hasPeerOperand) {
    // Compare the two original facts, not a second user-entered calculated
    // applicability flag. Keep unknowns explicit and zero as a real value.
    const missingParameterIds = [...new Set([parameterId, valueParameterId].filter(id =>
      !Object.prototype.hasOwnProperty.call(parameters, id)
      || parameters[id] === undefined || parameters[id] === null || parameters[id] === ""
    ))].sort();
    if (missingParameterIds.length) return { value: null, missingParameterIds };
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
  const right = finiteNumber(hasPeerOperand ? parameters[valueParameterId] : ast.value,
    hasPeerOperand ? valueParameterId : `${parameterId}.value`);
  if (kind === "greater_than") return { value: finiteNumber(actual, parameterId) > right, missingParameterIds: [] };
  if (kind === "greater_than_or_equal") return { value: finiteNumber(actual, parameterId) >= right, missingParameterIds: [] };
  if (kind === "less_than") return { value: finiteNumber(actual, parameterId) < right, missingParameterIds: [] };
  if (kind === "less_than_or_equal") return { value: finiteNumber(actual, parameterId) <= right, missingParameterIds: [] };
  throw new InclusionGraphEvaluationError(`unsupported inclusion AST kind ${kind || "<empty>"}`);
}

export function evaluateInclusionGraph(ast: InclusionGraphAst, parameters: Record<string, unknown>): boolean {
  return resolveInclusionGraph(ast, parameters).value === true;
}

/** Original facts used to decide this branch, excluding unused OR alternatives. */
export function inclusionGraphEvidenceParameterIds(
  ast: InclusionGraphAst,
  parameters: Record<string, unknown>,
  unresolvedEvidenceCount: (ids: readonly string[]) => number = () => 0,
): string[] {
  if (ast.kind === "literal") return [];
  if (ast.kind === "formula_greater_than") return [...conditionFormula(ast).inputParameterIds];
  if (ast.kind === "not") {
    return inclusionGraphEvidenceParameterIds(ast.operand as InclusionGraphAst, parameters, unresolvedEvidenceCount);
  }
  if (ast.kind === "and" || ast.kind === "or") {
    const children = childNodes(ast);
    const decisive = children.filter(child =>
      resolveInclusionGraph(child, parameters).value === (ast.kind === "or"));
    const evidence = (decisive.length ? decisive : children)
      .map(child => inclusionGraphEvidenceParameterIds(child, parameters, unresolvedEvidenceCount));
    if (decisive.length) {
      // Any decisive alternative is sufficient. Prefer independently proven
      // facts so an unused comparison does not block a known OR branch.
      return evidence.reduce((best, ids) => unresolvedEvidenceCount(ids) < unresolvedEvidenceCount(best) ? ids : best);
    }
    return mergeMissing(...evidence);
  }
  return [...new Set([ast.kind === "parameter" ? ast.id : ast.parameterId, ast.valueParameterId]
    .filter((id): id is string => typeof id === "string" && id.length > 0))].sort();
}
