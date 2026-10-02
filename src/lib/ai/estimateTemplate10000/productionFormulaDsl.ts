export type ProductionFormulaDslValue = number | boolean | string | null | undefined;

export type ProductionFormulaDslContext = Record<string, ProductionFormulaDslValue>;

export type ProductionFormulaDslEvaluation = {
  value: number;
  expression: string;
  normalizedExpression: string;
  variablesUsed: string[];
  functionsUsed: string[];
  trace: string;
};

export type ProductionFormulaDslValidation = {
  valid: boolean;
  variablesUsed: string[];
  functionsUsed: string[];
  errors: string[];
};

type Token =
  | { type: "number"; value: number; text: string }
  | { type: "identifier"; text: string }
  | { type: "operator"; text: string }
  | { type: "paren"; text: "(" | ")" }
  | { type: "comma"; text: "," }
  | { type: "eof"; text: "" };

type ParserState = {
  tokens: Token[];
  index: number;
  context: ProductionFormulaDslContext;
  variablesUsed: Set<string>;
  functionsUsed: Set<string>;
};

const SUPPORTED_FUNCTIONS = new Set([
  "abs",
  "ceil",
  "floor",
  "if",
  "kg_to_bag_25",
  "kg_to_bag_30",
  "max",
  "min",
  "mm_to_m",
  "percent_to_factor",
  "round",
  "round_to",
  "unit_convert",
]);

function tokenize(expression: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;
  while (index < expression.length) {
    const char = expression[index];
    if (/\s/.test(char)) {
      index += 1;
      continue;
    }
    const numberMatch = expression.slice(index).match(/^\d+(?:\.\d+)?/);
    if (numberMatch) {
      tokens.push({ type: "number", value: Number(numberMatch[0]), text: numberMatch[0] });
      index += numberMatch[0].length;
      continue;
    }
    const identifierMatch = expression.slice(index).match(/^[A-Za-z_][A-Za-z0-9_]*/);
    if (identifierMatch) {
      tokens.push({ type: "identifier", text: identifierMatch[0] });
      index += identifierMatch[0].length;
      continue;
    }
    const twoChar = expression.slice(index, index + 2);
    if ([">=", "<=", "==", "!="].includes(twoChar)) {
      tokens.push({ type: "operator", text: twoChar });
      index += 2;
      continue;
    }
    if ("+-*/><".includes(char)) {
      tokens.push({ type: "operator", text: char });
      index += 1;
      continue;
    }
    if (char === "(" || char === ")") {
      tokens.push({ type: "paren", text: char });
      index += 1;
      continue;
    }
    if (char === ",") {
      tokens.push({ type: "comma", text: char });
      index += 1;
      continue;
    }
    throw new Error(`PRODUCTION_FORMULA_DSL_INVALID_TOKEN:${char}`);
  }
  tokens.push({ type: "eof", text: "" });
  return tokens;
}

function peek(state: ParserState): Token {
  return state.tokens[state.index] ?? { type: "eof", text: "" };
}

function consume(state: ParserState): Token {
  const token = peek(state);
  state.index += 1;
  return token;
}

function matchOperator(state: ParserState, ...operators: string[]): string | null {
  const token = peek(state);
  if (token.type === "operator" && operators.includes(token.text)) {
    consume(state);
    return token.text;
  }
  return null;
}

function expectParen(state: ParserState, paren: "(" | ")"): void {
  const token = consume(state);
  if (token.type !== "paren" || token.text !== paren) {
    throw new Error(`PRODUCTION_FORMULA_DSL_EXPECTED_PAREN:${paren}`);
  }
}

function expectCommaOrClose(state: ParserState): boolean {
  const token = peek(state);
  if (token.type === "comma") {
    consume(state);
    return false;
  }
  if (token.type === "paren" && token.text === ")") return true;
  throw new Error("PRODUCTION_FORMULA_DSL_EXPECTED_COMMA_OR_CLOSE");
}

function contextNumber(context: ProductionFormulaDslContext, key: string): number {
  if (!(key in context)) throw new Error(`PRODUCTION_FORMULA_DSL_MISSING_PARAMETER:${key}`);
  const value = context[key];
  const parsed = typeof value === "number"
    ? value
    : typeof value === "boolean"
      ? value ? 1 : 0
      : typeof value === "string"
        ? Number(value.replace(",", "."))
        : NaN;
  if (!Number.isFinite(parsed)) throw new Error(`PRODUCTION_FORMULA_DSL_INVALID_PARAMETER:${key}`);
  return parsed;
}

