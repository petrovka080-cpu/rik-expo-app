import { resolveBuiltInAiContext } from "./builtInAiContextResolver";
import { routeBuiltInAiIntent } from "./builtInAiIntentRouter";
import { applyBuiltInAiToolPolicy } from "./builtInAiToolPolicyEngine";
import { runBuiltInAiTool } from "./builtInAiToolRegistry";
import { composeBuiltInAiAnswer } from "./builtInAiAnswerComposer";
import { buildBuiltInAiActions } from "./builtInAiActionBuilder";
import {
  createBuiltInAiRuntimeTrace,
  rememberBuiltInAiRuntimeTrace,
} from "./builtInAiRuntimeTrace";
import { assertBuiltInAiAnswer } from "./builtInAiGuards";
import type { BuiltInAiAnswer, BuiltInAiInput } from "./builtInAiTypes";
import { logger } from "../../logger";

function recordNativeBuiltInStage(
  stage: string,
  startedAt: number,
): void {
  if (
    typeof navigator === "undefined" ||
    navigator.product !== "ReactNative"
  ) {
    return;
  }
  logger.info(
    "RikWarmDeepLink",
    `AI_ESTIMATE_PIPELINE_STAGE ${JSON.stringify({
      stage,
      elapsedMs: Date.now() - startedAt,
    })}`,
  );
}

export function answerBuiltInAi(input: BuiltInAiInput): BuiltInAiAnswer {
  const startedAt = Date.now();
  const resolvedScreenContext = resolveBuiltInAiContext({
    screenContext: input.screenContext,
    route: input.route,
    role: input.role ?? undefined,
  });
  recordNativeBuiltInStage("context_resolved", startedAt);
  const route = applyBuiltInAiToolPolicy(routeBuiltInAiIntent({ ...input, resolvedScreenContext }));
  recordNativeBuiltInStage("intent_routed", startedAt);
  const toolResult = runBuiltInAiTool(input, route);
  recordNativeBuiltInStage("tool_complete", startedAt);
  const answerTextRu = composeBuiltInAiAnswer(route, toolResult);
  const actions = buildBuiltInAiActions(route, toolResult);
  const runtimeTrace = createBuiltInAiRuntimeTrace({
    route,
    toolResult,
    answerTextRu,
    hasPdfAction: actions.some((action) => action.id === "make_pdf" && action.visible),
  });
  const answer: BuiltInAiAnswer = {
    handled: route.intent !== "general_chat",
    route,
    answerTextRu,
    actions,
    toolResult,
    runtimeTrace,
  };
  assertBuiltInAiAnswer(answer);
  rememberBuiltInAiRuntimeTrace(runtimeTrace);
  recordNativeBuiltInStage("answer_complete", startedAt);
  return answer;
}
