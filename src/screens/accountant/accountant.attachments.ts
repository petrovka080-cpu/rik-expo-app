import { supabase } from "../../lib/supabaseClient";
import {
  ensureProposalAttachmentUrl,
  listCanonicalProposalAttachments,
  toProposalAttachmentLegacyRow,
  type ProposalAttachmentLegacyRow,
  type ProposalAttachmentViewState,
} from "../../lib/api/proposalAttachments.service";

type SupabaseLike = typeof supabase;

export type AccountantAttachmentLoadResult = {
  rows: ProposalAttachmentLegacyRow[];
  state: ProposalAttachmentViewState;
  sourceKind: string;
  fallbackUsed: boolean;
  rawCount: number;
  filteredCount: number;
  errorMessage: string | null;
};

export async function listProposalAttachments(
  client: SupabaseLike,
  proposalId: string,
): Promise<AccountantAttachmentLoadResult> {
  const result = await listCanonicalProposalAttachments(client, proposalId, {
    screen: "accountant",
  });

  return {
    rows: result.rows.map(toProposalAttachmentLegacyRow),
    state: result.state,
    sourceKind: result.sourceKind,
    fallbackUsed: result.fallbackUsed,
    rawCount: result.rawCount,
    filteredCount: result.filteredCount,
    errorMessage: result.errorMessage,
  };
}

export async function ensureAttachmentSignedUrl(
  client: SupabaseLike,
  row: ProposalAttachmentLegacyRow,
): Promise<string> {
  return ensureProposalAttachmentUrl(client, row);
}
