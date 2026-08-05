import {
  messageFromDurableError,
  serializeRevisionBundle,
  stableEstimateRevisionChecksum,
  type DurableWriteErrorCode,
  type EstimateRevisionDurableStore,
  type RevisionBundle,
} from "./estimateRevisionDurableStore.contract";
import { safeJsonParse } from "../format";

export type LegacyDurableMigrationResult =
  | {
      status: "NO_LEGACY_RECORD" | "MIGRATED";
      version: string | null;
      checksum: string | null;
    }
  | {
      status: "FAILED";
      error: {
        code: DurableWriteErrorCode;
        message: string;
      };
    };

export async function migrateLegacyEstimateRevisionBundle(input: {
  key: string;
  legacyStorageKey: string;
  pointerStorageKey: string;
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem">;
  durableStore: EstimateRevisionDurableStore;
  decode?: (value: unknown) => RevisionBundle | null;
}): Promise<LegacyDurableMigrationResult> {
  const legacyRaw = input.storage.getItem(input.legacyStorageKey);
  if (legacyRaw == null) {
    return { status: "NO_LEGACY_RECORD", version: null, checksum: null };
  }
  const parsedResult = safeJsonParse<unknown>(legacyRaw, null);
  if (!parsedResult.ok) {
    return {
      status: "FAILED",
      error: { code: "LEGACY_INVALID", message: messageFromDurableError(parsedResult.error) },
    };
  }
  const parsed = parsedResult.value;
  const bundle = input.decode ? input.decode(parsed) : parsed as RevisionBundle;
  if (!bundle?.draft?.id) {
    return {
      status: "FAILED",
      error: { code: "LEGACY_INVALID", message: "Legacy bundle failed structural validation." },
    };
  }
  const legacyChecksum = stableEstimateRevisionChecksum(legacyRaw);
  const canonical = serializeRevisionBundle(bundle);
  const existing = await input.durableStore.readBundle(input.key);
  const existingCanonical = existing ? serializeRevisionBundle(existing) : null;
  if (existingCanonical && existingCanonical.checksum !== canonical.checksum) {
    return {
      status: "FAILED",
      error: {
        code: "CONFLICT",
        message: "A different durable revision is already active for the migration key.",
      },
    };
  }
  const result = await input.durableStore.writeBundleAtomically(
    input.key,
    existingCanonical?.version ?? null,
    bundle,
  );
  if (result.status === "FAILED") {
    return {
      status: "FAILED",
      error: { code: result.error.code, message: result.error.message },
    };
  }
  const readBack = await input.durableStore.readBundle(input.key);
  if (
    !readBack ||
    serializeRevisionBundle(readBack).checksum !== canonical.checksum
  ) {
    return {
      status: "FAILED",
      error: { code: "READ_BACK_FAILED", message: "Legacy migration read-back verification failed." },
    };
  }
  const previousPointer = input.storage.getItem(input.pointerStorageKey);
  try {
    input.storage.setItem(input.pointerStorageKey, JSON.stringify({
      schemaVersion: "estimate_revision_legacy_pointer_v1",
      migrationState: "complete",
      currentVersion: result.version,
      recoveryVersion: result.previousVersion,
      checksum: legacyChecksum,
      durableChecksum: result.checksum,
      migratedAt: new Date().toISOString(),
    }));
    input.storage.removeItem(input.legacyStorageKey);
  } catch (error) {
    try {
      if (previousPointer == null) {
        input.storage.removeItem(input.pointerStorageKey);
      } else {
        input.storage.setItem(input.pointerStorageKey, previousPointer);
      }
    } catch {
      // Web Storage operations are individually atomic. This fallback only
      // handles a non-conforming storage implementation that also rejects the
      // marker rollback; the legacy payload is still never removed by us.
    }
    return {
      status: "FAILED",
      error: { code: "TRANSACTION_FAILED", message: messageFromDurableError(error) },
    };
  }
  return {
    status: "MIGRATED",
    version: result.version,
    checksum: legacyChecksum,
  };
}
