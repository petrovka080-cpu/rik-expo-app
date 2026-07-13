import type { AiRunInput, AiRunResult } from "../../kernel/AiRuntimeKernelContract";

export type AiEstimatePluginInput = {
  runInput: AiRunInput;
};

export type AiEstimatePlugin = {
  readonly pluginId: "ai_estimate";
  run(input: AiEstimatePluginInput): AiRunResult;
};
