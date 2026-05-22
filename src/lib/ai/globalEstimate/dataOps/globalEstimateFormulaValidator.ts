export type GlobalEstimateFormulaVariables = {
  area?: number;
  length?: number;
  height?: number;
  width?: number;
  volume?: number;
  count?: number;
  rooms?: number;
  openings?: number;
  linearLength?: number;
};

export type GlobalEstimateFormulaValidation = {
  valid: boolean;
  blockers: string[];
  missingVariables: string[];
  value?: number;
  quantity?: number;
};

const ALLOWED_VARIABLES = new Set([
  "area",
  "length",
  "height",
  "width",
  "volume",
  "count",
  "rooms",
  "openings",
  "linearLength",
]);

const ALLOWED_FUNCTIONS: Record<string, (...values: number[]) => number> = {
  ceil: Math.ceil,
  floor: Math.floor,
  round: Math.round,
  sqrt: Math.sqrt,
  min: Math.min,
  max: Math.max,
};

type Token =
  | { type: "number"; value: number }
  | { type: "identifier"; value: string }
  | { type: "operator"; value: "+" | "-" | "*" | "/" }
  | { type: "paren"; value: "(" | ")" }
  | { type: "comma"; value: "," };

function tokenize(formula: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;
  while (index < formula.length) {
    const char = formula[index] ?? "";
    if (/\s/.test(char)) {
      index += 1;
      continue;
    }
    if (/[0-9.]/.test(char)) {
      const start = index;
      index += 1;
      while (/[0-9.]/.test(formula[index] ?? "")) index += 1;
      const value = Number(formula.slice(start, index));
      if (!Number.isFinite(value)) throw new Error("GLOBAL_ESTIMATE_FORMULA_INVALID_NUMBER");
      tokens.push({ type: "number", value });
      continue;
    }
    if (/[a-zA-Z_]/.test(char)) {
      const start = index;
      index += 1;
      while (/[a-zA-Z0-9_]/.test(formula[index] ?? "")) index += 1;
      tokens.push({ type: "identifier", value: formula.slice(start, index) });
      continue;
    }
    if (char === "+" || char === "-" || char === "*" || char === "/") {
      tokens.push({ type: "operator", value: char });
      index += 1;
      continue;
    }
    if (char === "(" || char === ")") {
      tokens.push({ type: "paren", value: char });
      index += 1;
      continue;
    }
    if (char === ",") {
      tokens.push({ type: "comma", value: "," });
      index += 1;
      continue;
    }
    throw new Error("GLOBAL_ESTIMATE_FORMULA_FORBIDDEN_TOKEN");
  }
  return tokens;
}

