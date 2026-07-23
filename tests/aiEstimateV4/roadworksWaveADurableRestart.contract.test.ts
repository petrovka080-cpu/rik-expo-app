import {
  __resetConsumerRepairRequestStoreForTests,
  __simulateConsumerRepairRequestStoreReloadForTests,
  applyConsumerRepairDraftRevisionParamPatch,
  buildConsumerRepairCanonicalDraftPayload,
  createConsumerRepairRequestDraft,
  getConsumerRepairRequest,
  updateConsumerRepairRequestItemUnitPrice,
} from "../../src/lib/consumerRequests";
import { buildEstimateFromInlineWorkPrompt } from "../../src/lib/estimate/buildEstimateFromInlineWorkPrompt";
import { createAiEstimateRuntime } from "../../src/lib/estimate/runtime/createAiEstimateRuntime";
import { RoadworksWaveAProductionRegistry } from "../../src/lib/estimate/v4/roadworks";

function installLocalStorageMock(): () => void {
  const values = new Map<string, string>();
  const storage: Storage = {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => Array.from(values.keys())[index] ?? null,
    removeItem: (key) => { values.delete(key); },
    setItem: (key, value) => { values.set(key, value); },
  };
  Object.defineProperty(globalThis, "localStorage", { value: storage, configurable: true });
  return () => { delete (globalThis as { localStorage?: Storage }).localStorage; };
}

function fingerprint(value: unknown): string {
  const text = JSON.stringify(value);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

function canonicalWaveAFingerprintInput(bundle: ReturnType<typeof getConsumerRepairRequest>) {
  return {
    workId: bundle.draft.selectedWorkKey,
    rows: bundle.items.map((row) => ({
      id: row.id,
      rowCode: row.sourceParameters?.rowCode,
      quantity: row.quantity,
      unit: row.unit,
      unitPrice: row.unitPrice,
      priceStatus: row.priceStatus,
      priceSource: row.priceSource,
      formulaId: row.formulaId,
      quantityFormula: row.quantityFormula,
      templateId: row.templateId,
      templateVersion: row.templateVersion,
      canonicalWorkId: row.sourceParameters?.canonicalWorkId,
      migrationVersion: row.sourceParameters?.migrationVersion,
      scopeProfile: row.sourceParameters?.scopeProfile,
      parameterSnapshot: row.sourceParameters?.parameterSnapshot,
      includedInProcurement: row.sourceParameters?.includedInProcurement,
    })),
  };
}

describe("RoadworksWaveADurableRestartContract", () => {
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

  test("cold-restarts all 35 work IDs through the production durable adapter", () => {
    let passed = 0;
    const editedFamilies = new Set<string>();
    for (const [index, item] of RoadworksWaveAProductionRegistry.entries()) {
      const rawInput = `${item.professionalNameRu} ${120 + index} м2 толщина 50 мм`;
      const estimate = buildEstimateFromInlineWorkPrompt({
        rawInput,
        selectedWorkKey: item.workId,
        selectedTemplateId: item.templateId,
      });
      if (!estimate.draft) throw new Error(`Wave A draft missing: ${item.workId}`);
      let sessionA = createConsumerRepairRequestDraft({
        consumerUserId: `wave-a-durable-user-${index}`,
        problemText: rawInput,
        selectedWork: estimate.draft.selectedWork,
        aiDraft: estimate.draft,
      });
      if (!editedFamilies.has(item.technologyFamily)) {
        sessionA = applyConsumerRepairDraftRevisionParamPatch({
          requestDraftId: sessionA.draft.id,
          operation: "update_param",
          paramKey: "area_m2",
          rawValue: String(220 + index),
          createdAt: "2026-07-23T03:00:00.000Z",
        });
        editedFamilies.add(item.technologyFamily);
      }
      const priced = sessionA.items[0];
      sessionA = updateConsumerRepairRequestItemUnitPrice({
        requestDraftId: sessionA.draft.id,
        itemId: priced.id,
        unitPrice: 1000 + index,
      });
      const sessionAPayload = buildConsumerRepairCanonicalDraftPayload(sessionA, "draft_save");
      const sessionAFingerprint = fingerprint(canonicalWaveAFingerprintInput(sessionA));
      const requestDraftId = sessionA.draft.id;

      __simulateConsumerRepairRequestStoreReloadForTests();

      const sessionB = getConsumerRepairRequest(requestDraftId);
      expect(sessionB).not.toBe(sessionA);
      expect(sessionB.draft.selectedWorkKey).toBe(item.workId);
      expect(sessionB.items.find((row) => row.id === priced.id)?.unitPrice).toBe(1000 + index);
      const sessionBPayload = buildConsumerRepairCanonicalDraftPayload(sessionB, "draft_save");
      expect(sessionBPayload.draft.selectedWorkKey).toBe(sessionAPayload.draft.selectedWorkKey);
      expect(fingerprint(canonicalWaveAFingerprintInput(sessionB))).toBe(sessionAFingerprint);
      const currentRevisionId = sessionB.estimateDraftRevisionState?.currentRevisionId;
      const revision = sessionB.estimateDraftRevisionState?.revisions.find(
        (candidate) => candidate.revisionId === currentRevisionId,
      );
      if (!revision) throw new Error(`Durable revision missing: ${item.workId}`);
      const runtimeB = createAiEstimateRuntime();
      const pdf = runtimeB.buildPdfSnapshot({ revision });
      const buyer = runtimeB.buildBuyerPackage({ revision: pdf.revision, snapshot: pdf.snapshot });
      expect(pdf.snapshot.rows).toEqual(revision.boq.rows);
      expect(pdf.pdf.rowsHash).toBe(pdf.snapshot.rowsHash);
      expect(buyer.buyerPackage.items.every((row) =>
        revision.boq.rows.some((candidate) => candidate.rowId === row.rowId && candidate.includedInProcurement)
      )).toBe(true);
      if (editedFamilies.has(item.technologyFamily) &&
        RoadworksWaveAProductionRegistry.find((candidate) => candidate.technologyFamily === item.technologyFamily)?.workId === item.workId
      ) {
        const afterRestart = applyConsumerRepairDraftRevisionParamPatch({
          requestDraftId,
          operation: "update_param",
          paramKey: "area_m2",
          rawValue: String(320 + index),
          createdAt: "2026-07-23T03:01:00.000Z",
        });
        expect(afterRestart.draft.selectedWorkKey).toBe(item.workId);
        expect(afterRestart.estimateDraftRevisionState?.revisions.length).toBeGreaterThan(
          sessionB.estimateDraftRevisionState?.revisions.length ?? 0,
        );
        expect(afterRestart.estimateDraftRevisionState?.currentRevisionId).not.toBe(currentRevisionId);
      }
      passed += 1;
    }
    expect(passed).toBe(35);
  });
});
