export const FORMULA_GRAPH_VERSION = "formula-ast.r1" as const;
export const FORMULA_DECIMAL_SCALE = 9;

export type FormulaAst =
  | { kind: "literal"; value: string }
  | { kind: "parameter"; id: string }
  | { kind: "unary"; operator: "+" | "-"; operand: FormulaAst }
  | { kind: "binary"; operator: "+" | "-" | "*" | "/"; left: FormulaAst; right: FormulaAst }
  | {
    kind: "call";
    function: "ceil" | "floor" | "max" | "min" | "pow" | "round_to" | "sqrt" | "unit_convert";
    arguments: FormulaAst[];
  };

export type CompiledFormulaGraph = {
  version: typeof FORMULA_GRAPH_VERSION;
  source: string;
  ast: FormulaAst;
  inputParameterIds: string[];
  nodeCount: number;
};

type Token =
  | { type: "number"; value: string; offset: number }
  | { type: "identifier"; value: string; offset: number }
  | { type: "operator"; value: "+" | "-" | "*" | "/"; offset: number }
  | { type: "left" | "right" | "comma" | "eof"; offset: number };

const SCALE_FACTOR = 1_000_000_000n;
// Bounds cover the accepted professional transport/waste expressions while
// remaining finite. Formula authors are service-role migration/release jobs;
// end users can only supply typed parameter values.
const MAX_SOURCE_LENGTH = 16_384;
const MAX_AST_NODES = 4_096;
const MAX_AST_DEPTH = 256;

export class FormulaGraphError extends Error {
  readonly code: "INVALID_FORMULA" | "MISSING_PARAMETER" | "DIVISION_BY_ZERO" | "DECIMAL_OVERFLOW";
  readonly offset: number | null;

  constructor(
    code: FormulaGraphError["code"],
    message: string,
    offset: number | null = null,
  ) {
    super(message);
    this.name = "FormulaGraphError";
    this.code = code;
    this.offset = offset;
  }
}

function normalizeExpression(source: string): string {
  return source.normalize("NFKC").replace(/[×·]/g, "*").replace(/÷/g, "/").trim();
}

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let offset = 0;
  while (offset < source.length) {
    const char = source[offset];
    if (/\s/.test(char)) {
      offset += 1;
      continue;
    }
    if (/[0-9.]/.test(char)) {
      const start = offset;
      let dots = 0;
      while (offset < source.length && /[0-9.]/.test(source[offset])) {
        if (source[offset] === ".") dots += 1;
        offset += 1;
      }
      const value = source.slice(start, offset);
      if (dots > 1 || !/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(value)) {
        throw new FormulaGraphError("INVALID_FORMULA", `invalid numeric literal at offset ${start}`, start);
      }
      tokens.push({ type: "number", value, offset: start });
      continue;
    }
    if (/[A-Za-z_]/.test(char)) {
      const start = offset;
      offset += 1;
      while (offset < source.length && /[A-Za-z0-9_.]/.test(source[offset])) offset += 1;
      tokens.push({ type: "identifier", value: source.slice(start, offset), offset: start });
      continue;
    }
    if (char === "+" || char === "-" || char === "*" || char === "/") {
      tokens.push({ type: "operator", value: char, offset });
      offset += 1;
      continue;
    }
    if (char === "(" || char === ")" || char === "," || char === ";") {
      tokens.push({
        type: char === "(" ? "left" : char === ")" ? "right" : "comma",
        offset,
      });
      offset += 1;
      continue;
    }
    throw new FormulaGraphError("INVALID_FORMULA", `unsupported character at offset ${offset}`, offset);
  }
  tokens.push({ type: "eof", offset: source.length });
  return tokens;
}

class Parser {
  private index = 0;
  private nodes = 0;

  constructor(private readonly tokens: Token[]) {}

  parse(): { ast: FormulaAst; nodes: number } {
    const ast = this.parseExpression(0);
    const trailing = this.peek();
    if (trailing.type !== "eof") {
      throw new FormulaGraphError("INVALID_FORMULA", `unexpected token at offset ${trailing.offset}`, trailing.offset);
    }
    return { ast, nodes: this.nodes };
  }

