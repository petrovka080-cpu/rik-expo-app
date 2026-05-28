import type { GlobalLocalContext, LocalContextCompleteness } from "./globalLocalContextTypes";

export function classifyLocalContextCompleteness(context: Pick<GlobalLocalContext, "completeness">): LocalContextCompleteness {
  return context.completeness;
}

export function localContextAllowsPricedEstimate(context: GlobalLocalContext): boolean {
  return context.completeness === "LOCAL_CONTEXT_EXACT" || context.completeness === "LOCAL_CONTEXT_PARTIAL";
}
