/**
 * mutationQueue.quarantine.test.ts
 *
 * Verifies that the quarantine observability layer correctly emits
 * structured events when queue entries fail schema validation,
 * and that valid entries are NOT quarantined.
 *
 * P0-B: Offline Queue Schema Versioning & Quarantine Guard
 */

import { createMemoryOfflineStorage } from "./offlineStorage";
import {
  clearForemanMutationQueue,
  configureMutationQueue,
  enqueueForemanMutation,
  loadForemanMutationQueue,
} from "./mutationQueue";
import { MUTATION_PAYLOAD_SCHEMA_VERSION } from "./mutation.quarantine";
import { recordPlatformObservability } from "../observability/platformObservability";

jest.mock("../observability/platformObservability", () => ({
  recordPlatformObservability: jest.fn(),
}));

const MUTATION_QUEUE_STORAGE_KEY = "offline_mutation_queue_v2";

const mockedRecord = recordPlatformObservability as unknown as jest.Mock;

const configureStores = () => {
  configureMutationQueue({ storage: createMemoryOfflineStorage() });
};

const createValidSeedEntry = (overrides: Record<string, unknown> = {}) => ({
  id: "valid-seed-1",
  owner: "foreman",
  entityType: "foreman_draft",
  entityId: "req-123",
  scope: "foreman_draft",
  type: "background_sync",
  dedupeKey: "foreman_draft:req-123:background_sync:snap-v1:sync",
  baseVersion: "snap-v1",
  serverVersionHint: null,
  coalescedCount: 0,
  schemaVersion: MUTATION_PAYLOAD_SCHEMA_VERSION,
  payload: {
    draftKey: "req-123",
    requestId: "req-123",
    snapshotUpdatedAt: "snap-v1",
    mutationKind: "background_sync",
    localBeforeCount: 1,
    localAfterCount: 1,
    submitRequested: false,
    triggerSource: "manual_retry",
  },
  createdAt: 1000,
  updatedAt: 1000,
  attemptCount: 0,
  retryCount: 0,
  status: "pending",
  lifecycleStatus: "queued",
  lastAttemptAt: null,
  lastError: null,
  lastErrorCode: null,
  lastErrorKind: "none",
  nextRetryAt: null,
  maxAttempts: 5,
  ...overrides,
});

