import type { BuyerInboxRow } from "../../lib/catalog_api";

export type ProcurementItemType = "material" | "service" | "work" | "unknown";
export type CounterpartyRoleGate = "supplier" | "contractor" | null;

type BuyerProcurementHintRow = BuyerInboxRow & {
  item_type?: string | null;
  procurement_type?: string | null;
  type?: string | null;
  kind?: string | null;
};

const norm = (v: unknown) => String(v ?? "").trim().toLowerCase();

const parseTypedValue = (raw: unknown): ProcurementItemType => {
  const v = norm(raw);
  if (!v) return "unknown";
  if (v === "material" || v === "materials" || v === "материал" || v === "материалы") return "material";
  if (v === "service" || v === "services" || v === "услуга" || v === "услуги") return "service";
  if (v === "work" || v === "works" || v === "работа" || v === "работы") return "work";
  return "unknown";
};

export function getBuyerItemProcurementType(item: BuyerInboxRow): ProcurementItemType {
  const row = item as BuyerProcurementHintRow;

  const typed = parseTypedValue(
    row.item_type ?? row.procurement_type ?? row.type ?? row.kind ?? null,
  );
  if (typed !== "unknown") return typed;

  const appCode = String(row.app_code ?? "").trim().toUpperCase();
  if (appCode.startsWith("SRV-") || appCode.startsWith("SERVICE")) return "service";
  if (appCode.startsWith("WORK-") || appCode.startsWith("WT-")) return "work";
  if (appCode.startsWith("MAT-") || appCode.startsWith("TOOL-") || appCode.startsWith("KIT-")) return "material";

  const rikCode = String(row.rik_code ?? "").trim().toUpperCase();
  if (rikCode.startsWith("SRV-") || rikCode.startsWith("SERV-")) return "service";
  if (rikCode.startsWith("WORK-") || rikCode.startsWith("WT-")) return "work";
  if (rikCode.startsWith("MAT-") || rikCode.startsWith("TOOL-") || rikCode.startsWith("KIT-")) return "material";

  return "unknown";
}

export function getCounterpartyRoleGate(type: ProcurementItemType): CounterpartyRoleGate {
  if (type === "material") return "supplier";
  if (type === "service" || type === "work") return "contractor";
  return null;
}

export function getCounterpartyLabel(type: ProcurementItemType): string {
  if (type === "material") return "Поставщик";
  if (type === "service" || type === "work") return "Подрядчик";
  return "Контрагент";
}
