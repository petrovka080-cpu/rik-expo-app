import {
  compileCanonicalEstimateAndLoad,
  getCanonicalEstimateRevision,
  recalculateCanonicalEstimateAndLoad,
} from "./canonicalEstimateClient";
import {
  cacheCanonicalEstimateRevision,
  listPendingCanonicalEstimateAdmissions,
  recordPendingCanonicalEstimateFailure,
  removePendingCanonicalEstimateAdmission,
} from "./canonicalEstimateOfflineCache";

const activeReconciliations = new Map<string, Promise<CanonicalEstimateOutboxReconciliation>>();

export type CanonicalEstimateOutboxReconciliation = {
  attempted: number;
  admittedRevisionIds: string[];
  deferredLocalAdmissionIds: string[];
  conflictLocalAdmissionIds: string[];
};

async function run(ownerUserId: string): Promise<CanonicalEstimateOutboxReconciliation> {
  const pending = await listPendingCanonicalEstimateAdmissions(ownerUserId);
  const admittedRevisionIds: string[] = [];
  const deferredLocalAdmissionIds: string[] = [];
  const conflictLocalAdmissionIds: string[] = [];
  for (const entry of pending) {
    if (entry.status === "CONFLICT") {
      conflictLocalAdmissionIds.push(entry.localAdmissionId);
      continue;
    }
    try {
      if (entry.operation === "recalculate") {
        const base = await getCanonicalEstimateRevision(entry.baseRevisionId);
        const expectedSourceRelease = entry.request.releaseMigration?.fromReleaseId ?? entry.expectedReleaseId;
        if (
          base.checksumSha256 !== entry.baseRevisionChecksumSha256 ||
          base.releaseId !== expectedSourceRelease
        ) {
          await recordPendingCanonicalEstimateFailure(ownerUserId, entry.localAdmissionId, "BASE_REVISION_CONFLICT", true);
          conflictLocalAdmissionIds.push(entry.localAdmissionId);
          continue;
        }
      }
      const result = entry.operation === "compile"
        ? await compileCanonicalEstimateAndLoad({ request: entry.request })
        : await recalculateCanonicalEstimateAndLoad({ request: entry.request });
      if (
        result.revision.releaseId !== entry.expectedReleaseId ||
        (entry.operation === "recalculate" && result.revision.parentRevisionId !== entry.baseRevisionId)
      ) {
        await recordPendingCanonicalEstimateFailure(ownerUserId, entry.localAdmissionId, "SERVER_REVISION_IDENTITY_CONFLICT", true);
        conflictLocalAdmissionIds.push(entry.localAdmissionId);
        continue;
      }
      await cacheCanonicalEstimateRevision({ ownerUserId, revision: result.revision, rows: result.rows });
      await removePendingCanonicalEstimateAdmission(ownerUserId, entry.localAdmissionId);
      admittedRevisionIds.push(result.revision.revisionId);
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error
        ? String((error as { code: unknown }).code)
        : error instanceof Error ? error.name : "RECONCILIATION_FAILED";
      const conflict = code === "IDEMPOTENCY_CONFLICT" || code === "REVISION_CONFLICT" || code === "ACCESS_DENIED";
      await recordPendingCanonicalEstimateFailure(ownerUserId, entry.localAdmissionId, code, conflict);
      (conflict ? conflictLocalAdmissionIds : deferredLocalAdmissionIds).push(entry.localAdmissionId);
    }
  }
  return { attempted: pending.length, admittedRevisionIds, deferredLocalAdmissionIds, conflictLocalAdmissionIds };
}

export function reconcilePendingCanonicalEstimateAdmissions(
  ownerUserId: string,
): Promise<CanonicalEstimateOutboxReconciliation> {
  const identity = String(ownerUserId ?? "").trim();
  if (!identity) return Promise.reject(new Error("OWNER_USER_ID_REQUIRED"));
  const active = activeReconciliations.get(identity);
  if (active) return active;
  const reconciliation = run(identity).finally(() => { activeReconciliations.delete(identity); });
  activeReconciliations.set(identity, reconciliation);
  return reconciliation;
}
