import {
  getEngineeringUnitV4,
  resolveEngineeringUnitV4,
  type DimensionAxisV4,
  type DimensionVectorV4,
} from "./engineeringUnitRegistryV4";

export type FormulaDimensionBlockerV4 =
  | "FORMULA_DIMENSION_MISMATCH"
  | "PARAMETER_UNIT_MISSING"
  | "PARAMETER_UNIT_NOT_ALLOWED"
  | "ROW_UNIT_NOT_ALLOWED"
  | "UNCONVERTED_UNIT"
  | "FORMULA_INPUT_DIMENSION_UNKNOWN"
  | "OUTPUT_DIMENSION_UNKNOWN";

export type FormulaDimensionValidationV4 = {
  ok: boolean;
  blockers: FormulaDimensionBlockerV4[];
  dependencies: string[];
  result_vector: DimensionVectorV4 | null;
  output_vector: DimensionVectorV4 | null;
  trace: string[];
};

type Token =
  | { kind: "number"; value: number }
  | { kind: "identifier"; value: string }
  | { kind: "operator"; value: "+" | "-" | "*" | "/" }
  | { kind: "paren"; value: "(" | ")" }
  | { kind: "comma" };

const AXES: DimensionAxisV4[] = [
  "length", "mass", "time", "temperature", "count", "labor_time", "machine_time", "package", "service", "test", "document", "currency",
];
const DIMENSION_PRESERVING_FUNCTIONS = new Set(["round", "round_to", "ceil", "floor", "min", "max"]);

function normalizeVector(vector: DimensionVectorV4): DimensionVectorV4 {
  const result: DimensionVectorV4 = {};
  for (const axis of AXES) {
    const exponent = vector[axis] ?? 0;
    if (Math.abs(exponent) > 1e-9) result[axis] = Number(exponent.toFixed(8));
  }
  return result;
}
function combine(left: DimensionVectorV4, right: DimensionVectorV4, sign: 1 | -1): DimensionVectorV4 {
  const result: DimensionVectorV4 = {};
  for (const axis of AXES) result[axis] = (left[axis] ?? 0) + sign * (right[axis] ?? 0);
  return normalizeVector(result);
}

function scale(vector: DimensionVectorV4, factor: number): DimensionVectorV4 {
  const result: DimensionVectorV4 = {};
  for (const axis of AXES) result[axis] = (vector[axis] ?? 0) * factor;
  return normalizeVector(result);
}

function equalVectors(left: DimensionVectorV4, right: DimensionVectorV4): boolean {
  return AXES.every((axis) => Math.abs((left[axis] ?? 0) - (right[axis] ?? 0)) < 1e-9);
}

function tokenize(expression: string): { tokens: Token[]; valid: boolean } {
  const tokens: Token[] = [];
  let index = 0;
  while (index < expression.length) {
    const char = expression[index];
    if (/\s/.test(char)) {
      index += 1;
      continue;
    }
    const number = expression.slice(index).match(/^(?:\d+(?:\.\d+)?|\.\d+)/)?.[0];
    if (number) {
      tokens.push({ kind: "number", value: Number(number) });
      index += number.length;
      continue;
    }
    const identifier = expression.slice(index).match(/^[a-z][a-z0-9_]*/i)?.[0];
    if (identifier) {
      tokens.push({ kind: "identifier", value: identifier });
      index += identifier.length;
      continue;
    }
    if (char === "+" || char === "-" || char === "*" || char === "/") {
      tokens.push({ kind: "operator", value: char });
      index += 1;
      continue;
    }
    if (char === "(" || char === ")") {
      tokens.push({ kind: "paren", value: char });
      index += 1;
      continue;
    }
    if (char === ",") {
      tokens.push({ kind: "comma" });
      index += 1;
      continue;
    }
    return { tokens, valid: false };
  }
  return { tokens, valid: tokens.length > 0 };
}

class DimensionParser {
  private position = 0;
  private readonly dependencySet = new Set<string>();
  readonly trace: string[] = [];
  mismatch = false;
  unknownInput = false;

  constructor(
    private readonly tokens: readonly Token[],
    private readonly inputVectors: ReadonlyMap<string, DimensionVectorV4>,
  ) {}

  get dependencies(): string[] {
    return [...this.dependencySet].sort();
  }

  parse(): DimensionVectorV4 | null {
    try {
      const result = this.parseExpression();
      if (this.position !== this.tokens.length) return null;
      return result;
    } catch {
      return null;
    }
  }

  private peek(offset = 0): Token | null {
    return this.tokens[this.position + offset] ?? null;
  }

  private consume(): Token {
    const token = this.peek();
    if (!token) throw new Error("unexpected_end");
    this.position += 1;
    return token;
  }

  private parseExpression(): DimensionVectorV4 {
    let value = this.parseTerm();
    while (true) {
      const token = this.peek();
      if (token?.kind !== "operator" || (token.value !== "+" && token.value !== "-")) return value;
      this.consume();
      const right = this.parseTerm();
      if (!equalVectors(value, right)) this.mismatch = true;
      this.trace.push(`${token.value}:compatible=${equalVectors(value, right)}`);
    }
  }