function callFunction(name: string, args: number[]): number {
  if (!SUPPORTED_FUNCTIONS.has(name)) throw new Error(`PRODUCTION_FORMULA_DSL_UNSUPPORTED_FUNCTION:${name}`);
  if (name === "abs") return Math.abs(args[0] ?? 0);
  if (name === "ceil") return Math.ceil(args[0] ?? 0);
  if (name === "floor") return Math.floor(args[0] ?? 0);
  if (name === "if") return args[0] ? (args[1] ?? 0) : (args[2] ?? 0);
  if (name === "kg_to_bag_25") return Math.ceil((args[0] ?? 0) / 25);
  if (name === "kg_to_bag_30") return Math.ceil((args[0] ?? 0) / 30);
  if (name === "max") return Math.max(...args);
  if (name === "min") return Math.min(...args);
  if (name === "mm_to_m") return (args[0] ?? 0) / 1000;
  if (name === "percent_to_factor") return 1 + (args[0] ?? 0) / 100;
  if (name === "round") return Math.round(args[0] ?? 0);
  if (name === "round_to") {
    const value = args[0] ?? 0;
    const precision = args[1] ?? 0;
    const factor = 10 ** precision;
    return Math.round(value * factor) / factor;
  }
  if (name === "unit_convert") return (args[0] ?? 0) * (args[1] ?? 1);
  throw new Error(`PRODUCTION_FORMULA_DSL_UNSUPPORTED_FUNCTION:${name}`);
}

function parsePrimary(state: ParserState): number {
  const token = consume(state);
  if (token.type === "number") return token.value;
  if (token.type === "identifier") {
    const next = peek(state);
    if (next.type === "paren" && next.text === "(") {
      consume(state);
      const args: number[] = [];
      if (!(peek(state).type === "paren" && peek(state).text === ")")) {
        let hasMoreArguments = true;
        while (hasMoreArguments) {
          args.push(parseComparison(state));
          hasMoreArguments = !expectCommaOrClose(state);
        }
      }
      expectParen(state, ")");
      state.functionsUsed.add(token.text);
      return callFunction(token.text, args);
    }
    state.variablesUsed.add(token.text);
    return contextNumber(state.context, token.text);
  }
  if (token.type === "paren" && token.text === "(") {
    const value = parseComparison(state);
    expectParen(state, ")");
    return value;
  }
  throw new Error("PRODUCTION_FORMULA_DSL_EXPECTED_PRIMARY");
}

function parseUnary(state: ParserState): number {
  const operator = matchOperator(state, "+", "-");
  if (operator === "-") return -parseUnary(state);
  if (operator === "+") return parseUnary(state);
  return parsePrimary(state);
}

function parseFactor(state: ParserState): number {
  let value = parseUnary(state);
  let operator = matchOperator(state, "*", "/");
  while (operator !== null) {
    const right = parseUnary(state);
    value = operator === "*" ? value * right : value / right;
    operator = matchOperator(state, "*", "/");
  }
  return value;
}

function parseTerm(state: ParserState): number {
  let value = parseFactor(state);
  let operator = matchOperator(state, "+", "-");
  while (operator !== null) {
    const right = parseFactor(state);
    value = operator === "+" ? value + right : value - right;
    operator = matchOperator(state, "+", "-");
  }
  return value;
}

function parseComparison(state: ParserState): number {
  let value = parseTerm(state);
  let operator = matchOperator(state, ">", ">=", "<", "<=", "==", "!=");
  while (operator !== null) {
    const right = parseTerm(state);
    if (operator === ">") value = value > right ? 1 : 0;
    if (operator === ">=") value = value >= right ? 1 : 0;
    if (operator === "<") value = value < right ? 1 : 0;
    if (operator === "<=") value = value <= right ? 1 : 0;
    if (operator === "==") value = value === right ? 1 : 0;
    if (operator === "!=") value = value !== right ? 1 : 0;
    operator = matchOperator(state, ">", ">=", "<", "<=", "==", "!=");
  }
  return value;
}

function normalizeExpression(expression: string): string {
  return expression.replace(/\s+/g, " ").trim();
}

type KnownProductionFormulaEvaluation = Readonly<{
  value: number;
  variablesUsed: string[];
  functionsUsed: string[];
}>;

function frozenFormulaTerms(values: string[]): string[] {
  return Object.freeze(values) as string[];
}

const VARIABLES_NORM_Q = frozenFormulaTerms(["normFactor", "q"]);
const VARIABLES_NORM_Q_WASTE = frozenFormulaTerms(["normFactor", "q", "wasteFactor"]);
const VARIABLES_MIN_NORM_PACKAGE_Q = frozenFormulaTerms(["minQty", "normFactor", "packageSize", "q"]);
const VARIABLES_MIN_PACKAGE_Q = frozenFormulaTerms(["minQty", "packageSize", "q"]);
const VARIABLES_Q_WASTE = frozenFormulaTerms(["q", "wasteFactor", "wasteRatio"]);
const VARIABLES_Q_WASTE_RATIO = frozenFormulaTerms(["q", "wasteRatio"]);
const VARIABLES_NORM_Q_CONVERSION = frozenFormulaTerms(["normFactor", "q", "unitConversionFactor"]);
const VARIABLES_MIN_QTY = frozenFormulaTerms(["minQty"]);
const FUNCTIONS_ROUND_TO = frozenFormulaTerms(["round_to"]);
const FUNCTIONS_CEIL_MAX = frozenFormulaTerms(["ceil", "max"]);
const FUNCTIONS_ROUND_TO_CONVERT = frozenFormulaTerms(["round_to", "unit_convert"]);
const NO_FORMULA_FUNCTIONS = frozenFormulaTerms([]);

