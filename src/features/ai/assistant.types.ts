import type { AiEstimatePdfAction, AiEstimatePdfSource } from "../../lib/ai/estimatePdf";

export type AssistantRole =
  | "foreman"
  | "director"
  | "buyer"
  | "accountant"
  | "warehouse"
  | "contractor"
  | "security"
  | "unknown";

export type AssistantContext =
  | "foreman"
  | "director"
  | "buyer"
  | "accountant"
  | "warehouse"
  | "contractor"
  | "security"
  | "office"
  | "documents"
  | "chat"
  | "admin"
  | "runtime"
  | "client"
  | "supplier"
  | "market"
  | "supplierMap"
  | "profile"
  | "reports"
  | "request"
  | "unknown";

export type AssistantMessageRole = "user" | "assistant";

export interface AssistantMessage {
  id: string;
  role: AssistantMessageRole;
  content: string;
  createdAt: string;
  estimatePdfSource?: AiEstimatePdfSource;
  actions?: AiEstimatePdfAction[];
}

export interface AssistantQuickPrompt {
  id: string;
  label: string;
  prompt: string;
}
