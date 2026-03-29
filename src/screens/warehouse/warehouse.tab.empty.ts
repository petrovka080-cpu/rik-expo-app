import type { WarehouseReqHeadsIntegrityState, WarehouseReqHeadsListState } from "./warehouse.types";

export function selectWarehouseIncomingEmptyText() {
  return "РќРµС‚ Р·Р°РїРёСЃРµР№ РІРѕС‡РµСЂРµРґРё СЃРєР»Р°РґР°.";
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
  if (listState?.publishState === "degraded") {
    return "РќРµ СѓРґР°Р»РѕСЃСЊ РїРѕР»СѓС‡РёС‚СЊ СЃРІРµР¶СѓСЋ РѕС‡РµСЂРµРґСЊ РІС‹РґР°С‡Рё.\nРџРѕРєР°Р·Р°РЅРѕ РїРѕСЃР»РµРґРЅРµРµ СЃРѕС…СЂР°РЅС‘РЅРЅРѕРµ СЃРѕСЃС‚РѕСЏРЅРёРµ.";
  }
  if (listState?.publishState === "error" || integrityState?.mode === "error") {
    return "РќРµ СѓРґР°Р»РѕСЃСЊ РѕР±РЅРѕРІРёС‚СЊ РѕС‡РµСЂРµРґСЊ РІС‹РґР°С‡Рё.\nРџРѕС‚СЏРЅРё РІРЅРёР·, С‡С‚РѕР±С‹ РїРѕРІС‚РѕСЂРёС‚СЊ.";
  }
  return "РќРµС‚ Р·Р°СЏРІРѕРє РґР»СЏ РІС‹РґР°С‡Рё.\nРџРѕС‚СЏРЅРё РІРЅРёР·, С‡С‚РѕР±С‹ РѕР±РЅРѕРІРёС‚СЊ.";
}

export function selectWarehouseIssueBannerText(
  listState?: WarehouseReqHeadsListState,
  integrityState?: WarehouseReqHeadsIntegrityState,
) {
  if (listState?.publishState === "degraded") {
    return "РџРѕРєР°Р·Р°РЅРѕ СѓСЃС‚Р°СЂРµРІС€РµРµ СЃРѕСЃС‚РѕСЏРЅРёРµ: РїРѕСЃР»РµРґРЅРёРµ СѓСЃРїРµС€РЅРѕ Р·Р°РіСЂСѓР¶РµРЅРЅС‹Рµ Р·Р°СЏРІРєРё. РђРєС‚СѓР°Р»РёР·Р°С†РёСЏ РІСЂРµРјРµРЅРЅРѕ РЅРµРґРѕСЃС‚СѓРїРЅР°.";
  }
  if (listState?.publishState === "error" || integrityState?.mode === "error") {
    return "РћС‡РµСЂРµРґСЊ РІС‹РґР°С‡Рё РІСЂРµРјРµРЅРЅРѕ РЅРµ РѕР±РЅРѕРІР»РµРЅР°.";
  }
  if (integrityState?.mode === "stale_last_known_good") {
    return "РџРѕРєР°Р·Р°РЅС‹ РїРѕСЃР»РµРґРЅРёРµ Р·Р°РіСЂСѓР¶РµРЅРЅС‹Рµ Р·Р°СЏРІРєРё. РђРєС‚СѓР°Р»РёР·Р°С†РёСЏ РІСЂРµРјРµРЅРЅРѕ РЅРµРґРѕСЃС‚СѓРїРЅР°.";
  }
  return null;
}
