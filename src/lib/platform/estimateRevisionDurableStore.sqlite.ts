import {
  ESTIMATE_REVISION_DURABLE_ADAPTER_CAPACITY_BYTES,
  MAX_ESTIMATE_REVISION_DURABLE_RECORD_BYTES,
  createDurableEnvelope,
  durableWriteFailure,
  durableWriteErrorCode,
  estimateRevisionUtf8ByteLength,
  messageFromDurableError,
  parseDurableEnvelopeBundle,
  serializeRevisionBundle,
  type DurableEnvelope,
  type DurableWriteResult,
  type EstimateRevisionDurableStore,
  type RevisionBundle,
} from "./estimateRevisionDurableStore.contract";
import { safeJsonParse } from "../format";

function parseDurableEnvelopeJson(serialized: string): DurableEnvelope {
  if (
    estimateRevisionUtf8ByteLength(serialized) >
    MAX_ESTIMATE_REVISION_DURABLE_RECORD_BYTES
  ) {
    throw new Error("DURABLE_ENVELOPE_TOO_LARGE");
  }
  const parsed = safeJsonParse<DurableEnvelope | null>(serialized, null);
  if (!parsed.ok) throw parsed.error;
  if (!parsed.value || typeof parsed.value !== "object") {
    throw new Error("DURABLE_ENVELOPE_INVALID");
  }
  return parsed.value;
}

export type SQLiteDatabaseLike = {
  execAsync(sql: string): Promise<void>;
  withExclusiveTransactionAsync<T>(
    task: (transaction: SQLiteDatabaseLike) => Promise<T>,
  ): Promise<T>;
  getFirstAsync<T>(sql: string, ...params: unknown[]): Promise<T | null>;
  getAllAsync<T>(sql: string, ...params: unknown[]): Promise<T[]>;
  runAsync(sql: string, ...params: unknown[]): Promise<unknown>;
};

export type SQLiteModuleLike = {
  openDatabaseAsync(name: string): Promise<SQLiteDatabaseLike>;
};

export class SQLiteEstimateRevisionDurableStore implements EstimateRevisionDurableStore {
  private readonly databasePromise: Promise<SQLiteDatabaseLike>;

  constructor(openDatabase: () => Promise<SQLiteDatabaseLike>) {
    this.databasePromise = openDatabase().then(async (database) => {
      await database.execAsync(`
        PRAGMA journal_mode = WAL;
        PRAGMA foreign_keys = ON;
        CREATE TABLE IF NOT EXISTS estimate_revision_records (
          store_key TEXT NOT NULL,
          version TEXT NOT NULL,
          envelope_json TEXT NOT NULL,
          PRIMARY KEY (store_key, version)
        );
        CREATE TABLE IF NOT EXISTS estimate_revision_pointers (
          store_key TEXT PRIMARY KEY NOT NULL,
          current_version TEXT NOT NULL,
          previous_version TEXT
        );
      `);
      return database;
    });
  }

  async readBundle(key: string): Promise<RevisionBundle | null> {
    const database = await this.databasePromise;
    const row = await database.getFirstAsync<{ envelope_json: string }>(
      `SELECT r.envelope_json
       FROM estimate_revision_pointers p
       JOIN estimate_revision_records r
         ON r.store_key = p.store_key AND r.version = p.current_version
       WHERE p.store_key = ?`,
      key,
    );
    if (!row) return null;
    try {
      return parseDurableEnvelopeBundle(
        parseDurableEnvelopeJson(row.envelope_json),
        key,
        ESTIMATE_REVISION_DURABLE_ADAPTER_CAPACITY_BYTES.sqlite,
      );
    } catch {
      return null;
    }
  }

