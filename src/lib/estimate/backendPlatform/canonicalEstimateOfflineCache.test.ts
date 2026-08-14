import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  listPendingCanonicalEstimateAdmissions,
  queuePendingCanonicalEstimateAdmission,
  queuePendingCanonicalEstimateRecalculation,
  removePendingCanonicalEstimateAdmission,
} from "./canonicalEstimateOfflineCache";

describe("canonical estimate bounded offline outbox", () => {
  beforeEach(async () => AsyncStorage.clear());

  it("deduplicates by server idempotency key and remains explicitly pending", async () => {
    const request = { idempotencyKey: "same-key", catalogId: "catalog", parameters: { area_m2: 10 }, currencyCode: "KGS" };
    const first = await queuePendingCanonicalEstimateAdmission({ ownerUserId: "user-a", expectedReleaseId: "release-a", request });
    const replay = await queuePendingCanonicalEstimateAdmission({ ownerUserId: "user-a", expectedReleaseId: "release-a", request });
    expect(replay.localAdmissionId).toBe(first.localAdmissionId);
    expect(replay.status).toBe("PENDING_SERVER_ADMISSION");
    expect(await listPendingCanonicalEstimateAdmissions("user-a")).toHaveLength(1);
    await removePendingCanonicalEstimateAdmission("user-a", first.localAdmissionId);
    expect(await listPendingCanonicalEstimateAdmissions("user-a")).toHaveLength(0);
  });

  it("rejects a full-corpus-sized offline payload", async () => {
    await expect(queuePendingCanonicalEstimateAdmission({
      ownerUserId: "user-a",
      expectedReleaseId: "release-a",
      request: {
        idempotencyKey: "too-large",
        catalogId: "catalog",
        parameters: { data: "x".repeat(70_000) },
        currencyCode: "KGS",
      },
    })).rejects.toThrow("OFFLINE_ESTIMATE_REQUEST_TOO_LARGE");
  });

  it("isolates pending commands by owner and preserves recalculate lineage", async () => {
    const pending = await queuePendingCanonicalEstimateRecalculation({
      ownerUserId: "user-a",
      expectedReleaseId: "release-r2",
      baseRevisionChecksumSha256: "checksum-r1",
      request: {
        idempotencyKey: "recalculate-r1-r2",
        catalogId: "catalog",
        parentRevisionId: "revision-r1",
        parameters: { area_m2: 12 },
        currencyCode: "KGS",
        releaseMigration: {
          contractVersion: "canonical_revision_release_migration.r2",
          acknowledged: true,
          fromReleaseId: "release-r1",
          toReleaseId: "release-r2",
        },
      },
    });
    expect(pending.operation).toBe("recalculate");
    expect(pending.baseRevisionId).toBe("revision-r1");
    expect(pending.baseRevisionChecksumSha256).toBe("checksum-r1");
    expect(await listPendingCanonicalEstimateAdmissions("user-b")).toEqual([]);
    expect(await listPendingCanonicalEstimateAdmissions("user-a")).toHaveLength(1);
  });
});
