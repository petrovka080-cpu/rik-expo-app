import { createEstimateRevisionEvent } from "./estimateRevisionEvents";
import { getEstimateRevisionById } from "./estimateRevisionConcurrency";
import type {
  EstimateRevisionPdfBinding,
  EstimateRevisionState,
} from "./estimateRevisionTypes";

export function bindEstimateRevisionToPdfExport(input: {
  state: EstimateRevisionState;
  revision_id?: string;
  pdf_id: string;
  actor_id?: string;
  created_at?: string;
}): { state: EstimateRevisionState; binding: EstimateRevisionPdfBinding } {
  const revision = getEstimateRevisionById(input.state, input.revision_id ?? input.state.current_revision_id);
  const createdAt = input.created_at ?? new Date().toISOString();
  const binding: EstimateRevisionPdfBinding = {
    pdf_id: input.pdf_id,
    pdf_export_revision_id: revision.revision_id,
    pdf_snapshot_id: revision.snapshot_id,
    pdf_rows_hash: revision.rows_hash,
    pdf_totals_hash: revision.totals_hash,
    pdf_full_snapshot_hash: revision.full_snapshot_hash,
    pdf_recalculated_separately: false,
    created_at: createdAt,
    fake_green_claimed: false,
  };
  return {
    binding,
    state: {
      ...input.state,
      pdf_exports: [
        binding,
        ...input.state.pdf_exports.filter((candidate) => candidate.pdf_id !== input.pdf_id),
      ],
      events: [
        ...input.state.events,
        createEstimateRevisionEvent({
          revision_id: revision.revision_id,
          estimate_id: revision.estimate_id,
          event_type: "PDF_EXPORTED",
          event_index: input.state.events.length + 1,
          actor: "user",
          actor_id: input.actor_id,
          after_value: binding,
          reason_ru: "PDF \u043f\u0440\u0438\u0432\u044f\u0437\u0430\u043d \u043a \u0442\u0435\u043a\u0443\u0449\u0435\u0439 \u0440\u0435\u0432\u0438\u0437\u0438\u0438.",
          created_at: createdAt,
        }),
      ],
    },
  };
}