  async writeBundleAtomically(
    key: string,
    expectedVersion: string | null,
    bundle: RevisionBundle,
  ): Promise<DurableWriteResult> {
    let serialized: ReturnType<typeof serializeRevisionBundle>;
    try {
      serialized = serializeRevisionBundle(
        bundle,
        ESTIMATE_REVISION_DURABLE_ADAPTER_CAPACITY_BYTES.sqlite,
      );
    } catch (error) {
      return durableWriteFailure(durableWriteErrorCode(error), messageFromDurableError(error), null);
    }
    const database = await this.databasePromise;
    try {
      const result = await database.withExclusiveTransactionAsync(async (transaction) => {
        const pointer = await transaction.getFirstAsync<{
          current_version: string;
          previous_version: string | null;
        }>(
          "SELECT current_version, previous_version FROM estimate_revision_pointers WHERE store_key = ?",
          key,
        );
        const currentVersion = pointer?.current_version ?? null;
        if (currentVersion !== expectedVersion) {
          return durableWriteFailure("CONFLICT", "Durable revision compare-and-swap conflict.", currentVersion);
        }
        if (currentVersion === serialized.version) {
          const existing = await transaction.getFirstAsync<{ envelope_json: string }>(
            "SELECT envelope_json FROM estimate_revision_records WHERE store_key = ? AND version = ?",
            key,
            serialized.version,
          );
          if (existing) {
            const envelope = parseDurableEnvelopeJson(existing.envelope_json);
            if (
              envelope.checksum === serialized.checksum &&
              parseDurableEnvelopeBundle(
                envelope,
                key,
                ESTIMATE_REVISION_DURABLE_ADAPTER_CAPACITY_BYTES.sqlite,
              )
            ) {
              return {
                status: "UNCHANGED",
                version: serialized.version,
                previousVersion: pointer?.previous_version ?? null,
                checksum: serialized.checksum,
              } satisfies DurableWriteResult;
            }
          }
        }
        const envelope = createDurableEnvelope({
          key,
          version: serialized.version,
          previousVersion: currentVersion,
          checksum: serialized.checksum,
          serializedBundle: serialized.serializedBundle,
        });
        await transaction.runAsync(
          `INSERT OR REPLACE INTO estimate_revision_records (store_key, version, envelope_json)
           VALUES (?, ?, ?)`,
          key,
          serialized.version,
          JSON.stringify(envelope),
        );
        const verifiedStage = await transaction.getFirstAsync<{ envelope_json: string }>(
          "SELECT envelope_json FROM estimate_revision_records WHERE store_key = ? AND version = ?",
          key,
          serialized.version,
        );
        const verifiedEnvelope = verifiedStage
          ? parseDurableEnvelopeJson(verifiedStage.envelope_json)
          : null;
        if (
          verifiedEnvelope?.checksum !== serialized.checksum ||
          !parseDurableEnvelopeBundle(
            verifiedEnvelope,
            key,
            ESTIMATE_REVISION_DURABLE_ADAPTER_CAPACITY_BYTES.sqlite,
          )
        ) throw new Error("SQLITE_STAGED_REVISION_CHECKSUM_MISMATCH");
        await transaction.runAsync(
          `INSERT INTO estimate_revision_pointers (store_key, current_version, previous_version)
           VALUES (?, ?, ?)
           ON CONFLICT(store_key) DO UPDATE SET
             current_version = excluded.current_version,
             previous_version = excluded.previous_version`,
          key,
          serialized.version,
          currentVersion,
        );
        return {
          status: "WRITTEN",
          version: serialized.version,
          previousVersion: currentVersion,
          checksum: serialized.checksum,
        } satisfies DurableWriteResult;
      });
      if (result.status !== "WRITTEN") return result;
      const readBack = await this.readBundle(key);
      if (
        !readBack ||
        serializeRevisionBundle(
          readBack,
          ESTIMATE_REVISION_DURABLE_ADAPTER_CAPACITY_BYTES.sqlite,
        ).checksum !== result.checksum
      ) {
        return durableWriteFailure(
          "READ_BACK_FAILED",
          "Committed revision failed read-back verification.",
          result.previousVersion,
        );
      }
      await this.deleteOrphans(key);
      return result;
    } catch (error) {
      return durableWriteFailure("TRANSACTION_FAILED", messageFromDurableError(error), expectedVersion);
    }
  }

  async recoverLastValid(key: string): Promise<RevisionBundle | null> {
    const database = await this.databasePromise;
    const pointer = await database.getFirstAsync<{
      current_version: string;
      previous_version: string | null;
    }>(
      "SELECT current_version, previous_version FROM estimate_revision_pointers WHERE store_key = ?",
      key,
    );
    if (!pointer) return null;
    const current = await this.readBundle(key);
    if (current) return current;
    if (!pointer.previous_version) return null;
    const row = await database.getFirstAsync<{ envelope_json: string }>(
      "SELECT envelope_json FROM estimate_revision_records WHERE store_key = ? AND version = ?",
      key,
      pointer.previous_version,
    );
    if (!row) return null;
    let previous: RevisionBundle | null = null;
    try {
      previous = parseDurableEnvelopeBundle(
        parseDurableEnvelopeJson(row.envelope_json),
        key,
        ESTIMATE_REVISION_DURABLE_ADAPTER_CAPACITY_BYTES.sqlite,
      );
    } catch {
      previous = null;
    }
    if (!previous) return null;
    await database.withExclusiveTransactionAsync(async (transaction) => {
      await transaction.runAsync(
        "UPDATE estimate_revision_pointers SET current_version = ?, previous_version = NULL WHERE store_key = ?",
        pointer.previous_version,
        key,
      );
    });
    await this.deleteOrphans(key);
    return previous;
  }

  async deleteOrphans(key: string): Promise<void> {
    const database = await this.databasePromise;
    await database.withExclusiveTransactionAsync(async (transaction) => {
      const pointer = await transaction.getFirstAsync<{
        current_version: string;
        previous_version: string | null;
      }>(
        "SELECT current_version, previous_version FROM estimate_revision_pointers WHERE store_key = ?",
        key,
      );
      if (!pointer) {
        await transaction.runAsync("DELETE FROM estimate_revision_records WHERE store_key = ?", key);
      } else if (pointer.previous_version) {
        await transaction.runAsync(
          "DELETE FROM estimate_revision_records WHERE store_key = ? AND version NOT IN (?, ?)",
          key,
          pointer.current_version,
          pointer.previous_version,
        );
      } else {
        await transaction.runAsync(
          "DELETE FROM estimate_revision_records WHERE store_key = ? AND version <> ?",
          key,
          pointer.current_version,
        );
      }
    });
  }

  async listKeys(): Promise<string[]> {
    const database = await this.databasePromise;
    const rows = await database.getAllAsync<{ store_key: string }>(
      "SELECT store_key FROM estimate_revision_pointers ORDER BY store_key ASC",
    );
    return rows
      .map((row) => row.store_key)
      .filter((key) => typeof key === "string" && key.length > 0);
  }
}
