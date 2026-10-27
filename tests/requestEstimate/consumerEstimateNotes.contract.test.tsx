import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { ConsumerRepairEstimateNotes } from "../../src/features/consumerRepair/ConsumerRepairEstimateNotes";
import { buildRequestEstimateViewModel } from "../../src/features/consumerRepair/requestEstimateViewModel";
import { appendCanonicalBackendRevisionProjection } from "../../src/lib/consumerRequests/consumerCanonicalBackendRevisionProjection";
import { createConsumerRepairRequestDraft, saveConsumerRepairEstimateNote } from "../../src/lib/consumerRequests/consumerRequestService";
import { getConsumerRepairBundle, resetConsumerRepairRequestStoreForTests, saveConsumerRepairBundle,
  simulateConsumerRepairRequestStoreReloadForTests } from "../../src/lib/consumerRequests/consumerRequestRepository";

const revisionId = "a7b4d713-d7d9-4d33-a506-690051d375db";
const releaseId = "d30e2f0d-e55f-5d06-abef-c7cb80d69a73";
function fixture() {
  const base = createConsumerRepairRequestDraft({ consumerUserId: "notes-owner", problemText: "ДЕМО окраски" });
  const items = ["MATERIAL", "CONSUMABLE", "TOOL", "PPE", "LABOR", "SERVICE"].map((category, i) => ({
    id: `item-${i}`, requestDraftId: base.draft.id, itemType: "material" as const, category,
    titleRu: `Ресурс ${i}`, quantity: i === 0 ? 2.5 : null, unit: "item", unitPrice: i === 0 ? 37 : null,
    totalPrice: i === 0 ? 92.5 : null, currency: "KGS", source: "ai_suggested" as const,
    editableByConsumer: true, createdAt: "2026-10-27T00:00:00.000Z",
    sourceParameters: { rowCode: `resource-${i}`, rowSha256: String(i).repeat(64),
      canonicalBackendRevisionId: revisionId, canonicalBackendReleaseId: releaseId,
      canonicalBackendCatalogId: "paint-demo", canonicalBackendOwnershipStatus: "OWNED",
      includedInProcurement: i === 0, canonicalOperationComposition: {
        groupId: "paint", groupTitleRu: "Окраска", operationId: "prepare", operationTitleRu: "Подготовка",
      } },
  }));
  const payload = { workKey: "paint-demo", inputText: "ДЕМО окраски", canonicalBackend: {
    compilerOwner: "backend", revisionId, releaseId, catalogId: "paint-demo", revisionNumber: 1,
    parentRevisionId: null, checksumSha256: "a".repeat(64), createdAt: "2026-10-27T00:00:00.000Z", parameters: {},
  } };
  return saveConsumerRepairBundle(appendCanonicalBackendRevisionProjection({ previousBundle: null,
    nextBundle: { ...base, items }, payload: payload as never }));
}
const noteInput = (bundle: ReturnType<typeof fixture>, text = "Проверить согласованный цвет") => ({
  requestDraftId: bundle.draft.id, ownerUserId: "notes-owner", revisionId, text,
});

describe("notes preserve the authoritative estimate", () => {
  const originalStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); } };
  beforeEach(() => {
    values.clear();
    Object.defineProperty(globalThis, "localStorage", { configurable: true, value: storage });
    resetConsumerRepairRequestStoreForTests();
  });
  afterEach(() => {
    resetConsumerRepairRequestStoreForTests();
    if (originalStorage) Object.defineProperty(globalThis, "localStorage", originalStorage);
    else delete (globalThis as { localStorage?: Storage }).localStorage;
  });

  it("adds, cold reopens and deletes metadata without changing any resource, category, quantity or saved revision", () => {
    const original = fixture();
    const sections = buildRequestEstimateViewModel(original)!.sections;
    const saved = saveConsumerRepairEstimateNote(noteInput(original));
    expect(saved.items).toEqual(original.items);
    expect(saved.estimateDraftRevisionState).toEqual(original.estimateDraftRevisionState);
    expect(saved.structuredEstimatePayload).toEqual(original.structuredEstimatePayload);
    expect(buildRequestEstimateViewModel(saved)!.sections).toEqual(sections);
    expect(saved.estimateComments).toHaveLength(1);
    simulateConsumerRepairRequestStoreReloadForTests();
    const cold = getConsumerRepairBundle(original.draft.id);
    expect(cold.estimateComments).toEqual(saved.estimateComments);
    expect(cold.items).toMatchObject(original.items);
    const deleted = saveConsumerRepairEstimateNote({ ...noteInput(cold, ""), deleteCommentId: cold.estimateComments![0].id });
    expect(deleted.estimateComments![0].deleted).toBe(true);
    expect(deleted.items).toMatchObject(original.items);
    expect(deleted.estimateDraftRevisionState).toMatchObject(original.estimateDraftRevisionState!);
  });

  it("rejects a different owner, stale revision, blank note and foreign deletion without mutating the estimate", () => {
    const original = fixture(), before = JSON.stringify(getConsumerRepairBundle(original.draft.id));
    for (const patch of [{ ownerUserId: "other" }, { revisionId: "old-revision" }, { text: "  " },
      { text: "", deleteCommentId: "other-note" }]) {
      expect(() => saveConsumerRepairEstimateNote({ ...noteInput(original), ...patch })).toThrow();
      expect(JSON.stringify(getConsumerRepairBundle(original.draft.id))).toBe(before);
    }
  });

  it("requires text in the real note editor, saves once during an in-flight commit and exposes note deletion", async () => {
    let bundle = fixture();
    let release!: (value: boolean) => void;
    const onSave = jest.fn(async (input) => {
      bundle = saveConsumerRepairEstimateNote({ ...noteInput(bundle), ...input, requestDraftId: input.draftId });
      return new Promise<boolean>(resolve => { release = resolve; });
    });
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => { renderer = TestRenderer.create(<ConsumerRepairEstimateNotes bundle={bundle} busy={false} onSave={onSave} onClose={() => {}} />); });
    const button = () => renderer.root.findAllByProps({ accessibilityLabel: "Сохранить заметку" }).find(node => typeof node.type !== "string")!;
    expect(button().props.disabled).toBe(true);
    act(() => { renderer.root.findByType(require("react-native").TextInput).props.onChangeText("Заметка ДЕМО"); });
    expect(button().props.disabled).toBe(false);
    await act(async () => { const press = button().props.onPress; press(); press(); });
    expect(onSave).toHaveBeenCalledTimes(1);
    await act(async () => { release(true); });
    act(() => { renderer.update(<ConsumerRepairEstimateNotes bundle={bundle} busy={false} onSave={onSave} onClose={() => {}} />); });
    expect(renderer.root.findAllByProps({ accessibilityLabel: "Удалить заметку: Заметка ДЕМО" }).length).toBeGreaterThan(0);
    act(() => renderer.unmount());
  });
});
