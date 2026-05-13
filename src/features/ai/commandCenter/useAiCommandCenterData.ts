import { useEffect, useMemo, useState } from "react";

import { normalizeAiUserRole } from "../schemas/aiRoleSchemas";
import { loadCurrentProfileIdentity } from "../../profile/currentProfileIdentity";
import {
  buildAiCommandCenterViewModel,
  type AgentBffAuthContext,
  type AgentTaskStreamCard,
} from "./buildAiCommandCenterViewModel";
import { AI_COMMAND_CENTER_DEFAULT_CARD_LIMIT } from "./aiCommandCenterRuntimeBudget";
import type {
  AiCommandCenterDataState,
  AiCommandCenterViewModel,
} from "./AiCommandCenterTypes";

const anonymousViewModel = buildAiCommandCenterViewModel({ auth: null });

export type UseAiCommandCenterDataParams = {
  auth?: AgentBffAuthContext | null;
  sourceCards?: readonly AgentTaskStreamCard[];
};

function buildState(params: {
  loading: boolean;
  auth: AgentBffAuthContext | null;
  sourceCards?: readonly AgentTaskStreamCard[];
}): AiCommandCenterDataState {
  return {
    loading: params.loading,
    auth: params.auth,
    viewModel: buildAiCommandCenterViewModel({
      auth: params.auth,
      sourceCards: params.sourceCards,
      page: { limit: AI_COMMAND_CENTER_DEFAULT_CARD_LIMIT },
    }),
  };
}

export function useAiCommandCenterData(
  params: UseAiCommandCenterDataParams = {},
): AiCommandCenterDataState {
  const [resolvedAuth, setResolvedAuth] = useState<AgentBffAuthContext | null>(
    params.auth ?? null,
  );
  const [loading, setLoading] = useState(params.auth === undefined);
  const sourceCards = params.sourceCards;

  useEffect(() => {
    if (params.auth !== undefined) {
      setResolvedAuth(params.auth);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void loadCurrentProfileIdentity()
      .then((identity) => {
        if (cancelled) return;
        const userId = String(identity.userId ?? "").trim();
        const role = normalizeAiUserRole(identity.role);
        setResolvedAuth(userId ? { userId, role } : null);
      })
      .catch(() => {
        if (!cancelled) setResolvedAuth(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [params.auth]);

  return useMemo(
    () =>
      buildState({
        loading,
        auth: resolvedAuth,
        sourceCards,
      }),
    [loading, resolvedAuth, sourceCards],
  );
}

export function createAiCommandCenterStaticState(
  viewModel: AiCommandCenterViewModel = anonymousViewModel,
): AiCommandCenterDataState {
  return {
    loading: false,
    auth: null,
    viewModel,
  };
}
