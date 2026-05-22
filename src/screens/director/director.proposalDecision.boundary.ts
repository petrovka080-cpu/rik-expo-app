import type { AppSupabaseClient } from "../../lib/dbContract.types";
import {
  isRpcIgnoredMutationResponse,
  validateRpcResponse,
} from "../../lib/api/queryBoundary";
import { MAX_LIST_LIMIT } from "../../lib/api/queryLimits";
import { recordPlatformObservability } from "../../lib/observability/platformObservability";
import {
  callDirectorDecideProposalItemsRpc,
  type DirectorProposalItemDecision,
} from "./director.proposalDecision.transport";

type DirectorProposalDecisionResultKind = "success" | "error";

const toErrorText = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message.trim()) return error.message.trim();
  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    for (const key of ["message", "details", "hint", "code"] as const) {
      const value = String(record[key] ?? "").trim();
      if (value) return value;
    }
  }
  return String(error ?? "").trim() || fallback;
};

const recordDirectorProposalDecisionEvent = (
  event: string,
  result: DirectorProposalDecisionResultKind,
  extra: Record<string, unknown>,
  error?: unknown,
) => {
  recordPlatformObservability({
    screen: "director",
    surface: "director_proposal_decision",
    category: "ui",
    event,
    result,
    sourceKind: "mutation:director:proposal_decision",
    errorClass: error instanceof Error ? error.name : error ? "DirectorProposalDecisionError" : undefined,
    errorMessage: error ? toErrorText(error, "director proposal decision failed") : undefined,
    extra,
  });
};

const readProposalItemRequestId = async (
  supabase: AppSupabaseClient,
  proposalId: string,
  proposalItemId: string,
): Promise<string> => {
  const proposalItemIdNumber = Number(proposalItemId);
  if (!Number.isFinite(proposalItemIdNumber)) {
    throw new Error("proposal_item_id must be numeric");
  }
  const query = await supabase
    .from("proposal_items")
    .select("request_item_id")
    .eq("proposal_id", proposalId)
    .eq("id", proposalItemIdNumber)
    .maybeSingle();
  if (query.error) throw query.error;

  const requestItemId = String(query.data?.request_item_id || "").trim();
  if (!requestItemId) throw new Error("В строке предложения отсутствует request_item_id.");
  return requestItemId;
};

const readProposalRequestItemIds = async (
  supabase: AppSupabaseClient,
  proposalId: string,
): Promise<string[]> => {
  const proposalQuery = await supabase
    .from("proposals")
    .select("sent_to_accountant_at")
    .eq("id", proposalId)
    .maybeSingle();
  if (proposalQuery.error) throw proposalQuery.error;
  if (proposalQuery.data?.sent_to_accountant_at) {
    throw new Error("Документ уже у бухгалтерии. Вернуть может только бухгалтер.");
  }

  const itemsQuery = await supabase
    .from("proposal_items")
    .select("request_item_id")
    .eq("proposal_id", proposalId)
    .limit(MAX_LIST_LIMIT);
  if (itemsQuery.error) throw itemsQuery.error;

  const ids = Array.from(
    new Set(
      ((itemsQuery.data || []) as { request_item_id?: string | null }[])
        .map((row) => String(row.request_item_id || "").trim())
        .filter(Boolean),
    ),
  );
  if (!ids.length) throw new Error("В предложении нет строк для возврата.");
  return ids;
};

const runDirectorProposalDecisionRpc = async (
  supabase: AppSupabaseClient,
  args: {
    proposalId: string;
    decisions: DirectorProposalItemDecision[];
    finalize: boolean;
  },
) => {
  const { data, error } = await callDirectorDecideProposalItemsRpc(supabase, {
    p_proposal_id: args.proposalId,
    p_decisions: args.decisions,
    p_finalize: args.finalize,
  });
  if (error) throw error;
  validateRpcResponse(data, isRpcIgnoredMutationResponse, {
    rpcName: "director_decide_proposal_items",
    caller: "src/screens/director/director.proposalDecision.boundary.runDirectorProposalDecisionRpc",
    domain: "director",
  });
};

export async function runDirectorProposalRejectItemAction(params: {
  supabase: AppSupabaseClient;
  proposalId: string;
  proposalItemId: string | number;
  finalize: boolean;
  comment: string;
}): Promise<{ requestItemId: string }> {
  const proposalId = String(params.proposalId ?? "").trim();
  const proposalItemId = String(params.proposalItemId ?? "").trim();
  const eventBase = { proposalId, proposalItemId, finalize: params.finalize };
  recordDirectorProposalDecisionEvent("director_proposal_reject_item_started", "success", eventBase);

  try {
    if (!proposalId) throw new Error("proposal_id is required");
    if (!proposalItemId) throw new Error("proposal_item_id is required");

    const requestItemId = await readProposalItemRequestId(params.supabase, proposalId, proposalItemId);
    await runDirectorProposalDecisionRpc(params.supabase, {
      proposalId,
      decisions: [
        {
          request_item_id: requestItemId,
          decision: "rejected",
          comment: params.comment,
        },
      ],
      finalize: params.finalize,
    });

    recordDirectorProposalDecisionEvent("director_proposal_reject_item_terminal_success", "success", {
      ...eventBase,
      requestItemId,
    });
    return { requestItemId };
  } catch (error) {
    recordDirectorProposalDecisionEvent("director_proposal_reject_item_terminal_failure", "error", eventBase, error);
    throw error;
  }
}

export async function runDirectorProposalReturnAllAction(params: {
  supabase: AppSupabaseClient;
  proposalId: string | number;
  comment: string;
}): Promise<{ requestItemIds: string[] }> {
  const proposalId = String(params.proposalId ?? "").trim();
  const eventBase = { proposalId };
  recordDirectorProposalDecisionEvent("director_proposal_return_all_started", "success", eventBase);

  try {
    if (!proposalId) throw new Error("proposal_id is required");
    const requestItemIds = await readProposalRequestItemIds(params.supabase, proposalId);
    await runDirectorProposalDecisionRpc(params.supabase, {
      proposalId,
      decisions: requestItemIds.map((requestItemId) => ({
        request_item_id: requestItemId,
        decision: "rejected",
        comment: params.comment,
      })),
      finalize: true,
    });

    recordDirectorProposalDecisionEvent("director_proposal_return_all_terminal_success", "success", {
      ...eventBase,
      requestItemCount: requestItemIds.length,
    });
    return { requestItemIds };
  } catch (error) {
    recordDirectorProposalDecisionEvent("director_proposal_return_all_terminal_failure", "error", eventBase, error);
    throw error;
  }
}
