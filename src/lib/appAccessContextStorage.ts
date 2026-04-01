import type { AppContext } from "./appAccessModel";
import {
  readStoredString,
  writeStoredString,
} from "./storage/classifiedStorage";

const STORAGE_KEY_PREFIX = "gox.active_context.v1";

const buildStorageKey = (userId: string) => `${STORAGE_KEY_PREFIX}:${userId}`;

const isAppContext = (value: unknown): value is AppContext =>
  value === "market" || value === "office";

export async function loadStoredActiveContext(
  userId: string | null | undefined,
): Promise<AppContext | null> {
  const normalizedUserId = String(userId ?? "").trim();
  if (!normalizedUserId) return null;

  const stored = await readStoredString({
    screen: "profile",
    surface: "active_context",
    key: buildStorageKey(normalizedUserId),
  });

  return isAppContext(stored) ? stored : null;
}

export async function persistActiveContext(
  userId: string | null | undefined,
  context: AppContext,
): Promise<void> {
  const normalizedUserId = String(userId ?? "").trim();
  if (!normalizedUserId) return;

  await writeStoredString(
    {
      screen: "profile",
      surface: "active_context",
      key: buildStorageKey(normalizedUserId),
    },
    context,
  );
}
