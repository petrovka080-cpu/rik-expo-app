import { getEstimateRevisionById } from "./estimateRevisionConcurrency";
import type {
  EstimateRevisionHistoryBinding,
  EstimateRevisionState,
} from "./estimateRevisionTypes";

export function bindEstimateRevisionToHistoryEntry(input: {
  state: EstimateRevisionState;
  revision_id?: string;
  history_entry_id: string;
  created_at?: string;
}): { state: EstimateRevisionState; binding: EstimateRevisionHistoryBinding } {
  const revision = getEstimateRevisionById(input.state, input.revision_id ?? input.state.current_revision_id);
  const binding: EstimateRevisionHistoryBinding = {
    history_entry_id: input.history_entry_id,
    history_revision_id: revision.revision_id,
    history_snapshot_id: revision.snapshot_id,
    history_rows_hash: revision.rows_hash,
    history_totals_hash: revision.totals_hash,
    history_recalculated_separately: false,
    created_at: input.created_at ?? new Date().toISOString(),
    fake_green_claimed: false,
  };
  return {
    binding,
    state: {
      ...input.state,
      history_bindings: [
        binding,
        ...input.state.history_bindings.filter((candidate) => candidate.history_entry_id !== input.history_entry_id),
      ],
    },
  };
}
