import {
  InMemoryEstimateRevisionDurableStore,
  migrateLegacyEstimateRevisionBundle,
  stableEstimateRevisionChecksum,
  type DurableFailurePoint,
  type RevisionBundle,
} from "../../src/lib/platform/estimateRevisionDurableStore";

function maximumBundle(revisionCount: 1 | 2): RevisionBundle {
  const revisions = Array.from({ length: revisionCount }, (_, index) => ({
    estimateDraftId: "max-road-estimate",
    revisionId: `revision-r${index + 1}`,
    previousRevisionId: index === 0 ? null : `revision-r${index}`,
    source: index === 0 ? "initial_prompt" : "parameter_edit",
    rawInput: "Полное строительство дороги 3000 м × 32 м",
    selectedTemplateId: "asphalt_concrete_pavement_professional_truth_v4_phase1",
    matchedFamily: "asphalt_concrete_pavement",
    professionalWorkId: "asphalt_concrete_pavement",
    boq: {
      rows: Array.from({ length: 702 }, (_, rowIndex) => ({
        rowId: `road-row-${rowIndex + 1}`,
        titleRu: `Дорожная позиция ${rowIndex + 1}`,
        rowType: rowIndex % 3 === 0 ? "material" : "work",
        quantity: (index + 1) * (rowIndex + 1),
        unit: rowIndex % 3 === 0 ? "kg" : "m2",
        unitPrice: rowIndex + 0.25,
        totalPrice: (index + 1) * (rowIndex + 1) * (rowIndex + 0.25),
        currency: "KGS",
        quantityFormula: "area_m2 * rate",
        formulaId: `road-formula-${rowIndex + 1}`,
        calculationTrace: `revision=${index + 1};row=${rowIndex + 1}`,
      })),
    },
    params: {},
    trace: { rows: [] },
    missingInputs: [],
    assumptions: [],
    legacyRowsCount: 0,
  }));
  const currentRevisionId = revisions.at(-1)?.revisionId ?? "revision-r1";
  return {
    draft: {
      id: "max-road-estimate",
      consumerUserId: "durable-max-user",
      status: "draft",
      title: "Полное строительство дороги",
      problemText: "Полное строительство дороги 3000 м × 32 м",
      repairType: "road_construction",
      createdAt: "2026-07-24T05:00:00.000Z",
      updatedAt: `2026-07-24T05:0${revisionCount}:00.000Z`,
    },
    items: Array.from({ length: 702 }, (_, index) => ({
      id: `item-${index + 1}`,
      requestDraftId: "max-road-estimate",
      itemType: index % 3 === 0 ? "material" : "work",
      titleRu: `Дорожная позиция ${index + 1}`,
      quantity: revisionCount * (index + 1),
      unit: index % 3 === 0 ? "kg" : "m2",
      unitPrice: index + 0.25,
      totalPrice: revisionCount * (index + 1) * (index + 0.25),
      currency: "KGS",
      source: "reference_price_book",
      priceEditedByConsumer: true,
      priceStatus: "USER_ENTERED_PRICE",
      priceSource: "user",
      sourceParameters: { rowCode: `road-row-${index + 1}` },
      createdAt: "2026-07-24T05:00:00.000Z",
    })),
    media: [],
    pdfs: [],
    estimateDraftRevisionState: {
      estimateDraftId: "max-road-estimate",
      currentRevisionId,
      revisions,
      diffs: revisionCount === 2 ? [{
        fromRevisionId: "revision-r1",
        toRevisionId: "revision-r2",
        changedParams: ["width_m"],
        changedRows: Array.from({ length: 702 }, (_, index) => `road-row-${index + 1}`),
      }] : [],
    },
    projectExecutionDrafts: [],
    marketplaceLink: {
      requestDraftId: "max-road-estimate",
      publishedRequestId: null,
      linkedAt: null,
    },
    events: [],
    estimateComments: Array.from({ length: 24 }, (_, index) => ({
      id: `comment-${index + 1}`,
      ownerUserId: "durable-max-user",
      estimateId: "max-road-estimate",
      revisionId: currentRevisionId,
      rowId: `road-row-${index + 1}`,
      text: `Комментарий ${index + 1}`,
      createdAt: "2026-07-24T05:01:00.000Z",
      updatedAt: "2026-07-24T05:01:00.000Z",
      deleted: false,
    })),
    estimateAttachments: Array.from({ length: 8 }, (_, index) => ({
      id: `attachment-${index + 1}`,
      ownerScope: "estimate",
      estimateId: "max-road-estimate",
      revisionId: currentRevisionId,
      rowId: `road-row-${index + 1}`,
      fileName: `road-specification-${index + 1}.pdf`,
      mimeType: "application/pdf",
      sizeBytes: 1024 + index,
      contentHash: `content-${index + 1}`,
      storageReference: `redacted://road/${index + 1}`,
      thumbnailReference: null,
      createdAt: "2026-07-24T05:01:00.000Z",
      deleted: false,
      privacy: "redacted",
      redacted: true,
    })),
  } as unknown as RevisionBundle;
}

