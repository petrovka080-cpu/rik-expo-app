import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { ConsumerRepairRequestScreenController } from "../../src/features/consumerRepair/ConsumerRepairRequestScreen";
import { ParameterDisclosurePanel } from "../../src/features/consumerRepair/ConsumerRepairProgressiveEstimatePanel";
import { buildConsumerCanonicalParameterSession } from "../../src/features/consumerRepair/consumerCanonicalParameterEditor";
import { __resetConsumerRepairRequestStoreForTests, createConsumerRepairRequestDraft } from "../../src/lib/consumerRequests";
import { appendCanonicalBackendRevisionProjection } from "../../src/lib/consumerRequests/consumerCanonicalBackendRevisionProjection";
import { buildCanonicalConsumerRepairRevisionFixture } from "../consumerRepair/canonicalConsumerRepairRevisionFixture";
import { AsyncStorageEstimateRevisionDurableStore } from "../../src/lib/platform/estimateRevisionDurableStore.asyncStorage";
import { serializeRevisionBundle } from "../../src/lib/platform/estimateRevisionDurableStore.contract";
import type { CanonicalEstimateCatalogItem } from "../../src/lib/estimate/backendPlatform/contracts";

jest.mock("@expo/vector-icons", () => ({ Ionicons: () => null }));

