export type AiModelProviderId =
  | "disabled"
  | "legacy_gemini"
  | "openai_future";

export type AiModelTaskType =
  | "chat"
  | "draft"
  | "classification"
  | "tool_plan"
  | "summary"
  | "voice_intent"
  | "risk_summary";

export type AiModelMessageRole =
  | "system"
  | "user"
  | "assistant"
  | "tool";

export type AiModelMessage = {
  role: AiModelMessageRole;
  content: string;
};

export type AiModelResponseFormat = "text" | "json";

export type AiModelRequest = {
  taskType: AiModelTaskType;
  messages: AiModelMessage[];
  maxOutputTokens: number;
  temperature: number;
  topP?: number;
  timeoutMs: number;
  redactionRequired: true;
  responseFormat?: AiModelResponseFormat;
  traceLabel?: string;
};

export type AiModelUsage = {
  inputTokens?: number;
  outputTokens?: number;
};

export type AiModelSafety = {
  redacted: boolean;
  blocked: boolean;
  reason?: string;
};

export type AiModelResponse = {
  provider: AiModelProviderId;
  model: string;
  text: string;
  structured?: unknown;
  usage?: AiModelUsage;
  safety: AiModelSafety;
};
