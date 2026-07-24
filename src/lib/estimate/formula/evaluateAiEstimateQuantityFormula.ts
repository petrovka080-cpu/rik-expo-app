export type AiEstimateFormulaEnvironmentValue = number | boolean;

export type AiEstimateFormulaEnvironment = Record<string, AiEstimateFormulaEnvironmentValue>;

export type AiEstimateFormulaEvaluationResult = {
  ok: boolean;
  value: number | null;
  dependencies: string[];
  missingDependencies: string[];
  unsupportedTokens: string[];
  error: string | null;
};

type Token =
  | { kind: "number"; value: number; raw: string }
  | { kind: "identifier"; value: string }
  | { kind: "operator"; value: "+" | "-" | "*" | "/" }
  | { kind: "paren"; value: "(" | ")" }
  | { kind: "comma"; value: "," };

const SAFE_FUNCTIONS: Record<string, (...args: number[]) => number> = {
  round: (value) => Math.round(value),
  round_to: (value, precision = 0) => {
    const digits = Number.isFinite(precision) ? Math.max(0, Math.min(8, Math.round(precision))) : 0;
    const multiplier = 10 ** digits;
    return Math.round(value * multiplier) / multiplier;
  },
  ceil: (value) => Math.ceil(value),
  floor: (value) => Math.floor(value),
  min: (...values) => Math.min(...values),
  max: (...values) => Math.max(...values),
  sqrt: (value) => Math.sqrt(value),
};

const SAFE_FUNCTION_NAMES = new Set(Object.keys(SAFE_FUNCTIONS));

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort();
}

function tokeniseFormula(expression: string): { tokens: Token[]; unsupportedTokens: string[] } {
  const tokens: Token[] = [];
  const unsupportedTokens: string[] = [];
  let index = 0;
  while (index < expression.length) {
    const char = expression[index];
    if (/\s/.test(char)) {
      index += 1;
      continue;
    }
    const numberMatch = expression.slice(index).match(/^(?:\d+(?:\.\d+)?|\.\d+)/);
    if (numberMatch) {
      const raw = numberMatch[0];
      tokens.push({ kind: "number", value: Number(raw), raw });
      index += raw.length;
      continue;
    }
    const identifierMatch = expression.slice(index).match(/^[a-z][a-z0-9_]*/i);
    if (identifierMatch) {
      tokens.push({ kind: "identifier", value: identifierMatch[0] });
      index += identifierMatch[0].length;
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
      tokens.push({ kind: "comma", value: char });
      index += 1;
      continue;
    }
    unsupportedTokens.push(char);
    index += 1;
  }
  return { tokens, unsupportedTokens };
}

function numericEnvValue(value: AiEstimateFormulaEnvironmentValue): number {
  return typeof value === "boolean" ? (value ? 1 : 0) : value;
}

class FormulaParser {
  private readonly dependencies = new Set<string>();
  private readonly missingDependencies = new Set<string>();

  private position = 0;

  constructor(
    private readonly tokens: readonly Token[],
    private readonly env: AiEstimateFormulaEnvironment,
  ) {}

  parse(): AiEstimateFormulaEvaluationResult {
    try {
      const value = this.parseExpression();
      if (this.position !== this.tokens.length) {
        return this.failure("trailing_tokens", value);
      }
      if (!Number.isFinite(value)) {
        return this.failure("non_finite_result", null);
      }
      return {
        ok: this.missingDependencies.size === 0,
        value: this.missingDependencies.size === 0 ? Math.round(value * 1000) / 1000 : null,
        dependencies: uniqueSorted([...this.dependencies]),
        missingDependencies: uniqueSorted([...this.missingDependencies]),
        unsupportedTokens: [],
        error: this.missingDependencies.size === 0 ? null : "missing_dependencies",
      };
    } catch (error) {
      return this.failure(error instanceof Error ? error.message : String(error), null);
    }
  }

