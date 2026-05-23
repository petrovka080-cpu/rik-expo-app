import type { BuiltInAiIntentRoute, BuiltInAiRuntimeTrace, BuiltInAiToolResult } from "./builtInAiTypes";

export function createBuiltInAiTraceId(text: string, screenContext: string): string {
  let hash = 0;
  const seed = `${screenContext}:${text}`;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return `built_in_ai_${hash.toString(16).padStart(8, "0")}`;
}

export function createBuiltInAiRuntimeTrace(input: {
  route: BuiltInAiIntentRoute;
  toolResult: BuiltInAiToolResult;
  answerTextRu: string;
  hasPdfAction: boolean;
}): BuiltInAiRuntimeTrace {
  const text = input.answerTextRu;
  const estimate = input.toolResult.estimate;
  const product = input.toolResult.productSearch;
  return {
    traceId: input.route.traceId,
    input: input.route.originalText,
    screenContext: input.route.screenContext,
    detectedIntent: input.route.intent,
    selectedRoute: input.route.intent,
    selectedTool: input.toolResult.toolName,
    workKey: estimate?.work.workKey ?? input.route.workKey,
    category: estimate?.work.category ?? product?.category ?? input.route.category,
    volume: input.route.volume,
    unit: input.route.unit,
    backendCalled: input.toolResult.backendCalled,
    fallbackUsed: input.toolResult.fallbackUsed,
    blockedBy: input.toolResult.blockedBy,
    outputContract: {
      hasTable: text.includes("|"),
      hasMaterials: Boolean(estimate?.sections.some((section) => section.type === "materials")) || /материал/i.test(text),
      hasLabor: Boolean(estimate?.sections.some((section) => section.type === "labor" || section.type === "equipment")) || /работ|техник/i.test(text),
      hasSources: /источн|source|freshness|confidence/i.test(text),
      hasPdfAction: input.hasPdfAction,
    },
  };
}

let lastBuiltInAiRuntimeTrace: BuiltInAiRuntimeTrace | null = null;

export function rememberBuiltInAiRuntimeTrace(trace: BuiltInAiRuntimeTrace): void {
  lastBuiltInAiRuntimeTrace = trace;
}

export function getLastBuiltInAiRuntimeTrace(): BuiltInAiRuntimeTrace | null {
  return lastBuiltInAiRuntimeTrace ? { ...lastBuiltInAiRuntimeTrace, outputContract: { ...lastBuiltInAiRuntimeTrace.outputContract } } : null;
}