function parseFormula(tokens: Token[], variables: Required<GlobalEstimateFormulaVariables>): number {
  let position = 0;
  const peek = () => tokens[position];
  const take = () => tokens[position++];

  function parseExpression(): number {
    let value = parseTerm();
    while (peek()?.type === "operator" && (peek()?.value === "+" || peek()?.value === "-")) {
      const operator = take().value;
      const right = parseTerm();
      value = operator === "+" ? value + right : value - right;
    }
    return value;
  }

  function parseTerm(): number {
    let value = parseFactor();
    while (peek()?.type === "operator" && (peek()?.value === "*" || peek()?.value === "/")) {
      const operator = take().value;
      const right = parseFactor();
      if (operator === "/" && right === 0) throw new Error("GLOBAL_ESTIMATE_FORMULA_DIVIDE_BY_ZERO");
      value = operator === "*" ? value * right : value / right;
    }
    return value;
  }

  function parseFunction(name: string): number {
    const fn = ALLOWED_FUNCTIONS[name];
    if (!fn) throw new Error("GLOBAL_ESTIMATE_FORMULA_FORBIDDEN_FUNCTION");
    const open = take();
    if (open?.type !== "paren" || open.value !== "(") throw new Error("GLOBAL_ESTIMATE_FORMULA_EXPECTED_PAREN");
    const args: number[] = [];
    if (peek()?.type === "paren" && peek()?.value === ")") {
      take();
      return fn();
    }
    while (position < tokens.length) {
      args.push(parseExpression());
      if (peek()?.type === "comma") {
        take();
        continue;
      }
      const close = take();
      if (close?.type !== "paren" || close.value !== ")") throw new Error("GLOBAL_ESTIMATE_FORMULA_EXPECTED_CLOSE");
      return fn(...args);
    }
    throw new Error("GLOBAL_ESTIMATE_FORMULA_UNCLOSED_FUNCTION");
  }

  function parseFactor(): number {
    const token = take();
    if (!token) throw new Error("GLOBAL_ESTIMATE_FORMULA_UNEXPECTED_END");
    if (token.type === "number") return token.value;
    if (token.type === "operator" && token.value === "-") return -parseFactor();
    if (token.type === "identifier") {
      if (peek()?.type === "paren" && peek()?.value === "(") return parseFunction(token.value);
      if (!ALLOWED_VARIABLES.has(token.value)) throw new Error("GLOBAL_ESTIMATE_FORMULA_FORBIDDEN_VARIABLE");
      return variables[token.value as keyof GlobalEstimateFormulaVariables];
    }
    if (token.type === "paren" && token.value === "(") {
      const value = parseExpression();
      const close = take();
      if (close?.type !== "paren" || close.value !== ")") throw new Error("GLOBAL_ESTIMATE_FORMULA_EXPECTED_CLOSE");
      return value;
    }
    throw new Error("GLOBAL_ESTIMATE_FORMULA_UNEXPECTED_TOKEN");
  }

  const value = parseExpression();
  if (position !== tokens.length) throw new Error("GLOBAL_ESTIMATE_FORMULA_TRAILING_TOKEN");
  return value;
}

export function evaluateGlobalEstimateFormula(
  formula: string,
  variables: GlobalEstimateFormulaVariables,
): number {
  if (/eval\s*\(|Function\s*\(|fetch\s*\(|from\s*\(|select\s*\(/i.test(formula)) {
    throw new Error("GLOBAL_ESTIMATE_FORMULA_FORBIDDEN_CODE_EXECUTION");
  }
  const normalizedVariables: Required<GlobalEstimateFormulaVariables> = {
    area: variables.area ?? 0,
    length: variables.length ?? 0,
    height: variables.height ?? 0,
    width: variables.width ?? 0,
    volume: variables.volume ?? 0,
    count: variables.count ?? 0,
    rooms: variables.rooms ?? 0,
    openings: variables.openings ?? 0,
    linearLength: variables.linearLength ?? 0,
  };
  const value = Math.round(parseFormula(tokenize(formula), normalizedVariables) * 1_000_000) / 1_000_000;
  if (!Number.isFinite(value)) throw new Error("GLOBAL_ESTIMATE_FORMULA_NAN");
  if (value < 0) throw new Error("GLOBAL_ESTIMATE_FORMULA_NEGATIVE_QUANTITY");
  return value;
}

export function validateGlobalEstimateFormula(
  formula: string,
  variables: GlobalEstimateFormulaVariables = { area: 100, volume: 10, count: 1, linearLength: 40 },
): GlobalEstimateFormulaValidation {
  const missingVariables = [...formula.matchAll(/[a-zA-Z_][a-zA-Z0-9_]*/g)]
    .map((match) => match[0])
    .filter((name) => ALLOWED_VARIABLES.has(name) && variables[name as keyof GlobalEstimateFormulaVariables] == null);
  try {
    const value = evaluateGlobalEstimateFormula(formula, variables);
    return {
      valid: missingVariables.length === 0,
      blockers: missingVariables.length > 0 ? ["GLOBAL_ESTIMATE_FORMULA_MISSING_VARIABLE"] : [],
      missingVariables,
      value,
      quantity: value,
    };
  } catch (error) {
    return {
      valid: false,
      blockers: [error instanceof Error ? error.message : "GLOBAL_ESTIMATE_FORMULA_INVALID"],
      missingVariables,
    };
  }
}
