import { createMemoryOfflineStorage } from "../../lib/offline/offlineStorage";
import {
  clearForemanDurableDraftState,
  configureForemanDurableDraftStore,
  hydrateForemanDurableDraftStore,
  replaceForemanDurableDraftSnapshot,
} from "./foreman.durableDraft.store";
import {
  buildCompactForemanLocalDraftSnapshotPayload,
  restoreForemanLocalDraftSnapshotFromPayload,
} from "./foreman.localDraft.compactPayload";
import type { ForemanLocalDraftSnapshot } from "./foreman.localDraft";

const FOREMAN_DURABLE_DRAFT_STORAGE_KEY = "foreman_durable_draft_store_v2";

const createLargeSnapshot = (
  requestId = "req-compact-1",
  itemCount = 150,
): ForemanLocalDraftSnapshot => ({
  version: 1,
  ownerId: `srv:${requestId}`,
  requestId,
  displayNo: `REQ-${requestId}`,
  status: "draft",
  header: {
    foreman: "Compact Foreman",
    comment: "large offline draft",
    objectType: "OBJ",
    level: "L1",
    system: "SYS",
    zone: "Z1",
  },
  items: Array.from({ length: itemCount }, (_, index) => ({
    local_id: `local-${index}`,
    remote_item_id: `item-${index}`,
    rik_code: `MAT-${index}`,
    name_human: `Material ${index}`,
    qty: index + 1,
    uom: "pcs",
    status: "draft",
    note: index % 3 === 0 ? `note ${index}` : null,
    app_code: index % 4 === 0 ? `APP-${index}` : null,
    kind: "material",
    line_no: index + 1,
  })),
  qtyDrafts: Object.fromEntries(
    Array.from({ length: itemCount }, (_, index) => [`item-${index}`, String(index + 1)]),
  ),
  pendingDeletes: [
    {
      local_id: "deleted-local-1",
      remote_item_id: "deleted-remote-1",
    },
  ],
  submitRequested: false,
  lastError: null,
  updatedAt: "2026-04-16T10:00:00.000Z",
  baseServerRevision: "2026-04-16T09:59:00.000Z",
});

describe("foreman durable draft compact payload", () => {
  beforeEach(async () => {
    configureForemanDurableDraftStore({ storage: createMemoryOfflineStorage() });
    await clearForemanDurableDraftState();
  });

  it("round-trips compact payload to the exact full snapshot contract", () => {
    const snapshot = createLargeSnapshot();
    const payload = buildCompactForemanLocalDraftSnapshotPayload(snapshot);
    const restored = restoreForemanLocalDraftSnapshotFromPayload(payload);

    expect(payload?.kind).toBe("compact_v1");
    expect(JSON.stringify(restored)).toBe(JSON.stringify(snapshot));
    expect(JSON.stringify(payload).length).toBeLessThan(JSON.stringify(snapshot).length);
  });

  it("persists durable replay snapshot in compact mode and hydrates a full snapshot", async () => {
    const storage = createMemoryOfflineStorage();
    const snapshot = createLargeSnapshot("req-compact-persist");
    configureForemanDurableDraftStore({ storage });

    await replaceForemanDurableDraftSnapshot(snapshot, {
      syncStatus: "queued",
      pendingOperationsCount: 1,
      queueDraftKey: snapshot.requestId,
      requestIdKnown: true,
    });

    const raw = JSON.parse(storage.dump()[FOREMAN_DURABLE_DRAFT_STORAGE_KEY]);
    expect(raw).toMatchObject({
      version: 3,
      payloadSchemaVersion: 1,
      snapshot: null,
      snapshotStorageMode: "compact_v1",
      snapshotPayload: {
        kind: "compact_v1",
      },
    });
    expect(raw.snapshotPayload.snapshot.i).toHaveLength(150);

    const hydrated = await hydrateForemanDurableDraftStore();
    expect(JSON.stringify(hydrated.snapshot)).toBe(JSON.stringify(snapshot));
  });

  it("uses legacy full snapshot fallback when compact payload is invalid", async () => {
    const snapshot = createLargeSnapshot("req-compact-fallback", 3);
    const storage = createMemoryOfflineStorage({
      [FOREMAN_DURABLE_DRAFT_STORAGE_KEY]: JSON.stringify({
        version: 3,
        payloadSchemaVersion: 1,
        snapshot,
        snapshotStorageMode: "compact_v1",
        snapshotPayload: {
          kind: "compact_v1",
          snapshot: {
            v: 1,
            i: "not-an-array",
          },
        },
        syncStatus: "queued",
        pendingOperationsCount: 1,
        queueDraftKey: snapshot.requestId,
        requestIdKnown: true,
      }),
    });
    configureForemanDurableDraftStore({ storage });

    const hydrated = await hydrateForemanDurableDraftStore();

    expect(JSON.stringify(hydrated.snapshot)).toBe(JSON.stringify(snapshot));
  });

  it("hydrates an empty safe state when durable draft storage JSON is corrupted", async () => {
    const storage = createMemoryOfflineStorage({
      [FOREMAN_DURABLE_DRAFT_STORAGE_KEY]: "{broken",
    });
    configureForemanDurableDraftStore({ storage });

    const hydrated = await hydrateForemanDurableDraftStore();

    expect(hydrated).toMatchObject({
      hydrated: true,
      snapshot: null,
      syncStatus: "idle",
      pendingOperationsCount: 0,
    });
    expect(storage.dump()[FOREMAN_DURABLE_DRAFT_STORAGE_KEY]).toBe("{broken");
  });
});
