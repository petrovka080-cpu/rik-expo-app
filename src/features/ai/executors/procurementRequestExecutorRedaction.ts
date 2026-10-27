import type { ProcurementRequestExecutorPayload } from "./procurementRequestExecutorTypes";

const normalizeText = (value: unknown): string =>
  typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";

const normalizeNumber = (value: unknown): number | undefined => {
  const numberValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : undefined;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

export function redactProcurementRequestExecutorPayload(value: unknown): ProcurementRequestExecutorPayload | null {
  if (!isRecord(value)) return null;
  const title = normalizeText(value.title) || normalizeText(value.draftTitle) || "Approved procurement request";
  const rawItems = Array.isArray(value.items) ? value.items : [];
  const items = rawItems.slice(0, 50).flatMap((entry) => {
    if (!isRecord(entry)) return [];
    const materialLabel =
      normalizeText(entry.materialLabel) ||
      normalizeText(entry.name) ||
      normalizeText(entry.material_label);
    if (!materialLabel) return [];
    return [{
      materialLabel,
      quantity: normalizeNumber(entry.quantity),
      unit: normalizeText(entry.unit) || undefined,
      rikCode: normalizeText(entry.rikCode) || normalizeText(entry.rik_code) || undefined,
      appCode: normalizeText(entry.appCode) || normalizeText(entry.app_code) || undefined,
      kind: normalizeText(entry.kind) || undefined,
      supplierLabel: normalizeText(entry.supplierLabel) || normalizeText(entry.supplier_label) || undefined,
    }];
  });
  const notes = Array.isArray(value.notes)
    ? value.notes.map(normalizeText).filter(Boolean).slice(0, 10)
    : normalizeText(value.notes)
      ? [normalizeText(value.notes)]
      : [];

  return { title, items, notes };
}
