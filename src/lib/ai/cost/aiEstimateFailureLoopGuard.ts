export type AiEstimateFailureLoopInput = {
  promptHash: string;
  estimateRetries: number;
  pdfRetries: number;
  catalogLookupFailures: number;
  sourceRefreshFailures: number;
  modelToolRetries: number;
  routeReloads: number;
};

export type AiEstimateFailureLoopResult = {
  status: "ALLOW_RETRY" | "SAFE_FAILURE_LOOP_BLOCKED";
  repeated_failed_prompt_loop_found: boolean;
  visibleMessageRu: string | null;
  failures: string[];
};

export const AI_ESTIMATE_FAILURE_LOOP_LIMITS = {
  estimateRetries: 2,
  pdfRetries: 2,
  catalogLookupFailures: 3,
  sourceRefreshFailures: 2,
  modelToolRetries: 1,
  routeReloads: 2,
} as const;

export function evaluateAiEstimateFailureLoop(input: AiEstimateFailureLoopInput): AiEstimateFailureLoopResult {
  const failures: string[] = [];
  for (const [key, limit] of Object.entries(AI_ESTIMATE_FAILURE_LOOP_LIMITS)) {
    const observed = input[key as keyof typeof AI_ESTIMATE_FAILURE_LOOP_LIMITS];
    if (observed > limit) failures.push(`${key}:${observed}>${limit}`);
  }

  return {
    status: failures.length > 0 ? "SAFE_FAILURE_LOOP_BLOCKED" : "ALLOW_RETRY",
    repeated_failed_prompt_loop_found: failures.length > 0,
    visibleMessageRu: failures.length > 0
      ? "\u041d\u0435 \u043f\u043e\u043b\u0443\u0447\u0438\u043b\u043e\u0441\u044c \u043d\u0430\u0434\u0435\u0436\u043d\u043e \u043f\u043e\u0432\u0442\u043e\u0440\u0438\u0442\u044c \u0440\u0430\u0441\u0447\u0435\u0442. \u042f \u043e\u0441\u0442\u0430\u043d\u043e\u0432\u0438\u043b \u043f\u043e\u0432\u0442\u043e\u0440\u044b, \u0447\u0442\u043e\u0431\u044b \u043d\u0435 \u0437\u0430\u0446\u0438\u043a\u043b\u0438\u0442\u044c \u0441\u043c\u0435\u0442\u0443."
      : null,
    failures,
  };
}
