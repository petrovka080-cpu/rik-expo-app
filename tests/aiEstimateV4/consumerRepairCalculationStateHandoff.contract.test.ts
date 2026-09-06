import {
  __resetConsumerRepairRequestStoreForTests,
  __simulateConsumerRepairRequestStoreReloadForTests,
  commitPreparedConsumerRepairRequestBundle,
  getConsumerRepairRequest,
} from "../../src/lib/consumerRequests";
import {
  applyCanonicalConsumerRepairAuditParamBatchPatch as applyConsumerRepairDraftRevisionParamBatchPatch,
  createCanonicalConsumerRepairAuditDraft as createConsumerRepairRequestDraft,
} from "../../scripts/estimate/canonicalConsumerRepairAuditHarness";
import {
  createEstimateRevisionState,
  getBoundEstimateRevisionCalculationState,
} from "../../src/lib/ai/estimateRevisions";
import { refreshEditableEstimateSnapshot } from "../../src/lib/ai/editableEstimate";
import { ConsumerRepairValidationError } from "../../src/lib/consumerRequests/consumerRequestMarketplaceService";
import { buildConsumerRepairDraftFromAiEstimateRuntime } from "../../src/lib/estimate/runtime/buildConsumerRepairDraftFromAiEstimateRuntime";
import {
  DEFAULT_ROADWORKS_WAVE_A_INPUTS,
  RoadworksWaveAProductionRegistry,
  getRoadworksWaveAParameterKeys,
  type RoadworksWaveAParameterKey,
} from "../../src/lib/estimate/v4/roadworks";
import type { RoadworksWaveAProductionRegistration } from "../../src/lib/estimate/v4/roadworks";
import {
  getConsumerRepairCalculationStateForReadOnlyDisplay,
} from "../../src/lib/consumerRequests/consumerRequestExactRoadworksCalculationStateMigration";
import { consumerRepairBundleHasPdfEligibleSnapshot } from "../../src/features/consumerRepair/ConsumerRepairRequestScreenView";

function requiredRoadworksWaveADefault(
  key: RoadworksWaveAParameterKey,
): string | number | boolean {
  const value = DEFAULT_ROADWORKS_WAVE_A_INPUTS[key];
  if (value === undefined) throw new Error(`ROADWORKS_WAVE_A_DEFAULT_MISSING:${key}`);
  return value;
}

function installLocalStorageMock(): () => void {
  const values = new Map<string, string>();
  const storage: Storage = {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => { values.delete(key); },
    setItem: (key, value) => { values.set(key, value); },
  };
  Object.defineProperty(globalThis, "localStorage", { value: storage, configurable: true });
  return () => { delete (globalThis as { localStorage?: Storage }).localStorage; };
}

function createRuntimeBundle(
  userId: string,
  selectedWork?: RoadworksWaveAProductionRegistration,
) {
  const work = selectedWork ?? RoadworksWaveAProductionRegistry.find(
    (item) => item.technologyFamily === "asphalt_surface_repair" && item.workId.endsWith("_standard"),
  );
  if (!work) throw new Error("TEST_ROADWORKS_REGISTRATION_MISSING");
  const rawInput = `${work.professionalNameRu}; площадь 120 м2`;
  const aiDraft = buildConsumerRepairDraftFromAiEstimateRuntime({
    rawInput,
    selectedWorkKey: work.workId,
    selectedTemplateId: work.workId,
    selectedTemplateName: work.professionalNameRu,
    city: "Bishkek",
    currency: "KGS",
    countryCode: "KG",
    paramOverrides: Object.fromEntries(
      getRoadworksWaveAParameterKeys(work.workId).map((key) => [
        key,
        {
          value: requiredRoadworksWaveADefault(key),
          source: "user_input" as const,
          sourceText: "state-handoff-production-fixture",
          lastChangedAt: "2026-08-07T01:00:00.000Z",
        },
      ]),
    ),
    createdAt: "2026-08-07T01:00:00.000Z",
  });
  if (!aiDraft?.runtimeEstimateDraftRevision) {
    throw new Error("TEST_RUNTIME_REVISION_HANDOFF_MISSING");
  }
  return {
    work,
    runtimeRevisionId: aiDraft.runtimeEstimateDraftRevision.revisionId,
    bundle: createConsumerRepairRequestDraft({
      consumerUserId: userId,
      problemText: rawInput,
      city: "Bishkek",
      selectedWork: aiDraft.selectedWork,
      aiDraft,
    }),
  };
}

