export type Batch00R3ValidationState = {
  predecessorExact: boolean;
  contractExact: boolean;
  activeBatchLockFree: boolean;
  m5Count: number;
  m5SetHashMatches: boolean;
  queueDeterministic: boolean;
  keywordSelectorUsed: boolean;
  semanticContextMissing: number;
  unreasonedDefers: number;
  silentSkips: number;
  hardDependencyMissing: number;
  selectedGroupCount: number;
  selectedRecordCount: number;
  executionBudgetPassed: boolean;
  incompatiblePairs: number;
  doubleCountConflicts: number;
  ownerGaps: number;
  kgStatusRouteReady: boolean;
  draftSourceActive: boolean;
  foreignMandatoryPromotions: number;
  regionalLaneCells: number;
  globalSystemDecisions: number;
  workObligationCount: number;
  selectedWorkCount: number;
  manifestPlaceholders: number;
  manifestHashMatches: boolean;
  authorizedIdCount: number;
  productionContentMutations: number;
  testWeakeningCount: number;
  mutationDetections: number;
  replayMatches: boolean;
};

export const GREEN_BATCH00_R3_STATE: Readonly<Batch00R3ValidationState> = Object.freeze({
  predecessorExact: true,
  contractExact: true,
  activeBatchLockFree: true,
  m5Count: 4005,
  m5SetHashMatches: true,
  queueDeterministic: true,
  keywordSelectorUsed: false,
  semanticContextMissing: 0,
  unreasonedDefers: 0,
  silentSkips: 0,
  hardDependencyMissing: 0,
  selectedGroupCount: 3,
  selectedRecordCount: 16,
  executionBudgetPassed: true,
  incompatiblePairs: 0,
  doubleCountConflicts: 0,
  ownerGaps: 0,
  kgStatusRouteReady: true,
  draftSourceActive: false,
  foreignMandatoryPromotions: 0,
  regionalLaneCells: 33,
  globalSystemDecisions: 24,
  workObligationCount: 16,
  selectedWorkCount: 16,
  manifestPlaceholders: 0,
  manifestHashMatches: true,
  authorizedIdCount: 16,
  productionContentMutations: 0,
  testWeakeningCount: 0,
  mutationDetections: 30,
  replayMatches: true,
});

export function validateBatch00R3State(state: Batch00R3ValidationState): string[] {
  const errors: string[] = [];
  if (!state.predecessorExact) errors.push("PREDECESSOR_BINDING_MISMATCH");
  if (!state.contractExact) errors.push("CONTRACT_IDENTITY_MISMATCH");
  if (!state.activeBatchLockFree) errors.push("ACTIVE_BATCH_LOCK_CONFLICT");
  if (state.m5Count !== 4005) errors.push("M5_DENOMINATOR_MISMATCH");
  if (!state.m5SetHashMatches) errors.push("M5_MEMBER_SET_HASH_MISMATCH");
  if (!state.queueDeterministic) errors.push("QUEUE_ORDER_NONDETERMINISTIC");
  if (state.keywordSelectorUsed) errors.push("KEYWORD_SELECTOR_FORBIDDEN");
  if (state.semanticContextMissing !== 0) errors.push("SEMANTIC_CONTEXT_MISSING");
  if (state.unreasonedDefers !== 0) errors.push("UNREASONED_DEFER");
  if (state.silentSkips !== 0) errors.push("SILENT_CANDIDATE_SKIP");
  if (state.hardDependencyMissing !== 0) errors.push("HARD_DEPENDENCY_NOT_PROMOTED");
  if (state.selectedGroupCount < 2 || state.selectedGroupCount > 3) errors.push("SELECTED_GROUP_COUNT_INVALID");
  if (state.selectedRecordCount !== 16) errors.push("SELECTED_RECORD_COUNT_MISMATCH");
  if (!state.executionBudgetPassed) errors.push("EXECUTION_BUDGET_EXCEEDED");
  if (state.incompatiblePairs !== 0) errors.push("PAIRWISE_INCOMPATIBILITY");
  if (state.doubleCountConflicts !== 0) errors.push("DOUBLE_COUNT_CONFLICT");
  if (state.ownerGaps !== 0) errors.push("PRODUCTION_OWNER_GAP");
  if (!state.kgStatusRouteReady) errors.push("KG_NORMATIVE_ROUTE_NOT_READY");
  if (state.draftSourceActive) errors.push("DRAFT_SOURCE_PROMOTED_ACTIVE");
  if (state.foreignMandatoryPromotions !== 0) errors.push("FOREIGN_SOURCE_PROMOTED_KG_MANDATORY");
  if (state.regionalLaneCells !== state.selectedGroupCount * 11) errors.push("REGIONAL_11_LANE_COVERAGE_GAP");
  if (state.globalSystemDecisions !== state.selectedGroupCount * 8) errors.push("GLOBAL_APPLICABILITY_COVERAGE_GAP");
  if (state.workObligationCount !== state.selectedWorkCount) errors.push("PER_WORK_OBLIGATION_GAP");
  if (state.manifestPlaceholders !== 0) errors.push("EXACT_MANIFEST_PLACEHOLDER");
  if (!state.manifestHashMatches) errors.push("EXACT_MANIFEST_HASH_MISMATCH");
  if (state.authorizedIdCount !== state.selectedWorkCount) errors.push("AUTHORIZED_ID_SET_MISMATCH");
  if (state.productionContentMutations !== 0) errors.push("PRODUCTION_CONTENT_MUTATION");
  if (state.testWeakeningCount !== 0) errors.push("TEST_WEAKENING");
  if (state.mutationDetections !== 30) errors.push("MUTATION_DENOMINATOR_MISMATCH");
  if (!state.replayMatches) errors.push("REPLAY_MISMATCH");
  return errors;
}