it.each([false, true])("keeps one actual mounted Apply pending until local commit, then reports its exact outcome (full=%s)", async full => {
  __resetConsumerRepairRequestStoreForTests();
  const before = createConsumerRepairRequestDraft({ consumerUserId: "mounted-owner", problemText: "Фундамент 35,5 метров",
    aiDraft: buildCanonicalConsumerRepairRevisionFixture("Фундамент 35,5 метров") });
  const parentId = String(before.items[0].sourceParameters!.canonicalBackendRevisionId), releaseId = String(before.items[0].sourceParameters!.canonicalBackendReleaseId);
  const catalog: CanonicalEstimateCatalogItem = { catalogId: "canonical-work:test:consumer-history-fixture", releaseId,
    namespace: "global", domain: "concrete_foundation", workKey: "strip", titleRu: "Фундамент", definitionVersion: 1,
    applicability: {}, professionalMetadata: {}, parameterSchema: [
      ["total_axis_length_m", "Общая длина", "USER_MEASURED"], ["strip_width_m", "Ширина", "PROJECT_DOCUMENTATION"],
    ].map(([parameterId, titleRu, role], ordinal) => ({ parameterId, titleRu, ordinal, unitId: "m", valueType: "decimal",
      required: true, defaultValue: null, constraints: { min: 0.000001 }, visibilityRole: "USER_INPUT",
      valueSourceRole: role as "USER_MEASURED" | "PROJECT_DOCUMENTATION", formulaConsumers: ["exact-project-formula"] })) };
  const params = { total_axis_length_m: 35.5, strip_width_m: 0.6 };
  const project = (bundle: typeof before, revisionId: string, parentRevisionId: string | null, parameters: typeof params) =>
    appendCanonicalBackendRevisionProjection({ previousBundle: parentRevisionId ? bundle : null,
      nextBundle: { ...bundle, items: bundle.items.map(i => ({ ...i, sourceParameters: { ...i.sourceParameters,
        canonicalBackendRevisionId: revisionId } })) }, payload: { workKey: "strip", inputText: before.draft.problemText,
        canonicalBackend: { compilerOwner: "backend", revisionId, parentRevisionId, revisionNumber: parentRevisionId ? 2 : 1,
          releaseId, catalogId: catalog.catalogId, createdAt: before.draft.createdAt, checksumSha256: "a".repeat(64),
          formulaGraphVersion: "test", parameterSchemaHash: "b".repeat(64), parameters } } as never });
  const parent = project(before, parentId, null, params), childId = "mounted-saved-child";
  const childParams = { total_axis_length_m: 36, strip_width_m: 0.7 };
  const projected = project(parent, childId, parentId, childParams);
  const child = { ...projected, events: [...projected.events, { id: "medium-source", requestDraftId: before.draft.id,
    eventType: "canonical_revision_saved", userId: "mounted-owner", createdAt: before.draft.createdAt,
    payload: { sourceEvidence: "TEST: full original project history retained; ".repeat(9000) } } as never] };
  const session = (revisionId: string, parentRevisionId: string | null, parameters: typeof params) => buildConsumerCanonicalParameterSession({ catalog,
    draftId: before.draft.id, revision: { revisionId, parentRevisionId, releaseId, catalogId: catalog.catalogId,
      definitionVersionId: "test-definition", definitionVersion: 1, status: "ready", parameters, userInputSnapshot: parameters,
      acceptedBaselineSnapshot: {}, assumptionSnapshot: {}, parameterSchemaHash: "b".repeat(64), compilerVersion: "test",
      checksumSha256: "a".repeat(64), createdAt: before.draft.createdAt, preliminaryNeeds: [] } });
  const values = new Map<string, string>();let capacity = Infinity;
  const store = new AsyncStorageEstimateRevisionDurableStore({ getItem: async k => values.get(k) ?? null,
    setItem: async (k, v) => { const bytes = [...values.values()].reduce((n, x) => n + Buffer.byteLength(x), 0);
      if (bytes - Buffer.byteLength(values.get(k) ?? "") + Buffer.byteLength(v) > capacity) throw new Error("database or disk is full");
      values.set(k, v); }, removeItem: async k => { values.delete(k); } });
  const initial = await store.writeBundleAtomically(before.draft.id, null, parent);expect(initial.status).toBe("WRITTEN");
  if (initial.status === "FAILED") throw new Error("fixture parent failed");
  const occupied = [...values.values()].reduce((n, v) => n + Buffer.byteLength(v), 0);
  capacity = occupied + (full ? 0 : Buffer.byteLength(serializeRevisionBundle(child).serializedBundle) * 2 + 8192);
  let release!: () => void;const gate = new Promise<void>(resolve => { release = resolve; });
  const write = jest.spyOn(store, "writeBundleAtomically");
  const recalculate = jest.fn(async () => {
    await gate;
    const result = await store.writeBundleAtomically(before.draft.id, initial.version, child);
    if (result.status === "FAILED") throw new Error("CONSUMER_REPAIR_TRANSACTIONAL_COMMIT_NOT_DURABLE");
    const saved = (await store.recoverLastValid(before.draft.id))!;
    expect(saved.estimateDraftRevisionState).toEqual(child.estimateDraftRevisionState);
    return { bundle: saved, session: session(childId, parentId, childParams) };
  });
  let renderer!: TestRenderer.ReactTestRenderer;
  act(() => { renderer = TestRenderer.create(<ConsumerRepairRequestScreenController consumerUserId="mounted-owner"
    onPrepareCanonicalEstimate={jest.fn()} onLoadCanonicalRevisionDraft={jest.fn()}
    onLoadCanonicalParameterSession={jest.fn(async () => session(parentId, null, params))}
    onRecalculateCanonicalEstimate={recalculate} onSelectCanonicalCatalogItem={jest.fn()}
    onAddCanonicalCatalogItem={jest.fn()} onOpenPhotoForMaterialRecognition={jest.fn()} />); });
  const controller = renderer.root.findByType(ConsumerRepairRequestScreenController).instance as ConsumerRepairRequestScreenController;
  act(() => controller.setState({ bundle: parent, canonicalBackendParameterSession: session(parentId, null, params), problemText: "" }));
  act(() => renderer.root.findByProps({ testID: "request-estimate-parameters-toggle" }).props.onPress());
  for (const [key, value] of [["total_axis_length_m", "36"], ["strip_width_m", "0,7"]]) {
    act(() => renderer.root.findByProps({ testID: "editable-param-inline-editor-" + key })
      .findByProps({ testID: "editable-param-popover-input" }).props.onChangeText(value));
  }
  act(() => renderer.root.findByProps({ testID: "editable-param-batch-apply" }).props.onPress());
  const panel = renderer.root.findByType(ParameterDisclosurePanel).instance as ParameterDisclosurePanel;
  expect(panel.state.applyState).toBe("pending");expect(recalculate).toHaveBeenCalledTimes(1);expect(write).not.toHaveBeenCalled();
  await act(async () => { release();await gate;await new Promise(resolve => setTimeout(resolve, 30)); });
  expect(write).toHaveBeenCalledTimes(1);expect(recalculate).toHaveBeenCalledTimes(1);
  if (full) {
    expect(panel.state.applyState).toBe("error");expect(panel.state.draftValues.total_axis_length_m).toBe("36");
    expect(panel.state.draftValues.strip_width_m).toBe("0,7");expect(controller.state.bundle?.estimateDraftRevisionState?.currentRevisionId).toBe(parentId);
  } else {
    expect(panel.state.applyState).toBe("success");expect(controller.state.bundle?.estimateDraftRevisionState?.currentRevisionId).toBe(childId);
    expect(panel.state.baselineValues.total_axis_length_m).toBe(panel.state.draftValues.total_axis_length_m);
    expect(panel.state.baselineValues.strip_width_m).toBe(panel.state.draftValues.strip_width_m);
    expect(renderer.root.findAllByProps({ testID: "request-estimate-parameter-apply-error" })).toHaveLength(0);
  }
  act(() => renderer.unmount());__resetConsumerRepairRequestStoreForTests();
});
