// src/screens/buyer/buyer.helpers.ts
import type { BuyerInboxRow } from "../../lib/catalog_api";

// ===== Date/format helpers =====
export function fmtLocal(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

export function setDeadlineHours(hours: number, setIso: (v: string) => void) {
  const d = new Date(Date.now() + hours * 3600 * 1000);
  setIso(d.toISOString());
}

export function isDeadlineHoursActive(hours: number, rfqDeadlineIso: string) {
  const target = new Date(Date.now() + hours * 3600 * 1000);
  const cur = new Date(rfqDeadlineIso);
  return Math.abs(cur.getTime() - target.getTime()) <= 10 * 60 * 1000; // ±10 минут
}

// ===== Phone helpers =====
export function stripToLocal(phoneAny: any) {
  const digits = String(phoneAny ?? "").replace(/[^\d]/g, "");

  // KG: +996XXXXXXXXX -> "996XXXXXXXXX" -> убираем "996"
  if (digits.startsWith("996") && digits.length > 3) return digits.slice(3);

  // RU/KZ: +7XXXXXXXXXX -> "7XXXXXXXXXX" -> убираем "7"
  if (digits.startsWith("7") && digits.length > 10) return digits.slice(1);

  return digits;
}

export function inferCountryCode(cityRaw?: string, phoneRaw?: string) {
  const city = String(cityRaw ?? "").toLowerCase();
  const digits = String(phoneRaw ?? "").replace(/[^\d]/g, "");

  if (digits.startsWith("996")) return "+996";
  if (digits.startsWith("7")) return "+7";

  if (city.includes("алматы") || city.includes("алма-ата") || city.includes("алма ата")) return "+7";
  if (city.includes("бишкек") || city.includes("ош") || city.includes("кыргыз")) return "+996";

  return "+996";
}

// ===== Money helpers =====
export function priceNum(v?: string) {
  const n = Number(String(v ?? "").replace(",", ".").trim());
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function lineTotal(it: BuyerInboxRow, priceStr?: string) {
  const qty = Number((it as any)?.qty ?? 0) || 0;
  return qty * priceNum(priceStr);
}

export function requestSum(items: BuyerInboxRow[], metaById: Record<string, { price?: string }>) {
  return (items || []).reduce((acc, it) => {
    const key = String((it as any)?.request_item_id ?? "");
    const p = metaById?.[key]?.price;
    return acc + lineTotal(it, p);
  }, 0);
}

// ===== RFQ preview =====
export function buildRfqPickedPreview(rows: BuyerInboxRow[], pickedIds: string[]) {
  const set = new Set((pickedIds || []).map(String));
  const out: { id: string; title: string; qty: number; uom: string }[] = [];

  for (const r of rows || []) {
    const rid = String((r as any)?.request_item_id ?? "");
    if (!rid || !set.has(rid)) continue;

    out.push({
      id: rid,
      title: String((r as any)?.name_human ?? "Позиция"),
      qty: Number((r as any)?.qty ?? 0) || 0,
      uom: String((r as any)?.uom ?? ""),
    });
  }

  return out.slice(0, 30);
}
