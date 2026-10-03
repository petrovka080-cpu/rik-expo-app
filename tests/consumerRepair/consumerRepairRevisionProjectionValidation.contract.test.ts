import {
  bindConsumerRepairEstimateRevisionHistory,
  ensureConsumerRepairBundleEstimateRevisionState,
} from "../../src/lib/consumerRequests/consumerRequestEditableEstimateSnapshot";
import type { ConsumerRepairDraftBundle } from "../../src/lib/consumerRequests/consumerRequestTypes";
import { bindEstimateRevisionCalculationState } from "../../src/lib/ai/estimateRevisions/estimateRevisionCalculationStateBinding";
import * as integrity from "../../src/lib/ai/estimateRevisions/estimateRevisionIntegrityGuard";
import type { EstimateDraftRevisionState } from "../../src/lib/estimate/estimateDraftRevisionContract";
import { estimateRevisionState, REVISION_TIME } from "../estimateRevisions/estimateRevisionTestHelpers";

function calculation(): EstimateDraftRevisionState {
  return {
    estimateDraftId: "calculation-draft", currentRevisionId: "calculation-8", diffs: [],
    revisions: Array.from({ length: 8 }, (_, index) => ({
      estimateDraftId: "calculation-draft", revisionId: `calculation-${index + 1}`,
      previousRevisionId: index ? `calculation-${index}` : null,
      source: "param_edit", rawInput: "Synthetic archived calculation", selectedTemplateId: "test-work",
      matchedFamily: "test", estimateLevel: "PRELIMINARY_QUANTITY_BOQ", rawInputFacts: [],
      rawInputFactMetrics: { explicit_input_facts_ignored: 0, explicit_input_unit_mismatches: 0, explicit_input_facts_overwritten_by_default: 0 },
      params: { length: { value: 100 + index, source: "user_input", lastChangedAt: REVISION_TIME } },
      assumptions: [], missingInputs: [], boq: { sections: [], rows: [] },
      trace: { traceId: `trace-${index}`, revisionId: `calculation-${index + 1}`, selectedTemplateId: "test-work", params: [], rows: [], staleTraceAccepted: false },
      status: "draft_ready", artifacts: { snapshotId: null, pdfArtifactId: null, buyerHandoffId: null, artifactsValidForRevisionId: null },
    })),
  };
}
function bundle(): ConsumerRepairDraftBundle {
  const state = bindEstimateRevisionCalculationState(estimateRevisionState(), calculation());
  // This pure projection reads only draft/snapshot/state; no repository or UI.
  return {
    draft: { id: "request_1", status: "draft", createdAt: REVISION_TIME },
    editableEstimateSnapshot: state.revisions[0].editable_estimate_snapshot,
    estimateRevisionState: state, estimateDraftRevisionState: state.calculation_state!.state,
  } as unknown as ConsumerRepairDraftBundle;
}