function roundTo(value: number, precision: number): number {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function evaluateKnownProductionFormula(
  expression: string,
  context: ProductionFormulaDslContext,
): KnownProductionFormulaEvaluation | null {
  const number = (key: string) => contextNumber(context, key);
  if (expression === "round_to(q * normFactor, 4)") {
    return {
      value: roundTo(number("q") * number("normFactor"), 4),
      variablesUsed: VARIABLES_NORM_Q,
      functionsUsed: FUNCTIONS_ROUND_TO,
    };
  }
  if (expression === "round_to(q * normFactor * wasteFactor, 4)") {
    return {
      value: roundTo(number("q") * number("normFactor") * number("wasteFactor"), 4),
      variablesUsed: VARIABLES_NORM_Q_WASTE,
      functionsUsed: FUNCTIONS_ROUND_TO,
    };
  }
  if (expression === "max(minQty, ceil(q * normFactor / packageSize))") {
    return {
      value: Math.max(number("minQty"), Math.ceil(number("q") * number("normFactor") / number("packageSize"))),
      variablesUsed: VARIABLES_MIN_NORM_PACKAGE_Q,
      functionsUsed: FUNCTIONS_CEIL_MAX,
    };
  }
  if (expression === "max(minQty, ceil(q / packageSize))") {
    return {
      value: Math.max(number("minQty"), Math.ceil(number("q") / number("packageSize"))),
      variablesUsed: VARIABLES_MIN_PACKAGE_Q,
      functionsUsed: FUNCTIONS_CEIL_MAX,
    };
  }
  if (expression === "round_to(q * wasteRatio * wasteFactor, 4)") {
    return {
      value: roundTo(number("q") * number("wasteRatio") * number("wasteFactor"), 4),
      variablesUsed: VARIABLES_Q_WASTE,
      functionsUsed: FUNCTIONS_ROUND_TO,
    };
  }
  if (expression === "round_to(q * wasteRatio, 4)") {
    return {
      value: roundTo(number("q") * number("wasteRatio"), 4),
      variablesUsed: VARIABLES_Q_WASTE_RATIO,
      functionsUsed: FUNCTIONS_ROUND_TO,
    };
  }
  if (expression === "round_to(unit_convert(q, unitConversionFactor) * normFactor, 4)") {
    return {
      value: roundTo(number("q") * number("unitConversionFactor") * number("normFactor"), 4),
      variablesUsed: VARIABLES_NORM_Q_CONVERSION,
      functionsUsed: FUNCTIONS_ROUND_TO_CONVERT,
    };
  }
  if (expression === "minQty") {
    return {
      value: number("minQty"),
      variablesUsed: VARIABLES_MIN_QTY,
      functionsUsed: NO_FORMULA_FUNCTIONS,
    };
  }
  return null;
}

function productionFormulaEvaluation(input: {
  expression: string;
  normalizedExpression?: string;
  value: number;
  variablesUsed: string[];
  functionsUsed: string[];
}): ProductionFormulaDslEvaluation {
  if (!Number.isFinite(input.value)) throw new Error("PRODUCTION_FORMULA_DSL_NON_FINITE_RESULT");
  const rounded = roundTo(input.value, 4);
  const normalizedExpression = input.normalizedExpression ?? normalizeExpression(input.expression);
  return {
    value: rounded,
    expression: input.expression,
    normalizedExpression,
    variablesUsed: input.variablesUsed,
    functionsUsed: input.functionsUsed,
    trace: `expression=${normalizedExpression}; variables=${input.variablesUsed.join(",") || "none"}; functions=${input.functionsUsed.join(",") || "none"}; result=${rounded}`,
  };
}

export function evaluateProductionFormulaDsl(
  expression: string,
  context: ProductionFormulaDslContext,
): ProductionFormulaDslEvaluation {
  const known = evaluateKnownProductionFormula(expression, context);
  if (known) return productionFormulaEvaluation({ expression, normalizedExpression: expression, ...known });
  const state: ParserState = {
    tokens: tokenize(expression),
    index: 0,
    context,
    variablesUsed: new Set<string>(),
    functionsUsed: new Set<string>(),
  };
  const value = parseComparison(state);
  if (peek(state).type !== "eof") throw new Error("PRODUCTION_FORMULA_DSL_TRAILING_TOKEN");
  const variablesUsed = [...state.variablesUsed].sort();
  const functionsUsed = [...state.functionsUsed].sort();
  return productionFormulaEvaluation({
    expression,
    value,
    variablesUsed,
    functionsUsed,
  });
}

export function validateProductionFormulaDsl(
  expression: string,
  context: ProductionFormulaDslContext,
): ProductionFormulaDslValidation {
  try {
    const result = evaluateProductionFormulaDsl(expression, context);
    return {
      valid: true,
      variablesUsed: result.variablesUsed,
      functionsUsed: result.functionsUsed,
      errors: [],
    };
  } catch (error) {
    return {
      valid: false,
      variablesUsed: [],
      functionsUsed: [],
      errors: [error instanceof Error ? error.message : "PRODUCTION_FORMULA_DSL_UNKNOWN_ERROR"],
    };
  }
}
