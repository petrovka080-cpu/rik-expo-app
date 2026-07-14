import type { AiRunInput, AiRunMode, AiPlatformRole, AiPlatformSurface, AiRuntimeKernel } from "../kernel/AiRuntimeKernelContract";

export type LegacyAiEntrypointClassification = {
  entrypointId: string;
  surface: AiPlatformSurface;
  mode: AiRunMode;
  policyAdded: true;
  ledgerAdded: true;
  userVisibleBehaviorPreserved: true;
};

export function classifyLegacyAiEntrypoint(input: {
  entrypointId: string;
  surface: AiPlatformSurface;
  mode: AiRunMode;
}): LegacyAiEntrypointClassification {
  return {
    entrypointId: input.entrypointId,
    surface: input.surface,
    mode: input.mode,
    policyAdded: true,
    ledgerAdded: true,
    userVisibleBehaviorPreserved: true,
  };
}

export function wrapLegacyAiEntrypoint<TInput, TOutput>(input: {
  entrypointId: string;
  surface: AiPlatformSurface;
  mode: AiRunMode;
  role: AiPlatformRole;
  kernel: AiRuntimeKernel;
  sourceSha: string;
  runtimeVersion: string;
  handler: (value: TInput) => Promise<TOutput> | TOutput;
  toUserText?: (value: TInput) => string;
}) {
  return async (value: TInput): Promise<TOutput> => {
    const runInput: AiRunInput = {
      flowId: `${input.entrypointId}:${Date.now()}`,
      role: input.role,
      surface: input.surface,
      intent: input.entrypointId,
      userText: input.toUserText?.(value),
      mode: input.mode,
      sourceSha: input.sourceSha,
      runtimeVersion: input.runtimeVersion,
    };
    await input.kernel.validate(runInput);
    await input.kernel.run(runInput);
    return await input.handler(value);
  };
}
