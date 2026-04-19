import {
  selectWarehouseIncomingEmptyText,
  selectWarehouseIssueBannerText,
  selectWarehouseIssueEmptyText,
  selectWarehouseStockEmptyText,
  selectWarehouseStockUnsupportedText,
} from "../../src/screens/warehouse/warehouse.tab.empty";

describe("warehouse visible text", () => {
  it("returns readable warehouse empty-state copy", () => {
    expect(selectWarehouseIncomingEmptyText()).toBe("Нет записей в очереди склада.");
    expect(selectWarehouseStockUnsupportedText()).toBe(
      "Раздел «Склад факт» требует view v_warehouse_fact или RPC с фактическими остатками.",
    );
    expect(selectWarehouseStockEmptyText()).toBe("Пока нет данных по складу.");
  });

  it("returns readable issue empty copy for canonical states", () => {
    expect(selectWarehouseIssueEmptyText(true)).toBe("Загрузка...");
    expect(selectWarehouseIssueEmptyText(false, { publishState: "error" } as never)).toBe(
      "Не удалось обновить очередь выдачи.\nПотяни вниз, чтобы повторить.",
    );
    expect(selectWarehouseIssueEmptyText(false)).toBe(
      "Нет заявок для выдачи.\nПотяни вниз, чтобы обновить.",
    );
  });

  it("returns readable issue banner copy for warehouse failure states", () => {
    expect(selectWarehouseIssueBannerText({ publishState: "error" } as never)).toBe(
      "Очередь выдачи временно не обновлена.",
    );
    expect(selectWarehouseIssueBannerText()).toBeNull();
  });
});
