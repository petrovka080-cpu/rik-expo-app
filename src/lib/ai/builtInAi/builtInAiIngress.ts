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

export function answerBuiltInAi(input: BuiltInAiInput): BuiltInAiAnswer {
  const resolvedScreenContext = resolveBuiltInAiContext({
    screenContext: input.screenContext,
    route: input.route,
    role: input.role ?? undefined,
  });
  const route = applyBuiltInAiToolPolicy(routeBuiltInAiIntent({ ...input, resolvedScreenContext }));
  const toolResult = runBuiltInAiTool(input, route);
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
  return answer;
}
