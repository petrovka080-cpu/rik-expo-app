import {
  selectWarehouseIncomingEmptyText,
  selectWarehouseIssueBannerText,
  selectWarehouseIssueEmptyText,
  selectWarehouseStockEmptyText,
  selectWarehouseStockUnsupportedText,
} from "../../src/screens/warehouse/warehouse.tab.empty";

describe("warehouse visible text", () => {
  it("returns readable warehouse empty-state copy", () => {
    expect(selectWarehouseIncomingEmptyText()).toBe("РќРµС‚ Р·Р°РїРёСЃРµР№ РІ РѕС‡РµСЂРµРґРё СЃРєР»Р°РґР°.");
    expect(selectWarehouseStockUnsupportedText()).toBe(
      "Р Р°Р·РґРµР» В«РЎРєР»Р°Рґ С„Р°РєС‚В» С‚СЂРµР±СѓРµС‚ view v_warehouse_fact РёР»Рё RPC СЃ С„Р°РєС‚РёС‡РµСЃРєРёРјРё РѕСЃС‚Р°С‚РєР°РјРё.",
    );
    expect(selectWarehouseStockEmptyText()).toBe("РџРѕРєР° РЅРµС‚ РґР°РЅРЅС‹С… РїРѕ СЃРєР»Р°РґСѓ.");
  });

  it("returns readable issue empty copy for canonical states", () => {
    expect(selectWarehouseIssueEmptyText(true)).toBe("Р—Р°РіСЂСѓР·РєР°...");
    expect(selectWarehouseIssueEmptyText(false, { publishState: "error" } as never)).toBe(
      "РќРµ СѓРґР°Р»РѕСЃСЊ РѕР±РЅРѕРІРёС‚СЊ РѕС‡РµСЂРµРґСЊ РІС‹РґР°С‡Рё.\nРџРѕС‚СЏРЅРё РІРЅРёР·, С‡С‚РѕР±С‹ РїРѕРІС‚РѕСЂРёС‚СЊ.",
    );
    expect(selectWarehouseIssueEmptyText(false)).toBe(
      "РќРµС‚ Р·Р°СЏРІРѕРє РґР»СЏ РІС‹РґР°С‡Рё.\nРџРѕС‚СЏРЅРё РІРЅРёР·, С‡С‚РѕР±С‹ РѕР±РЅРѕРІРёС‚СЊ.",
    );
  });

  it("returns readable issue banner copy for warehouse failure states", () => {
    expect(selectWarehouseIssueBannerText({ publishState: "error" } as never)).toBe(
      "РћС‡РµСЂРµРґСЊ РІС‹РґР°С‡Рё РІСЂРµРјРµРЅРЅРѕ РЅРµ РѕР±РЅРѕРІР»РµРЅР°.",
    );
    expect(selectWarehouseIssueBannerText()).toBeNull();
  });
});
