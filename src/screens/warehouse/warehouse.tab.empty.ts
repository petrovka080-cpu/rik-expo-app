export function selectWarehouseIncomingEmptyText() {
  return "Нет записей в очереди склада.";
}

export function selectWarehouseStockUnsupportedText() {
  return "Раздел «Склад факт» требует view v_warehouse_fact или RPC с фактическими остатками.";
}

export function selectWarehouseStockEmptyText() {
  return "Пока нет данных по складу.";
}

export function selectWarehouseIssueEmptyText(loading: boolean) {
  if (loading) return "Загрузка...";
  return "Нет заявок для выдачи.\nПотяни вниз, чтобы обновить.";
}