  private node<T extends FormulaAst>(value: T, depth: number): T {
    this.nodes += 1;
    if (this.nodes > MAX_AST_NODES || depth > MAX_AST_DEPTH) {
      throw new FormulaGraphError("INVALID_FORMULA", "formula complexity limit exceeded");
    }
    return value;
  }

  private parseExpression(depth: number): FormulaAst {
    let left = this.parseTerm(depth + 1);
    while (this.isOperator("+") || this.isOperator("-")) {
      const operator = (this.consume() as Extract<Token, { type: "operator" }>).value as "+" | "-";
      left = this.node({ kind: "binary", operator, left, right: this.parseTerm(depth + 1) }, depth);
    }
    return left;
  }

  private parseTerm(depth: number): FormulaAst {
    let left = this.parseUnary(depth + 1);
    while (this.isOperator("*") || this.isOperator("/")) {
      const operator = (this.consume() as Extract<Token, { type: "operator" }>).value as "*" | "/";
      left = this.node({ kind: "binary", operator, left, right: this.parseUnary(depth + 1) }, depth);
    }
    return left;
  }

  private parseUnary(depth: number): FormulaAst {
    if (this.isOperator("+") || this.isOperator("-")) {
      const operator = (this.consume() as Extract<Token, { type: "operator" }>).value as "+" | "-";
      return this.node({ kind: "unary", operator, operand: this.parseUnary(depth + 1) }, depth);
    }
    return this.parsePrimary(depth + 1);
  }

  private parsePrimary(depth: number): FormulaAst {
    const token = this.consume();
    if (token.type === "number") return this.node({ kind: "literal", value: normalizeDecimal(token.value) }, depth);
    if (token.type === "left") {
      const expression = this.parseExpression(depth + 1);
      this.expect("right");
      return expression;
    }
    if (token.type === "identifier") {
      if (this.peek().type !== "left") return this.node({ kind: "parameter", id: token.value }, depth);
      this.consume();
      const name = token.value.toLowerCase();
      if (!["ceil", "floor", "max", "min", "pow", "round_to", "sqrt", "unit_convert"].includes(name)) {
        throw new FormulaGraphError("INVALID_FORMULA", `function ${token.value} is not allowed`, token.offset);
      }
      const args: FormulaAst[] = [];
      if (this.peek().type !== "right") {
        do {
          args.push(this.parseExpression(depth + 1));
          if (this.peek().type !== "comma") break;
          this.consume();
        } while (true);
      }
      this.expect("right");
      const unaryFunction = name === "ceil" || name === "floor" || name === "sqrt";
      const fixedBinaryFunction = name === "pow" || name === "round_to" || name === "unit_convert";
      if ((unaryFunction && args.length !== 1)
        || (fixedBinaryFunction && args.length !== 2)
        || (!unaryFunction && !fixedBinaryFunction && args.length < 2)) {
        throw new FormulaGraphError("INVALID_FORMULA", `invalid argument count for ${name}`, token.offset);
      }
      return this.node({
        kind: "call",
        function: name as Extract<FormulaAst, { kind: "call" }>["function"],
        arguments: args,
      }, depth);
    }
    throw new FormulaGraphError("INVALID_FORMULA", `expected formula value at offset ${token.offset}`, token.offset);
  }

  private isOperator(value: string): boolean {
    const token = this.peek();
    return token.type === "operator" && token.value === value;
  }

  private expect(type: Token["type"]): void {
    const token = this.consume();
    if (token.type !== type) {
      throw new FormulaGraphError("INVALID_FORMULA", `expected ${type} at offset ${token.offset}`, token.offset);
    }
  }

  private peek(): Token {
    return this.tokens[this.index];
  }

  private consume(): Token {
    const token = this.tokens[this.index];
    this.index += 1;
    return token;
  }
}

function normalizeDecimal(value: string): string {
  const [integerRaw, fractionRaw = ""] = value.split(".");
  const integer = integerRaw.replace(/^0+(?=\d)/, "") || "0";
  const fraction = fractionRaw.replace(/0+$/, "");
  return fraction ? `${integer}.${fraction}` : integer;
}

