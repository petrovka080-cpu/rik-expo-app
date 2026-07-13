import { applyAiEstimateMissingInputAnswer } from "../applyAiEstimateMissingInputAnswer";
import { applyAiEstimateParameterOverride } from "../applyAiEstimateParameterOverrides";
import { createInitialEstimateDraftRevisionState } from "../createEstimateDraftRevision";
import { appendRecalculatedEstimateDraftRevision } from "../recalculateEstimateDraftRevision";
import { parseUserParamPatch } from "../parseUserParamPatch";
import { validateAiEstimateRevisionChain } from "./validateAiEstimateRevisionChain";

export type AiEstimateRevisionEngineV2Validation = {
  ok: boolean;
  revisionEngineV2Created: boolean;
  revisionIsImmutable: boolean;
  manualOverrideCreatesNewRevision: boolean;
  missingInputAnswerCreatesNewRevision: boolean;
  formulaRecalcCreatesNewRevision: boolean;
  revisionChainPreserved: boolean;
  revisionDiffExplainsChangedRows: boolean;
  pdfMarkedStaleAfterRevisionChange: boolean;
  buyerPackageMarkedStaleAfterRevisionChange: boolean;
  approvedHistoryUsesRevisionIds: boolean;
  blockingReasons: string[];
};

export function validateAiEstimateRevisionEngineV2(): AiEstimateRevisionEngineV2Validation {
  const state = createInitialEstimateDraftRevisionState({
    estimateDraftId: "revision-engine-v2",
    rawInput: "capital apartment repair 98 m2 2 bathrooms ceiling height 2.7 m",
    selectedTemplateId: "demolition_interior_tile_remove_standard_professional_expanded_v1",
    createdAt: "2026-07-09T00:00:00.000Z",
    artifacts: {
      snapshotId: "snapshot_old",
      pdfArtifactId: "pdf_old",
      buyerHandoffId: "buyer_old",
      artifactsValidForRevisionId: "old_revision",
    },
  });
  const first = state.revisions[0];
  const beforeJson = JSON.stringify(first);
  const manual = applyAiEstimateParameterOverride({
    revision: first,
    operation: first.params.q ? "update_param" : "add_param",
    paramKey: "q",
    rawValue: "115",
    createdAt: "2026-07-09T00:01:00.000Z",
    revisionIndex: 2,
  });
  const missing = applyAiEstimateMissingInputAnswer({
    revision: manual.revision,
    paramKey: "material_specification",
    rawValue: "contract specification",
    createdAt: "2026-07-09T00:02:00.000Z",
    revisionIndex: 3,
  });
  const patch = parseUserParamPatch({
    revision: missing.revision,
    operation: missing.revision.params.width_m ? "update_param" : "add_param",
    paramKey: "width_m",
    rawValue: "7",
  });
  const nextState = appendRecalculatedEstimateDraftRevision(
    {
      estimateDraftId: state.estimateDraftId,
      currentRevisionId: missing.revision.revisionId,
      revisions: [first, manual.revision, missing.revision],
      diffs: [manual.diff, missing.diff],
    },
    patch,
    { createdAt: "2026-07-09T00:03:00.000Z", revisionIndex: 4 },
  );
  const chain = validateAiEstimateRevisionChain(nextState);
  const checks = {
    revision_engine_v2_created: true,
    revision_is_immutable: JSON.stringify(first) === beforeJson,
    manual_override_creates_new_revision: manual.revision.revisionId !== first.revisionId,
    missing_input_answer_creates_new_revision: missing.revision.revisionId !== manual.revision.revisionId,
    formula_recalc_creates_new_revision: nextState.currentRevisionId !== missing.revision.revisionId,
    revision_chain_preserved: chain.revisionChainPreserved,
    revision_diff_explains_changed_rows: manual.diff.changedRowsCount > 0 || missing.diff.changedRowsCount > 0,
    pdf_marked_stale_after_revision_change: manual.revision.artifacts.pdfArtifactId === null,
    buyer_package_marked_stale_after_revision_change: manual.revision.artifacts.buyerHandoffId === null,
    approved_history_uses_revision_ids: chain.approvedHistoryUsesRevisionIds,
  };
  const blockingReasons = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([key]) => key);
  return {
    ok: blockingReasons.length === 0,
    revisionEngineV2Created: true,
    revisionIsImmutable: checks.revision_is_immutable,
    manualOverrideCreatesNewRevision: checks.manual_override_creates_new_revision,
    missingInputAnswerCreatesNewRevision: checks.missing_input_answer_creates_new_revision,
    formulaRecalcCreatesNewRevision: checks.formula_recalc_creates_new_revision,
    revisionChainPreserved: checks.revision_chain_preserved,
    revisionDiffExplainsChangedRows: checks.revision_diff_explains_changed_rows,
    pdfMarkedStaleAfterRevisionChange: checks.pdf_marked_stale_after_revision_change,
    buyerPackageMarkedStaleAfterRevisionChange: checks.buyer_package_marked_stale_after_revision_change,
    approvedHistoryUsesRevisionIds: checks.approved_history_uses_revision_ids,
    blockingReasons,
  };
}
