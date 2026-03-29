import type { WarehouseReqHeadsIntegrityState } from "./warehouse.types";

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
  integrityState?: WarehouseReqHeadsIntegrityState,
) {
  if (loading) return "Р—Р°РіСЂСѓР·РєР°...";
  if (integrityState?.mode === "error") {
    return "РќРµ СѓРґР°Р»РѕСЃСЊ РѕР±РЅРѕРІРёС‚СЊ РѕС‡РµСЂРµРґСЊ РІС‹РґР°С‡Рё.\nРџРѕС‚СЏРЅРё РІРЅРёР·, С‡С‚РѕР±С‹ РїРѕРІС‚РѕСЂРёС‚СЊ.";
  }
  return "РќРµС‚ Р·Р°СЏРІРѕРє РґР»СЏ РІС‹РґР°С‡Рё.\nРџРѕС‚СЏРЅРё РІРЅРёР·, С‡С‚РѕР±С‹ РѕР±РЅРѕРІРёС‚СЊ.";
}

export function selectWarehouseIssueBannerText(
  integrityState?: WarehouseReqHeadsIntegrityState,
) {
  if (integrityState?.mode === "stale_last_known_good") {
    return "РџРѕРєР°Р·Р°РЅС‹ РїРѕСЃР»РµРґРЅРёРµ Р·Р°РіСЂСѓР¶РµРЅРЅС‹Рµ Р·Р°СЏРІРєРё. РђРєС‚СѓР°Р»РёР·Р°С†РёСЏ РІСЂРµРјРµРЅРЅРѕ РЅРµРґРѕСЃС‚СѓРїРЅР°.";
  }
  if (integrityState?.mode === "error") {
    return "РћС‡РµСЂРµРґСЊ РІС‹РґР°С‡Рё РІСЂРµРјРµРЅРЅРѕ РЅРµ РѕР±РЅРѕРІР»РµРЅР°.";
  }
  return null;
}