function collectParameters(ast: FormulaAst, target: Set<string>): void {
  if (ast.kind === "parameter") target.add(ast.id);
  else if (ast.kind === "unary") collectParameters(ast.operand, target);
  else if (ast.kind === "binary") {
    collectParameters(ast.left, target);
    collectParameters(ast.right, target);
  } else if (ast.kind === "call") {
    ast.arguments.forEach((argument) => collectParameters(argument, target));
  }
}

export function compileFormulaGraph(rawSource: string): CompiledFormulaGraph {
  if (typeof rawSource !== "string") throw new FormulaGraphError("INVALID_FORMULA", "formula must be a string");
  const source = normalizeExpression(rawSource);
  if (!source || source.length > MAX_SOURCE_LENGTH) {
    throw new FormulaGraphError("INVALID_FORMULA", "formula length is outside the accepted range");
  }
  const parsed = new Parser(tokenize(source)).parse();
  const parameters = new Set<string>();
  collectParameters(parsed.ast, parameters);
  return {
    version: FORMULA_GRAPH_VERSION,
    source,
    ast: parsed.ast,
    inputParameterIds: [...parameters].sort(),
    nodeCount: parsed.nodes,
  };
}

class FixedDecimal {
  private constructor(private readonly scaled: bigint) {}

  static parse(value: string | number | bigint): FixedDecimal {
    const raw = String(value).trim();
    const match = /^([+-]?)(\d+)(?:\.(\d+))?$/.exec(raw);
    if (!match) throw new FormulaGraphError("INVALID_FORMULA", `invalid decimal input: ${raw}`);
    const fraction = (match[3] ?? "").padEnd(FORMULA_DECIMAL_SCALE + 1, "0");
    let scaled = BigInt(match[2]) * SCALE_FACTOR + BigInt(fraction.slice(0, FORMULA_DECIMAL_SCALE));
    const roundDigit = Number(fraction[FORMULA_DECIMAL_SCALE] ?? "0");
    if (roundDigit >= 5) scaled += 1n;
    if (match[1] === "-") scaled = -scaled;
    FixedDecimal.assertRange(scaled);
    return new FixedDecimal(scaled);
  }

  add(other: FixedDecimal): FixedDecimal { return FixedDecimal.fromScaled(this.scaled + other.scaled); }
  subtract(other: FixedDecimal): FixedDecimal { return FixedDecimal.fromScaled(this.scaled - other.scaled); }
  negate(): FixedDecimal { return FixedDecimal.fromScaled(-this.scaled); }
  multiply(other: FixedDecimal): FixedDecimal {
    return FixedDecimal.fromScaled(FixedDecimal.divideRounded(this.scaled * other.scaled, SCALE_FACTOR));
  }
  divide(other: FixedDecimal): FixedDecimal {
    if (other.scaled === 0n) throw new FormulaGraphError("DIVISION_BY_ZERO", "formula division by zero");
    return FixedDecimal.fromScaled(FixedDecimal.divideRounded(this.scaled * SCALE_FACTOR, other.scaled));
  }
  ceil(): FixedDecimal {
    const quotient = this.scaled / SCALE_FACTOR;
    const remainder = this.scaled % SCALE_FACTOR;
    return FixedDecimal.fromScaled((remainder > 0n ? quotient + 1n : quotient) * SCALE_FACTOR);
  }
  floor(): FixedDecimal {
    const quotient = this.scaled / SCALE_FACTOR;
    const remainder = this.scaled % SCALE_FACTOR;
    return FixedDecimal.fromScaled((remainder < 0n ? quotient - 1n : quotient) * SCALE_FACTOR);
  }
  round(decimalPlaces: number): FixedDecimal {
    if (!Number.isInteger(decimalPlaces) || decimalPlaces < 0 || decimalPlaces > FORMULA_DECIMAL_SCALE) {
      throw new FormulaGraphError("INVALID_FORMULA", `invalid decimal places: ${decimalPlaces}`);
    }
    const divisor = 10n ** BigInt(FORMULA_DECIMAL_SCALE - decimalPlaces);
    const quotient = this.scaled / divisor;
    const remainder = this.scaled % divisor;
    const absoluteRemainder = remainder < 0n ? -remainder : remainder;
    const rounded = absoluteRemainder * 2n >= divisor
      ? quotient + (this.scaled < 0n ? -1n : 1n)
      : quotient;
    return FixedDecimal.fromScaled(rounded * divisor);
  }
  toNumber(): number {
    return Number(this.toString());
  }
  compare(other: FixedDecimal): number { return this.scaled < other.scaled ? -1 : this.scaled > other.scaled ? 1 : 0; }
  toString(): string {
    const negative = this.scaled < 0n;
    const absolute = negative ? -this.scaled : this.scaled;
    const integer = absolute / SCALE_FACTOR;
    const fraction = String(absolute % SCALE_FACTOR).padStart(FORMULA_DECIMAL_SCALE, "0").replace(/0+$/, "");
    return `${negative ? "-" : ""}${integer}${fraction ? `.${fraction}` : ""}`;
  }

