import {
  createEstimateRevisionState,
  getCurrentEstimateRevision,
  type EstimateRevisionState,
} from "../../src/lib/ai/estimateRevisions";
import type { EditableEstimateRow } from "../../src/lib/ai/editableEstimate";
import { editableRow, editableSnapshot } from "../editableEstimate/editableEstimateTestHelpers";

export const REVISION_TIME = "2026-06-15T00:00:00.000Z";

export function estimateRevisionState(rows: EditableEstimateRow[] = [editableRow()]): EstimateRevisionState {
  return createEstimateRevisionState({
    estimate_id: "estimate_1",
    request_id: "request_1",
    selected_work_key: "laminate_installation",
    region: "Bishkek",
    currency: "KGS",
    editable_estimate_snapshot: editableSnapshot(rows),
    created_by: "ai",
    created_at: REVISION_TIME,
  });
}

export function currentRevision(state: EstimateRevisionState) {
  return getCurrentEstimateRevision(state);
}

export function revisionEventTypes(state: EstimateRevisionState): string[] {
  return state.events.map((event) => event.event_type);
}

export { editableRow, editableSnapshot };
