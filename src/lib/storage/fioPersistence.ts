import {
  readStoredJson,
  readStoredString,
  removeStoredValue,
  writeStoredJson,
  writeStoredString,
} from "./classifiedStorage";

type ObservabilityScreen = Parameters<typeof readStoredString>[0]["screen"];

type FioPersistenceKeys = {
  currentKey?: string;
  confirmKey: string;
  historyKey: string;
};

type LoadFioStateParams = {
  screen: ObservabilityScreen;
  surface: string;
  keys: FioPersistenceKeys;
};

type SaveFioStateParams = LoadFioStateParams & {
  fio: string;
  history: string[];
  confirmedAtIso?: string;
  historyLimit?: number;
};

const FIO_CONFIRM_TTL_MS = 14 * 24 * 60 * 60 * 1000;
const FIO_HISTORY_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const normalizeHistory = (value: unknown, fallbackCurrent: string | null): string[] => {
  const list = Array.isArray(value) ? value : [];
  const out: string[] = [];
  const seen = new Set<string>();

  const pushValue = (entry: unknown) => {
    const next = String(entry ?? "").trim();
    if (!next || seen.has(next)) return;
    seen.add(next);
    out.push(next);
  };

  for (const entry of list) pushValue(entry);
  if (fallbackCurrent) pushValue(fallbackCurrent);

  return out;
};

export async function loadStoredFioState(
  params: LoadFioStateParams,
): Promise<{
  currentFio: string;
  history: string[];
  lastConfirmIso: string | null;
}> {
  const [legacyCurrent, lastConfirmIso, storedHistory] = await Promise.all([
    params.keys.currentKey
      ? readStoredString({
        screen: params.screen,
        surface: params.surface,
        key: params.keys.currentKey,
      })
      : Promise.resolve(null),
    readStoredString({
      screen: params.screen,
      surface: params.surface,
      key: params.keys.confirmKey,
      ttlMs: FIO_CONFIRM_TTL_MS,
    }),
    readStoredJson<string[]>({
      screen: params.screen,
      surface: params.surface,
      key: params.keys.historyKey,
      ttlMs: FIO_HISTORY_TTL_MS,
    }),
  ]);

  const history = normalizeHistory(storedHistory, legacyCurrent);
  return {
    currentFio: history[0] ?? "",
    history,
    lastConfirmIso,
  };
}

export async function saveStoredFioState(params: SaveFioStateParams): Promise<string[]> {
  const value = String(params.fio ?? "").trim();
  if (!value) return params.history;

  const historyLimit = Math.max(1, params.historyLimit ?? 12);
  const nextHistory = normalizeHistory(params.history, value).slice(0, historyLimit);
  const confirmedAtIso = params.confirmedAtIso ?? new Date().toISOString();

  await Promise.all([
    writeStoredJson(
      {
        screen: params.screen,
        surface: params.surface,
        key: params.keys.historyKey,
        ttlMs: FIO_HISTORY_TTL_MS,
      },
      nextHistory,
    ),
    writeStoredString(
      {
        screen: params.screen,
        surface: params.surface,
        key: params.keys.confirmKey,
        ttlMs: FIO_CONFIRM_TTL_MS,
      },
      confirmedAtIso,
    ),
    params.keys.currentKey
      ? removeStoredValue({
        screen: params.screen,
        surface: params.surface,
        key: params.keys.currentKey,
      })
      : Promise.resolve(),
  ]);

  return nextHistory;
}
