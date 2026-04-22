export const LOSS_ERROR_TEXT = "Некорректное значение";

const SAFE_EXPRESSION = /^[-+*/().0-9\s]+$/;

export type CalcExpressionParseResult =
  | { kind: "empty" }
  | { kind: "invalid" }
  | { kind: "valid"; value: number; formatted: string };

export const normalizeCalcRawInput = (value: string | null | undefined) =>
  typeof value === "string" ? value : "";

export const formatCalcNumber = (value: number) => {
  if (!Number.isFinite(value)) return "";
  const fixed = value.toFixed(6);
  return fixed.replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
};

export const sanitizeCalcExpression = (raw: string | null | undefined) =>
  normalizeCalcRawInput(raw)
    .replace(/,/g, ".")
    .replace(/[xX*×хХ]/g, "*")
    .replace(/:/g, "/")
    .trim();

export const evaluateCalcExpression = (rawInput: string | null | undefined): number => {
  const sanitized = sanitizeCalcExpression(rawInput);
  if (!sanitized) throw new Error("empty");
  if (!SAFE_EXPRESSION.test(sanitized)) throw new Error("invalid_char");
  const fn = Function(`"use strict"; return (${sanitized});`);
  const result = fn();
  if (typeof result !== "number" || !Number.isFinite(result)) throw new Error("not_finite");
  return result;
};

export const parseCalcExpression = (rawInput: string | null | undefined): CalcExpressionParseResult => {
  const sanitized = sanitizeCalcExpression(rawInput);
  if (!sanitized) {
    return { kind: "empty" };
  }

  try {
    const value = evaluateCalcExpression(sanitized);
    return {
      kind: "valid",
      value,
      formatted: formatCalcNumber(value),
    };
  } catch (_error) {
    return {
      kind: "invalid",
    };
  }
};
