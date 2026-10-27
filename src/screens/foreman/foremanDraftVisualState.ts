export type ForemanDraftSyncTone = "neutral" | "info" | "success" | "warning" | "danger";

export type ForemanDraftVisualState =
  | "empty_clean"
  | "dirty_local"
  | "synced_ready"
  | "submitting_locked"
  | "post_submit_fresh_draft"
  | "needs_attention";

export type ForemanDraftVisualInput = {
  requestLabel?: string | null;
  itemsCount: number;
  syncLabel?: string | null;
  syncDetail?: string | null;
  syncTone?: ForemanDraftSyncTone;
  isSubmitting?: boolean;
  freshDraftAfterSubmit?: boolean;
};

export type ForemanDraftVisualSnapshot = Pick<
  ForemanDraftVisualInput,
  "requestLabel" | "itemsCount" | "syncLabel" | "syncDetail" | "syncTone" | "isSubmitting"
>;

export type ForemanDraftVisualModel = {
  state: ForemanDraftVisualState;
  count: number;
  requestLabel: string;
  itemsLabel: string;
  statusLabel: string;
  helperText: string | null;
  tone: ForemanDraftSyncTone;
};

export type ForemanDraftContextSummary = {
  title: string;
  draftLabel: string;
  meta: string;
};

const normalizeText = (value: string | null | undefined): string =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const clampCount = (value: number): number => (Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0);

const pluralizePositions = (count: number): string => {
  const abs = Math.abs(count) % 100;
  const tail = abs % 10;
  if (abs > 10 && abs < 20) return `${count} позиций`;
  if (tail === 1) return `${count} позиция`;
  if (tail >= 2 && tail <= 4) return `${count} позиции`;
  return `${count} позиций`;
};

const translateSyncLabel = (
  syncLabel: string | null | undefined,
  syncTone: ForemanDraftSyncTone,
  itemsCount: number,
): string => {
  const normalized = normalizeText(syncLabel);

  if (normalized === "saved locally") return "Есть изменения";
  if (normalized === "queued") return "В очереди";
  if (normalized === "syncing") return "Синхронизируем";
  if (normalized === "synced") return "Синхронизировано";
  if (normalized === "waiting to retry") return "Повторим синхронизацию";
  if (normalized === "sync failed") return "Синхронизация не удалась";
  if (normalized === "need attention") return "Нужно внимание";
  if (normalized === "needs review") return "Нужно проверить";
  if (normalized === "server changed") return "Данные на сервере изменились";
  if (normalized === "local draft stale") return "Локальная версия устарела";
  if (normalized === "server already closed") return "Заявка уже закрыта";
  if (normalized === "local draft ready") {
    return itemsCount > 0 ? "Готово к работе" : "Черновик пуст";
  }

  if (syncTone === "danger") return "Нужно внимание";
  if (syncTone === "warning") return "Есть изменения";
  if (syncTone === "info") return "Синхронизация";
  if (itemsCount === 0) return "Черновик пуст";
  return "Готово к работе";
};

const translateSyncDetail = (syncDetail: string | null | undefined): string | null => {
  const normalized = normalizeText(syncDetail);
  if (!normalized) return null;

  if (normalized.startsWith("last sync ")) return null;
  if (normalized.endsWith(" pending")) return "Изменения ещё не дошли до сервера.";
  if (normalized === "local draft was kept. choose server, restore local, or discard local.") {
    return "Выберите, какую версию черновика оставить.";
  }
  if (normalized === "server rejected the current draft snapshot.") {
    return "Проверьте черновик перед следующей синхронизацией.";
  }
  if (normalized === "remote draft diverged while this device was offline.") {
    return "Серверная версия изменилась, нужен осознанный выбор.";
  }
  if (normalized === "refresh from server or restore local draft intentionally.") {
    return "Обновите серверную версию или восстановите локальную.";
  }
  if (normalized.startsWith("retry ")) return "Повтор синхронизации ещё продолжается.";
  if (normalized.startsWith("stage ")) return "Сбой синхронизации требует проверки.";
  return String(syncDetail).trim() || null;
};

const isPotentialNewDraftLabel = (requestLabel: string | null | undefined): boolean => {
  const normalized = normalizeText(requestLabel);
  return normalized === "" || normalized === "черновик" || normalized === "новый черновик";
};

export const didForemanDraftRollOverToFreshState = (
  previous: ForemanDraftVisualSnapshot | null | undefined,
  current: ForemanDraftVisualSnapshot,
): boolean => {
  if (!previous) return false;
  if (current.isSubmitting) return false;
  if (clampCount(previous.itemsCount) <= 0 || clampCount(current.itemsCount) !== 0) return false;
  if ((current.syncTone ?? "neutral") === "danger") return false;

  const previousLabel = normalizeText(previous.requestLabel);
  const currentLabel = normalizeText(current.requestLabel);

  if (currentLabel && currentLabel !== previousLabel) return true;
  return isPotentialNewDraftLabel(current.requestLabel);
};

export const buildForemanDraftVisualModel = (
  input: ForemanDraftVisualInput,
): ForemanDraftVisualModel => {
  const count = clampCount(input.itemsCount);
  const syncTone = input.syncTone ?? "neutral";
  const requestLabel = String(input.requestLabel || "").trim() || "Новый черновик";
  const syncLabel = translateSyncLabel(input.syncLabel, syncTone, count);
  const syncDetail = translateSyncDetail(input.syncDetail);

  if (input.isSubmitting) {
    return {
      state: "submitting_locked",
      count,
      requestLabel,
      itemsLabel: pluralizePositions(count),
      statusLabel: "Отправляем на утверждение",
      helperText: "Пока не закрывайте экран и не запускайте новое редактирование.",
      tone: "info",
    };
  }

  if (input.freshDraftAfterSubmit && count === 0) {
    return {
      state: "post_submit_fresh_draft",
      count,
      requestLabel,
      itemsLabel: pluralizePositions(count),
      statusLabel: "Новый черновик готов",
      helperText: "Старый черновик уже отправлен. Можно добавлять новые позиции.",
      tone: "success",
    };
  }

  if (syncTone === "danger") {
    return {
      state: "needs_attention",
      count,
      requestLabel,
      itemsLabel: pluralizePositions(count),
      statusLabel: syncLabel,
      helperText: syncDetail,
      tone: syncTone,
    };
  }

  if (count === 0) {
    return {
      state: "empty_clean",
      count,
      requestLabel,
      itemsLabel: pluralizePositions(count),
      statusLabel: syncTone === "warning" || syncTone === "info" ? syncLabel : "Черновик пуст",
      helperText: null,
      tone: syncTone === "warning" || syncTone === "info" ? syncTone : "neutral",
    };
  }

  if (syncTone === "warning" || syncTone === "info") {
    return {
      state: "dirty_local",
      count,
      requestLabel,
      itemsLabel: pluralizePositions(count),
      statusLabel: syncLabel,
      helperText: null,
      tone: syncTone,
    };
  }

  return {
    state: "synced_ready",
    count,
    requestLabel,
    itemsLabel: pluralizePositions(count),
    statusLabel: syncLabel,
    helperText: null,
    tone: syncTone === "success" ? "success" : "neutral",
  };
};

export const buildForemanDraftContextSummary = (
  requestLabel: string | null | undefined,
  itemsCount: number,
  mode: "compose" | "review",
): ForemanDraftContextSummary => {
  return {
    title: mode === "review" ? "Добавим в черновик" : "Текущий черновик",
    draftLabel: String(requestLabel || "").trim() || "Новый черновик",
    meta: pluralizePositions(clampCount(itemsCount)),
  };
};