describe("mutationQueue quarantine guard (P0-B)", () => {
  beforeEach(() => {
    configureStores();
    mockedRecord.mockReset();
  });

  // ── Happy path ───────────────────────────────────────────────────────────

  it("does not quarantine a valid entry with the current schema version", async () => {
    const storage = createMemoryOfflineStorage({
      [MUTATION_QUEUE_STORAGE_KEY]: JSON.stringify([createValidSeedEntry()]),
    });
    configureMutationQueue({ storage });

    const queue = await loadForemanMutationQueue();

    expect(queue).toHaveLength(1);
    expect(queue[0].id).toBe("valid-seed-1");
    const quarantineEvents = mockedRecord.mock.calls.filter(
      (args: unknown[]) =>
        (args[0] as { event?: string })?.event === "mutation_queue_entry_quarantined",
    );
    expect(quarantineEvents).toHaveLength(0);
  });

  it("successfully enqueues and loads back a fresh mutation with schemaVersion stamp", async () => {
    await clearForemanMutationQueue();
    await enqueueForemanMutation({
      draftKey: "req-new",
      requestId: "req-new",
      snapshotUpdatedAt: "2026-04-19T10:00:00.000Z",
      mutationKind: "background_sync",
      triggerSource: "manual_retry",
    });

    const queue = await loadForemanMutationQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].schemaVersion).toBe(MUTATION_PAYLOAD_SCHEMA_VERSION);
    expect(mockedRecord.mock.calls.filter(
      (args: unknown[]) =>
        (args[0] as { event?: string })?.event === "mutation_queue_entry_quarantined",
    )).toHaveLength(0);
  });

  // ── Quarantine triggers ──────────────────────────────────────────────────

  it("emits quarantine event for entry with wrong scope", async () => {
    const invalidEntry = createValidSeedEntry({ scope: "unknown_scope" });
    const storage = createMemoryOfflineStorage({
      [MUTATION_QUEUE_STORAGE_KEY]: JSON.stringify([invalidEntry]),
    });
    configureMutationQueue({ storage });

    const queue = await loadForemanMutationQueue();

    // Entry is filtered out (normalizeEntry returns null)
    expect(queue).toHaveLength(0);

    const quarantineEvent = mockedRecord.mock.calls.find(
      (args: unknown[]) =>
        (args[0] as { event?: string })?.event === "mutation_queue_entry_quarantined",
    );
    expect(quarantineEvent).toBeDefined();
    expect(quarantineEvent![0]).toMatchObject({
      event: "mutation_queue_entry_quarantined",
      result: "error",
      errorClass: "wrong_scope",
      extra: expect.objectContaining({
        scope: "unknown_scope",
        id: "valid-seed-1",
      }),
    });
  });

  it("emits quarantine event for entry missing required draftKey in payload", async () => {
    const invalidEntry = createValidSeedEntry({
      payload: {
        draftKey: "",  // empty → trim returns ""
        requestId: "req-123",
        snapshotUpdatedAt: "snap-v1",
        mutationKind: "background_sync",
        localBeforeCount: 1,
        localAfterCount: 1,
        submitRequested: false,
        triggerSource: "manual_retry",
      },
    });
    const storage = createMemoryOfflineStorage({
      [MUTATION_QUEUE_STORAGE_KEY]: JSON.stringify([invalidEntry]),
    });
    configureMutationQueue({ storage });

    const queue = await loadForemanMutationQueue();

    expect(queue).toHaveLength(0);

    const quarantineEvent = mockedRecord.mock.calls.find(
      (args: unknown[]) =>
        (args[0] as { event?: string })?.event === "mutation_queue_entry_quarantined",
    );
    expect(quarantineEvent).toBeDefined();
    expect(quarantineEvent![0]).toMatchObject({
      event: "mutation_queue_entry_quarantined",
      errorClass: "missing_required_field",
    });
  });

  it("emits quarantine event for entry with older schema version but still normalizes it", async () => {
    // Schema version is old (1 < current 3), but all required fields are present
    // → entry IS loaded (normalizer fallbacks handle it), but quarantine is observed
    const oldSchemaEntry = createValidSeedEntry({ schemaVersion: 1 });
    const storage = createMemoryOfflineStorage({
      [MUTATION_QUEUE_STORAGE_KEY]: JSON.stringify([oldSchemaEntry]),
    });
    configureMutationQueue({ storage });

    const queue = await loadForemanMutationQueue();

    // Entry should still be loaded — schema version mismatch is observability only
    expect(queue).toHaveLength(1);
    expect(queue[0].id).toBe("valid-seed-1");

    const quarantineEvent = mockedRecord.mock.calls.find(
      (args: unknown[]) =>
        (args[0] as { event?: string })?.event === "mutation_queue_entry_quarantined",
    );
    expect(quarantineEvent).toBeDefined();
    expect(quarantineEvent![0]).toMatchObject({
      event: "mutation_queue_entry_quarantined",
      errorClass: "unknown_schema_version",
      extra: expect.objectContaining({
        entrySchemaVersion: 1,
        expectedSchemaVersion: MUTATION_PAYLOAD_SCHEMA_VERSION,
      }),
    });
  });

  it("emits quarantine event for a completely invalid (non-record) raw entry", async () => {
    const storage = createMemoryOfflineStorage({
      [MUTATION_QUEUE_STORAGE_KEY]: JSON.stringify(["not-a-record", null, 42]),
    });
    configureMutationQueue({ storage });

    const queue = await loadForemanMutationQueue();

    expect(queue).toHaveLength(0);

    // 3 invalid entries → expect at least 1 quarantine event (non-records may not all emit)
    const quarantineEvents = mockedRecord.mock.calls.filter(
      (args: unknown[]) =>
        (args[0] as { event?: string })?.event === "mutation_queue_entry_quarantined",
    );
    // At minimum the string entry emits a quarantine event
    expect(quarantineEvents.length).toBeGreaterThanOrEqual(1);
  });

  it("quarantine does not affect the valid entries in a mixed queue", async () => {
    const storage = createMemoryOfflineStorage({
      [MUTATION_QUEUE_STORAGE_KEY]: JSON.stringify([
        createValidSeedEntry({ id: "valid-1" }),
        createValidSeedEntry({ id: "invalid-scope", scope: "other_scope" }),
        createValidSeedEntry({ id: "valid-2", dedupeKey: "foreman_draft:req-123:background_sync:snap-v2:sync", payload: {
          draftKey: "req-123",
          requestId: "req-123",
          snapshotUpdatedAt: "snap-v2",
          mutationKind: "background_sync",
          localBeforeCount: 1,
          localAfterCount: 1,
          submitRequested: false,
          triggerSource: "manual_retry",
        }, createdAt: 2000, updatedAt: 2000 }),
      ]),
    });
    configureMutationQueue({ storage });

    const queue = await loadForemanMutationQueue();

    // 2 valid entries loaded, 1 discarded
    expect(queue).toHaveLength(2);
    expect(queue.map((e) => e.id)).toEqual(
      expect.arrayContaining(["valid-1", "valid-2"]),
    );
    // Exactly 1 quarantine event
    const quarantineEvents = mockedRecord.mock.calls.filter(
      (args: unknown[]) =>
        (args[0] as { event?: string })?.event === "mutation_queue_entry_quarantined",
    );
    expect(quarantineEvents).toHaveLength(1);
    expect(quarantineEvents[0][0]).toMatchObject({
      errorClass: "wrong_scope",
    });
  });

  it("MUTATION_PAYLOAD_SCHEMA_VERSION is a positive integer", () => {
    expect(typeof MUTATION_PAYLOAD_SCHEMA_VERSION).toBe("number");
    expect(Number.isInteger(MUTATION_PAYLOAD_SCHEMA_VERSION)).toBe(true);
    expect(MUTATION_PAYLOAD_SCHEMA_VERSION).toBeGreaterThan(0);
  });
});