describe("bounded read-only revision projection validation", () => {
  afterEach(() => jest.restoreAllMocks());

  it("validates the existing canonical owner once and reuses that exact result", () => {
    const source = bundle();
    const before = JSON.stringify(source);
    const validate = jest.spyOn(integrity, "assertEstimateRevisionStateIntegrity");
    const projected = ensureConsumerRepairBundleEstimateRevisionState(source);
    expect(validate).toHaveBeenCalledTimes(1);
    expect(projected.estimateRevisionState).toBe(source.estimateRevisionState);
    expect(projected.estimateDraftRevisionState).toBe(source.estimateRevisionState!.calculation_state!.state);
    expect(JSON.stringify(source)).toBe(before);
  });

  it("projects the bound owner instead of a stale or absent compatibility field", () => {
    const source = bundle();
    for (const compatibility of [null, { ...calculation(), currentRevisionId: "calculation-1" }]) {
      const validate = jest.spyOn(integrity, "assertEstimateRevisionStateIntegrity");
      validate.mockClear();
      const projected = ensureConsumerRepairBundleEstimateRevisionState({ ...source, estimateDraftRevisionState: compatibility });
      expect(projected.estimateDraftRevisionState).toBe(source.estimateRevisionState!.calculation_state!.state);
      expect(validate).toHaveBeenCalledTimes(1);
    }
  });

  it("checks a newly bound legacy owner once through the actual binder", () => {
    const source = bundle();
    const unbound = { ...source, estimateRevisionState: { ...source.estimateRevisionState!, calculation_state: null } };
    const validate = jest.spyOn(integrity, "assertEstimateRevisionStateIntegrity");
    const projected = ensureConsumerRepairBundleEstimateRevisionState(unbound);
    expect(validate).toHaveBeenCalledTimes(1);
    expect(projected.estimateDraftRevisionState).toBe(source.estimateDraftRevisionState);
    expect(projected.estimateRevisionState!.calculation_state!.state).toBe(source.estimateDraftRevisionState);
    expect(unbound.estimateRevisionState.calculation_state).toBeNull();
  });

  it("adds a history pointer without re-normalizing the already validated state", () => {
    const source = bundle();
    const before = JSON.stringify(source);
    const validate = jest.spyOn(integrity, "assertEstimateRevisionStateIntegrity");
    const projected = bindConsumerRepairEstimateRevisionHistory({ bundle: source, history_entry_id: "owned-history" });
    expect(validate).toHaveBeenCalledTimes(1);
    expect(projected.estimateRevisionState!.history_bindings).toHaveLength(1);
    expect(projected.estimateRevisionState!.history_bindings[0].history_revision_id).toBe(source.estimateRevisionState!.current_revision_id);
    expect(projected.estimateRevisionState!.revisions).toBe(source.estimateRevisionState!.revisions);
    expect(projected.estimateRevisionState!.calculation_state).toBe(source.estimateRevisionState!.calculation_state);
    expect(JSON.stringify(source)).toBe(before);
  });

  it("still validates a previously bound history pointer on every read", () => {
    const bound = bindConsumerRepairEstimateRevisionHistory({ bundle: bundle(), history_entry_id: "owned-history" });
    const validate = jest.spyOn(integrity, "assertEstimateRevisionStateIntegrity");
    ensureConsumerRepairBundleEstimateRevisionState(bound);
    bound.estimateRevisionState!.calculation_state!.state.revisions[0].params.length.value = 999;
    expect(() => bindConsumerRepairEstimateRevisionHistory({ bundle: bound, history_entry_id: "owned-history" }))
      .toThrow("ESTIMATE_REVISION_CALCULATION_STATE_HASH_STALE");
    expect(validate).toHaveBeenCalledTimes(2);
  });

  it("rejects changed immutable rows even when the calculation binding is intact", () => {
    const source = bundle();
    source.estimateRevisionState!.revisions[0].editable_estimate_snapshot.rows[0].quantity = 999;
    expect(() => ensureConsumerRepairBundleEstimateRevisionState(source)).toThrow("ESTIMATE_REVISION_ROWS_HASH_STALE");
  });

  it("never repairs a corrupt calculation hash using the compatibility copy", () => {
    const source = bundle();
    source.estimateRevisionState!.calculation_state!.calculation_state_hash = "00000000";
    expect(() => ensureConsumerRepairBundleEstimateRevisionState(source)).toThrow("ESTIMATE_REVISION_CALCULATION_STATE_HASH_STALE");
  });

  it("preserves a historical unbound snapshot without inventing calculation state", () => {
    const source = bundle();
    const projected = ensureConsumerRepairBundleEstimateRevisionState({
      ...source, estimateRevisionState: { ...source.estimateRevisionState!, calculation_state: null }, estimateDraftRevisionState: null,
    });
    expect(projected.estimateDraftRevisionState).toBeNull();
    expect(projected.estimateRevisionState!.calculation_state).toBeNull();
  });
});