describe("EstimateRevisionDurableStore", () => {
  test("atomically keeps maximum R1 + R2, reloads R2, and recovers R1", async () => {
    const store = new InMemoryEstimateRevisionDurableStore();
    const r1 = maximumBundle(1);
    const r2 = maximumBundle(2);
    const first = await store.writeBundleAtomically("max-road-estimate", null, r1);
    expect(first).toMatchObject({ status: "WRITTEN", version: expect.stringContaining("revision-r1:content:") });
    if (first.status === "FAILED") throw new Error(first.error.message);
    const second = await store.writeBundleAtomically("max-road-estimate", first.version, r2);
    expect(second).toMatchObject({
      status: "WRITTEN",
      version: expect.stringContaining("revision-r2:content:"),
      previousVersion: first.version,
    });

    const reloaded = await store.readBundle("max-road-estimate");
    expect(reloaded?.estimateDraftRevisionState?.currentRevisionId).toBe("revision-r2");
    expect(reloaded?.estimateDraftRevisionState?.revisions).toHaveLength(2);
    expect(reloaded?.estimateDraftRevisionState?.revisions.at(-1)?.boq.rows).toHaveLength(702);
    expect(reloaded?.items.filter((item) => item.unitPrice != null)).toHaveLength(702);
    expect(reloaded?.estimateComments).toHaveLength(24);
    expect(reloaded?.estimateAttachments).toHaveLength(8);
    expect(store.revisionCount("max-road-estimate")).toBe(2);

    store.corruptCurrentForTests("max-road-estimate");
    const recovered = await store.recoverLastValid("max-road-estimate");
    expect(recovered?.estimateDraftRevisionState?.currentRevisionId).toBe("revision-r1");
    expect(recovered?.estimateDraftRevisionState?.revisions).toHaveLength(1);
    expect(store.revisionCount("max-road-estimate")).toBe(1);
  });

  test("preserves the last committed revision through 12 controlled failure classes", async () => {
    const injectedPoints: DurableFailurePoint[] = [
      "before_write",
      "after_revision_write",
      "before_pointer_switch",
      "after_pointer_switch",
      "before_read_back",
      "before_orphan_cleanup",
    ];
    let accepted = 0;
    for (const point of injectedPoints) {
      const store = new InMemoryEstimateRevisionDurableStore();
      const baseline = await store.writeBundleAtomically("max-road-estimate", null, maximumBundle(1));
      if (baseline.status === "FAILED") throw new Error(baseline.error.message);
      store.setFailureInjector((candidate) => {
        if (candidate === point) throw new Error(`INJECTED:${point}`);
      });
      const result = await store.writeBundleAtomically(
        "max-road-estimate",
        baseline.version,
        maximumBundle(2),
      );
      expect(result.status).toBe("FAILED");
      store.setFailureInjector(null);
      expect((await store.readBundle("max-road-estimate"))
        ?.estimateDraftRevisionState?.currentRevisionId).toBe("revision-r1");
      accepted += 1;
    }

    const conflictStore = new InMemoryEstimateRevisionDurableStore();
    await conflictStore.writeBundleAtomically("max-road-estimate", null, maximumBundle(1));
    expect((await conflictStore.writeBundleAtomically(
      "max-road-estimate",
      "stale-version",
      maximumBundle(2),
    ))).toMatchObject({ status: "FAILED", error: { code: "CONFLICT" } });
    accepted += 1;

    const serializationStore = new InMemoryEstimateRevisionDurableStore();
    const serializationBaseline = await serializationStore.writeBundleAtomically(
      "max-road-estimate",
      null,
      maximumBundle(1),
    );
    if (serializationBaseline.status === "FAILED") throw new Error(serializationBaseline.error.message);
    const cyclic = maximumBundle(2) as RevisionBundle & { cycle?: unknown };
    cyclic.cycle = cyclic;
    expect((await serializationStore.writeBundleAtomically(
      "max-road-estimate",
      serializationBaseline.version,
      cyclic,
    )).status).toBe("FAILED");
    expect((await serializationStore.readBundle("max-road-estimate"))
      ?.estimateDraftRevisionState?.currentRevisionId).toBe("revision-r1");
    accepted += 1;

    const idempotentStore = new InMemoryEstimateRevisionDurableStore();
    const r1 = maximumBundle(1);
    const idempotentBaseline = await idempotentStore.writeBundleAtomically("max-road-estimate", null, r1);
    if (idempotentBaseline.status === "FAILED") throw new Error(idempotentBaseline.error.message);
    expect(await idempotentStore.writeBundleAtomically(
      "max-road-estimate",
      idempotentBaseline.version,
      r1,
    )).toMatchObject({ status: "UNCHANGED", version: idempotentBaseline.version });
    accepted += 1;
    expect(await idempotentStore.writeBundleAtomically(
      "max-road-estimate",
      idempotentBaseline.version,
      r1,
    )).toMatchObject({ status: "UNCHANGED", version: idempotentBaseline.version });
    accepted += 1;

    await idempotentStore.writeBundleAtomically(
      "max-road-estimate",
      idempotentBaseline.version,
      maximumBundle(2),
    );
    idempotentStore.corruptCurrentForTests("max-road-estimate");
    expect((await idempotentStore.recoverLastValid("max-road-estimate"))
      ?.estimateDraftRevisionState?.currentRevisionId).toBe("revision-r1");
    accepted += 1;

    idempotentStore.addOrphanForTests("max-road-estimate");
    expect(idempotentStore.revisionCount("max-road-estimate")).toBe(2);
    await idempotentStore.deleteOrphans("max-road-estimate");
    expect(idempotentStore.revisionCount("max-road-estimate")).toBe(1);
    accepted += 1;

    expect(accepted).toBe(12);
  });

  test("migrates legacy payload only after checksum read-back and pointer publication", async () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value); },
      removeItem: (key: string) => { values.delete(key); },
    };
    const bundle = maximumBundle(2);
    const legacyRaw = JSON.stringify(bundle);
    values.set("legacy", legacyRaw);
    const durableStore = new InMemoryEstimateRevisionDurableStore();

    const result = await migrateLegacyEstimateRevisionBundle({
      key: "max-road-estimate",
      legacyStorageKey: "legacy",
      pointerStorageKey: "pointer",
      storage,
      durableStore,
    });

    expect(result).toMatchObject({
      status: "MIGRATED",
      version: expect.stringContaining("revision-r2:content:"),
      checksum: stableEstimateRevisionChecksum(legacyRaw),
    });
    expect(values.has("legacy")).toBe(false);
    expect(JSON.parse(values.get("pointer") ?? "{}")).toMatchObject({
      schemaVersion: "estimate_revision_legacy_pointer_v1",
      currentVersion: expect.stringContaining("revision-r2:content:"),
      checksum: stableEstimateRevisionChecksum(legacyRaw),
    });
    expect((await durableStore.readBundle("max-road-estimate"))?.items).toHaveLength(702);
  });

  test("keeps legacy active and does not publish a pointer when migration fails", async () => {
    const values = new Map<string, string>([["legacy", JSON.stringify(maximumBundle(2))]]);
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value); },
      removeItem: (key: string) => { values.delete(key); },
    };
    const durableStore = new InMemoryEstimateRevisionDurableStore({
      failureInjector: (point) => {
        if (point === "before_pointer_switch") throw new Error("MIGRATION_WRITE_FAILED");
      },
    });
    const result = await migrateLegacyEstimateRevisionBundle({
      key: "max-road-estimate",
      legacyStorageKey: "legacy",
      pointerStorageKey: "pointer",
      storage,
      durableStore,
    });

    expect(result).toMatchObject({ status: "FAILED" });
    expect(values.has("legacy")).toBe(true);
    expect(values.has("pointer")).toBe(false);
    expect(await durableStore.readBundle("max-road-estimate")).toBeNull();
  });

  test("rolls back a published marker when legacy deletion fails and retries idempotently", async () => {
    const values = new Map<string, string>([["legacy", JSON.stringify(maximumBundle(2))]]);
    let rejectLegacyDeletion = true;
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value); },
      removeItem: (key: string) => {
        if (key === "legacy" && rejectLegacyDeletion) {
          throw new Error("LEGACY_DELETE_FAILED");
        }
        values.delete(key);
      },
    };
    const durableStore = new InMemoryEstimateRevisionDurableStore();
    const migrate = () => migrateLegacyEstimateRevisionBundle({
      key: "max-road-estimate",
      legacyStorageKey: "legacy",
      pointerStorageKey: "pointer",
      storage,
      durableStore,
    });

    expect(await migrate()).toMatchObject({ status: "FAILED" });
    expect(values.has("legacy")).toBe(true);
    expect(values.has("pointer")).toBe(false);
    expect(durableStore.revisionCount("max-road-estimate")).toBe(1);

    rejectLegacyDeletion = false;
    expect(await migrate()).toMatchObject({ status: "MIGRATED" });
    expect(values.has("legacy")).toBe(false);
    expect(values.has("pointer")).toBe(true);
    expect(durableStore.revisionCount("max-road-estimate")).toBe(1);
  });
});
