import type { WarehouseReqHeadsIntegrityState, WarehouseReqHeadsListState } from "./warehouse.types";

export function selectWarehouseIncomingEmptyText() {
  return "РќРµС‚ Р·Р°РїРёСЃРµР№ РІ РѕС‡РµСЂРµРґРё СЃРєР»Р°РґР°.";
}

export function selectWarehouseStockUnsupportedText() {
  return "Р Р°Р·РґРµР» В«РЎРєР»Р°Рґ С„Р°РєС‚В» С‚СЂРµР±СѓРµС‚ view v_warehouse_fact РёР»Рё RPC СЃ С„Р°РєС‚РёС‡РµСЃРєРёРјРё РѕСЃС‚Р°С‚РєР°РјРё.";
}

export function selectWarehouseStockEmptyText() {
  return "РџРѕРєР° РЅРµС‚ РґР°РЅРЅС‹С… РїРѕ СЃРєР»Р°РґСѓ.";
}

export function selectWarehouseIssueEmptyText(
  loading: boolean,
  listState?: WarehouseReqHeadsListState,
  integrityState?: WarehouseReqHeadsIntegrityState,
) {
  if (loading) return "Р—Р°РіСЂСѓР·РєР°...";
  if (listState?.publishState === "error" || integrityState?.mode === "error") {
    return "РќРµ СѓРґР°Р»РѕСЃСЊ РѕР±РЅРѕРІРёС‚СЊ РѕС‡РµСЂРµРґСЊ РІС‹РґР°С‡Рё.\nРџРѕС‚СЏРЅРё РІРЅРёР·, С‡С‚РѕР±С‹ РїРѕРІС‚РѕСЂРёС‚СЊ.";
  }
  return "РќРµС‚ Р·Р°СЏРІРѕРє РґР»СЏ РІС‹РґР°С‡Рё.\nРџРѕС‚СЏРЅРё РІРЅРёР·, С‡С‚РѕР±С‹ РѕР±РЅРѕРІРёС‚СЊ.";
}

export function selectWarehouseIssueBannerText(
  listState?: WarehouseReqHeadsListState,
  integrityState?: WarehouseReqHeadsIntegrityState,
) {
  if (listState?.publishState === "error" || integrityState?.mode === "error") {
    return "РћС‡РµСЂРµРґСЊ РІС‹РґР°С‡Рё РІСЂРµРјРµРЅРЅРѕ РЅРµ РѕР±РЅРѕРІР»РµРЅР°.";
  }
  return null;
}
