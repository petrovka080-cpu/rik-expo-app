import type { WarehouseReqHeadsIntegrityState, WarehouseReqHeadsListState } from "./warehouse.types";

export function selectWarehouseIncomingEmptyText() {
  return "Нет записей в очереди склада.";
}

export function selectWarehouseStockUnsupportedText() {
  return "Раздел «Склад факт» требует view v_warehouse_fact или RPC с фактическими остатками.";
}

export function selectWarehouseStockEmptyText() {
  return "Пока нет данных по складу.";
}

export function selectWarehouseIssueEmptyText(
  loading: boolean,
  listState?: WarehouseReqHeadsListState,
  integrityState?: WarehouseReqHeadsIntegrityState,
) {
  if (loading) return "Загрузка...";
  if (listState?.publishState === "degraded") {
    return "Не удалось получить свежую очередь выдачи.\nПоказано последнее сохранённое состояние.";
  }
  if (listState?.publishState === "error" || integrityState?.mode === "error") {
    return "Не удалось обновить очередь выдачи.\nПотяни вниз, чтобы повторить.";
  }
  return "Нет заявок для выдачи.\nПотяни вниз, чтобы обновить.";
}

export function selectWarehouseIssueBannerText(
  listState?: WarehouseReqHeadsListState,
  integrityState?: WarehouseReqHeadsIntegrityState,
) {
  if (listState?.publishState === "degraded") {
    return "Показано устаревшее состояние: последние успешно загруженные заявки. Актуализация временно недоступна.";
  }
  if (listState?.publishState === "error" || integrityState?.mode === "error") {
    return "Очередь выдачи временно не обновлена.";
  }
  if (integrityState?.mode === "stale_last_known_good") {
    return "Показаны последние загруженные заявки. Актуализация временно недоступна.";
  }
  return null;
}
