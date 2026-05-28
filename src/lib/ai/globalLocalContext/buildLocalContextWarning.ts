import type { GlobalLocalContext } from "./globalLocalContextTypes";

export function buildLocalContextWarning(context: GlobalLocalContext): string | null {
  if (context.warnings.length > 0) return context.warnings.join(" ");
  if (context.completeness === "LOCAL_CONTEXT_EXACT") return null;
  return "Уточните страну и город для локальной сметы.";
}
