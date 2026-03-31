import {
  readStoredString,
  removeStoredValue,
  writeStoredString,
} from "./storage/classifiedStorage";
import { recordCatchDiscipline } from "./observability/catchDiscipline";

type MigrationPair = {
  from: string;
  to: string;
};

type CrossStoragePolicy = {
  ttlMs?: number;
};

const DAYS = (count: number) => count * 24 * 60 * 60 * 1000;

const CROSS_STORAGE_POLICIES: Record<string, CrossStoragePolicy> = {
  acc_fio: { ttlMs: DAYS(14) },
  acc_bankName: { ttlMs: DAYS(30) },
  acc_bik: { ttlMs: DAYS(30) },
  acc_rs: { ttlMs: DAYS(30) },
  acc_inn: { ttlMs: DAYS(30) },
  acc_kpp: { ttlMs: DAYS(30) },
  acc_hist_search: { ttlMs: DAYS(30) },
  acc_hist_date_from: { ttlMs: DAYS(30) },
  acc_hist_date_to: { ttlMs: DAYS(30) },
};

const getPolicy = (key: string): CrossStoragePolicy => CROSS_STORAGE_POLICIES[key] ?? {};

export async function crossStorageGet(key: string): Promise<string | null> {
  const policy = getPolicy(key);
  return readStoredString({
    screen: "accountant",
    surface: "cross_storage",
    key,
    ttlMs: policy.ttlMs,
  });
}

export async function crossStorageSet(key: string, value: string): Promise<void> {
  const policy = getPolicy(key);
  await writeStoredString(
    {
      screen: "accountant",
      surface: "cross_storage",
      key,
      ttlMs: policy.ttlMs,
    },
    value,
  );
}

export async function crossStorageRemove(key: string): Promise<void> {
  await removeStoredValue({
    screen: "accountant",
    surface: "cross_storage",
    key,
  });
}

export async function migrateCrossStorageKeysOnce(params: {
  markerKey: string;
  pairs: MigrationPair[];
}): Promise<void> {
  try {
    const done = await crossStorageGet(params.markerKey);
    if (done === "1") return;

    for (const pair of params.pairs) {
      const current = await crossStorageGet(pair.to);
      if (current != null && String(current).length > 0) continue;

      const legacy = await crossStorageGet(pair.from);
      if (legacy == null) continue;
      await crossStorageSet(pair.to, legacy);
    }

    await crossStorageSet(params.markerKey, "1");
  } catch (error) {
    recordCatchDiscipline({
      screen: "accountant",
      surface: "cross_storage",
      event: "cross_storage_migration_failed",
      error,
      kind: "degraded_fallback",
      category: "ui",
      sourceKind: "cross_storage_migrate",
      extra: {
        markerKey: params.markerKey,
        pairCount: params.pairs.length,
      },
    });
  }
}