  private failure(error: string, value: number | null): AiEstimateFormulaEvaluationResult {
    return {
      ok: false,
      value,
      dependencies: uniqueSorted([...this.dependencies]),
      missingDependencies: uniqueSorted([...this.missingDependencies]),
      unsupportedTokens: [],
      error,
    };
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

  private consumeExpectedParen(value: "(" | ")"): void {
    const token = this.consume();
    if (token.kind !== "paren" || token.value !== value) throw new Error(`expected_${value}`);
  }

  private parseExpression(): number {
    let value = this.parseTerm();
    let token = this.peek();
    while (token?.kind === "operator" && (token.value === "+" || token.value === "-")) {
      this.consume();
      const right = this.parseTerm();
      value = token.value === "+" ? value + right : value - right;
      token = this.peek();
    }
    return value;
  }

  private parseTerm(): number {
    let value = this.parseFactor();
    let token = this.peek();
    while (token?.kind === "operator" && (token.value === "*" || token.value === "/")) {
      this.consume();
      const right = this.parseFactor();
      if (token.value === "/" && right === 0) throw new Error("division_by_zero");
      value = token.value === "*" ? value * right : value / right;
      token = this.peek();
    }
    return value;
  }

  private parseFactor(): number {
    const token = this.peek();
    if (!token) throw new Error("expected_factor");
    if (token.kind === "operator" && token.value === "-") {
      this.consume();
      return -this.parseFactor();
    }
    if (token.kind === "operator" && token.value === "+") {
      this.consume();
      return this.parseFactor();
    }
    if (token.kind === "number") {
      this.consume();
      return token.value;
    }
    if (token.kind === "identifier") {
      const next = this.peek(1);
      if (next?.kind === "paren" && next.value === "(") return this.parseFunctionCall();
      return this.parseIdentifierValue();
    }
    if (token.kind === "paren" && token.value === "(") {
      this.consumeExpectedParen("(");
      const value = this.parseExpression();
      this.consumeExpectedParen(")");
      return value;
    }
    throw new Error("expected_factor");
  }

  private parseIdentifierValue(): number {
    const token = this.consume();
    if (token.kind !== "identifier") throw new Error("expected_identifier");
    this.dependencies.add(token.value);
    if (!Object.prototype.hasOwnProperty.call(this.env, token.value)) {
      this.missingDependencies.add(token.value);
      return 0;
    }
    const value = numericEnvValue(this.env[token.value]);
    if (!Number.isFinite(value)) throw new Error(`non_finite_identifier:${token.value}`);
    return value;
  }

  private parseFunctionCall(): number {
    const name = this.consume();
    if (name.kind !== "identifier") throw new Error("expected_function");
    const fn = SAFE_FUNCTIONS[name.value.toLowerCase()];
    if (!fn || !SAFE_FUNCTION_NAMES.has(name.value.toLowerCase())) throw new Error(`unsupported_function:${name.value}`);
    this.consumeExpectedParen("(");
    const args: number[] = [];
    if (this.peek()?.kind === "paren" && this.peek()?.value === ")") {
      this.consumeExpectedParen(")");
      return fn(...args);
    }
    let hasMoreArguments = true;
    while (hasMoreArguments) {
      args.push(this.parseExpression());
      const token = this.peek();
      if (token?.kind === "comma") {
        this.consume();
      } else {
        hasMoreArguments = false;
      }
    }
    this.consumeExpectedParen(")");
    const value = fn(...args);
    if (!Number.isFinite(value)) throw new Error(`non_finite_function:${name.value}`);
    return value;
  }
}

export function extractAiEstimateFormulaIdentifiers(formula: string | null | undefined): string[] {
  const expression = String(formula ?? "");
  const identifiers: string[] = expression.match(/\b[a-z][a-z0-9_]*\b/gi) ?? [];
  return uniqueSorted(identifiers.filter((token) => !SAFE_FUNCTION_NAMES.has(token.toLowerCase())));
}

export function evaluateAiEstimateQuantityFormula(input: {
  formula: string | null | undefined;
  env: AiEstimateFormulaEnvironment;
}): AiEstimateFormulaEvaluationResult {
  const formula = String(input.formula ?? "").trim();
  if (!formula) {
    return {
      ok: false,
      value: null,
      dependencies: [],
      missingDependencies: [],
      unsupportedTokens: [],
      error: "empty_formula",
    };
  }
  const { tokens, unsupportedTokens } = tokeniseFormula(formula);
  if (unsupportedTokens.length > 0) {
    return {
      ok: false,
      value: null,
      dependencies: extractAiEstimateFormulaIdentifiers(formula),
      missingDependencies: [],
      unsupportedTokens: uniqueSorted(unsupportedTokens),
      error: "unsupported_tokens",
    };
  }
  if (tokens.length === 0) {
    return {
      ok: false,
      value: null,
      dependencies: [],
      missingDependencies: [],
      unsupportedTokens: [],
      error: "empty_formula",
    };
  }
  return new FormulaParser(tokens, input.env).parse();
}
