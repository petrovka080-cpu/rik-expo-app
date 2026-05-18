import { useMemo } from "react";
import { useLocalSearchParams, type Href } from "expo-router";

import {
  getAssistantContextQuickPrompts,
  getAssistantQuickPrompts,
  normalizeAssistantContext,
} from "./assistantPrompts";
import type { AssistantContext, AssistantRole } from "./assistant.types";
import type { AssistantScopedFacts } from "./assistantScopeContext";
import {
  booleanAssistantRouteParam,
  firstAssistantRouteParam,
  parseAssistantRouteContextParam,
  resolveAssistantUserContext,
} from "./assistantUx/aiAssistantContextResolver";
import { resolveAiScreenIdForAssistantContext } from "./context/aiScreenContext";
import { buildApprovedRequestBundleFromSearchParams } from "./procurement/aiApprovedRequestSupplierProposalHydrator";
import { describeProcurementReadyBuyOptionsForAssistant } from "./procurement/aiBuyerInboxReadyBuyOptions";
import { buildProcurementReadyBuyBundleFromSearchParams } from "./procurement/aiProcurementRequestOptionHydrator";
import { getAiRoleScreenAssistantPack } from "./realAssistants/aiRoleScreenAssistantEngine";
import {
  buildAiScreenMagicPackFromWorkflowPack,
  describeAiScreenMagicPack,
} from "./screenMagic/aiScreenMagicEngine";
import {
  describeAiScreenNativeAssistantPack,
  getAiScreenNativeAssistantPack,
} from "./screenNative/aiScreenNativeAssistantEngine";
import {
  describeAiScreenWorkflowPack,
  getAiScreenWorkflowPack,
} from "./screenWorkflows/aiScreenWorkflowEngine";
import { getAiScreenReadyProposals } from "./screenProposals/aiScreenReadyProposalEngine";
import { OFFICE_TAB_ROUTE, PROFILE_TAB_ROUTE } from "../../lib/navigation/coreRoutes";
import { MARKET_TAB_ROUTE } from "../market/market.routes";

function resolveAssistantBackFallback(context: AssistantContext): Href {
  switch (context) {
    case "foreman":
    case "director":
    case "buyer":
    case "accountant":
    case "warehouse":
    case "contractor":
    case "security":
      return OFFICE_TAB_ROUTE;
    case "profile":
      return PROFILE_TAB_ROUTE;
    case "market":
    case "supplierMap":
    case "request":
    case "reports":
    case "unknown":
    default:
      return MARKET_TAB_ROUTE;
  }
}

export function useAIAssistantScreenDerivedState({
  role,
  scopedFacts,
}: {
  role: AssistantRole;
  scopedFacts: AssistantScopedFacts | null;
}) {
  const params = useLocalSearchParams() as Record<string, string | string[] | undefined>;
  const routePrompt = firstAssistantRouteParam(params.prompt);
  const routeAutoSend = firstAssistantRouteParam(params.autoSend);
  const routeContextParams = useMemo(
    () => parseAssistantRouteContextParam(firstAssistantRouteParam(params.context)),
    [params.context],
  );
  const routeContext = routeContextParams.context;
  const assistantContext = useMemo<AssistantContext>(() => normalizeAssistantContext(routeContext), [routeContext]);
  const debugAiContext = routeContextParams.debugAiContext || booleanAssistantRouteParam(params.debugAiContext);
  const assistantScreenId = useMemo(
    () => resolveAiScreenIdForAssistantContext(assistantContext),
    [assistantContext],
  );
  const resolvedUserContext = useMemo(
    () =>
      resolveAssistantUserContext({
        urlContext: assistantContext,
        sessionRole: role,
        screenId: assistantScreenId,
      }),
    [assistantContext, assistantScreenId, role],
  );
  const readyProposals = useMemo(
    () =>
      getAiScreenReadyProposals({
        context: assistantContext,
        screenId: resolvedUserContext.screenId,
        limit: assistantContext === "buyer" ? 4 : 3,
      }),
    [assistantContext, resolvedUserContext.screenId],
  );
  const approvedSupplierBundle = useMemo(
    () => buildApprovedRequestBundleFromSearchParams(params),
    [params],
  );
  const readyBuyBundle = useMemo(
    () => buildProcurementReadyBuyBundleFromSearchParams(params),
    [params],
  );
  const readyBuyFactsSummary = useMemo(
    () => describeProcurementReadyBuyOptionsForAssistant(readyBuyBundle),
    [readyBuyBundle],
  );
  const roleScreenAssistantPack = useMemo(
    () => getAiRoleScreenAssistantPack({
      role,
      context: assistantContext,
      screenId: firstAssistantRouteParam(params.screenId) || resolvedUserContext.screenId,
      searchParams: params,
      scopedFactsSummary: scopedFacts?.summary ?? null,
      readyBuyBundle,
    }),
    [assistantContext, params, readyBuyBundle, resolvedUserContext.screenId, role, scopedFacts?.summary],
  );
  const screenNativeAssistantPack = useMemo(
    () => getAiScreenNativeAssistantPack({
      role,
      context: assistantContext,
      screenId: firstAssistantRouteParam(params.screenId) || resolvedUserContext.screenId,
      searchParams: params,
      scopedFactsSummary: scopedFacts?.summary ?? null,
      readyBuyBundle,
    }),
    [assistantContext, params, readyBuyBundle, resolvedUserContext.screenId, role, scopedFacts?.summary],
  );
  const screenNativeAssistantSummary = useMemo(
    () => describeAiScreenNativeAssistantPack(screenNativeAssistantPack),
    [screenNativeAssistantPack],
  );
  const screenWorkflowPack = useMemo(
    () =>
      getAiScreenWorkflowPack({
        role,
        context: assistantContext,
        screenId: firstAssistantRouteParam(params.screenId) || resolvedUserContext.screenId,
        searchParams: params,
        scopedFactsSummary: scopedFacts?.summary ?? null,
      }),
    [assistantContext, params, resolvedUserContext.screenId, role, scopedFacts?.summary],
  );
  const screenMagicPack = buildAiScreenMagicPackFromWorkflowPack(screenWorkflowPack);
  const assistantFactsSummary = useMemo(
    () =>
      [
        scopedFacts?.summary ?? null,
        readyBuyFactsSummary,
        screenNativeAssistantSummary,
        describeAiScreenMagicPack(screenMagicPack),
        describeAiScreenWorkflowPack(screenWorkflowPack),
      ].filter(Boolean).join("\n\n") || null,
    [readyBuyFactsSummary, screenMagicPack, screenNativeAssistantSummary, screenWorkflowPack, scopedFacts?.summary],
  );
  const assistantVoiceScreen = useMemo(
    () => (role === "buyer" || role === "director" || role === "foreman" ? role : null),
    [role],
  );
  const quickPrompts = useMemo(() => {
    const merged = [
      ...getAssistantContextQuickPrompts(assistantContext),
      ...getAssistantQuickPrompts(role),
    ];
    const seen = new Set<string>();
    return merged.filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }, [assistantContext, role]);
  const backFallbackRoute = useMemo(
    () => resolveAssistantBackFallback(assistantContext),
    [assistantContext],
  );

  return {
    params,
    routePrompt,
    routeAutoSend,
    assistantContext,
    debugAiContext,
    resolvedUserContext,
    readyProposals,
    approvedSupplierBundle,
    readyBuyBundle,
    roleScreenAssistantPack,
    screenNativeAssistantPack,
    screenWorkflowPack,
    screenMagicPack,
    assistantFactsSummary,
    assistantVoiceScreen,
    quickPrompts,
    backFallbackRoute,
  };
}