  private static fromScaled(scaled: bigint): FixedDecimal {
    FixedDecimal.assertRange(scaled);
    return new FixedDecimal(scaled);
  }
  private static divideRounded(numerator: bigint, denominator: bigint): bigint {
    const quotient = numerator / denominator;
    const remainder = numerator % denominator;
    if (remainder === 0n) return quotient;
    const sameSign = (numerator < 0n) === (denominator < 0n);
    return (remainder < 0n ? -remainder : remainder) * 2n >= (denominator < 0n ? -denominator : denominator)
      ? quotient + (sameSign ? 1n : -1n)
      : quotient;
  }
  private static assertRange(value: bigint): void {
    if (value > 99_999_999_999_999_999_999_999_999_999_999_999n || value < -99_999_999_999_999_999_999_999_999_999_999_999n) {
      throw new FormulaGraphError("DECIMAL_OVERFLOW", "formula result exceeds decimal range");
    }
  }
}

function evaluateNode(ast: FormulaAst, parameters: Record<string, string | number | bigint>): FixedDecimal {
  if (ast.kind === "literal") return FixedDecimal.parse(ast.value);
  if (ast.kind === "parameter") {
    const value = parameters[ast.id];
    if (value == null) throw new FormulaGraphError("MISSING_PARAMETER", `missing parameter ${ast.id}`);
    return FixedDecimal.parse(value);
  }
  if (ast.kind === "unary") {
    const value = evaluateNode(ast.operand, parameters);
    return ast.operator === "-" ? value.negate() : value;
  }
  if (ast.kind === "binary") {
    const left = evaluateNode(ast.left, parameters);
    const right = evaluateNode(ast.right, parameters);
    if (ast.operator === "+") return left.add(right);
    if (ast.operator === "-") return left.subtract(right);
    if (ast.operator === "*") return left.multiply(right);
    return left.divide(right);
  }
  const values = ast.arguments.map((argument) => evaluateNode(argument, parameters));
  if (ast.function === "ceil") return values[0].ceil();
  if (ast.function === "floor") return values[0].floor();
  if (ast.function === "unit_convert") return values[0].multiply(values[1]);
  if (ast.function === "round_to") return values[0].round(values[1].toNumber());
  if (ast.function === "sqrt") {
    const result = Math.sqrt(values[0].toNumber());
    if (!Number.isFinite(result)) throw new FormulaGraphError("INVALID_FORMULA", "sqrt requires a non-negative finite value");
    return FixedDecimal.parse(result.toFixed(FORMULA_DECIMAL_SCALE));
  }
  if (ast.function === "pow") {
    const rawResult = Math.pow(values[0].toNumber(), values[1].toNumber());
    const nearestInteger = Math.round(rawResult);
    const result = Math.abs(rawResult - nearestInteger) < 0.00000001 ? nearestInteger : rawResult;
    if (!Number.isFinite(result)) throw new FormulaGraphError("DECIMAL_OVERFLOW", "pow result exceeds decimal range");
    return FixedDecimal.parse(result.toFixed(FORMULA_DECIMAL_SCALE));
  }
  return values.slice(1).reduce(
    (selected, value) => ast.function === "max"
      ? (selected.compare(value) >= 0 ? selected : value)
      : (selected.compare(value) <= 0 ? selected : value),
    values[0],
  );
}

export function evaluateFormulaGraph(
  formula: FormulaAst | CompiledFormulaGraph,
  parameters: Record<string, string | number | bigint>,
): string {
  const ast = "ast" in formula ? formula.ast : formula;
  return evaluateNode(ast, parameters).toString();
}
