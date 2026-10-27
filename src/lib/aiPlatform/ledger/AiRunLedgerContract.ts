import type { AiRunMode } from "../kernel/AiRuntimeKernelContract";

export type AiBudgetUsage = {
  inputChars: number;
  maxInputChars: number;
  outputTokens?: number;
};

export type AiToolPlanSummary = {
  toolName: string;
  mode: AiRunMode;
  allowed: boolean;
  approvalRequired: boolean;
};

export type AiRunLedgerRecord = {
  aiRunId: string;
  flowId: string;
  sourceSha: string;
  runtimeVersion: string;
  role: string;
  surface: string;
  intent: string;
  mode: AiRunMode;
  providerKey: string;
  modelKey: string;
  toolPlanSummary?: AiToolPlanSummary;
  approvalRequired: boolean;
  approvalGranted: boolean;
  redactionPassed: boolean;
  budgetUsed: AiBudgetUsage;
  status: "completed" | "blocked" | "failed";
  createdAt: string;
};

export type AiRunLedgerAppendInput = Omit<AiRunLedgerRecord, "aiRunId" | "createdAt"> & {
  aiRunId?: string;
  createdAt?: string;
};
