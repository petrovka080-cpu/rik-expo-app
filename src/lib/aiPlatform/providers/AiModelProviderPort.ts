export type AiSafeMessageRole = "system" | "user" | "assistant" | "tool";

export type AiSafeMessage = {
  role: AiSafeMessageRole;
  content: string;
  sourceRef?: string;
};

export type AiSafeToolDefinition = {
  name: string;
  description: string;
  riskLevel: "safe_read" | "draft_only" | "approval_required" | "forbidden";
};

export type AiResponseContract = {
  contractId: string;
  version: string;
  responseFormat: "text" | "json";
};

export type AiModelBudget = {
  maxInputChars: number;
  maxOutputTokens: number;
  timeoutMs: number;
};

export type AiRedactionPolicyRef = {
  policyId: string;
  version: string;
  redactionRequired: true;
};

export type AiModelCompleteInput = {
  modelKey: string;
  messages: AiSafeMessage[];
  tools?: AiSafeToolDefinition[];
  responseContract?: AiResponseContract;
  budget: AiModelBudget;
  redaction: AiRedactionPolicyRef;
  sourceSha: string;
};

export type AiModelCompleteResult = {
  providerKey: string;
  modelKey: string;
  text: string;
  structured?: unknown;
  usage: {
    inputChars: number;
    outputTokens?: number;
  };
  safety: {
    redacted: true;
    blocked: boolean;
    reason?: string;
  };
};

export type AiModelStreamEvent = {
  type: "text" | "done" | "blocked";
  text?: string;
  reason?: string;
};

export type AiModelProviderPort = {
  readonly providerKey: string;
  complete(input: AiModelCompleteInput): Promise<AiModelCompleteResult>;
  stream?(input: AiModelCompleteInput): AsyncIterable<AiModelStreamEvent>;
};
