import {
  __resetConsumerRepairRequestStoreForTests,
  __simulateConsumerRepairRequestStoreReloadForTests,
  commitPreparedConsumerRepairRequestBundle,
  createConsumerRepairRequestDraft,
  getConsumerRepairRequest,
} from "../../src/lib/consumerRequests";
import { buildEstimateFromInlineWorkPrompt } from "../../src/lib/estimate/buildEstimateFromInlineWorkPrompt";
import { RoadworksWaveAProductionRegistry } from "../../src/lib/estimate/v4/roadworks";

function installStorage(): () => void {
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

describe("RoadworksWaveABundleMetadataParityContract", () => {
  test("preserves ordered comment states and external attachment references", () => {
    const cleanup = installStorage();
    __resetConsumerRepairRequestStoreForTests();
    try {
      const work = RoadworksWaveAProductionRegistry.find((item) => item.technologyFamily === "asphalt_surface_repair")!;
      const estimate = buildEstimateFromInlineWorkPrompt({
        rawInput: `${work.professionalNameRu} 80 м2`,
        selectedWorkKey: work.workId,
        selectedTemplateId: work.templateId,
      });
      const created = createConsumerRepairRequestDraft({
        consumerUserId: "synthetic-metadata-owner",
        problemText: `${work.professionalNameRu} 80 м2`,
        aiDraft: estimate.draft,
      });
      const revisionId = created.estimateDraftRevisionState?.currentRevisionId ?? null;
      const rowId = created.items[0].sourceParameters?.rowCode as string;
      const comments = [
        { id: "note-estimate", rowId: null, text: "Общая заметка\nВторая строка", deleted: false },
        { id: "note-row", rowId, text: "Комментарий к строке", deleted: false },
        { id: "note-empty", rowId, text: "", deleted: false },
        { id: "note-deleted", rowId, text: "Удалённый комментарий", deleted: true },
        { id: "note-long", rowId, text: "Длинный текст ".repeat(200), deleted: false },
      ].map((comment, index) => ({
        ...comment,
        ownerUserId: created.draft.consumerUserId,
        estimateId: created.draft.id,
        revisionId,
        createdAt: `2026-07-23T05:00:0${index}.000Z`,
        updatedAt: `2026-07-23T05:01:0${index}.000Z`,
      }));
      const attachmentSeeds = [
        ["attachment-estimate", "estimate", null, "application/pdf"],
        ["attachment-revision", "revision", null, "application/pdf"],
        ["attachment-row-photo", "row", rowId, "image/jpeg"],
        ["attachment-row-document", "row", rowId, "application/pdf"],
      ] as const;
      const attachments = attachmentSeeds.map(([id, ownerScope, attachedRowId, mimeType], index) => ({
        id,
        ownerScope: ownerScope as "estimate" | "revision" | "row",
        estimateId: created.draft.id,
        revisionId: ownerScope === "estimate" ? null : revisionId,
        rowId: attachedRowId,
        fileName: `synthetic-${index}.${mimeType === "image/jpeg" ? "jpg" : "pdf"}`,
        mimeType,
        sizeBytes: 2000 + index,
        contentHash: `synthetic-content-${index}`,
        storageReference: `redacted://metadata/${index}`,
        thumbnailReference: mimeType === "image/jpeg" ? `redacted://thumbnail/${index}` : null,
        createdAt: `2026-07-23T05:02:0${index}.000Z`,
        deleted: false,
        privacy: "redacted" as const,
        redacted: true,
      }));
      commitPreparedConsumerRepairRequestBundle({
        ...created,
        estimateComments: comments,
        estimateAttachments: attachments,
      });

      __simulateConsumerRepairRequestStoreReloadForTests();
      const restored = getConsumerRepairRequest(created.draft.id);
      expect(restored.estimateComments).toEqual(comments);
      expect(restored.estimateAttachments).toEqual(attachments);
      expect(restored.estimateAttachments?.every((attachment) =>
        attachment.storageReference.startsWith("redacted://") &&
        !("content" in attachment)
      )).toBe(true);
    } finally {
      __resetConsumerRepairRequestStoreForTests();
      cleanup();
    }
  });
});