  private parseTerm(): DimensionVectorV4 {
    let value = this.parseFactor();
    while (true) {
      const token = this.peek();
      if (token?.kind !== "operator" || (token.value !== "*" && token.value !== "/")) return value;
      this.consume();
      const right = this.parseFactor();
      value = combine(value, right, token.value === "*" ? 1 : -1);
      this.trace.push(`${token.value}:${JSON.stringify(value)}`);
    }
  }

  private parseFactor(): DimensionVectorV4 {
    const token = this.peek();
    if (!token) throw new Error("factor_missing");
    if (token.kind === "operator" && (token.value === "+" || token.value === "-")) {
      this.consume();
      return this.parseFactor();
    }
    if (token.kind === "number") {
      this.consume();
      return {};
    }
    if (token.kind === "identifier") {
      const next = this.peek(1);
      if (next?.kind === "paren" && next.value === "(") return this.parseFunction();
      this.consume();
      this.dependencySet.add(token.value);
      const vector = this.inputVectors.get(token.value);
      if (!vector) {
        this.unknownInput = true;
        return {};
      }
      return vector;
    }
    if (token.kind === "paren" && token.value === "(") {
      this.consume();
      const value = this.parseExpression();
      const close = this.consume();
      if (close.kind !== "paren" || close.value !== ")") throw new Error("close_paren_missing");
      return value;
    }
    throw new Error("unsupported_factor");
  }

  private parseFunction(): DimensionVectorV4 {
    const nameToken = this.consume();
    if (nameToken.kind !== "identifier") throw new Error("function_name_missing");
    const open = this.consume();
    if (open.kind !== "paren" || open.value !== "(") throw new Error("open_paren_missing");
    const args: DimensionVectorV4[] = [];
    if (!(this.peek()?.kind === "paren" && (this.peek() as { value?: string }).value === ")")) {
      while (true) {
        args.push(this.parseExpression());
        if (this.peek()?.kind !== "comma") break;
        this.consume();
      }
    }
    const close = this.consume();
    if (close.kind !== "paren" || close.value !== ")") throw new Error("close_paren_missing");
    const name = nameToken.value.toLowerCase();
    if (name === "sqrt") return scale(args[0] ?? {}, 0.5);
    if (!DIMENSION_PRESERVING_FUNCTIONS.has(name) || args.length === 0) throw new Error("unsupported_function");
    const comparedArgs = name === "round_to" ? args.slice(0, 1) : args;
    if (comparedArgs.some((arg) => !equalVectors(arg, comparedArgs[0]))) this.mismatch = true;
    return args[0];
  }
}

function pushUnique<T>(items: T[], item: T): void {
  if (!items.includes(item)) items.push(item);
}

export function validateFormulaDimensionsV4(input: {
  expression: string;
  input_unit_ids: Readonly<Record<string, string | null | undefined>>;
  output_unit_id: string | null | undefined;
}): FormulaDimensionValidationV4 {
  const blockers: FormulaDimensionBlockerV4[] = [];
  const vectors = new Map<string, DimensionVectorV4>();
  for (const [parameter, rawUnitId] of Object.entries(input.input_unit_ids)) {
    if (!rawUnitId) {
      pushUnique(blockers, "PARAMETER_UNIT_MISSING");
      continue;
    }
    const exact = getEngineeringUnitV4(rawUnitId);
    const resolved = exact ?? resolveEngineeringUnitV4(rawUnitId);
    if (!resolved) {
      pushUnique(blockers, "PARAMETER_UNIT_NOT_ALLOWED");
      pushUnique(blockers, "FORMULA_INPUT_DIMENSION_UNKNOWN");
      continue;
    }
    if (!exact) pushUnique(blockers, "UNCONVERTED_UNIT");
    vectors.set(parameter, resolved.vector);
  }
  const outputExact = getEngineeringUnitV4(input.output_unit_id);
  const outputResolved = outputExact ?? resolveEngineeringUnitV4(input.output_unit_id);
  if (!outputResolved) {
    pushUnique(blockers, "ROW_UNIT_NOT_ALLOWED");
    pushUnique(blockers, "OUTPUT_DIMENSION_UNKNOWN");
  } else if (!outputExact) {
    pushUnique(blockers, "UNCONVERTED_UNIT");
  }
  const tokenized = tokenize(input.expression.trim());
  const parser = tokenized.valid ? new DimensionParser(tokenized.tokens, vectors) : null;
  const resultVector = parser?.parse() ?? null;
  if (!resultVector) pushUnique(blockers, "FORMULA_INPUT_DIMENSION_UNKNOWN");
  if (parser?.unknownInput) pushUnique(blockers, "FORMULA_INPUT_DIMENSION_UNKNOWN");
  if (parser?.mismatch) pushUnique(blockers, "FORMULA_DIMENSION_MISMATCH");
  if (resultVector && outputResolved && !equalVectors(resultVector, outputResolved.vector)) {
    pushUnique(blockers, "FORMULA_DIMENSION_MISMATCH");
  }
  return {
    ok: blockers.length === 0,
    blockers,
    dependencies: parser?.dependencies ?? [],
    result_vector: resultVector,
    output_vector: outputResolved?.vector ?? null,
    trace: parser?.trace ?? [],
  };
}