describe("ConsumerRepairCalculationStateHandoffContract", () => {
  let cleanup: (() => void) | null = null;

  beforeEach(() => {
    cleanup = installLocalStorageMock();
    __resetConsumerRepairRequestStoreForTests();
  });

  afterEach(() => {
    __resetConsumerRepairRequestStoreForTests();
    cleanup?.();
    cleanup = null;
  });

  test("vector A: hands a fresh exact runtime revision to the canonical owner and edits after cold remount", () => {
    const created = createRuntimeBundle("calculation-handoff-owner");
    const initialCalculationState = created.bundle.estimateDraftRevisionState;
    expect(initialCalculationState?.currentRevisionId).toBeTruthy();
    expect(initialCalculationState?.currentRevisionId).not.toBe(created.runtimeRevisionId);
    expect(getBoundEstimateRevisionCalculationState(created.bundle.estimateRevisionState))
      .toEqual(initialCalculationState);
    expect(consumerRepairBundleHasPdfEligibleSnapshot(created.bundle)).toBe(true);
    const immutableInitialRevision = JSON.stringify(initialCalculationState?.revisions[0]);

    __simulateConsumerRepairRequestStoreReloadForTests();
    const restored = getConsumerRepairRequest(created.bundle.draft.id);
    expect(restored.estimateDraftRevisionState?.currentRevisionId)
      .toBe(initialCalculationState?.currentRevisionId);

    const edited = applyConsumerRepairDraftRevisionParamBatchPatch({
      requestDraftId: restored.draft.id,
      userId: restored.draft.consumerUserId,
      createdAt: "2026-08-07T01:01:00.000Z",
      patches: [{ operation: "update_param", paramKey: "area_m2", rawValue: "220" }],
    });
    const editedCalculationState = edited.estimateDraftRevisionState;
    expect(editedCalculationState?.revisions).toHaveLength(2);
    expect(editedCalculationState?.currentRevisionId).not.toBe(initialCalculationState?.currentRevisionId);
    expect(JSON.stringify(editedCalculationState?.revisions[0])).toBe(immutableInitialRevision);
    expect(getBoundEstimateRevisionCalculationState(edited.estimateRevisionState))
      .toEqual(editedCalculationState);
    expect(edited.draft.selectedWorkKey).toBe(created.work.workId);
    expect(editedCalculationState?.revisions.at(-1)?.params.area_m2?.value).toBe(220);
  });

  test("vector B: projects canonical calculation state when the legacy compatibility field is absent", () => {
    const created = createRuntimeBundle("canonical-only-calculation-handoff-owner");
    const canonicalOnly = commitPreparedConsumerRepairRequestBundle({
      ...created.bundle,
      estimateRevisionState: undefined,
      editableEstimateSnapshot: undefined,
    });
    expect(canonicalOnly.estimateRevisionState).toBeUndefined();
    expect(canonicalOnly.estimateDraftRevisionState?.currentRevisionId)
      .toBe(created.bundle.estimateDraftRevisionState?.currentRevisionId);

    __simulateConsumerRepairRequestStoreReloadForTests();
    const edited = applyConsumerRepairDraftRevisionParamBatchPatch({
      requestDraftId: canonicalOnly.draft.id,
      userId: canonicalOnly.draft.consumerUserId,
      createdAt: "2026-08-07T01:01:30.000Z",
      patches: [{ operation: "update_param", paramKey: "area_m2", rawValue: "240" }],
    });
    expect(edited.estimateDraftRevisionState?.revisions).toHaveLength(2);
    expect(edited.estimateDraftRevisionState?.revisions.at(-1)?.params.area_m2?.value).toBe(240);
    expect(edited.estimateDraftRevisionState).toEqual(
      getBoundEstimateRevisionCalculationState(edited.estimateRevisionState),
    );
  });

  test("vector C: keeps a historical snapshot read-only and blocks mutation without backend projection", () => {
    const created = createRuntimeBundle("historical-calculation-handoff-owner");
    if (!created.bundle.estimateRevisionState) throw new Error("TEST_CANONICAL_STATE_MISSING");
    const historicalPrepared = commitPreparedConsumerRepairRequestBundle({
      ...created.bundle,
      estimateRevisionState: {
        ...created.bundle.estimateRevisionState,
        calculation_state: null,
      },
      estimateDraftRevisionState: null,
    });
    expect(getBoundEstimateRevisionCalculationState(historicalPrepared.estimateRevisionState)).toBeNull();
    const readOnlyDisplay = getConsumerRepairCalculationStateForReadOnlyDisplay(historicalPrepared);
    expect(readOnlyDisplay?.revisions).toHaveLength(1);
    expect(readOnlyDisplay?.revisions[0]?.params.area_m2?.value).toBe(
      created.bundle.estimateDraftRevisionState?.revisions[0]?.params.area_m2?.value,
    );
    expect(historicalPrepared.estimateDraftRevisionState).toBeNull();
    expect(getBoundEstimateRevisionCalculationState(historicalPrepared.estimateRevisionState)).toBeNull();

    __simulateConsumerRepairRequestStoreReloadForTests();
    const before = JSON.stringify(getConsumerRepairRequest(historicalPrepared.draft.id));
    expect(() => applyConsumerRepairDraftRevisionParamBatchPatch({
      requestDraftId: historicalPrepared.draft.id,
      userId: historicalPrepared.draft.consumerUserId,
      createdAt: "2026-08-07T01:02:00.000Z",
      patches: [{ operation: "update_param", paramKey: "area_m2", rawValue: "260" }],
    })).toThrow(ConsumerRepairValidationError);
    expect(JSON.stringify(getConsumerRepairRequest(historicalPrepared.draft.id))).toBe(before);
  });

  test("vector D: fails closed before mutation when an isolated prepared snapshot is unrecoverable", () => {
    const created = createRuntimeBundle("unrecoverable-calculation-handoff-owner");
    if (!created.bundle.editableEstimateSnapshot) throw new Error("TEST_EDITABLE_SNAPSHOT_MISSING");
    const sourceBefore = JSON.stringify(created.bundle);
    const strippedSnapshot = refreshEditableEstimateSnapshot({
      ...created.bundle.editableEstimateSnapshot,
      rows: created.bundle.editableEstimateSnapshot.rows.map((row) => ({
        ...row,
        sourceParameters: row.sourceParameters
          ? { ...row.sourceParameters, roadworksWaveA: false }
          : null,
      })),
    });
    const isolatedState = createEstimateRevisionState({
      estimate_id: created.bundle.estimateRevisionState?.estimate_id ?? created.bundle.draft.id,
      request_id: created.bundle.draft.id,
      selected_work_key: created.work.workId,
      region: "Bishkek",
      currency: "KGS",
      editable_estimate_snapshot: strippedSnapshot,
      created_by: "ai",
      created_at: "2026-08-07T01:03:00.000Z",
      source: "AI_GENERATED",
      status: "DRAFT",
    });
    const isolatedPrepared = commitPreparedConsumerRepairRequestBundle({
      ...created.bundle,
      items: created.bundle.items.map((item) => ({
        ...item,
        sourceParameters: item.sourceParameters
          ? { ...item.sourceParameters, roadworksWaveA: false }
          : null,
      })),
      editableEstimateSnapshot: strippedSnapshot,
      estimateRevisionState: isolatedState,
      estimateDraftRevisionState: null,
    });
    __simulateConsumerRepairRequestStoreReloadForTests();
    const recoveredBeforeMutation = getConsumerRepairRequest(isolatedPrepared.draft.id);
    const isolatedBefore = JSON.stringify(recoveredBeforeMutation);
    let failure: unknown = null;
    try {
      applyConsumerRepairDraftRevisionParamBatchPatch({
        requestDraftId: isolatedPrepared.draft.id,
        userId: isolatedPrepared.draft.consumerUserId,
        createdAt: "2026-08-07T01:04:00.000Z",
        patches: [{ operation: "update_param", paramKey: "area_m2", rawValue: "280" }],
      });
    } catch (error) {
      failure = error;
    }
    expect(failure).toBeInstanceOf(ConsumerRepairValidationError);
    expect((failure as ConsumerRepairValidationError).errors).toEqual([
      expect.objectContaining({ code: "ESTIMATE_REVISION_STATE_RECOVERY_REQUIRED" }),
    ]);
    expect(JSON.stringify(getConsumerRepairRequest(isolatedPrepared.draft.id))).toBe(isolatedBefore);
    expect(JSON.stringify(created.bundle)).toBe(sourceBefore);
  });

  test("applies one production parameter batch through cold repository/codec recovery for all 35 exact work keys", () => {
    const dependencyFailures: Array<Record<string, unknown>> = [];
    const counts = {
      paramBatchApply: 0,
      stateRecovery: 0,
      newRevisionCreated: 0,
      previousRevisionImmutable: 0,
      exactOwnerPreserved: 0,
      dependentRowsChanged: 0,
      durableReplay: 0,
      unexpectedRowsChanged: 0,
      genericParserCalls: 0,
      genericCompilerCalls: 0,
      duplicateInitialRevisions: 0,
      partialMutations: 0,
      uncaughtErrors: 0,
    };

    for (const [index, work] of RoadworksWaveAProductionRegistry.entries()) {
      __resetConsumerRepairRequestStoreForTests();
      const created = createRuntimeBundle(`calculation-batch-${index}`, work);
      const initialState = created.bundle.estimateDraftRevisionState;
      if (!initialState) throw new Error(`TEST_INITIAL_CALCULATION_STATE_MISSING:${work.workId}`);
      if (initialState.revisions.length !== 1) counts.duplicateInitialRevisions += 1;
      const initialRevision = initialState.revisions[0];
      const immutableInitialRevision = JSON.stringify(initialRevision);
      const affectedByArea = new Set(initialRevision.boq.rows
        .filter((row) => Array.isArray(row.sourceParameters?.affectedBy) &&
          row.sourceParameters.affectedBy.includes("area_m2"))
        .map((row) => row.rowId));
      if (initialRevision.resolvedIdentity?.legacyFallbackUsed === true) {
        counts.genericParserCalls += 1;
      }
      if (!initialRevision.boq.rows.every((row) => row.sourceParameters?.roadworksWaveA === true)) {
        counts.genericCompilerCalls += 1;
      }

      __simulateConsumerRepairRequestStoreReloadForTests();
      const cold = getConsumerRepairRequest(created.bundle.draft.id);
      const coldState = cold.estimateDraftRevisionState;
      if (coldState?.currentRevisionId === initialRevision.revisionId) counts.stateRecovery += 1;
      const nextArea = 200 + index * 7;
      let edited;
      try {
        edited = applyConsumerRepairDraftRevisionParamBatchPatch({
          requestDraftId: cold.draft.id,
          userId: cold.draft.consumerUserId,
          createdAt: `2026-08-07T02:${String(index).padStart(2, "0")}:00.000Z`,
          patches: [{ operation: "update_param", paramKey: "area_m2", rawValue: String(nextArea) }],
        });
      } catch (error) {
        counts.uncaughtErrors += 1;
        throw error;
      }
      counts.paramBatchApply += 1;
      const editedState = edited.estimateDraftRevisionState;
      if (!editedState) throw new Error(`TEST_EDITED_CALCULATION_STATE_MISSING:${work.workId}`);
      const nextRevision = editedState.revisions.at(-1);
      const diff = editedState.diffs.at(-1);
      if (!nextRevision || !diff) throw new Error(`TEST_EDITED_REVISION_OR_DIFF_MISSING:${work.workId}`);
      if (nextRevision.revisionId !== initialRevision.revisionId && editedState.revisions.length === 2) {
        counts.newRevisionCreated += 1;
      }
      if (JSON.stringify(editedState.revisions[0]) === immutableInitialRevision) {
        counts.previousRevisionImmutable += 1;
      }
      if (
        edited.draft.selectedWorkKey === work.workId &&
        nextRevision.matchedFamily === work.workId &&
        nextRevision.resolvedIdentity?.requestedCatalogWorkId === work.workId
      ) {
        counts.exactOwnerPreserved += 1;
      }
      if (diff.changedRowsCount > 0 && diff.changedRows.every((row) => affectedByArea.has(row.rowId))) {
        counts.dependentRowsChanged += 1;
      } else {
        dependencyFailures.push({
          workId: work.workId,
          initialArea: initialRevision.params.area_m2?.value ?? null,
          nextArea: nextRevision.params.area_m2?.value ?? null,
          changedRows: diff.changedRows.map((row) => row.rowId),
          areaAffectedRows: [...affectedByArea],
        });
      }
      counts.unexpectedRowsChanged += diff.changedRows.filter((row) => !affectedByArea.has(row.rowId)).length;

      __simulateConsumerRepairRequestStoreReloadForTests();
      const reopened = getConsumerRepairRequest(edited.draft.id);
      const reopenedState = reopened.estimateDraftRevisionState;
      if (
        reopenedState?.currentRevisionId === nextRevision.revisionId &&
        reopenedState.revisions.at(-1)?.params.area_m2?.value === nextArea &&
        reopened.draft.selectedWorkKey === work.workId
      ) {
        counts.durableReplay += 1;
      }
    }

    expect(dependencyFailures).toEqual([]);
    expect(counts).toEqual({
      paramBatchApply: 35,
      stateRecovery: 35,
      newRevisionCreated: 35,
      previousRevisionImmutable: 35,
      exactOwnerPreserved: 35,
      dependentRowsChanged: 35,
      durableReplay: 35,
      unexpectedRowsChanged: 0,
      genericParserCalls: 0,
      genericCompilerCalls: 0,
      duplicateInitialRevisions: 0,
      partialMutations: 0,
      uncaughtErrors: 0,
    });
  });
});