export const BATCH00_R3_CONTROLLED_MUTATIONS: ReadonlyArray<{
  id: string;
  expectedCode: string;
  mutate: (state: Batch00R3ValidationState) => void;
}> = [
  { id: "wrong_predecessor", expectedCode: "PREDECESSOR_BINDING_MISMATCH", mutate: (s) => { s.predecessorExact = false; } },
  { id: "changed_contract", expectedCode: "CONTRACT_IDENTITY_MISMATCH", mutate: (s) => { s.contractExact = false; } },
  { id: "active_batch_exists", expectedCode: "ACTIVE_BATCH_LOCK_CONFLICT", mutate: (s) => { s.activeBatchLockFree = false; } },
  { id: "m5_4004", expectedCode: "M5_DENOMINATOR_MISMATCH", mutate: (s) => { s.m5Count = 4004; } },
  { id: "m5_hash_changed", expectedCode: "M5_MEMBER_SET_HASH_MISMATCH", mutate: (s) => { s.m5SetHashMatches = false; } },
  { id: "queue_shuffled", expectedCode: "QUEUE_ORDER_NONDETERMINISTIC", mutate: (s) => { s.queueDeterministic = false; } },
  { id: "keyword_selection", expectedCode: "KEYWORD_SELECTOR_FORBIDDEN", mutate: (s) => { s.keywordSelectorUsed = true; } },
  { id: "semantic_context_removed", expectedCode: "SEMANTIC_CONTEXT_MISSING", mutate: (s) => { s.semanticContextMissing = 1; } },
  { id: "defer_without_reason", expectedCode: "UNREASONED_DEFER", mutate: (s) => { s.unreasonedDefers = 1; } },
  { id: "candidate_silently_skipped", expectedCode: "SILENT_CANDIDATE_SKIP", mutate: (s) => { s.silentSkips = 1; } },
  { id: "frame_dependency_not_promoted", expectedCode: "HARD_DEPENDENCY_NOT_PROMOTED", mutate: (s) => { s.hardDependencyMissing = 1; } },
  { id: "one_group", expectedCode: "SELECTED_GROUP_COUNT_INVALID", mutate: (s) => { s.selectedGroupCount = 1; } },
  { id: "wrong_record_total", expectedCode: "SELECTED_RECORD_COUNT_MISMATCH", mutate: (s) => { s.selectedRecordCount = 15; } },
  { id: "budget_failed", expectedCode: "EXECUTION_BUDGET_EXCEEDED", mutate: (s) => { s.executionBudgetPassed = false; } },
  { id: "incompatible_pair", expectedCode: "PAIRWISE_INCOMPATIBILITY", mutate: (s) => { s.incompatiblePairs = 1; } },
  { id: "shared_row_double_count", expectedCode: "DOUBLE_COUNT_CONFLICT", mutate: (s) => { s.doubleCountConflicts = 1; } },
  { id: "owner_missing", expectedCode: "PRODUCTION_OWNER_GAP", mutate: (s) => { s.ownerGaps = 1; } },
  { id: "kg_route_missing", expectedCode: "KG_NORMATIVE_ROUTE_NOT_READY", mutate: (s) => { s.kgStatusRouteReady = false; } },
  { id: "draft_marked_active", expectedCode: "DRAFT_SOURCE_PROMOTED_ACTIVE", mutate: (s) => { s.draftSourceActive = true; } },
  { id: "foreign_marked_kg_mandatory", expectedCode: "FOREIGN_SOURCE_PROMOTED_KG_MANDATORY", mutate: (s) => { s.foreignMandatoryPromotions = 1; } },
  { id: "one_regional_cell_missing", expectedCode: "REGIONAL_11_LANE_COVERAGE_GAP", mutate: (s) => { s.regionalLaneCells = 32; } },
  { id: "one_global_decision_missing", expectedCode: "GLOBAL_APPLICABILITY_COVERAGE_GAP", mutate: (s) => { s.globalSystemDecisions = 23; } },
  { id: "one_work_obligation_missing", expectedCode: "PER_WORK_OBLIGATION_GAP", mutate: (s) => { s.workObligationCount = 15; } },
  { id: "manifest_unknown", expectedCode: "EXACT_MANIFEST_PLACEHOLDER", mutate: (s) => { s.manifestPlaceholders = 1; } },
  { id: "manifest_hash_changed", expectedCode: "EXACT_MANIFEST_HASH_MISMATCH", mutate: (s) => { s.manifestHashMatches = false; } },
  { id: "authorized_id_missing", expectedCode: "AUTHORIZED_ID_SET_MISMATCH", mutate: (s) => { s.authorizedIdCount = 15; } },
  { id: "production_file_changed", expectedCode: "PRODUCTION_CONTENT_MUTATION", mutate: (s) => { s.productionContentMutations = 1; } },
  { id: "existing_test_weakened", expectedCode: "TEST_WEAKENING", mutate: (s) => { s.testWeakeningCount = 1; } },
  { id: "mutation_not_detected", expectedCode: "MUTATION_DENOMINATOR_MISMATCH", mutate: (s) => { s.mutationDetections = 29; } },
  { id: "replay_byte_drift", expectedCode: "REPLAY_MISMATCH", mutate: (s) => { s.replayMatches = false; } },
];

export function runBatch00R3ControlledMutations(): Array<Record<string, unknown>> {
  return BATCH00_R3_CONTROLLED_MUTATIONS.map(({ id, expectedCode, mutate }) => {
    const state = structuredClone(GREEN_BATCH00_R3_STATE) as Batch00R3ValidationState;
    mutate(state);
    const detectedCodes = validateBatch00R3State(state);
    return { id, expectedCode, detectedCodes, detected: detectedCodes.includes(expectedCode) };
  });
}
