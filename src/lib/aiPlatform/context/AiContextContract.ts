import type { AiRunInput } from "../kernel/AiRuntimeKernelContract";
import type { AiSafeMessage } from "../providers/AiModelProviderPort";

export type AiContextSource = {
  sourceId: string;
  kind: "screen" | "request" | "estimate" | "revision" | "ledger" | "object" | "user_text";
  ref: string;
  freshness: "live" | "snapshot" | "unknown";
};

export type AiContextBudgetUsage = {
  inputChars: number;
  maxInputChars: number;
  truncated: boolean;
};

export type AiBuiltContext = {
  flowId: string;
  messages: AiSafeMessage[];
  sourceMapping: AiContextSource[];
  redactedFields: string[];
  budget: AiContextBudgetUsage;
  redactionPassed: boolean;
};

export type AiContextBuilder = {
  build(input: AiRunInput): AiBuiltContext;
};
