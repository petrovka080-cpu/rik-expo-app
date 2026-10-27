import {
  answerLiveAiFromRouteContext,
  answerLiveAiRoute,
  type LiveAiAnswer,
  type LiveAiRouteResult,
} from "./liveAiActionRouter";
import {
  resolveLiveAiRoute,
  type LiveAiRouteDefinition,
} from "./liveAiRouteRegistry";

export type LiveAiContextResolution = {
  registered: boolean;
  route: LiveAiRouteDefinition | null;
  exactReason: string | null;
};

export function resolveLiveAiContext(params: {
  routeContext?: string | null;
  assistantContext?: string | null;
}): LiveAiContextResolution {
  const route = resolveLiveAiRoute(params.routeContext) ?? resolveLiveAiRoute(params.assistantContext);
  if (!route) {
    return {
      registered: false,
      route: null,
      exactReason: "Для этого раздела AI-контекст ещё не подключён. Проверьте liveAiRouteRegistry.",
    };
  }
  return {
    registered: true,
    route,
    exactReason: null,
  };
}

export function answerResolvedLiveAiContext(params: {
  routeContext?: string | null;
  assistantContext?: string | null;
  userText: string;
  intentSources?: Parameters<typeof answerLiveAiFromRouteContext>[0]["intentSources"];
}): LiveAiRouteResult {
  return answerLiveAiFromRouteContext(params);
}

export function answerKnownLiveAiRoute(params: {
  route: LiveAiRouteDefinition;
  userText: string;
  forceActionId?: string;
  intentSources?: Parameters<typeof answerLiveAiRoute>[0]["intentSources"];
}): LiveAiAnswer {
  return answerLiveAiRoute(params);
}
